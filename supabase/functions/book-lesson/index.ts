import {
  callRpc,
  corsHeaders,
  escapeHtml,
  formatLessonDate,
  isAllowedOrigin,
  json,
  randomToken,
  sendBrevoEmail,
  sha256,
} from '../_shared/http.ts';

type Reservation = {
  reservation_id: string;
  attendee_name: string;
  attendee_email: string;
  title: string;
  starts_at: string;
  cancel_before: string;
  teacher: string;
  location: string;
  payment_note: string;
  available_spots: number;
};

const errors: Record<string, [number, string]> = {
  INVALID_NAME: [400, 'Zkontroluj prosím jméno.'],
  INVALID_EMAIL: [400, 'Zkontroluj prosím e-mail.'],
  INVALID_RELATION: [400, 'Zvol prosím, zda jdeš jako zaměstnanec nebo host.'],
  LESSON_NOT_AVAILABLE: [409, 'Tuto lekci už není možné rezervovat.'],
  LESSON_FULL: [409, 'Lekce je už obsazená.'],
  ALREADY_BOOKED: [409, 'Na tento e-mail už rezervace existuje.'],
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, { error: 'METHOD_NOT_ALLOWED' }, 405);
  if (!isAllowedOrigin(req)) return json(req, { error: 'ORIGIN_NOT_ALLOWED' }, 403);

  try {
    const body = await req.json();
    const lessonId = String(body.lessonId ?? '');
    const name = String(body.name ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const relation = body.relation === 'guest' ? 'guest' : 'employee';
    if (!/^[0-9a-f-]{36}$/i.test(lessonId)) return json(req, { error: 'INVALID_LESSON', message: 'Neplatná lekce.' }, 400);

    const token = randomToken();
    const tokenHash = await sha256(token);
    const reservation = await callRpc<Reservation>('reserve_lesson', {
      p_lesson_id: lessonId,
      p_attendee_name: name,
      p_attendee_email: email,
      p_attendee_relation: relation,
      p_cancellation_token_hash: tokenHash,
    });

    const siteUrl = (Deno.env.get('PUBLIC_SITE_URL') || 'https://joga-na-hallu.pages.dev').replace(/\/$/, '');
    const cancelUrl = `${siteUrl}/?cancel=${encodeURIComponent(token)}`;
    const teacherFirstName = reservation.teacher.trim().split(/\s+/)[0] || 'Tým';
    const cancellationHours = Math.max(0, Math.round((new Date(reservation.starts_at).getTime() - new Date(reservation.cancel_before).getTime()) / 3_600_000));
    const emailResult = await sendBrevoEmail({
      toEmail: reservation.attendee_email,
      toName: reservation.attendee_name,
      subject: `Potvrzení rezervace: ${reservation.title}`,
      htmlContent: `<p>Ahoj ${escapeHtml(reservation.attendee_name)},</p>
        <p>máš rezervované místo na lekci <strong>${escapeHtml(reservation.title)}</strong>.</p>
        <p><strong>${escapeHtml(formatLessonDate(reservation.starts_at))}</strong><br>
        ${escapeHtml(reservation.location)}<br>Lektor: ${escapeHtml(reservation.teacher)}</p>
        <p>${escapeHtml(reservation.payment_note)}</p>
        <p>Rezervaci můžeš zrušit nejpozději ${cancellationHours} hodin před začátkem: <a href="${escapeHtml(cancelUrl)}">zrušit rezervaci</a>.</p>
        <p>Těšíme se na podložce.<br>${escapeHtml(teacherFirstName)} · Jóga na HALLU</p>`,
    });

    try {
      await callRpc('record_reservation_email_result', {
        p_reservation_id: reservation.reservation_id,
        p_sent: emailResult.sent,
        p_message_id: emailResult.messageId ?? null,
        p_error: emailResult.error ?? null,
      });
    } catch (trackingError) {
      console.error('email result tracking failed', trackingError);
    }

    return json(req, {
      ok: true,
      emailSent: emailResult.sent,
      cancelUrl: emailResult.sent ? undefined : cancelUrl,
      reservation: {
        title: reservation.title,
        startsAt: reservation.starts_at,
        availableSpots: reservation.available_spots,
      },
    }, 201);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    const mapped = errors[code];
    console.error('book-lesson failed', code);
    return json(req, { error: code, message: mapped?.[1] ?? 'Rezervaci se nepodařilo uložit. Zkus to prosím znovu.' }, mapped?.[0] ?? 500);
  }
});
