import {
  callRpc,
  czechSalutation,
  escapeHtml,
  formatLessonDate,
  isAllowedOrigin,
  sendBrevoEmail,
  sha256,
  supabaseConfig,
} from '../_shared/http.ts';
import { sentPaymentEmail, resendPaymentEmail } from '../_shared/payment-email-history.ts';

type Participant = { name: string; email: string };

type PaymentParticipant = {
  reservation_id: string;
  name: string;
  email: string | null;
  status?: string;
  payment_waived_at?: string | null;
  payment_email_sent_at?: string | null;
  payment_email_recipient?: string | null;
  payment_email_error?: string | null;
  feedback_token?: string;
};

type FeedbackSummary = {
  requested: boolean;
  total: number;
  ratings: { great: number; good: number; not_right: number };
  topics: Array<{ topic: string; count: number }>;
  comments: string[];
};

type PaymentEmailBatch = {
  lesson_id: string;
  title: string;
  starts_at: string;
  ends_at?: string;
  teacher: string;
  instructor_email: string | null;
  payment_mode: 'paid' | 'donation';
  price_czk: number | null;
  cancellation_hours: number;
  payment_note: string;
  payment_qr_url: string | null;
  feedback_requested?: boolean;
  participants: PaymentParticipant[];
};

type AdminReservationCancellation = {
  reservation_id: string;
  attendee_name: string;
  attendee_email: string;
  title: string;
  starts_at: string;
  location: string;
  teacher: string;
  late_cancellation: boolean;
};

type LessonChange = {
  action: 'update' | 'reschedule' | 'cancel';
  lesson_id: string;
  title: string;
  location: string;
  teacher: string;
  old_starts_at: string;
  old_ends_at: string;
  new_starts_at: string;
  new_ends_at: string;
  participants: Participant[];
  old_title?: string;
  old_teacher?: string;
  old_language?: string;
  old_payment_mode?: 'paid' | 'donation';
  old_price_czk?: number | null;
  new_language?: string;
  new_payment_mode?: 'paid' | 'donation';
  new_price_czk?: number | null;
};

const allowedOrigins = new Set([
  'http://127.0.0.1:3000',
  'http://127.0.0.1:4173',
  'http://localhost:3000',
  'http://localhost:4173',
  'https://joga-na-hallu.pages.dev',
  'https://alza-joga-i7pk.vercel.app',
  'https://joganahallu.cz',
  'https://www.joganahallu.cz',
]);

const DONATION_BOOKING_COPY = 'Doporučený příspěvek je 150 Kč, jeho výše je ale jen na tobě. QR kód k příspěvku bude odeslán po skončení lekce a platba směřuje přímo na účet organizace Dobrý anděl.';
const DONATION_PAYMENT_COPY = 'Posílám ti QR kód pro dobrovolný příspěvek Dobrému andělovi. Doporučená částka je 150 Kč, její výše je ale na tobě. Peníze jdou přímo na účet organizace.';

const OWNER_ADMIN_USER_ID = '3f8ca22d-aa9a-4cad-bb14-8e4fbfae1c97';

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

type AdminUser = {
  id: string;
  email?: string;
  app_metadata?: { role?: string };
  user_metadata?: { full_name?: string; name?: string };
};

async function requireAdmin(req: Request): Promise<AdminUser> {
  const authorization = req.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) throw new Error('UNAUTHORIZED');

  const { url, secretKey } = supabaseConfig();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: secretKey, Authorization: authorization },
  });
  const user = await response.json().catch(() => null);
  if (!response.ok || user?.app_metadata?.role !== 'admin') throw new Error('FORBIDDEN');
  return user;
}

async function callAuthAdmin(path: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', body?: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { url, secretKey } = supabaseConfig();
  const response = await fetch(`${url}/auth/v1/admin/${path}`, {
    method,
    headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = String(result?.code || result?.error_code || result?.message || 'AUTH_ADMIN_FAILED');
    throw new Error(code.includes('email_exists') || code.includes('already') ? 'ADMIN_EXISTS' : 'AUTH_ADMIN_FAILED');
  }
  return result;
}

async function getInstructorPayment(instructorId: string): Promise<{ payment_mode: 'paid' | 'donation'; price_czk: number | null; payment_note: string }> {
  const { url, secretKey } = supabaseConfig();
  const query = new URLSearchParams({ select: 'payment_mode,price_czk,payment_note', id: `eq.${instructorId}`, limit: '1' });
  const response = await fetch(`${url}/rest/v1/instructors?${query}`, { headers: { apikey: secretKey } });
  const rows = await response.json();
  if (!response.ok || !rows[0]) throw new Error('INVALID_INSTRUCTOR');
  return rows[0];
}

async function adminDisplayName(adminUser: AdminUser): Promise<string> {
  const metadataName = String(adminUser.user_metadata?.full_name ?? adminUser.user_metadata?.name ?? '').trim();
  if (metadataName) return metadataName;

  const email = String(adminUser.email ?? '').trim().toLowerCase();
  if (!email) return '';
  const contacts = await callRpc<Array<{ instructor_id: string; email: string }>>('admin_instructor_contacts', {});
  const contact = contacts.find((item) => item.email.trim().toLowerCase() === email);
  if (contact) {
    const { url, secretKey } = supabaseConfig();
    const query = new URLSearchParams({ select: 'name', id: `eq.${contact.instructor_id}`, limit: '1' });
    const response = await fetch(`${url}/rest/v1/instructors?${query}`, { headers: { apikey: secretKey } });
    const rows = await response.json().catch(() => []);
    if (response.ok && rows[0]?.name) return String(rows[0].name);
  }

  const firstEmailPart = email.split('@')[0].split(/[._-]/).find((part) => /^[a-záčďéěíňóřšťúůýž]{2,}$/i.test(part));
  return firstEmailPart ? `${firstEmailPart.charAt(0).toLocaleUpperCase('cs-CZ')}${firstEmailPart.slice(1)}` : '';
}

function formalAdminGreeting(displayName: string): string {
  const informalGreeting = czechSalutation(displayName);
  return informalGreeting.startsWith('Ahoj ') ? `Dobrý den, ${informalGreeting.slice(5)}` : 'Dobrý den';
}

function publicAssetUrl(siteUrl: string, path: string): string {
  return /^https?:\/\//i.test(path) ? path : `${siteUrl}/${path.replace(/^\/+/, '')}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers(req) });
  if (req.method !== 'POST') return json(req, { error: 'METHOD_NOT_ALLOWED' }, 405);
  if (!isAllowedOrigin(req)) return json(req, { error: 'ORIGIN_NOT_ALLOWED' }, 403);

  let requestedAction = '';
  try {
    const adminUser = await requireAdmin(req);
    const body = await req.json();
    const action = String(body.action ?? '');
    const publicSiteUrl = (Deno.env.get('PUBLIC_SITE_URL') || 'https://joga-na-hallu.pages.dev').replace(/\/$/, '');
    requestedAction = action;
    const canManageAdmins = adminUser.id === OWNER_ADMIN_USER_ID;
    if (action === 'payment-email-content' || action === 'payment-email-resend') {
      if (action === 'payment-email-resend' && body.confirmed !== true) throw new Error('EMAIL_RESEND_CONFIRM_REQUIRED');
      const original = await sentPaymentEmail(String(body.reservationId ?? ''));
      if (action === 'payment-email-content') {
        const response = json(req, { ok: true, subject: original.subject, html: original.html, recipient: original.recipient, sentAt: original.reservation.payment_email_sent_at, lastResentAt: original.reservation.payment_email_last_resent_at });
        response.headers.set('Cache-Control', 'no-store');
        return response;
      }
      const result = await resendPaymentEmail(original);
      return json(req, { ok: true, recipient: original.recipient, ...result });
    }
    if (action === 'capabilities') {
      const displayName = await adminDisplayName(adminUser);
      return json(req, { ok: true, action, canManageAdmins, canDeleteLessons: canManageAdmins, greeting: formalAdminGreeting(displayName) });
    }
    if (action === 'create-admin') {
      if (!canManageAdmins) throw new Error('OWNER_ONLY');
      const email = String(body.email ?? '').trim().toLowerCase();
      const displayName = String(body.displayName ?? '').trim();
      const password = String(body.password ?? '');
      if (displayName.length < 2 || displayName.length > 120) throw new Error('INVALID_NAME');
      if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('INVALID_EMAIL');
      if (password.length < 12 || password.length > 72) throw new Error('INVALID_PASSWORD');
      const created = await callAuthAdmin('users', 'POST', {
        email,
        password,
        email_confirm: true,
        app_metadata: { role: 'admin' },
        user_metadata: { full_name: displayName },
      });
      return json(req, { ok: true, action, userId: created.id ?? null });
    }

    if (action === 'list-admins') {
      if (!canManageAdmins) throw new Error('OWNER_ONLY');
      const result = await callAuthAdmin('users?page=1&per_page=1000', 'GET');
      const users = Array.isArray(result.users) ? result.users : [];
      const admins = users
        .filter((user) => user?.app_metadata?.role === 'admin')
        .map((user) => ({
          id: user.id,
          email: user.email ?? '',
          createdAt: user.created_at ?? null,
          lastSignInAt: user.last_sign_in_at ?? null,
          isOwner: user.id === OWNER_ADMIN_USER_ID,
        }))
        .sort((a, b) => Number(b.isOwner) - Number(a.isOwner) || a.email.localeCompare(b.email));
      return json(req, { ok: true, action, admins });
    }

    if (action === 'delete-admin') {
      if (!canManageAdmins) throw new Error('OWNER_ONLY');
      const userId = String(body.userId ?? '');
      if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error('INVALID_ADMIN');
      if (userId === OWNER_ADMIN_USER_ID || userId === adminUser.id) throw new Error('OWNER_SELF_DELETE');
      const target = await callAuthAdmin(`users/${userId}`, 'GET');
      const targetMetadata = target.app_metadata as { role?: string } | undefined;
      if (targetMetadata?.role !== 'admin') throw new Error('ADMIN_NOT_FOUND');
      await callAuthAdmin(`users/${userId}`, 'DELETE');
      return json(req, { ok: true, action, userId });
    }

    if (action === 'change-password') {
      const password = String(body.password ?? '');
      if (password.length < 12 || password.length > 72) throw new Error('INVALID_PASSWORD');
      await callAuthAdmin(`users/${adminUser.id}`, 'PUT', { password });
      return json(req, { ok: true, action });
    }

    if (action === 'instructor-contacts') {
      const instructors = await callRpc<Array<{ instructor_id: string; email: string }>>('admin_instructor_contacts', {});
      return json(req, { ok: true, action, instructors });
    }

    if (action === 'update-instructor-email') {
      const instructorId = String(body.instructorId ?? '');
      const email = String(body.email ?? '').trim().toLowerCase();
      if (!/^[0-9a-f-]{36}$/i.test(instructorId)) throw new Error('INVALID_INSTRUCTOR');
      if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('INVALID_EMAIL');
      await callRpc<void>('admin_update_instructor_email', { p_instructor_id: instructorId, p_email: email });
      return json(req, { ok: true, action });
    }

    if (action === 'update-instructor-profile') {
      const instructorId = String(body.instructorId ?? '');
      const email = String(body.email ?? '').trim().toLowerCase();
      const name = String(body.name ?? '').trim();
      const bio = String(body.bio ?? '').trim();
      const paymentMode = String(body.paymentMode ?? '');
      const priceCzk = body.priceCzk === null || body.priceCzk === undefined ? null : Number(body.priceCzk);
      const styles = Array.isArray(body.styles) ? body.styles.map((style) => String(style).trim()).filter(Boolean) : [];
      if (!/^[0-9a-f-]{36}$/i.test(instructorId)) throw new Error('INVALID_INSTRUCTOR');
      if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('INVALID_EMAIL');
      if (!name || name.length > 120) throw new Error('INVALID_INSTRUCTOR_NAME');
      if (!bio) throw new Error('INVALID_INSTRUCTOR_BIO');
      if (!['paid', 'donation'].includes(paymentMode)) throw new Error('INVALID_PAYMENT_MODE');
      if (paymentMode === 'paid' && (!Number.isInteger(priceCzk) || priceCzk < 0 || priceCzk > 10000)) throw new Error('INVALID_INSTRUCTOR_PRICE');
      const profile = await callRpc<{ instructor_id: string; updated_at: string }>('admin_update_instructor_profile', {
        p_instructor_id: instructorId,
        p_email: email,
        p_name: name,
        p_styles: styles,
        p_bio: bio,
        p_practice_quote: String(body.practiceQuote ?? '').trim(),
        p_photo_url: String(body.photoUrl ?? '').trim() || null,
        p_payment_mode: paymentMode,
        p_price_czk: paymentMode === 'paid' ? priceCzk : null,
        p_payment_note: String(body.paymentNote ?? '').trim(),
        p_paid_qr_url: String(body.paidQrUrl ?? '').trim() || null,
        p_donation_qr_url: String(body.donationQrUrl ?? '').trim() || null,
      });
      return json(req, { ok: true, action, profile });
    }

    if (action === 'cancel-reservation') {
      const reservationId = String(body.reservationId ?? '');
      if (!/^[0-9a-f-]{36}$/i.test(reservationId)) throw new Error('INVALID_RESERVATION');
      const cancellation = await callRpc<AdminReservationCancellation>('admin_cancel_reservation', {
        p_reservation_id: reservationId,
      });
      const teacherFirstName = cancellation.teacher.trim().split(/\s+/)[0] || 'Tým';
      const cancellationCopy = cancellation.late_cancellation
        ? `<p>potvrzuji pozdní zrušení tvé rezervace na lekci <strong>${escapeHtml(cancellation.title)}</strong>.</p>
          <p>QR kód pro platbu nebo dobrovolný příspěvek ti pošlu e-mailem po skončení lekce.</p>`
        : `<p>potvrzuji zrušení tvé rezervace na lekci <strong>${escapeHtml(cancellation.title)}</strong>.</p>`;
      const emailResult = await sendBrevoEmail({
        toEmail: cancellation.attendee_email,
        toName: cancellation.attendee_name,
        subject: `${cancellation.late_cancellation ? 'Pozdní storno' : 'Rezervace zrušena'}: ${cancellation.title}`,
        signatureName: teacherFirstName,
        senderName: `${teacherFirstName} · Jóga na HALLU`,
        htmlContent: `<div style="font-family:Arial,sans-serif;color:#1f2824;line-height:1.6;max-width:560px;margin:auto">
          <p>${escapeHtml(czechSalutation(cancellation.attendee_name))},</p>
          ${cancellationCopy}
          <p>Termín: <strong>${escapeHtml(formatLessonDate(cancellation.starts_at))}</strong><br>${escapeHtml(cancellation.location)}</p>
          ${cancellation.late_cancellation ? '' : '<p>Pokud máš zájem, vyber si prosím jiný termín na webu.</p>'}
          <p>${cancellation.late_cancellation ? 'Děkuji za pochopení.' : 'Budu se těšit na příští společnou praxi.'}</p>
        </div>`,
      });
      return json(req, { ok: true, action, emailSent: emailResult.sent, lateCancellation: cancellation.late_cancellation });
    }

    if (action === 'update-settings') {
      const cancellationHours = Number(body.cancellationHours);
      const bookingGraceMinutes = Number(body.bookingGraceMinutes);
      const minimumAttendance = Number(body.minimumAttendance);
      const defaultPaidPrice = Number(body.defaultPaidPrice);
      const studioCapacity = Number(body.studioCapacity);
      if (!Number.isInteger(cancellationHours) || cancellationHours < 0 || cancellationHours > 168) throw new Error('INVALID_CANCELLATION_HOURS');
      if (!Number.isInteger(bookingGraceMinutes) || bookingGraceMinutes < 0 || bookingGraceMinutes > 60) throw new Error('INVALID_BOOKING_GRACE_MINUTES');
      if (!Number.isInteger(minimumAttendance) || minimumAttendance < 1 || minimumAttendance > 100) throw new Error('INVALID_MINIMUM_ATTENDANCE');
      if (!Number.isInteger(defaultPaidPrice) || defaultPaidPrice < 0 || defaultPaidPrice > 10000) throw new Error('INVALID_DEFAULT_PRICE');
      if (!Number.isInteger(studioCapacity) || studioCapacity < 1 || studioCapacity > 100) throw new Error('INVALID_STUDIO_CAPACITY');
      if (minimumAttendance > studioCapacity) throw new Error('INVALID_MINIMUM_ATTENDANCE');
      const settings = await callRpc<Record<string, number>>('admin_update_booking_settings', {
        p_cancellation_hours: cancellationHours,
        p_booking_grace_minutes: bookingGraceMinutes,
        p_minimum_attendance: minimumAttendance,
        p_default_paid_price: defaultPaidPrice,
        p_studio_capacity: studioCapacity,
      });
      return json(req, { ok: true, action, settings });
    }

    if (action === 'delete-lesson') {
      if (!canManageAdmins) throw new Error('OWNER_ONLY');
      const lessonId = String(body.lessonId ?? '');
      if (!/^[0-9a-f-]{36}$/i.test(lessonId)) throw new Error('INVALID_LESSON');
      const deleted = await callRpc<{ lesson_id: string; title: string; deleted_reservations: number }>('admin_delete_lesson', {
        p_lesson_id: lessonId,
      });
      return json(req, {
        ok: true,
        action,
        lessonId: deleted.lesson_id,
        title: deleted.title,
        deletedReservations: deleted.deleted_reservations,
      });
    }

    if (action === 'payment-preview') {
      const lessonId = String(body.lessonId ?? '');
      if (!/^[0-9a-f-]{36}$/i.test(lessonId)) throw new Error('INVALID_LESSON');
      const preview = await callRpc<PaymentEmailBatch>('admin_payment_email_preview', {
        p_lesson_id: lessonId,
      });
      const feedback = await callRpc<FeedbackSummary>('admin_lesson_feedback_summary', {
        p_lesson_id: lessonId,
      });
      return json(req, { ok: true, action, ...preview, feedback });
    }

    if (action === 'feedback-overview') {
      const feedback = await callRpc<Array<Record<string, unknown>>>('admin_lesson_feedback_overview', {});
      return json(req, { ok: true, action, feedback });
    }

    if (action === 'add-walk-in') {
      const lessonId = String(body.lessonId ?? '');
      const attendeeName = String(body.attendeeName ?? '').trim();
      const attendeeEmail = String(body.attendeeEmail ?? '').trim().toLowerCase();
      const attendeeRelation = String(body.attendeeRelation ?? 'employee');
      if (!/^[0-9a-f-]{36}$/i.test(lessonId)) throw new Error('INVALID_LESSON');
      if (attendeeName.length < 2 || attendeeName.length > 120) throw new Error('INVALID_ATTENDEE_NAME');
      if (attendeeEmail && (attendeeEmail.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendeeEmail))) throw new Error('INVALID_EMAIL');
      if (!['employee', 'guest'].includes(attendeeRelation)) throw new Error('INVALID_ATTENDEE_RELATION');
      const walkIn = await callRpc<Record<string, unknown>>('admin_add_walk_in', {
        p_lesson_id: lessonId,
        p_attendee_name: attendeeName,
        p_attendee_email: attendeeEmail || null,
        p_attendee_relation: attendeeRelation,
        p_cancellation_token_hash: await sha256(crypto.randomUUID()),
      });
      return json(req, { ok: true, action, ...walkIn });
    }

    if (action === 'payment-send') {
      const lessonId = String(body.lessonId ?? '');
      const feedbackRequested = body.feedbackRequested === true;
      const requestedAttendance = Array.isArray(body.attendance) ? body.attendance : [];
      if (!/^[0-9a-f-]{36}$/i.test(lessonId)) throw new Error('INVALID_LESSON');
      if (requestedAttendance.length < 1 || requestedAttendance.length > 100) throw new Error('INVALID_ATTENDANCE');

      const recipientById = new Map<string, string>();
      const outcomeById = new Map<string, string>();
      const attendance = requestedAttendance.map((entry) => {
        const reservationId = String(entry?.reservationId ?? '');
        const outcome = String(entry?.outcome ?? '');
        const email = String(entry?.email ?? '').trim().toLowerCase();
        if (!/^[0-9a-f-]{36}$/i.test(reservationId) || !['attended', 'no_show', 'waived'].includes(outcome)) throw new Error('INVALID_ATTENDANCE');
        if (email && (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error('INVALID_EMAIL');
        recipientById.set(reservationId, email);
        outcomeById.set(reservationId, outcome);
        return { reservation_id: reservationId, outcome };
      });

      const preview = await callRpc<PaymentEmailBatch>('admin_payment_email_preview', {
        p_lesson_id: lessonId,
      });
      const hasUnsentPayment = preview.participants.some((participant) => (
        !participant.payment_email_sent_at
        && outcomeById.get(participant.reservation_id) !== 'waived'
        && Boolean(recipientById.get(participant.reservation_id) || participant.email)
      ));
      if (hasUnsentPayment && !preview.instructor_email) throw new Error('INSTRUCTOR_EMAIL_MISSING');
      if (hasUnsentPayment && !preview.payment_qr_url) throw new Error('PAYMENT_QR_MISSING');

      const batch = await callRpc<PaymentEmailBatch>('admin_record_attendance', {
        p_lesson_id: lessonId,
        p_attendance: attendance,
        p_feedback_requested: feedbackRequested,
      });

      const teacherFirstName = batch.teacher.trim().split(/\s+/)[0] || 'Tým';
      const senderName = `${teacherFirstName} · Jóga na HALLU`;
      const donation = batch.payment_mode === 'donation';
      const participantsToEmail = batch.participants.filter((participant) => (
        !participant.payment_waived_at
        && !participant.payment_email_sent_at
        && Boolean(recipientById.get(participant.reservation_id) || participant.email)
      ));
      const qrUrl = batch.payment_qr_url ? publicAssetUrl(publicSiteUrl, batch.payment_qr_url) : '';
      const paymentUrl = `${publicSiteUrl}/platba?lekce=${encodeURIComponent(batch.lesson_id)}`;
      const pragueDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Prague', year: 'numeric', month: '2-digit', day: '2-digit' });
      const practiceCopy = pragueDay.format(new Date(batch.starts_at)) === pragueDay.format(new Date())
        ? 'děkuji za dnešní společnou jógovou praxi.'
        : 'děkuji za společnou jógovou praxi.';
      const results = await Promise.all(participantsToEmail.map(async (participant) => {
        const recipientEmail = recipientById.get(participant.reservation_id) || participant.email || '';
        const absent = participant.status === 'no_show';
        const paymentCopy = donation
          ? DONATION_PAYMENT_COPY
          : `Posílám ti QR kód pro platbu za lekci. Částka k úhradě je ${batch.price_czk ?? 0} Kč.`;
        const attendanceCopy = absent
          ? donation
            ? '<p>na lekci jsi měl/a rezervované místo, ale tentokrát jsme se na podložce nepotkali.</p><p>Pokud chceš i tak přispět Dobrému andělovi, příspěvek je dobrovolný.</p>'
            : `<p>na lekci jsi měl/a rezervované místo. Rezervace byla zrušena po lhůtě pro bezplatné storno, nebo zůstala nevyužitá.</p>
              <p>Bezplatné zrušení je možné nejpozději ${batch.cancellation_hours} hodin před začátkem. Při pozdějším zrušení nebo neúčasti se lekce hradí.</p>`
          : `<p>${practiceCopy}</p>`;
        const feedbackCopy = !absent && feedbackRequested && participant.feedback_token
          ? `<div style="margin:28px 0;padding:20px;background:#f5f1e9;border-left:4px solid #b87854">
              <p style="margin:0 0 14px"><strong>Jaká pro tebe lekce byla?</strong><br>Krátká anonymní zpětná vazba mi pomůže další lekce vyladit.</p>
              <p style="margin:0"><a href="${escapeHtml(`${publicSiteUrl}/?feedback=${participant.feedback_token}`)}" style="display:inline-block;padding:12px 18px;border-radius:24px;background:#3e5648;color:#fff;text-decoration:none;font-weight:700">Ohodnotit lekci</a></p>
            </div>`
          : '';
        const result = await sendBrevoEmail({
          toEmail: recipientEmail,
          toName: participant.name,
          subject: donation
            ? `${absent ? 'Dobrovolný příspěvek za rezervovanou lekci' : 'Dobrovolný příspěvek po lekci'}: ${batch.title}`
            : `${absent ? 'Platba za rezervovanou lekci' : 'Platba za lekci'}: ${batch.title}`,
          signatureName: teacherFirstName,
          senderName,
          htmlContent: `<div style="font-family:Arial,sans-serif;color:#1f2824;line-height:1.6;max-width:560px;margin:auto">
            <p>${escapeHtml(czechSalutation(participant.name))},</p>
            ${attendanceCopy}
            <p style="padding:18px 20px;background:#f5f1e9;border-left:3px solid #b87854"><strong>${escapeHtml(batch.title)}</strong><br>${escapeHtml(formatLessonDate(batch.starts_at))}<br>Lektor: ${escapeHtml(batch.teacher)}</p>
            <p>${escapeHtml(paymentCopy)}</p>
            <p style="margin:26px 0 12px"><a href="${escapeHtml(paymentUrl)}" style="display:block;padding:15px 22px;border-radius:28px;background:#3e5648;color:#fff;text-align:center;text-decoration:none;font-weight:700">${donation ? 'Přispět Dobrému andělovi' : 'Zaplatit lekci'}</a></p>
            <p style="font-size:14px;color:#66706b">Na mobilu můžeš QR sdílet do podporované bankovní aplikace nebo si ho uložit.</p>
            <p style="text-align:center;margin:28px 0"><a href="${qrUrl}"><img src="${qrUrl}" width="280" alt="${donation ? 'QR kód pro dobrovolný příspěvek' : `QR kód pro platbu ${batch.price_czk ?? 0} Kč – ${escapeHtml(batch.teacher)}`}" style="max-width:100%;height:auto;border:0"></a></p>
            <p style="font-size:13px;color:#66706b">Pokud se obrázek v e-mailu nezobrazí, <a href="${qrUrl}">otevři QR kód v prohlížeči</a>.</p>
            <p style="font-size:14px;color:#66706b">Platíš z počítače? QR kód načti telefonem.<br>Pokud jsi už ${donation ? 'přispěl/a' : 'zaplatil/a'}, nemusíš nic dalšího dělat.</p>
            ${feedbackCopy}
            <p>${absent ? donation ? 'Budu se těšit na některé z dalších lekcí.' : 'Děkuji za pochopení.' : 'Děkuji a těším se příště.'}</p>
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
      const skipped = batch.participants.length - results.length;
      const summaryRows = participantsToEmail.map((participant) => {
        const result = results.find((item) => item.reservationId === participant.reservation_id);
        const recipientEmail = recipientById.get(participant.reservation_id) || participant.email || '';
        return `<tr><td style="padding:7px 10px;border-bottom:1px solid #ddd">${escapeHtml(participant.name)}</td><td style="padding:7px 10px;border-bottom:1px solid #ddd">${escapeHtml(recipientEmail)}</td><td style="padding:7px 10px;border-bottom:1px solid #ddd">${result?.sent ? 'Odesláno' : 'Neodesláno'}</td></tr>`;
      }).join('');
      const summaryResult = participantsToEmail.length ? await sendBrevoEmail({
        toEmail: batch.instructor_email || '',
        toName: batch.teacher,
        subject: `Souhrn platebních e-mailů: ${batch.title}`,
        senderName,
        htmlContent: `<div style="font-family:Arial,sans-serif;color:#1f2824;line-height:1.6;max-width:640px;margin:auto">
          <p>${escapeHtml(czechSalutation(teacherFirstName))},</p>
          <p>rozesílání platebních e-mailů k lekci <strong>${escapeHtml(batch.title)}</strong> (${escapeHtml(formatLessonDate(batch.starts_at))}) bylo dokončeno.</p>
          <p><strong>Odesláno:</strong> ${sent}<br><strong>Neúspěšné:</strong> ${failed}<br><strong>Přeskočeno:</strong> ${skipped}</p>
          <table style="width:100%;border-collapse:collapse"><thead><tr><th style="padding:7px 10px;text-align:left;border-bottom:2px solid #3e5648">Účastník</th><th style="padding:7px 10px;text-align:left;border-bottom:2px solid #3e5648">E-mail</th><th style="padding:7px 10px;text-align:left;border-bottom:2px solid #3e5648">Stav</th></tr></thead><tbody>${summaryRows}</tbody></table>
        </div>`,
      }) : { sent: true };
      return json(req, { ok: true, action, sent, failed, skipped, summarySent: summaryResult.sent, attendanceSaved: true, results });
    }

    if (action === 'create') {
      const instructorId = String(body.instructorId ?? '');
      const title = String(body.title ?? '').trim();
      const language = String(body.language ?? 'cs');
      const startsAt = String(body.startsAt ?? '');
      const endsAt = String(body.endsAt ?? '');
      const capacity = Number(body.capacity);
      const repeatCount = Number(body.repeatCount);
      const paymentMode = String(body.paymentMode ?? '');
      const priceCzk = paymentMode === 'paid' ? Number(body.priceCzk) : null;
      const minimumAttendance = Number(body.minimumAttendance);
      if (!/^[0-9a-f-]{36}$/i.test(instructorId)) throw new Error('INVALID_INSTRUCTOR');
      if (title.length < 2 || title.length > 120) throw new Error('INVALID_TITLE');
      if (!['cs', 'en'].includes(language)) throw new Error('INVALID_LANGUAGE');
      if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) throw new Error('INVALID_CAPACITY');
      if (!Number.isInteger(repeatCount) || repeatCount < 1 || repeatCount > 52) throw new Error('INVALID_REPEAT_COUNT');
      if (!['paid', 'donation'].includes(paymentMode)) throw new Error('INVALID_PAYMENT_MODE');
      if (paymentMode === 'paid' && (!Number.isInteger(priceCzk) || priceCzk < 0 || priceCzk > 10000)) throw new Error('INVALID_PRICE');
      if (!Number.isInteger(minimumAttendance) || minimumAttendance < 1 || minimumAttendance > capacity) throw new Error('INVALID_MINIMUM_ATTENDANCE');
      if (!Number.isFinite(Date.parse(startsAt)) || !Number.isFinite(Date.parse(endsAt)) || Date.parse(endsAt) <= Date.parse(startsAt)) throw new Error('INVALID_TIME');
      const instructorPayment = await getInstructorPayment(instructorId);
      const paymentNote = instructorPayment.payment_mode === paymentMode && instructorPayment.payment_note
        ? instructorPayment.payment_note
        : paymentMode === 'paid'
          ? `Platba ${priceCzk} Kč. QR kód bude odeslán po skončení lekce.`
          : DONATION_BOOKING_COPY;

      const created = await callRpc<{ created: number; lesson_ids: string[] }>('admin_create_lessons', {
        p_title: title,
        p_instructor_id: instructorId,
        p_starts_at: startsAt,
        p_ends_at: endsAt,
        p_capacity: capacity,
        p_language: language,
        p_repeat_count: repeatCount,
        p_payment_mode: paymentMode,
        p_price_czk: priceCzk,
        p_payment_note: paymentNote,
        p_minimum_attendance: minimumAttendance,
      });
      return json(req, { ok: true, action, created: created.created, lessonIds: created.lesson_ids });
    }

    const lessonId = String(body.lessonId ?? '');
    if (!/^[0-9a-f-]{36}$/i.test(lessonId)) throw new Error('INVALID_LESSON');
    if (action === 'confirm-low-attendance') {
      const confirmation = await callRpc<{ booked_count: number; minimum_attendance: number }>('admin_confirm_low_attendance', {
        p_lesson_id: lessonId,
      });
      return json(req, { ok: true, action, ...confirmation });
    }
    let change: LessonChange;
    if (action === 'update') {
      const instructorId = String(body.instructorId ?? '');
      const title = String(body.title ?? '').trim();
      const language = String(body.language ?? 'cs');
      const startsAt = String(body.startsAt ?? '');
      const endsAt = String(body.endsAt ?? '');
      const capacity = Number(body.capacity);
      const paymentMode = String(body.paymentMode ?? '');
      const priceCzk = paymentMode === 'paid' ? Number(body.priceCzk) : null;
      const minimumAttendance = Number(body.minimumAttendance);
      if (!/^[0-9a-f-]{36}$/i.test(instructorId)) throw new Error('INVALID_INSTRUCTOR');
      if (title.length < 2 || title.length > 120) throw new Error('INVALID_TITLE');
      if (!['cs', 'en'].includes(language)) throw new Error('INVALID_LANGUAGE');
      if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) throw new Error('INVALID_CAPACITY');
      if (!['paid', 'donation'].includes(paymentMode)) throw new Error('INVALID_PAYMENT_MODE');
      if (paymentMode === 'paid' && (!Number.isInteger(priceCzk) || priceCzk < 0 || priceCzk > 10000)) throw new Error('INVALID_PRICE');
      if (!Number.isInteger(minimumAttendance) || minimumAttendance < 1 || minimumAttendance > capacity) throw new Error('INVALID_MINIMUM_ATTENDANCE');
      if (!Number.isFinite(Date.parse(startsAt)) || !Number.isFinite(Date.parse(endsAt)) || Date.parse(endsAt) <= Date.parse(startsAt)) throw new Error('INVALID_TIME');
      const instructorPayment = await getInstructorPayment(instructorId);
      const paymentNote = instructorPayment.payment_mode === paymentMode && instructorPayment.payment_note
        ? instructorPayment.payment_note
        : paymentMode === 'paid'
          ? `Platba ${priceCzk} Kč. QR kód bude odeslán po skončení lekce.`
          : DONATION_BOOKING_COPY;
      change = await callRpc<LessonChange>('admin_update_lesson', {
        p_lesson_id: lessonId,
        p_title: title,
        p_instructor_id: instructorId,
        p_starts_at: startsAt,
        p_ends_at: endsAt,
        p_capacity: capacity,
        p_language: language,
        p_payment_mode: paymentMode,
        p_price_czk: priceCzk,
        p_payment_note: paymentNote,
        p_minimum_attendance: minimumAttendance,
      });
    } else {
      if (!['reschedule', 'cancel'].includes(action)) throw new Error('INVALID_ACTION');
      change = await callRpc<LessonChange>('admin_change_lesson', {
        p_lesson_id: lessonId,
        p_action: action,
        p_starts_at: action === 'reschedule' ? body.startsAt : null,
        p_ends_at: action === 'reschedule' ? body.endsAt : null,
      });
    }

    const teacherFirstName = change.teacher.trim().split(/\s+/)[0] || 'Tým';
    const results = await Promise.all(change.participants.map((participant) => {
      const rescheduled = change.action === 'reschedule';
      const updated = change.action === 'update';
      const paymentLabel = (mode?: 'paid' | 'donation', price?: number | null) => mode === 'donation' ? 'dobrovolný příspěvek' : `${price ?? 0} Kč`;
      const details = updated
        ? `<p><strong>Původně:</strong> ${escapeHtml(change.old_title || change.title)} · ${escapeHtml(change.old_teacher || change.teacher)}<br>
          ${escapeHtml(formatLessonDate(change.old_starts_at))} · ${escapeHtml(change.old_language === 'en' ? 'anglicky' : 'česky')} · ${escapeHtml(paymentLabel(change.old_payment_mode, change.old_price_czk))}</p>
          <p><strong>Nově:</strong> ${escapeHtml(change.title)} · ${escapeHtml(change.teacher)}<br>
          ${escapeHtml(formatLessonDate(change.new_starts_at))} · ${escapeHtml(change.new_language === 'en' ? 'anglicky' : 'česky')} · ${escapeHtml(paymentLabel(change.new_payment_mode, change.new_price_czk))}</p>`
        : rescheduled
        ? `<p>Původní termín: <s>${escapeHtml(formatLessonDate(change.old_starts_at))}</s><br>
          Nový termín: <strong>${escapeHtml(formatLessonDate(change.new_starts_at))}</strong></p>`
        : `<p>Termín: <strong>${escapeHtml(formatLessonDate(change.old_starts_at))}</strong></p>`;
      const changeCopy = updated || rescheduled
        ? `posílám ti ${updated ? 'aktualizované údaje k lekci' : 'nový termín lekce'} <strong>${escapeHtml(change.title)}</strong>, na kterou máš rezervaci.`
        : `lekce <strong>${escapeHtml(change.title)}</strong> se bohužel nekoná.`;
      return sendBrevoEmail({
        toEmail: participant.email,
        toName: participant.name,
        subject: `${updated ? 'Změna lekce' : rescheduled ? 'Změna času lekce' : 'Lekce zrušena'}: ${change.title}`,
        signatureName: teacherFirstName,
        senderName: `${teacherFirstName} · Jóga na HALLU`,
        htmlContent: `<p>${escapeHtml(czechSalutation(participant.name))},</p>
          <p>${changeCopy}</p>
          ${details}
          ${updated ? '<p>QR kód pro platbu nebo dobrovolný příspěvek ti pošlu e-mailem po skončení lekce.</p>' : ''}
          <p>${escapeHtml(change.location)}</p>
          <p>${updated || rescheduled ? 'Těším se na společnou praxi.' : 'Omlouvám se za komplikace a budu se těšit na některé z dalších lekcí.'}</p>`,
      });
    }));

    const notified = results.filter((result) => result.sent).length;
    const failed = results.length - notified;
    return json(req, { ok: true, action: change.action, notified, failed });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    const status = code === 'UNAUTHORIZED' ? 401 : code === 'FORBIDDEN' || code === 'OWNER_ONLY' ? 403 : code.includes('LESSON_CONFLICT') || code.includes('STUDIO_CONFLICT') || code.includes('LESSON_NOT_ENDED') || code.includes('LESSON_CAPACITY_TOO_SMALL') || code.includes('CANCELLATION_NOT_ALLOWED') || code.includes('PAYMENT_ALREADY_SENT') || code === 'WALK_IN_EXISTS' ? 409 : code.includes('INVALID_') || code.includes('NO_ELIGIBLE_') || code.includes('PAYMENT_QR_MISSING') || code.includes('INSTRUCTOR_EMAIL_MISSING') || code.includes('LESSON_UNCHANGED') || code === 'OWNER_SELF_DELETE' ? 400 : code.includes('RESERVATION_NOT_FOUND') || code === 'ADMIN_NOT_FOUND' || code === 'LESSON_NOT_FOUND' ? 404 : 500;
    console.error('manage-lesson failed', code);
    const emailErrors: Record<string, [number, string]> = {
      EMAIL_CONTENT_UNAVAILABLE: [404, 'Původní obsah e-mailu už není u poskytovatele dostupný. Nejde o náhled dnešní šablony.'],
      EMAIL_HISTORY_UNAVAILABLE: [502, 'Archiv odeslaných e-mailů se nepodařilo načíst. Zkus to později.'],
      EMAIL_NOT_SENT: [409, 'K této rezervaci není evidovaný odeslaný platební e-mail.'],
      EMAIL_RESEND_NOT_ALLOWED: [409, 'Tento e-mail nelze znovu odeslat: zkontroluj stav lekce a případné prominutí platby.'],
      EMAIL_RESEND_THROTTLED: [429, 'Opětovné odeslání už bylo spuštěno. Před dalším pokusem počkej alespoň dvě minuty.'],
      EMAIL_RESEND_CONFIRM_REQUIRED: [400, 'Opětovné odeslání je potřeba nejprve potvrdit.'],
      EMAIL_RESEND_UNCERTAIN: [502, 'Poskytovatel nepotvrdil výsledek. E-mail mohl být odeslán; před dalším pokusem ověř doručení.'],
      EMAIL_RESEND_FAILED: [502, 'Poskytovatel opětovné odeslání odmítl. E-mail nebyl znovu odeslán.'],
    };
    if (emailErrors[code]) return json(req, { error: code, message: emailErrors[code][1] }, emailErrors[code][0]);
    const message = code === 'FORBIDDEN'
      ? 'Tento účet nemá oprávnění správce.'
      : code === 'INVALID_CAPACITY_OVER_STUDIO_LIMIT'
        ? 'Kapacita lekce nemůže překročit kapacitu studia nastavenou ve správě.'
      : requestedAction === 'add-walk-in'
        ? code === 'WALK_IN_EXISTS' ? 'Tento člověk už je u lekce evidovaný.' : code.includes('LESSON_NOT_ENDED') ? 'Účast bez rezervace lze přidat až po skončení lekce.' : 'Účast bez rezervace se nepodařilo přidat.'
      : status === 409
        ? code.includes('CANCELLATION_NOT_ALLOWED')
          ? 'Rezervaci už nelze zrušit nebo už byla zrušená.'
        : code.includes('PAYMENT_ALREADY_SENT')
          ? 'Platbu už nelze prominout, protože platební e-mail byl odeslán.'
        : code.includes('LESSON_NOT_ENDED')
          ? 'Platební e-maily lze odeslat až po skončení lekce.'
          : code.includes('LESSON_CAPACITY_TOO_SMALL')
            ? 'Kapacita nemůže být nižší než počet potvrzených rezervací.'
          : code.includes('STUDIO_CONFLICT')
            ? 'Studio je v tomto čase už obsazené, včetně 15minutové rezervy.'
            : 'Ve zvoleném termínu už má tento lektor naplánovanou lekci.'
        : code === 'ADMIN_EXISTS'
          ? 'Účet s tímto e-mailem už existuje.'
        : code === 'OWNER_ONLY'
          ? 'Administrátory může spravovat pouze Petr.'
        : code === 'OWNER_SELF_DELETE'
          ? 'Vlastní účet správce nelze smazat.'
        : code === 'ADMIN_NOT_FOUND'
          ? 'Administrátor nebyl nalezen.'
        : requestedAction === 'create-admin'
          ? 'Administrátora se nepodařilo vytvořit.'
        : requestedAction === 'list-admins'
          ? 'Seznam administrátorů se nepodařilo načíst.'
        : requestedAction === 'delete-admin'
          ? 'Administrátora se nepodařilo smazat.'
        : requestedAction === 'delete-lesson'
          ? code === 'LESSON_NOT_FOUND' ? 'Lekce už neexistuje.' : 'Lekci se nepodařilo trvale smazat.'
        : requestedAction === 'change-password'
          ? 'Heslo se nepodařilo změnit.'
        : requestedAction.startsWith('payment-')
          ? code.includes('PAYMENT_QR_MISSING') ? 'V profilu lektora chybí QR kód pro tento typ platby.' : code.includes('INSTRUCTOR_EMAIL_MISSING') ? 'V profilu lektora chybí e-mail pro souhrn.' : code.includes('INVALID_ATTENDANCE') ? 'Docházka není úplná. Obnov stránku a zkus ji potvrdit znovu.' : 'Docházku nebo platební e-maily se nepodařilo uložit.'
        : requestedAction === 'cancel-reservation'
          ? code.includes('CANCELLATION_NOT_ALLOWED') ? 'Rezervaci už nelze zrušit nebo už byla zrušená.' : 'Rezervaci účastníka se nepodařilo zrušit.'
        : requestedAction === 'update-instructor-profile'
          ? 'Profil lektora se nepodařilo uložit.'
        : requestedAction === 'update-instructor-email' || requestedAction === 'instructor-contacts'
          ? 'E-mail lektora se nepodařilo načíst nebo uložit.'
        : requestedAction === 'update-settings'
          ? 'Nastavení se nepodařilo uložit.'
        : requestedAction === 'feedback-overview'
          ? 'Zpětnou vazbu se nepodařilo načíst.'
        : requestedAction === 'create'
          ? 'Nové lekce se nepodařilo vytvořit.'
          : requestedAction === 'confirm-low-attendance'
            ? 'Potvrzení konání lekce se nepodařilo uložit.'
          : 'Změnu lekce se nepodařilo uložit.';
    return json(req, { error: code, message }, status);
  }
});
