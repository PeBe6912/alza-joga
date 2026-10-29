import { callRpc, instructorDisplayName, supabaseConfig } from './http.ts';

type SentReservation = {
  id: string;
  attendee_name: string;
  attendee_email: string | null;
  status: string;
  payment_waived_at: string | null;
  payment_email_sent_at: string | null;
  payment_email_recipient: string | null;
  payment_email_message_id: string | null;
  payment_email_last_resent_at: string | null;
  lessons: { title: string; ends_at: string; status: string; instructors: { name: string } | null };
};

async function brevoGet(path: string): Promise<Record<string, unknown>> {
  const key = Deno.env.get('BREVO_API_KEY');
  if (!key) throw new Error('EMAIL_HISTORY_UNAVAILABLE');
  let response: Response;
  try {
    response = await fetch(`https://api.brevo.com/v3/smtp/emails${path}`, {
      headers: { 'api-key': key, accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
  } catch { throw new Error('EMAIL_HISTORY_UNAVAILABLE'); }
  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    // No keys, recipients, message IDs or original message content in diagnostics.
    const reason = typeof details.message === 'string' && /start\/end date.*current date/i.test(details.message)
      ? 'FUTURE_DATE_RANGE' : 'PROVIDER_REJECTED';
    console.error('email_archive_provider_error', JSON.stringify({
      stage: path.startsWith('?') ? 'list' : 'content', status: response.status,
      code: typeof details.code === 'string' ? details.code.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50) : '', reason,
    }));
    throw new Error(response.status === 404 ? 'EMAIL_CONTENT_UNAVAILABLE' : 'EMAIL_HISTORY_UNAVAILABLE');
  }
  return await response.json();
}

export async function sentPaymentEmail(reservationId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reservationId)) throw new Error('INVALID_RESERVATION');
  const { url, secretKey } = supabaseConfig();
  const query = new URLSearchParams({
    id: `eq.${reservationId}`, limit: '1',
    select: 'id,attendee_name,attendee_email,status,payment_waived_at,payment_email_sent_at,payment_email_recipient,payment_email_message_id,payment_email_last_resent_at,lessons!inner(title,ends_at,status,instructors(name))',
  });
  const response = await fetch(`${url}/rest/v1/reservations?${query}`, { headers: { apikey: secretKey } });
  if (!response.ok) throw new Error('EMAIL_HISTORY_UNAVAILABLE');
  const [reservation] = await response.json() as SentReservation[];
  if (!reservation) throw new Error('RESERVATION_NOT_FOUND');
  if (!reservation.payment_email_message_id || !reservation.payment_email_sent_at) throw new Error('EMAIL_NOT_SENT');
  const recipient = (reservation.payment_email_recipient || reservation.attendee_email || '').trim().toLowerCase();
  if (!recipient) throw new Error('EMAIL_CONTENT_UNAVAILABLE');
  // Keep the day-boundary buffer, but Brevo rejects any start/end date in the future.
  // Explicit dates also cover messages older than Brevo's default 30 days.
  const sent = new Date(reservation.payment_email_sent_at);
  if (!Number.isFinite(sent.getTime())) throw new Error('EMAIL_CONTENT_UNAVAILABLE');
  const startDate = new Date(sent.getTime() - 86400000).toISOString().slice(0, 10);
  const endDate = new Date(Math.min(sent.getTime() + 86400000, Date.now())).toISOString().slice(0, 10);
  if (startDate > endDate) throw new Error('EMAIL_CONTENT_UNAVAILABLE');
  const filter = new URLSearchParams({ messageId: reservation.payment_email_message_id, startDate, endDate, limit: '100' });
  const list = await brevoGet(`?${filter}`);
  const matches = Array.isArray(list.transactionalEmails) ? list.transactionalEmails as Array<Record<string, unknown>> : [];
  const match = matches.find(item => item.messageId === reservation.payment_email_message_id && String(item.email).trim().toLowerCase() === recipient);
  if (!match || typeof match.uuid !== 'string') throw new Error('EMAIL_CONTENT_UNAVAILABLE');
  const original = await brevoGet(`/${encodeURIComponent(match.uuid)}`);
  if (String(original.email).trim().toLowerCase() !== recipient || typeof original.subject !== 'string' || typeof original.body !== 'string' || !original.body.trim()) {
    throw new Error('EMAIL_CONTENT_UNAVAILABLE');
  }
  return { reservation, recipient, subject: original.subject, html: original.body };
}

export async function resendPaymentEmail(original: Awaited<ReturnType<typeof sentPaymentEmail>>) {
  const { reservation, recipient, subject, html } = original;
  if (reservation.lessons.status === 'cancelled' || new Date(reservation.lessons.ends_at).getTime() > Date.now()
    || !['attended', 'no_show'].includes(reservation.status) || reservation.payment_waived_at) throw new Error('EMAIL_RESEND_NOT_ALLOWED');
  const key = Deno.env.get('BREVO_API_KEY');
  const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL');
  if (!key || !senderEmail) throw new Error('EMAIL_HISTORY_UNAVAILABLE');
  const claimed = await callRpc<boolean>('claim_payment_email_resend', {
    p_reservation_id: reservation.id, p_expected_message_id: reservation.payment_email_message_id,
  });
  if (!claimed) throw new Error('EMAIL_RESEND_THROTTLED');
  // Exactly one recipient, original subject/body, no attendance RPC and no batch-summary email.
  let response: Response;
  try {
    response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST', headers: { 'api-key': key, accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { name: `${instructorDisplayName(reservation.lessons.instructors?.name).split(/\s+/)[0] || 'Jóga na HALLU'}${reservation.lessons.instructors ? ' · Jóga na HALLU' : ''}`, email: senderEmail },
        to: [{ email: recipient, name: reservation.attendee_name }], subject, htmlContent: html, tags: ['joga-na-hallu', 'payment-resend'],
      }),
      signal: AbortSignal.timeout(20000),
    });
  } catch { throw new Error('EMAIL_RESEND_UNCERTAIN'); }
  if (!response.ok) throw new Error('EMAIL_RESEND_FAILED');
  const sentAt = new Date().toISOString();
  const { url, secretKey } = supabaseConfig();
  const query = new URLSearchParams({ id: `eq.${reservation.id}`, payment_email_message_id: `eq.${reservation.payment_email_message_id}`, select: 'id' });
  let recorded = false;
  try {
    const save = await fetch(`${url}/rest/v1/reservations?${query}`, {
      method: 'PATCH', headers: { apikey: secretKey, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ payment_email_last_resent_at: sentAt }),
    });
    recorded = save.ok && (await save.json()).length === 1;
  } catch { /* The email was already accepted: never retry sending because audit recording failed. */ }
  return { sentAt, recorded };
}
