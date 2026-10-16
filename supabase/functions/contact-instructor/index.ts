import {
  callRpc,
  corsHeaders,
  czechSalutation,
  escapeHtml,
  isAllowedOrigin,
  json,
  sendBrevoEmail,
  supabaseConfig,
} from '../_shared/http.ts';

type InstructorContact = {
  name: string;
  email: string;
};

type InstructorEmail = {
  instructor_id: string;
  email: string;
};

const allowedInstructors = new Set(['Daniela Šťastná', 'Petr Bena']);

async function getInstructorContact(name: string): Promise<InstructorContact> {
  const { url, secretKey } = supabaseConfig();
  const query = new URLSearchParams({ select: 'id,name', name: `eq.${name}`, active: 'eq.true', limit: '1' });
  const response = await fetch(`${url}/rest/v1/instructors?${query}`, { headers: { apikey: secretKey } });
  const rows = await response.json();
  if (!response.ok || !rows[0]?.id) throw new Error('INSTRUCTOR_NOT_AVAILABLE');
  const contacts = await callRpc<InstructorEmail[]>('admin_instructor_contacts', {});
  const contact = contacts.find((item) => item.instructor_id === rows[0].id);
  if (!contact?.email) throw new Error('INSTRUCTOR_NOT_AVAILABLE');
  return { name: rows[0].name, email: contact.email };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, { error: 'METHOD_NOT_ALLOWED' }, 405);
  if (!isAllowedOrigin(req)) return json(req, { error: 'ORIGIN_NOT_ALLOWED' }, 403);

  try {
    const body = await req.json();
    const instructorName = String(body.instructorName ?? '').trim();
    const name = String(body.name ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const phone = String(body.phone ?? '').trim();
    const message = String(body.message ?? '').trim();
    const website = String(body.website ?? '').trim();
    const openedAt = Number(body.openedAt);
    const elapsed = Date.now() - openedAt;

    if (!allowedInstructors.has(instructorName)) throw new Error('INVALID_INSTRUCTOR');
    if (name.length < 2 || name.length > 120) throw new Error('INVALID_NAME');
    if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('INVALID_EMAIL');
    if (phone.length > 40 || (phone && !/^[+\d][\d\s().-]{5,39}$/.test(phone))) throw new Error('INVALID_PHONE');
    if (message.length < 10 || message.length > 2000) throw new Error('INVALID_MESSAGE');
    if (body.consent !== true) throw new Error('CONSENT_REQUIRED');
    if (website || !Number.isFinite(openedAt) || elapsed < 1500 || elapsed > 7_200_000) throw new Error('SPAM_REJECTED');

    const instructor = await getInstructorContact(instructorName);
    const emailResult = await sendBrevoEmail({
      toEmail: instructor.email,
      toName: instructor.name,
      subject: `Poptávka soukromé lekce: ${name}`,
      htmlContent: `<div style="font-family:Arial,sans-serif;color:#1f2824;line-height:1.6;max-width:600px;margin:auto">
        <p>${escapeHtml(czechSalutation(instructor.name))},</p>
        <p>přišla ti nová poptávka soukromé lekce z webu Jóga na HALLU.</p>
        <p><strong>Jméno:</strong> ${escapeHtml(name)}<br>
        <strong>E-mail:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>${phone ? `<br><strong>Telefon:</strong> ${escapeHtml(phone)}` : ''}</p>
        <p><strong>Zpráva:</strong><br>${escapeHtml(message).replaceAll('\n', '<br>')}</p>
        <p>Odpověz prosím zájemci přímo na uvedený e-mail.</p>
      </div>`,
    });
    if (!emailResult.sent) throw new Error('EMAIL_NOT_SENT');

    return json(req, { ok: true }, 201);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    console.error('contact-instructor failed', code);
    const status = code.startsWith('INVALID_') || code === 'CONSENT_REQUIRED' ? 400 : code === 'SPAM_REJECTED' ? 429 : code === 'INSTRUCTOR_NOT_AVAILABLE' ? 404 : 500;
    const message = code === 'INVALID_NAME'
      ? 'Zkontroluj prosím jméno.'
      : code === 'INVALID_EMAIL'
        ? 'Zkontroluj prosím e-mail.'
        : code === 'INVALID_PHONE'
          ? 'Zkontroluj prosím telefonní číslo.'
          : code === 'INVALID_MESSAGE'
            ? 'Napiš prosím alespoň krátkou zprávu.'
            : code === 'CONSENT_REQUIRED'
              ? 'Pro odeslání je potřeba souhlas se zpracováním údajů.'
              : code === 'SPAM_REJECTED'
                ? 'Formulář se nepodařilo ověřit. Obnov stránku a zkus to znovu.'
                : code === 'INSTRUCTOR_NOT_AVAILABLE'
                  ? 'Kontakt na vybraného lektora není momentálně dostupný.'
                  : 'Poptávku se nepodařilo odeslat. Zkus to prosím znovu.';
    return json(req, { error: code, message }, status);
  }
});
