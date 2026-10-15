import {
  callRpc,
  corsHeaders,
  czechSalutation,
  escapeHtml,
  formatLessonDate,
  isAllowedOrigin,
  json,
  sendBrevoEmail,
  sha256,
} from '../_shared/http.ts';

type Cancellation = {
  already_cancelled: boolean;
  attendee_name: string;
  attendee_email: string;
  title: string;
  starts_at: string;
};

const errors: Record<string, [number, string]> = {
  RESERVATION_NOT_FOUND: [404, 'Rezervaci se nepodařilo najít.'],
  CANCELLATION_NOT_ALLOWED: [409, 'Tuto rezervaci už není možné zrušit.'],
  CANCELLATION_DEADLINE_PASSED: [409, 'Lhůta pro bezplatné zrušení této rezervace už uplynula.'],
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, { error: 'METHOD_NOT_ALLOWED' }, 405);
  if (!isAllowedOrigin(req)) return json(req, { error: 'ORIGIN_NOT_ALLOWED' }, 403);

  try {
    const body = await req.json();
    const siteUrl = (Deno.env.get('PUBLIC_SITE_URL') || 'https://joga-na-hallu.pages.dev').replace(/\/$/, '');
    const token = String(body.token ?? '');
    if (token.length < 40 || token.length > 80) return json(req, { error: 'INVALID_TOKEN', message: 'Odkaz pro zrušení není platný.' }, 400);

    const cancellation = await callRpc<Cancellation>('cancel_reservation', {
      p_cancellation_token_hash: await sha256(token),
    });

    if (!cancellation.already_cancelled) {
      await sendBrevoEmail({
        toEmail: cancellation.attendee_email,
        toName: cancellation.attendee_name,
        subject: `Rezervace zrušena: ${cancellation.title}`,
        htmlContent: `<p>${escapeHtml(czechSalutation(cancellation.attendee_name))},</p>
          <p>rezervace na lekci <strong>${escapeHtml(cancellation.title)}</strong> (${escapeHtml(formatLessonDate(cancellation.starts_at))}) byla zrušena.</p>
          <p>Budeme rádi, když si vybereš jiný termín.</p>
          <p>Tým · Jóga na HALLU<br><a href="${escapeHtml(siteUrl)}">Web Jóga na HALLU</a></p>`,
      });
    }

    return json(req, { ok: true, alreadyCancelled: cancellation.already_cancelled });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    const mapped = errors[code];
    console.error('cancel-reservation failed', code);
    return json(req, { error: code, message: mapped?.[1] ?? 'Rezervaci se nepodařilo zrušit. Zkus to prosím znovu.' }, mapped?.[0] ?? 500);
  }
});
