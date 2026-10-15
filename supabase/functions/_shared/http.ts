const allowedOrigins = new Set([
  'http://127.0.0.1:4173',
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
    'Access-Control-Allow-Headers': 'apikey, content-type',
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
  const body = await response.json();
  if (!response.ok) throw new Error(body?.message || 'DATABASE_ERROR');
  return body as T;
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
}): Promise<{ sent: boolean; messageId?: string; error?: string }> {
  const apiKey = Deno.env.get('BREVO_API_KEY');
  const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL');
  if (!apiKey || !senderEmail) return { sent: false, error: 'BREVO_NOT_CONFIGURED' };

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'accept': 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'Jóga na HALLU', email: senderEmail },
      to: [{ email: message.toEmail, name: message.toName }],
      subject: message.subject,
      htmlContent: message.htmlContent,
      tags: ['joga-na-hallu'],
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) return { sent: false, error: body?.message || `BREVO_${response.status}` };
  return { sent: true, messageId: body.messageId };
}
