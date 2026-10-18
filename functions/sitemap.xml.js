const SUPABASE_URL = 'https://zltcizbzckyazlxilzwq.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_X1KLjQkjhSe3Sl-McSQNBA_hz9d5HKR';

function escapeXml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function lessonShareSlug(lesson) {
  const title = String(lesson.title || 'lekce')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return `${title || 'lekce'}-${String(lesson.starts_at || '').slice(0, 10)}-${lesson.id}`;
}

async function loadPublishedLessons() {
  const query = new URLSearchParams({
    select: 'id,title,starts_at,updated_at',
    status: 'eq.published',
    starts_at: `gte.${new Date().toISOString()}`,
    order: 'starts_at.asc',
  });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/lessons?${query}`, {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
  });
  if (!response.ok) throw new Error(`Lessons returned ${response.status}`);
  return response.json();
}

function urlNode(location, lastModified) {
  return `  <url>\n    <loc>${escapeXml(location)}</loc>${lastModified ? `\n    <lastmod>${escapeXml(lastModified)}</lastmod>` : ''}\n  </url>`;
}

export async function onRequest(context) {
  const origin = new URL(context.request.url).origin;
  const staticUrls = [
    `${origin}/`,
    `${origin}/cesta-praxe`,
    `${origin}/podminky`,
    `${origin}/ochrana-osobnich-udaju`,
  ];
  let lessons = [];
  try {
    lessons = await loadPublishedLessons();
  } catch {
    lessons = [];
  }
  const nodes = [
    ...staticUrls.map((url) => urlNode(url)),
    ...lessons.map((lesson) => urlNode(
      `${origin}/lekce/${lessonShareSlug(lesson)}`,
      String(lesson.updated_at || '').slice(0, 10),
    )),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${nodes.join('\n')}\n</urlset>\n`;
  return new Response(context.request.method === 'HEAD' ? null : xml, {
    headers: {
      'Content-Type': 'application/xml; charset=UTF-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
