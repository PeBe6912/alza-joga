function instructorDisplayName(value) {
  const name = String(value || '').trim();
  const normalized = name.toLocaleLowerCase('cs-CZ').replace(/\s+/g, ' ');
  if (['daniela šťastná', 'daniela', 'danča'].includes(normalized)) return 'Danča';
  if (['petr bena', 'petr'].includes(normalized)) return 'Petr';
  return name;
}

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

function lessonShareSlug(lesson) {
  const title = String(lesson.title || 'lekce')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  const date = String(lesson.starts_at || '').slice(0, 10);
  return `${title || 'lekce'}-${date}-${lesson.id}`;
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
    description: `${date} · ${instructorDisplayName(lesson.teacher)}${language}${payment}${status}. Rezervace a podrobnosti na webu Jóga na HALLU.`,
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

function structuredData(lesson, canonicalUrl, imageUrl) {
  if (!lesson) return null;
  const capacity = Number(lesson.capacity || 0);
  const booked = Number(lesson.booked_count || 0);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: lesson.title,
    description: lessonMetadata(lesson).description,
    startDate: lesson.starts_at,
    endDate: lesson.ends_at,
    eventStatus: lesson.status === 'cancelled'
      ? 'https://schema.org/EventCancelled'
      : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    inLanguage: lesson.language === 'en' ? 'en' : 'cs',
    url: canonicalUrl,
    image: [imageUrl],
    location: {
      '@type': 'Place',
      name: lesson.location || 'Jógová místnost, 3. patro, HALL',
      address: 'Budova HALL, 3. patro',
    },
    organizer: {
      '@type': 'Person',
      name: instructorDisplayName(lesson.teacher),
      url: new URL(canonicalUrl).origin,
    },
  };
  if (lesson.payment_mode !== 'donation') {
    schema.offers = {
      '@type': 'Offer',
      price: Number(lesson.price_czk || 0),
      priceCurrency: 'CZK',
      availability: capacity > 0 && booked >= capacity
        ? 'https://schema.org/SoldOut'
        : 'https://schema.org/InStock',
      url: canonicalUrl,
    };
  }
  return JSON.stringify(schema).replace(/</g, '\\u003c');
}

function stripStaticMetadata(html) {
  return html
    .replace(/\s*<link rel="canonical"[^>]*>/gi, '')
    .replace(/\s*<meta property="og:[^"]+"[^>]*>/gi, '')
    .replace(/\s*<meta name="twitter:[^"]+"[^>]*>/gi, '')
    .replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, '');
}

function addMetadata(html, metadata, canonicalUrl, lesson) {
  const imageUrl = `${new URL(canonicalUrl).origin}/assets/joga-na-hallu-social-daylight-v3.jpg`;
  const jsonLd = structuredData(lesson, canonicalUrl, imageUrl);
  const tags = `
  <base href="/" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  ${lesson ? '' : '<meta name="robots" content="noindex, follow" />'}
  <meta property="og:type" content="${lesson ? 'event' : 'website'}" />
  <meta property="og:locale" content="cs_CZ" />
  <meta property="og:site_name" content="Jóga na HALLU" />
  <meta property="og:title" content="${escapeHtml(metadata.title)}" />
  <meta property="og:description" content="${escapeHtml(metadata.description)}" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:image" content="${escapeHtml(imageUrl)}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="Jógové studio ve 3. patře budovy HALL s proutěnými světly a jógovými obrazy" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(metadata.title)}" />
  <meta name="twitter:description" content="${escapeHtml(metadata.description)}" />
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
  <meta name="twitter:image:alt" content="Jógové studio ve 3. patře budovy HALL s proutěnými světly a jógovými obrazy" />
  ${jsonLd ? `<script type="application/ld+json">${jsonLd}</script>` : ''}`;
  return stripStaticMetadata(html)
    .replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(metadata.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/i, `<meta name="description" content="${escapeHtml(metadata.description)}" />`)
    .replace(/(<meta charset="[^"]+"\s*\/?>)/i, `$1${tags}`);
}

function lessonSummary(lesson) {
  if (!lesson) return '';
  const startsAt = new Date(lesson.starts_at);
  const endsAt = new Date(lesson.ends_at);
  const date = new Intl.DateTimeFormat('cs-CZ', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Prague',
  }).format(startsAt);
  const time = `${startsAt.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Prague' })}–${endsAt.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Prague' })}`;
  const payment = lesson.payment_mode === 'donation'
    ? 'Dobrovolný příspěvek'
    : `${Number(lesson.price_czk || 0)} Kč`;
  const language = lesson.language === 'en' ? 'Lekce v angličtině' : 'Lekce v češtině';
  const reservable = lesson.status === 'published' && startsAt > new Date();
  return `<section class="shared-lesson-landing" aria-labelledby="shared-lesson-title">
    <div class="shared-lesson-landing-inner">
      <div>
        <p class="eyebrow">Sdílená lekce</p>
        <h1 id="shared-lesson-title">${escapeHtml(lesson.title)}</h1>
        <p class="shared-lesson-lead">${escapeHtml(date)} · ${escapeHtml(time)}</p>
        <p>${escapeHtml(instructorDisplayName(lesson.teacher))} · ${escapeHtml(lesson.location || 'Jógová místnost, 3. patro, HALL')}</p>
        <div class="shared-lesson-tags"><span>${escapeHtml(language)}</span><span>${escapeHtml(payment)}</span></div>
      </div>
      <div class="shared-lesson-actions">
        ${reservable ? `<button class="button" type="button" data-book="${escapeHtml(lesson.id)}">Rezervovat místo</button>` : '<span class="shared-lesson-state">Tato lekce už není dostupná k rezervaci.</span>'}
        <a class="inline-link" href="/#lekce">Zobrazit všechny termíny</a>
      </div>
    </div>
  </section>`;
}

export async function onRequest(context) {
  const requestUrl = new URL(context.request.url);
  const lessonId = String(context.params.lesson || '').match(UUID_PATTERN)?.[0] || '';
  const lesson = lessonId ? await loadLesson(lessonId).catch(() => null) : null;
  const assetResponse = await context.env.ASSETS.fetch(new URL('/', requestUrl));
  const html = await assetResponse.text();
  const canonicalUrl = lesson
    ? `${requestUrl.origin}/lekce/${lessonShareSlug(lesson)}`
    : `${requestUrl.origin}${requestUrl.pathname}`;
  const body = addMetadata(html, lessonMetadata(lesson), canonicalUrl, lesson)
    .replace('<main id="public-view">', `<main id="public-view">${lessonSummary(lesson)}`);
  return new Response(context.request.method === 'HEAD' ? null : body, {
    status: lesson ? 200 : 404,
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'Cache-Control': 'public, max-age=60, s-maxage=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
