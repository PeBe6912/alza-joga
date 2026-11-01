import { callRpc, czechSalutation, escapeHtml, formatLessonDate, instructorDisplayName, sendBrevoEmail } from './http.ts';

type Confirmation = {
  title: string; starts_at: string; teacher: string; location: string;
  booked_count: number; minimum_attendance: number;
  participants: Array<{ reservation_id: string; name: string; email: string }>;
};

export async function confirmLessonAndNotify(lessonId: string) {
  const batch = await callRpc<Confirmation>('admin_confirm_low_attendance', { p_lesson_id: lessonId });
  const teacher = instructorDisplayName(batch.teacher);
  let notified = 0, failed = 0;
  for (const participant of batch.participants) {
    try {
      const result = await sendBrevoEmail({
        toEmail: participant.email, toName: participant.name,
        subject: `Lekce se koná: ${batch.title}`,
        signatureName: teacher, senderName: `${teacher} · Jóga na HALLU`,
        htmlContent: `<p>${escapeHtml(czechSalutation(participant.name))},</p>
          <p>potvrzuji, že lekce <strong>${escapeHtml(batch.title)}</strong> se koná i v menším počtu.</p>
          <p style="padding:18px 20px;background:#f5f1e9;border-left:3px solid #b87854"><strong>${escapeHtml(batch.title)}</strong><br>${escapeHtml(formatLessonDate(batch.starts_at))}<br>${teacher === 'Danča' ? 'Lektorka' : 'Lektor'}: ${escapeHtml(teacher)}<br>${escapeHtml(batch.location)}</p>
          <p>Tvoje rezervace platí, nemusíš nic dalšího potvrzovat.</p>
          <p>Těším se na společnou jógovou praxi.</p>`,
      });
      await callRpc('record_lesson_confirmation_email', { p_reservation_id: participant.reservation_id, p_sent: result.sent, p_message_id: result.messageId || null, p_error: result.error || null });
      if (result.sent) notified++; else failed++;
    } catch (error) {
      // Keep the claim when delivery is uncertain, so another click cannot send a duplicate.
      console.error('lesson confirmation notification uncertain', participant.reservation_id, error instanceof Error ? error.message : 'UNKNOWN_ERROR');
      failed++;
    }
  }
  return { booked_count: batch.booked_count, minimum_attendance: batch.minimum_attendance, low_attendance_confirmed: true, notified, failed };
}
