const SUPABASE_URL = 'https://zltcizbzckyazlxilzwq.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_X1KLjQkjhSe3Sl-McSQNBA_hz9d5HKR';
const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function lessonMetadata(lesson) {
  if (!lesson) return {
    title: 'Lekce nenalezena · Jóga na HALLU',
    description: 'Tuto lekci se nepodařilo najít. Vyber si jiný termín na webu Jóga na HALLU.',
  };
  const startsAt = new Date(lesson.starts_at);
  const date = new Intl.DateTimeFormat('cs-CZ', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Prague',
  }).format(startsAt);
  const language = lesson.language === 'en' ? ' · v angličtině' : '';
  const payment = lesson.payment_mode === 'donation'
    ? ' · dobrovolný příspěvek'
    : ` · ${Number(lesson.price_czk || 0)} Kč`;
  const status = lesson.status === 'cancelled' ? ' · zrušeno' : '';
  return {
    title: `${lesson.title} · Jóga na HALLU`,
    description: `${date} · ${lesson.teacher}${language}${payment}${status}. Rezervace a podrobnosti na webu Jóga na HALLU.`,
  };
}

async function loadLesson(id) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/public_lesson_share`, {
    method: 'POST',
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_lesson_id: id }),
  });
  if (!response.ok) return null;
  return response.json();
}

function addMetadata(html, metadata, canonicalUrl) {
  const imageUrl = `${new URL(canonicalUrl).origin}/assets/joga-na-hallu-logo.png`;
  const tags = `
  <base href="/" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="cs_CZ" />
  <meta property="og:site_name" content="Jóga na HALLU" />
  <meta property="og:title" content="${escapeHtml(metadata.title)}" />
  <meta property="og:description" content="${escapeHtml(metadata.description)}" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:image" content="${escapeHtml(imageUrl)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(metadata.title)}" />
  <meta name="twitter:description" content="${escapeHtml(metadata.description)}" />
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`;
  return html
    .replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(metadata.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/i, `<meta name="description" content="${escapeHtml(metadata.description)}" />`)
    .replace(/<head>/i, `<head>${tags}`);
}

export async function onRequest(context) {
  const requestUrl = new URL(context.request.url);
  const lessonId = String(context.params.lesson || '').match(UUID_PATTERN)?.[0] || '';
  const lesson = lessonId ? await loadLesson(lessonId).catch(() => null) : null;
  const assetResponse = await context.env.ASSETS.fetch(new URL('/', requestUrl));
  const html = await assetResponse.text();
  const canonicalUrl = `${requestUrl.origin}${requestUrl.pathname}`;
  const body = addMetadata(html, lessonMetadata(lesson), canonicalUrl);
  return new Response(context.request.method === 'HEAD' ? null : body, {
    status: lesson ? 200 : 404,
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'Cache-Control': 'public, max-age=60, s-maxage=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
