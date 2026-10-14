import {
  callRpc,
  escapeHtml,
  formatLessonDate,
  isAllowedOrigin,
  sendBrevoEmail,
  supabaseConfig,
} from '../_shared/http.ts';

type Participant = { name: string; email: string };

type PaymentParticipant = {
  reservation_id: string;
  name: string;
  email: string;
  status?: string;
  payment_email_sent_at?: string | null;
  payment_email_recipient?: string | null;
  payment_email_error?: string | null;
};

type PaymentEmailBatch = {
  lesson_id: string;
  title: string;
  starts_at: string;
  ends_at?: string;
  teacher: string;
  payment_mode: 'paid' | 'donation';
  price_czk: number | null;
  payment_note: string;
  participants: PaymentParticipant[];
};

type LessonChange = {
  action: 'reschedule' | 'cancel';
  lesson_id: string;
  title: string;
  location: string;
  teacher: string;
  old_starts_at: string;
  old_ends_at: string;
  new_starts_at: string;
  new_ends_at: string;
  participants: Participant[];
};

const allowedOrigins = new Set([
  'http://127.0.0.1:4173',
  'http://localhost:4173',
  'https://joga-na-hallu.pages.dev',
  'https://alza-joga-i7pk.vercel.app',
  'https://joganahallu.cz',
  'https://www.joganahallu.cz',
]);

function headers(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  return {
    'Access-Control-Allow-Origin': origin && allowedOrigins.has(origin) ? origin : '',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function json(req: Request, body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: headers(req) });
}

async function requireAdmin(req: Request): Promise<void> {
  const authorization = req.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) throw new Error('UNAUTHORIZED');

  const { url, secretKey } = supabaseConfig();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: secretKey, Authorization: authorization },
  });
  const user = await response.json().catch(() => null);
  if (!response.ok || user?.app_metadata?.role !== 'admin') throw new Error('FORBIDDEN');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers(req) });
  if (req.method !== 'POST') return json(req, { error: 'METHOD_NOT_ALLOWED' }, 405);
  if (!isAllowedOrigin(req)) return json(req, { error: 'ORIGIN_NOT_ALLOWED' }, 403);

  let requestedAction = '';
  try {
    await requireAdmin(req);
    const body = await req.json();
    const action = String(body.action ?? '');
    requestedAction = action;
    if (action === 'payment-preview') {
      const lessonId = String(body.lessonId ?? '');
      if (!/^[0-9a-f-]{36}$/i.test(lessonId)) throw new Error('INVALID_LESSON');
      const preview = await callRpc<PaymentEmailBatch>('admin_payment_email_preview', {
        p_lesson_id: lessonId,
      });
      return json(req, { ok: true, action, ...preview });
    }

    if (action === 'payment-send') {
      const lessonId = String(body.lessonId ?? '');
      const requestedRecipients = Array.isArray(body.recipients) ? body.recipients : [];
      if (!/^[0-9a-f-]{36}$/i.test(lessonId)) throw new Error('INVALID_LESSON');
      if (requestedRecipients.length < 1 || requestedRecipients.length > 100) throw new Error('INVALID_RECIPIENTS');

      const recipientById = new Map<string, string>();
      for (const recipient of requestedRecipients) {
        const reservationId = String(recipient?.reservationId ?? '');
        const email = String(recipient?.email ?? '').trim().toLowerCase();
        if (!/^[0-9a-f-]{36}$/i.test(reservationId)) throw new Error('INVALID_RECIPIENTS');
        if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('INVALID_EMAIL');
        recipientById.set(reservationId, email);
      }

      const batch = await callRpc<PaymentEmailBatch>('admin_payment_email_recipients', {
        p_lesson_id: lessonId,
        p_reservation_ids: Array.from(recipientById.keys()),
      });
      if (!batch.participants.length) throw new Error('NO_ELIGIBLE_RECIPIENTS');

      const teacherFirstName = batch.teacher.trim().split(/\s+/)[0] || 'Tým';
      const publicSiteUrl = (Deno.env.get('PUBLIC_SITE_URL') || 'https://joga-na-hallu.pages.dev').replace(/\/$/, '');
      const donation = batch.payment_mode === 'donation';
      const qrUrl = `${publicSiteUrl}/assets/${donation ? 'qr-dobry-andel.jpg' : 'qr-daniela-150.jpg'}`;
      const results = await Promise.all(batch.participants.map(async (participant) => {
        const recipientEmail = recipientById.get(participant.reservation_id) || participant.email;
        const paymentCopy = donation
          ? 'Pokud chceš, můžeš dobrovolně přispět organizaci Dobrý anděl pomocí QR kódu níže.'
          : `Prosíme o úhradu ${batch.price_czk ?? 150} Kč pomocí QR kódu níže.`;
        const result = await sendBrevoEmail({
          toEmail: recipientEmail,
          toName: participant.name,
          subject: donation ? `Dobrovolný příspěvek po lekci: ${batch.title}` : `Platba za lekci: ${batch.title}`,
          htmlContent: `<div style="font-family:Arial,sans-serif;color:#1f2824;line-height:1.6;max-width:560px;margin:auto">
            <p>Ahoj ${escapeHtml(participant.name)},</p>
            <p>děkujeme za účast na lekci <strong>${escapeHtml(batch.title)}</strong> (${escapeHtml(formatLessonDate(batch.starts_at))}).</p>
            <p>${escapeHtml(paymentCopy)}</p>
            <p style="text-align:center;margin:28px 0"><a href="${qrUrl}"><img src="${qrUrl}" width="280" alt="${donation ? 'QR kód pro dobrovolný příspěvek organizaci Dobrý anděl' : 'QR kód pro platbu 150 Kč Daniele'}" style="max-width:100%;height:auto;border:0"></a></p>
            <p style="font-size:13px;color:#66706b">Pokud se obrázek v e-mailu nezobrazí, <a href="${qrUrl}">otevři QR kód v prohlížeči</a>.</p>
            <p>Děkujeme.<br>${escapeHtml(teacherFirstName)} · Jóga na HALLU</p>
          </div>`,
        });
        await callRpc<void>('record_payment_email_result', {
          p_reservation_id: participant.reservation_id,
          p_sent: result.sent,
          p_recipient_email: recipientEmail,
          p_message_id: result.messageId ?? null,
          p_error: result.error ?? null,
        });
        return { reservationId: participant.reservation_id, sent: result.sent, error: result.error };
      }));

      const sent = results.filter((result) => result.sent).length;
      const failed = results.length - sent;
      const skipped = requestedRecipients.length - results.length;
      return json(req, { ok: true, action, sent, failed, skipped, results });
    }

    if (action === 'create') {
      const instructorId = String(body.instructorId ?? '');
      const title = String(body.title ?? '').trim();
      const language = String(body.language ?? 'cs');
      const startsAt = String(body.startsAt ?? '');
      const endsAt = String(body.endsAt ?? '');
      const capacity = Number(body.capacity);
      const repeatCount = Number(body.repeatCount);
      if (!/^[0-9a-f-]{36}$/i.test(instructorId)) throw new Error('INVALID_INSTRUCTOR');
      if (title.length < 2 || title.length > 120) throw new Error('INVALID_TITLE');
      if (!['cs', 'en'].includes(language)) throw new Error('INVALID_LANGUAGE');
      if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) throw new Error('INVALID_CAPACITY');
      if (!Number.isInteger(repeatCount) || repeatCount < 1 || repeatCount > 52) throw new Error('INVALID_REPEAT_COUNT');
      if (!Number.isFinite(Date.parse(startsAt)) || !Number.isFinite(Date.parse(endsAt)) || Date.parse(endsAt) <= Date.parse(startsAt)) throw new Error('INVALID_TIME');

      const created = await callRpc<{ created: number; lesson_ids: string[] }>('admin_create_lessons', {
        p_title: title,
        p_instructor_id: instructorId,
        p_starts_at: startsAt,
        p_ends_at: endsAt,
        p_capacity: capacity,
        p_language: language,
        p_repeat_count: repeatCount,
      });
      return json(req, { ok: true, action, created: created.created, lessonIds: created.lesson_ids });
    }

    const lessonId = String(body.lessonId ?? '');
    if (!/^[0-9a-f-]{36}$/i.test(lessonId)) throw new Error('INVALID_LESSON');
    if (!['reschedule', 'cancel'].includes(action)) throw new Error('INVALID_ACTION');

    const change = await callRpc<LessonChange>('admin_change_lesson', {
      p_lesson_id: lessonId,
      p_action: action,
      p_starts_at: action === 'reschedule' ? body.startsAt : null,
      p_ends_at: action === 'reschedule' ? body.endsAt : null,
    });

    const teacherFirstName = change.teacher.trim().split(/\s+/)[0] || 'Tým';
    const results = await Promise.all(change.participants.map((participant) => {
      const rescheduled = change.action === 'reschedule';
      const details = rescheduled
        ? `<p>Původní termín: <s>${escapeHtml(formatLessonDate(change.old_starts_at))}</s><br>
          Nový termín: <strong>${escapeHtml(formatLessonDate(change.new_starts_at))}</strong></p>`
        : `<p>Termín: <strong>${escapeHtml(formatLessonDate(change.old_starts_at))}</strong></p>`;
      return sendBrevoEmail({
        toEmail: participant.email,
        toName: participant.name,
        subject: `${rescheduled ? 'Změna času lekce' : 'Lekce zrušena'}: ${change.title}`,
        htmlContent: `<p>Ahoj ${escapeHtml(participant.name)},</p>
          <p>${rescheduled ? 'čas lekce byl změněn' : 'lekce byla zrušena'}: <strong>${escapeHtml(change.title)}</strong>.</p>
          ${details}
          <p>${escapeHtml(change.location)}</p>
          <p>${rescheduled ? 'Těšíme se na podložce.' : 'Omlouváme se za komplikace.'}<br>${escapeHtml(teacherFirstName)} · Jóga na HALLU</p>`,
      });
    }));

    const notified = results.filter((result) => result.sent).length;
    const failed = results.length - notified;
    return json(req, { ok: true, action: change.action, notified, failed });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    const status = code === 'UNAUTHORIZED' ? 401 : code === 'FORBIDDEN' ? 403 : code.includes('LESSON_CONFLICT') || code.includes('LESSON_NOT_ENDED') ? 409 : code.includes('INVALID_') || code.includes('NO_ELIGIBLE_') ? 400 : 500;
    console.error('manage-lesson failed', code);
    const message = status === 403
      ? 'Tento účet nemá oprávnění správce.'
      : status === 409
        ? code.includes('LESSON_NOT_ENDED')
          ? 'Platební e-maily lze odeslat až po skončení lekce.'
          : 'Ve zvoleném termínu už má tento lektor naplánovanou lekci.'
        : requestedAction.startsWith('payment-')
          ? 'Platební e-maily se nepodařilo připravit nebo odeslat.'
        : requestedAction === 'create'
          ? 'Nové lekce se nepodařilo vytvořit.'
          : 'Změnu lekce se nepodařilo uložit.';
    return json(req, { error: code, message }, status);
  }
});
