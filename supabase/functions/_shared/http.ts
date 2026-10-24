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

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  return {
    'Access-Control-Allow-Origin': origin && allowedOrigins.has(origin) ? origin : '',
    'Access-Control-Allow-Headers': 'apikey, authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

export function isAllowedOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  return !origin || allowedOrigins.has(origin);
}

export function json(req: Request, body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: corsHeaders(req) });
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export function supabaseConfig(): { url: string; secretKey: string } {
  const url = Deno.env.get('SUPABASE_URL');
  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS');
  const legacyKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const secretKey = secretKeys ? JSON.parse(secretKeys).default : legacyKey;
  if (!url || !secretKey) throw new Error('SUPABASE_SERVER_CONFIGURATION_MISSING');
  return { url, secretKey };
}

export async function callRpc<T>(name: string, payload: Record<string, unknown>): Promise<T> {
  const { url, secretKey } = supabaseConfig();
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: secretKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const responseText = await response.text();
  const body = responseText ? JSON.parse(responseText) : null;
  if (!response.ok) throw new Error(body?.message || 'DATABASE_ERROR');
  return body as T;
}

export type AuthenticatedUser = {
  id: string;
  email: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
};

export async function authenticatedUser(req: Request): Promise<AuthenticatedUser | null> {
  const authorization = req.headers.get('authorization');
  if (!authorization?.toLowerCase().startsWith('bearer ')) return null;
  const { url, secretKey } = supabaseConfig();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: secretKey, authorization },
  });
  if (!response.ok) return null;
  const user = await response.json();
  return user?.id && user?.email ? user as AuthenticatedUser : null;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

const CZECH_VOCATIVES: Record<string, string> = {
  adam: 'Adame', ales: 'Aleši', 'aleš': 'Aleši', aneta: 'Aneto', anna: 'Anno', barbora: 'Barboro',
  daniela: 'Danielo', david: 'Davide', dominik: 'Dominiku', dominika: 'Dominiko', eliska: 'Eliško', 'eliška': 'Eliško',
  eva: 'Evo', filip: 'Filipe', frantisek: 'Františku', 'františek': 'Františku', hana: 'Hano', jakub: 'Jakube',
  jan: 'Jane', jana: 'Jano', jaroslav: 'Jaroslave', jiri: 'Jiří', 'jiří': 'Jiří', jitka: 'Jitko', josef: 'Josefe',
  karel: 'Karle', karolina: 'Karolíno', 'karolína': 'Karolíno', katerina: 'Kateřino', 'kateřina': 'Kateřino',
  klara: 'Kláro', 'klára': 'Kláro', kristyna: 'Kristýno', 'kristýna': 'Kristýno', lenka: 'Lenko', lucie: 'Lucie',
  lukas: 'Lukáši', 'lukáš': 'Lukáši', magdalena: 'Magdaléno', 'magdaléna': 'Magdaléno', marek: 'Marku', marie: 'Marie',
  martin: 'Martine', martina: 'Martino', matej: 'Matěji', 'matěj': 'Matěji', michal: 'Michale', michaela: 'Michaelo',
  milan: 'Milane', monika: 'Moniko', nikola: 'Nikolo', ondrej: 'Ondřeji', 'ondřej': 'Ondřeji', patrik: 'Patriku',
  pavel: 'Pavle', petr: 'Petře', petra: 'Petro', radek: 'Radku', richard: 'Richarde', roman: 'Romane',
  simona: 'Simono', sona: 'Soňo', 'soňa': 'Soňo', sarka: 'Šárko', 'šárka': 'Šárko', tereza: 'Terezo',
  tomas: 'Tomáši', 'tomáš': 'Tomáši', vaclav: 'Václave', 'václav': 'Václave', veronika: 'Veroniko',
  vojta: 'Vojto', vojtech: 'Vojtěchu', 'vojtěch': 'Vojtěchu', zdenek: 'Zdeňku', 'zdeněk': 'Zdeňku',
  zuzana: 'Zuzano',
};

export function czechSalutation(fullName: unknown): string {
  const nameParts = String(fullName ?? '').trim().split(/\s+/).map((part) => part.replace(/[,.]+$/g, '')).filter(Boolean);
  const matchedName = nameParts.find((part) => CZECH_VOCATIVES[part.toLocaleLowerCase('cs-CZ')]);
  const vocative = matchedName ? CZECH_VOCATIVES[matchedName.toLocaleLowerCase('cs-CZ')] : undefined;
  return vocative ? `Ahoj ${vocative}` : 'Dobrý den';
}

export function formatLessonDate(value: string): string {
  return new Intl.DateTimeFormat('cs-CZ', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Europe/Prague',
  }).format(new Date(value));
}

export async function sendBrevoEmail(message: {
  toEmail: string;
  toName: string;
  subject: string;
  htmlContent: string;
  signatureName?: string;
  senderName?: string;
}): Promise<{ sent: boolean; messageId?: string; error?: string }> {
  const apiKey = Deno.env.get('BREVO_API_KEY');
  const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL');
  if (!apiKey || !senderEmail) return { sent: false, error: 'BREVO_NOT_CONFIGURED' };

  const siteUrl = (Deno.env.get('PUBLIC_SITE_URL') || 'https://joga-na-hallu.pages.dev').replace(/\/$/, '');
  const signatureName = String(message.signatureName ?? '').trim();
  const signature = signatureName ? `<span style="display:block">${escapeHtml(signatureName)}</span>` : '';
  const senderName = String(message.senderName ?? '').trim() || 'Jóga na HALLU';
  const brandedContent = `<!doctype html>
    <html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#f5f1e9;color:#1f2824;font-family:Arial,sans-serif">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f1e9;padding:28px 12px">
        <tr><td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;border-collapse:collapse">
            <tr><td style="padding:22px 28px;background:#3e5648;color:#fff">
              <table role="presentation" cellspacing="0" cellpadding="0"><tr>
                <td width="96" height="106" align="center" bgcolor="#ffffff" style="width:96px;height:106px;background:#ffffff;border-radius:4px"><a href="${escapeHtml(siteUrl)}" style="display:block"><img src="${escapeHtml(siteUrl)}/assets/joga-na-hallu-logo.png" alt="Jóga na HALLU" width="82" height="92" style="display:block;width:82px;height:92px;margin:0 auto;border:0"></a></td>
                <td width="18" style="width:18px"></td>
                <td><a href="${escapeHtml(siteUrl)}" style="color:#fff;text-decoration:none;font-family:Georgia,serif;font-size:25px">Jóga na HALLU</a></td>
              </tr></table>
            </td></tr>
            <tr><td style="padding:34px 32px;background:#fff;border-left:1px solid rgba(31,40,36,.12);border-right:1px solid rgba(31,40,36,.12);font-size:16px;line-height:1.65">
              ${message.htmlContent}
              <p data-email-signature style="margin:30px 0 0;color:#1f2824">${signature}<a href="${escapeHtml(siteUrl)}" style="color:#3e5648;font-weight:700">Jóga na HALLU</a></p>
            </td></tr>
            <tr><td style="padding:18px 28px;background:#ebe3d6;border-top:3px solid #b87854;color:#66706b;font-size:12px;line-height:1.5">
              Jóga na HALLU · 3. patro · Pro zaměstnance Alzy a jejich hosty
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body></html>`;

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'accept': 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: senderName.slice(0, 120), email: senderEmail },
      to: [{ email: message.toEmail, name: message.toName }],
      subject: message.subject,
      htmlContent: brandedContent,
      tags: ['joga-na-hallu'],
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) return { sent: false, error: body?.message || `BREVO_${response.status}` };
  return { sent: true, messageId: body.messageId };
}
