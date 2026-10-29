const SUPABASE_URL = 'https://zltcizbzckyazlxilzwq.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_X1KLjQkjhSe3Sl-McSQNBA_hz9d5HKR';
function instructorDisplayName(value) {
  const name = String(value || '').trim();
  const normalized = name.toLocaleLowerCase('cs-CZ').replace(/\s+/g, ' ');
  if (['daniela šťastná', 'daniela', 'danča'].includes(normalized)) return 'Danča';
  if (['petr bena', 'petr'].includes(normalized)) return 'Petr';
  return name;
}
function instructorRole(value) {
  return instructorDisplayName(value) === 'Danča' ? 'Lektorka' : 'Lektor';
}

const PUBLIC_SETTING_DEFAULTS = {
  cancellation_hours: 24,
  booking_grace_minutes: 15,
  minimum_attendance: 5,
  default_paid_price: 150,
  studio_capacity: 20,
};
const DONATION_PAYMENT_COPY = 'Doporučený příspěvek je 150 Kč, jeho výše je ale jen na tobě. Platba prostřednictvím QR kódu směřuje přímo na účet organizace Dobrý anděl.';
const HERO_CLAIMS = [
  ['Jóga není o tom, jak jsi flexibilní.', 'Ale o tom, jak blízko máš k sobě.'],
  ['Celý den něco řešíš.', 'Tady můžeš chvíli jen být.'],
  ['Dech v těle.', 'Prostor v mysli.'],
  ['Ne všechno potřebuje výsledek.', 'Stačí tvůj dobrý pocit.'],
  ['Tady a teď.'],
  ['Podložka není další úkol.', 'Je to chvíle, kterou si dopřeješ.'],
  ['Jóga není o tom, kam až dosáhneš.', 'Ale o tom, co po cestě potkáš.'],
  ['Nemusíš čekat, až bude klid.', 'Můžeš si pro něj přijít.'],
  ['Tělo v pohybu.', 'Mysl v přítomnosti.'],
  ['Nemusíš nikomu nic dokazovat.', 'Tenhle čas je jen tvůj.'],
  ['Všechno je, jak má být.'],
  ['Na podložce nemusíš být lepší než včera.', 'Stačí být tady dnes.'],
  ['Nemusíš vědět, co bude dál.', 'Stačí s důvěrou udělat další nádech.'],
];

const HERO_CLAIM_LAYOUTS = [
  { desktop: [['Jóga není o tom,', 'jak jsi flexibilní.'], ['Ale o tom, jak blízko', 'máš k sobě.']] },
  { desktop: [['Celý den něco řešíš.'], ['Tady můžeš', 'chvíli jen být.']], mobile: [['Celý den', 'něco řešíš.'], ['Tady můžeš', 'chvíli jen být.']] },
  { desktop: [['Dech v těle.'], ['Prostor v mysli.']] },
  { desktop: [['Ne všechno', 'potřebuje výsledek.'], ['Stačí tvůj dobrý pocit.']], mobile: [['Ne všechno', 'potřebuje výsledek.'], ['Stačí tvůj', 'dobrý pocit.']] },
  { desktop: [['Tady a teď.']] },
  { desktop: [['Podložka není', 'další úkol.'], ['Je to chvíle,', 'kterou si dopřeješ.']] },
  { desktop: [['Jóga není o tom,', 'kam až dosáhneš.'], ['Ale o tom,', 'co po cestě potkáš.']] },
  { desktop: [['Nemusíš čekat,', 'až bude klid.'], ['Můžeš si pro něj přijít.']], mobile: [['Nemusíš čekat,', 'až bude klid.'], ['Můžeš si', 'pro něj přijít.']] },
  { desktop: [['Tělo v pohybu.'], ['Mysl v přítomnosti.']] },
  { desktop: [['Nemusíš nikomu', 'nic dokazovat.'], ['Tenhle čas', 'je jen tvůj.']] },
  { desktop: [['Všechno je,', 'jak má být.']] },
  { desktop: [['Na podložce nemusíš', 'být lepší než včera.'], ['Stačí být tady dnes.']], mobile: [['Na podložce', 'nemusíš být', 'lepší než včera.'], ['Stačí být tady dnes.']] },
  { desktop: [['Nemusíš vědět,', 'co bude dál.'], ['Stačí s důvěrou', 'udělat další nádech.']] },
];

function initializeHeroClaim() {
  const heading = document.querySelector('[data-hero-claim]');
  if (!heading) return;
  let index = Math.floor(Math.random() * HERO_CLAIMS.length);
  try {
    const saved = localStorage.getItem('jogaHeroClaimNextV1');
    if (saved !== null && /^\d+$/.test(saved) && Number(saved) < HERO_CLAIMS.length) index = Number(saved);
    localStorage.setItem('jogaHeroClaimNextV1', String((index + 1) % HERO_CLAIMS.length));
  } catch {
    // Without browser storage, keep a random claim for this page load.
  }
  const layout = HERO_CLAIM_LAYOUTS[index];
  heading.replaceChildren();
  for (const size of ['desktop', 'mobile']) {
    const variant = document.createElement('span');
    variant.className = `hero-claim-${size}`;
    (layout[size] || layout.desktop).forEach((lines, partIndex) => {
      const part = document.createElement(partIndex ? 'i' : 'span');
      part.className = 'hero-claim-part';
      lines.forEach((text) => {
        const line = document.createElement('span');
        line.className = 'hero-claim-line';
        line.textContent = text;
        part.append(line);
      });
      variant.append(part);
    });
    heading.append(variant);
  }
}
const YOGA_REFLECTIONS = [
  ['Laskavost má místo i na podložce.', 'II.30 · ahimsá — neubližování'],
  ['Pevnost a lehkost se nevylučují.', 'II.46 · ásana — stabilita a pohodlí v pozici'],
  ['Dech není jen doprovod pohybu.', 'II.49 · pránájáma — práce s dechem'],
  ['Jedna chvíle. Jeden bod pozornosti.', 'III.1 · dháraná — soustředění'],
  ['Poznávání sebe není totéž co hodnocení sebe.', 'II.32 · svádhjája — studium a sebepoznávání'],
  ['Svět venku. Pozornost uvnitř.', 'II.54 · pratjáhára — obrácení pozornosti dovnitř'],
  ['Praxe má svůj rytmus. A svůj čas.', 'I.14 · abhjása — dlouhodobá, soustavná praxe'],
  ['Méně sevření. Více prostoru.', 'II.30 · aparigraha — neulpívání na vlastnění'],
  ['Spokojenost nemusí znamenat, že je všechno dokonalé.', 'II.42 · santóša — spokojenost'],
  ['Úsilí a uvolnění. Obojí má v praxi místo.', 'II.47 · uvolnění úsilí v pozici'],
  ['Pozornost nemusí nic přidávat. Někdy jen odkrývá.', 'III.1–2 · dháraná a dhjána — soustředění a meditace'],
  ['Pravdivost má místo i ve vztahu k vlastním možnostem.', 'II.30 · satja — pravdivost'],
  ['Nádech. Výdech. Prostor mezi nimi.', 'II.49 · pránájáma — práce s dechem'],
  ['Praxe není jen to, co je vidět.', 'II.54 · pratjáhára — obrácení pozornosti dovnitř'],
  ['Pravidelnost a neulpívání. Dvě stránky jedné praxe.', 'I.12 · abhjása a vairágja — soustavná praxe a nepřipoutanost'],
  ['Pozice má tvar. Její prožitek je osobní.', 'II.46 · ásana — stabilita a pohodlí v pozici'],
];

function initializeYogaReflection() {
  const text = document.querySelector('[data-yoga-reflection]');
  const source = document.querySelector('[data-yoga-reflection-source]');
  if (!text || !source) return;
  let index = Math.floor(Math.random() * YOGA_REFLECTIONS.length);
  try {
    const saved = localStorage.getItem('jogaReflectionNextV1');
    if (saved !== null && /^\d+$/.test(saved) && Number(saved) < YOGA_REFLECTIONS.length) index = Number(saved);
    localStorage.setItem('jogaReflectionNextV1', String((index + 1) % YOGA_REFLECTIONS.length));
  } catch {
    // Storage is optional; the reflection stays unchanged for this page load.
  }
  text.textContent = YOGA_REFLECTIONS[index][0];
  source.textContent = `Volně inspirováno Jógasútrami ${YOGA_REFLECTIONS[index][1]}`;
}

const JOURNEY_MILESTONES = [
  { count: 1, name: 'První nádech', note: 'Začátek cesty' },
  { count: 5, name: 'Pozdrav slunci', note: 'První pravidelnější praxe' },
  { count: 10, name: 'V rytmu dechu', note: 'Pohyb a dech se propojují' },
  { count: 20, name: 'Pevný základ', note: 'Praxe už má své místo' },
  { count: 30, name: 'Vinyasa', note: 'Jednotlivé lekce se spojují v cestu' },
  { count: 50, name: 'Ve flow', note: 'Pohyb začíná přirozeně plynout' },
  { count: 75, name: 'Klid v pohybu', note: 'Stabilita i během náročnější praxe' },
  { count: 100, name: 'Stálá praxe', note: 'Výrazný milník pravidelnosti' },
  { count: 150, name: 'Vnitřní rovnováha', note: 'Síla a uvolnění v rovnováze' },
  { count: 200, name: 'Sthira sukham', note: 'Stabilita a lehkost' },
  { count: 300, name: 'Hluboká praxe', note: 'Dlouhodobá cesta bez spěchu' },
  { count: 400, name: 'Srdce komunity', note: 'Společná praxe vytváří atmosféru' },
  { count: 500, name: 'Mistr praxe', note: 'Výjimečný milník vytrvalosti' },
];

async function loadPublicSettings() {
  try {
    const query = new URLSearchParams({ select: 'key,value', is_public: 'eq.true' });
    const response = await fetch(`${SUPABASE_URL}/rest/v1/site_settings?${query}`, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
    });
    if (!response.ok) throw new Error('SETTINGS_NOT_AVAILABLE');
    const rows = await response.json();
    return rows.reduce((settings, row) => ({ ...settings, [row.key]: row.value }), { ...PUBLIC_SETTING_DEFAULTS });
  } catch (error) {
    console.error(error);
    return { ...PUBLIC_SETTING_DEFAULTS };
  }
}

function donationSummaryText(summary) {
  if (!summary || typeof summary.amount_czk !== 'number' || !Number.isFinite(summary.amount_czk)
    || summary.amount_czk < 0 || summary.amount_czk > 999999999.99
    || Math.abs(summary.amount_czk * 100 - Math.round(summary.amount_czk * 100)) > 0.00001
    || typeof summary.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(summary.as_of)) return '';
  const date = new Date(`${summary.as_of}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== summary.as_of
    || summary.as_of < '2000-01-01') return '';
  const months = ['lednu', 'únoru', 'březnu', 'dubnu', 'květnu', 'červnu', 'červenci', 'srpnu', 'září', 'říjnu', 'listopadu', 'prosinci'];
  const amount = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 2 }).format(summary.amount_czk);
  return `K ${date.getUTCDate()}. ${months[date.getUTCMonth()]} ${date.getUTCFullYear()} jsme společně přispěli Dobrému andělovi částkou ${amount} Kč.`;
}

function applyPublicSettings(settings) {
  document.querySelectorAll('[data-setting]').forEach((element) => {
    const value = settings[element.dataset.setting];
    if (value !== undefined && value !== null) element.textContent = String(value);
  });
  document.querySelectorAll('[data-donation-summary]').forEach((element) => {
    const text = donationSummaryText(settings.donation_summary);
    element.textContent = text;
    element.hidden = !text;
  });
}

const fallbackLessons = [];

let lessons = fallbackLessons;

const fallbackTeachers = [
  { name: 'Daniela Šťastná', photo: 'assets/daniela-stastna.jpg', styles: 'Fyzio · Hatha · Power · Vinyasa', bio: 'Jógu aktivně praktikuje od roku 2014. V roce 2023 dokončila akreditovaný 200hodinový kurz MŠMT od Yoga4Everybody.', quote: 'Ve svých lekcích aktivně asistuji cvičícím, využívám éterické oleje a zpěv manter. Jsem zvědavá na vaši jógovou cestu a budu se na vás těšit.' },
  { name: 'Petr Bena', photo: 'assets/petr-bena.jpeg', styles: 'Power · Vinyasa · Strong slow flow', bio: 'Jeho jógová cesta je poměrně krátká, ale velmi intenzivní. Od prosince 2023 se jóga proměnila ze způsobu, jak se zotavit z běžeckého zranění, v každodenní praxi trvající 1 000 dní v řadě. Z fyzického cvičení se postupně stala cesta k větší přítomnosti, stabilitě a poznávání toho, jak lze filozofii jógy přenášet i do života mimo podložku.', quote: 'V roce 2026 jsem v Ubudu na Bali dokončil 200hodinový kurz pro učitele power a vinyasa jógy. Chci vytvářet lekce, na kterých se lidé cítí podporováni a zároveň přiměřeně vyzváni. Nejbližší je mi strong slow flow.' }
];
let teachers = fallbackTeachers;
let newsItems = [];

const savedBookings = JSON.parse(localStorage.getItem('alzaYogaBookings') || '[]');
let userSession = JSON.parse(localStorage.getItem('jogaUserSession') || 'null');
let userRefreshPromise = null;
let accountData = null;
let accountRecoveryMode = false;
let activeAccountTab = 'lessons';
const storedAdminSession = localStorage.getItem('jogaAdminSession') || sessionStorage.getItem('jogaAdminSession');
let adminSession = null;
try {
  adminSession = JSON.parse(storedAdminSession || 'null');
} catch {
  localStorage.removeItem('jogaAdminSession');
  sessionStorage.removeItem('jogaAdminSession');
}
if (adminSession) {
  localStorage.setItem('jogaAdminSession', JSON.stringify(adminSession));
  sessionStorage.removeItem('jogaAdminSession');
}
let adminRefreshPromise = null;
let adminLessons = [];
let adminInstructors = [];
let adminNews = [];
let adminReservations = [];
let adminFeedback = [];
let publicCalendarLessons = [];
let publicStudioBlocks = [];
let publicStudioBlocksError = '';
let adminStudioBlocks = [];
let adminCanManageAdmins = false;
let adminCanDeleteLessons = false;
let adminAccounts = [];
let adminGreeting = 'Dobrý den';
let adminShowCancelledLessons = false;
let publicSettings = { ...PUBLIC_SETTING_DEFAULTS };
let adminSettings = { ...PUBLIC_SETTING_DEFAULTS };
let activeAdminTab = 'overview';
let adminLessonInstructorFilter = 'all';
const ADMIN_TAB_SLUGS = Object.freeze({
  overview: 'lekce',
  calendar: 'kalendar',
  completed: 'probehle-lekce',
  feedback: 'zpetna-vazba',
  people: 'ucastnici',
  content: 'novinky',
  teachers: 'lektori',
  accounts: 'administratori',
  settings: 'nastaveni',
});
const ADMIN_SLUG_TABS = Object.fromEntries(Object.entries(ADMIN_TAB_SLUGS).map(([tab, slug]) => [slug, tab]));
const LESSON_PAGE_SIZE = 6;
let lessonDisplayLimit = LESSON_PAGE_SIZE;
let sharedLessonHandled = false;
let publicCalendarStart = startOfWeek(new Date());
let adminCalendarMonth = startOfMonth(new Date());
const classList = document.querySelector('#class-list');
const toast = document.querySelector('#toast');
const dialog = document.querySelector('#booking-dialog');

document.querySelector('#main-menu a[href="#ucet"]')?.insertAdjacentHTML('beforebegin', '<a href="/cesta-praxe">Cesta jógové praxe</a>');

function spotsLeft(lesson) {
  return Math.max(lesson.capacity - lesson.booked, 0);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderNewsText(value) {
  const journeyLink = '<a class="inline-link" href="/cesta-praxe">Cesta jógové praxe</a>';
  return escapeHtml(value)
    .replaceAll('Cesta jógové praxe', journeyLink)
    .replaceAll('Cesta praxe', journeyLink);
}

function journeyMilestone(attendedCount) {
  return [...JOURNEY_MILESTONES].reverse().find((item) => attendedCount >= item.count) || { count: 0, name: 'Na začátku cesty', note: 'První milník čeká po absolvované lekci' };
}

function nextJourneyMilestone(attendedCount) {
  return JOURNEY_MILESTONES.find((item) => attendedCount < item.count) || null;
}

function journeyProgress(attendedCount, current, next) {
  if (!next) return 100;
  const span = Math.max(next.count - current.count, 1);
  return Math.max(0, Math.min(100, ((attendedCount - current.count) / span) * 100));
}

function startOfWeek(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date;
}

function startOfMonth(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  date.setDate(1);
  return date;
}

function addMonths(value, months) {
  const date = startOfMonth(value);
  date.setMonth(date.getMonth() + months);
  return date;
}

function addDays(value, days) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function pragueDateKey(value) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Prague' }).format(new Date(value));
}

function shortTime(value) {
  return new Intl.DateTimeFormat('cs-CZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Prague' }).format(new Date(value));
}

function calendarRangeLabel(start) {
  const end = addDays(start, 6);
  const format = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'short', timeZone: 'Europe/Prague' });
  return `${format.format(start)}–${format.format(end)}`;
}

function calendarMonthLabel(value) {
  const format = new Intl.DateTimeFormat('cs-CZ', { month: 'long', year: 'numeric', timeZone: 'Europe/Prague' });
  const label = format.format(value);
  return label.charAt(0).toLocaleUpperCase('cs-CZ') + label.slice(1);
}

function instructorCalendarClass(teacher) {
  const normalizedName = String(teacher || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (normalizedName.includes('daniela stastna')) return ' calendar-instructor-daniela';
  if (normalizedName.includes('petr bena')) return ' calendar-instructor-petr';
  return '';
}

function calendarEventCard(event, { admin = false } = {}) {
  const occupiedStart = event.occupiedStartsAt || event.startsAt;
  const occupiedEnd = event.occupiedEndsAt || event.endsAt;
  const actions = admin && event.kind === 'private'
    ? `<div class="calendar-event-actions"><button class="text-button" data-edit-studio-block="${event.id}">Upravit</button><button class="text-button danger" data-delete-studio-block="${event.id}">Smazat</button></div>`
    : '';
  const instructorClass = event.kind === 'public' ? instructorCalendarClass(event.teacher) : '';
  const teacher = event.kind === 'public' && event.teacher
    ? `<span class="calendar-event-teacher">${instructorRole(event.teacher)}: ${escapeHtml(instructorDisplayName(event.teacher))}</span>`
    : '';
  return `<article class="calendar-event calendar-event-${event.kind}${instructorClass}"><strong>${escapeHtml(event.title)}</strong><span class="calendar-event-time">${escapeHtml(shortTime(occupiedStart))}–${escapeHtml(shortTime(occupiedEnd))}</span>${teacher}${admin && event.kind === 'private' ? `<small>Akce ${escapeHtml(shortTime(event.startsAt))}–${escapeHtml(shortTime(event.endsAt))} · rezerva 15 min</small>` : ''}${actions}</article>`;
}

function calendarDays(start, events, { admin = false } = {}) {
  const dayFormat = new Intl.DateTimeFormat('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric', timeZone: 'Europe/Prague' });
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    const key = pragueDateKey(date);
    const dayEvents = events.filter((event) => pragueDateKey(event.startsAt) === key).sort((a, b) => new Date(a.occupiedStartsAt || a.startsAt) - new Date(b.occupiedStartsAt || b.startsAt));
    const cards = dayEvents.map((event) => calendarEventCard(event, { admin })).join('');
    return `<section class="calendar-day"><h3>${escapeHtml(dayFormat.format(date))}</h3><div>${cards || '<p class="calendar-free">Volno</p>'}</div></section>`;
  }).join('');
}

function adminMonthRange(month) {
  const monthStart = startOfMonth(month);
  const nextMonth = addMonths(monthStart, 1);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = startOfWeek(addDays(nextMonth, 6));
  return { monthStart, nextMonth, gridStart, gridEnd };
}

function adminMonthCalendar(month, events) {
  const { monthStart, nextMonth, gridStart, gridEnd } = adminMonthRange(month);
  const dayFormat = new Intl.DateTimeFormat('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric', timeZone: 'Europe/Prague' });
  const todayKey = pragueDateKey(new Date());
  const days = [];
  for (let date = new Date(gridStart); date < gridEnd; date = addDays(date, 1)) {
    const key = pragueDateKey(date);
    const outside = date < monthStart || date >= nextMonth;
    const dayEvents = events.filter((event) => pragueDateKey(event.startsAt) === key).sort((a, b) => new Date(a.occupiedStartsAt || a.startsAt) - new Date(b.occupiedStartsAt || b.startsAt));
    const cards = dayEvents.map((event) => calendarEventCard(event, { admin: true })).join('');
    days.push(`<section class="calendar-day month-calendar-day${outside ? ' is-outside-month' : ''}${key === todayKey ? ' is-today' : ''}"><h3>${escapeHtml(dayFormat.format(date))}</h3><div>${cards || '<p class="calendar-free">Volno</p>'}<button class="calendar-add-day" type="button" data-add-studio-block-date="${key}" aria-label="Přidat neveřejnou rezervaci na ${escapeHtml(dayFormat.format(date))}">+ Přidat</button></div></section>`);
  }
  return days.join('');
}

function adminMonthAgenda(month, events) {
  const { monthStart, nextMonth } = adminMonthRange(month);
  const dayFormat = new Intl.DateTimeFormat('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Prague' });
  const monthEvents = events.filter((event) => new Date(event.startsAt) >= monthStart && new Date(event.startsAt) < nextMonth);
  const grouped = new Map();
  monthEvents.sort((a, b) => new Date(a.occupiedStartsAt || a.startsAt) - new Date(b.occupiedStartsAt || b.startsAt)).forEach((event) => {
    const key = pragueDateKey(event.startsAt);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(event);
  });
  if (!grouped.size) return '<p class="admin-calendar-empty">V tomto měsíci nejsou žádné lekce ani rezervace studia.</p>';
  return [...grouped.entries()].map(([key, dayEvents]) => {
    const date = new Date(`${key}T12:00:00`);
    return `<section class="admin-agenda-day"><div class="admin-agenda-heading"><h3>${escapeHtml(dayFormat.format(date))}</h3><button class="text-button" type="button" data-add-studio-block-date="${key}">+ Přidat rezervaci</button></div><div>${dayEvents.map((event) => calendarEventCard(event, { admin: true })).join('')}</div></section>`;
  }).join('');
}

function attendanceLabel(lesson) {
  return `Přihlášeno ${lesson.booked} / ${lesson.capacity}`;
}

function lessonShareSlug(lesson) {
  const title = String(lesson.title || 'lekce')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  const date = String(lesson.iso || '').slice(0, 10);
  return `${title || 'lekce'}-${date}-${lesson.id}`;
}

function lessonShareUrl(lesson) {
  return `${location.origin}/lekce/${lessonShareSlug(lesson)}`;
}

function lessonById(id) {
  return lessons.find((item) => item.id === id) || adminLessons.find((item) => item.id === id);
}

async function copyLessonLink(lesson) {
  const url = lessonShareUrl(lesson);
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    const input = document.createElement('textarea');
    input.value = url;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    input.remove();
  }
  showToast('Odkaz na lekci je zkopírovaný.');
}

async function shareLesson(lesson) {
  const url = lessonShareUrl(lesson);
  if (navigator.share) {
    try {
      await navigator.share({ title: `${lesson.title} · Jóga na HALLU`, text: `${lesson.date} · ${lesson.time} · ${instructorDisplayName(lesson.teacher)}`, url });
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
  }
  await copyLessonLink(lesson);
}

function bindLessonShareButtons(root = document) {
  root.querySelectorAll('[data-share-lesson]').forEach((button) => button.addEventListener('click', (event) => {
    event.preventDefault();
    const lesson = lessonById(button.dataset.shareLesson);
    if (lesson) shareLesson(lesson);
  }));
  root.querySelectorAll('[data-copy-lesson]').forEach((button) => button.addEventListener('click', () => {
    const lesson = lessonById(button.dataset.copyLesson);
    if (lesson) copyLessonLink(lesson);
  }));
}

function preferredCalendarProvider() {
  const userAgent = navigator.userAgent || '';
  const isIPad = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  if (/Android/i.test(userAgent)) return 'google';
  if (/iPad|iPhone|iPod/i.test(userAgent) || isIPad) return 'ics';
  return 'ics';
}

function calendarLessonById(id, source = 'lesson') {
  if (source === 'account') return accountData?.reservations.find((item) => item.id === id) || null;
  return lessonById(id);
}

function calendarLessonData(item, source = 'lesson') {
  if (!item) return null;
  const startsAt = item.iso || item.startsAt;
  const endsAt = item.endsAt;
  if (!startsAt || !endsAt) return null;
  const lessonUrl = source === 'account' ? `${location.origin}/#ucet` : lessonShareUrl(item);
  return {
    id: `${source}-${item.id}`,
    title: `${item.title} · Jóga na HALLU`,
    startsAt,
    endsAt,
    location: item.location || 'Jógová místnost, 3. patro, HALL',
    description: `${instructorRole(item.teacher)}: ${instructorDisplayName(item.teacher)}\nJóga na HALLU`,
    url: lessonUrl,
  };
}

function calendarTimestamp(value) {
  return new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function escapeCalendarText(value) {
  return String(value || '')
    .replaceAll('\\', '\\\\')
    .replaceAll('\n', '\\n')
    .replaceAll(',', '\\,')
    .replaceAll(';', '\\;');
}

function calendarFile(events) {
  const stamp = calendarTimestamp(new Date());
  const entries = events.map((event) => [
    'BEGIN:VEVENT',
    `UID:${escapeCalendarText(event.id)}@joganahallu.cz`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${calendarTimestamp(event.startsAt)}`,
    `DTEND:${calendarTimestamp(event.endsAt)}`,
    `SUMMARY:${escapeCalendarText(event.title)}`,
    `LOCATION:${escapeCalendarText(event.location)}`,
    `DESCRIPTION:${escapeCalendarText(event.description)}`,
    `URL:${event.url}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
  ].join('\r\n')).join('\r\n');
  return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Joga na HALLU//Lekce//CS\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n${entries}\r\nEND:VCALENDAR\r\n`;
}

function downloadCalendar(events, filename = 'joga-na-hallu.ics') {
  if (!events.length) return showToast('Nejsou vybrané žádné budoucí lekce.');
  const url = URL.createObjectURL(new Blob([calendarFile(events)], { type: 'text/calendar;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function googleCalendarUrl(event) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${calendarTimestamp(event.startsAt)}/${calendarTimestamp(event.endsAt)}`,
    details: `${event.description}\n${event.url}`,
    location: event.location,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function addLessonToCalendar(item, source, provider) {
  const event = calendarLessonData(item, source);
  if (!event) return showToast('Kalendář pro tuto lekci se nepodařilo připravit.');
  if (provider === 'google') {
    window.open(googleCalendarUrl(event), '_blank', 'noopener');
    return;
  }
  downloadCalendar([event], `joga-na-hallu-${String(item.title || 'lekce').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.ics`);
}

function calendarControls(id, source = 'lesson', compact = false) {
  const preferred = preferredCalendarProvider();
  const alternative = preferred === 'google' ? 'ics' : 'google';
  const alternativeLabel = alternative === 'google' ? 'Google kalendář' : 'Soubor .ics';
  return `<div class="calendar-actions${compact ? ' calendar-actions-compact' : ''}"><button class="${compact ? 'text-button' : 'button'}" type="button" data-calendar-add="${escapeHtml(id)}" data-calendar-source="${source}" data-calendar-provider="${preferred}">${compact ? 'Do kalendáře' : 'Přidat do kalendáře'}</button><button class="text-button calendar-alternative" type="button" data-calendar-add="${escapeHtml(id)}" data-calendar-source="${source}" data-calendar-provider="${alternative}">${alternativeLabel}</button></div>`;
}

function bindCalendarButtons(root = document) {
  root.querySelectorAll('[data-calendar-add]').forEach((button) => button.addEventListener('click', () => {
    const source = button.dataset.calendarSource || 'lesson';
    addLessonToCalendar(calendarLessonById(button.dataset.calendarAdd, source), source, button.dataset.calendarProvider);
  }));
  root.querySelector('[data-calendar-export]')?.addEventListener('click', () => {
    const futureLessons = filteredAdminLessons(adminLessons.filter((lesson) => lesson.status === 'published' && new Date(lesson.endsAt) > new Date()));
    downloadCalendar(futureLessons.map((lesson) => calendarLessonData(lesson)).filter(Boolean), 'joga-na-hallu-budouci-lekce.ics');
  });
}

function settingNumber(key) {
  const value = Number(publicSettings[key] ?? PUBLIC_SETTING_DEFAULTS[key]);
  return Number.isFinite(value) ? value : Number(PUBLIC_SETTING_DEFAULTS[key]);
}

async function refreshPublicSettings() {
  publicSettings = await loadPublicSettings();
  applyPublicSettings(publicSettings);
}

function renderLessons(filter = 'all') {
  const filtered = lessons.filter((lesson) => filter === 'all' || lesson.type === filter);
  const expanded = lessonDisplayLimit > LESSON_PAGE_SIZE;
  const visible = filtered.slice(0, expanded ? filtered.length : LESSON_PAGE_SIZE);
  const lessonRows = visible.map((lesson) => {
    const places = spotsLeft(lesson);
    const typeLabel = lesson.type === 'charity' ? 'Dobrovolný příspěvek' : 'Klasická lekce';
    const languageLabel = lesson.language === 'en' ? '<span class="language-badge">Lekce v angličtině</span>' : '';
    return `<article class="class-row">
      <div class="class-date"><strong>${lesson.day}</strong><span>${lesson.date}</span></div>
      <div class="class-teacher"><h3>${escapeHtml(lesson.title)}</h3><b class="class-time-compact">${escapeHtml(lesson.time)}</b><small>${instructorRole(lesson.teacher)}: ${escapeHtml(instructorDisplayName(lesson.teacher))}</small><br><span>${typeLabel}</span>${languageLabel}</div>
      <div class="class-meta"><span>HALL · 3. patro</span><span>${escapeHtml(lesson.price)}</span></div>
      <div class="class-action"><button class="button" data-book="${lesson.id}" ${places <= 0 ? 'disabled' : ''}>${places <= 0 ? 'Obsazeno' : 'Rezervovat'}</button><small>${attendanceLabel(lesson)}</small><a class="text-button class-share" href="${escapeHtml(lessonShareUrl(lesson))}" data-share-lesson="${lesson.id}" aria-label="Sdílet lekci ${escapeHtml(lesson.title)}">Sdílet lekci</a></div>
    </article>`;
  }).join('');
  const remaining = filtered.length - visible.length;
  const moreButton = filtered.length > LESSON_PAGE_SIZE
    ? `<div class="class-list-more"><button class="button button-small button-secondary" data-toggle-lessons>${expanded ? 'Zobrazit méně' : `Zobrazit další lekce (${remaining})`}</button></div>`
    : '';
  classList.innerHTML = lessonRows || '<p class="class-list-empty">V této kategorii teď nejsou žádné vypsané lekce.</p>';
  classList.insertAdjacentHTML('beforeend', moreButton);
  document.querySelectorAll('[data-book]').forEach((button) => button.addEventListener('click', () => openBooking(button.dataset.book)));
  bindLessonShareButtons(classList);
  document.querySelector('[data-toggle-lessons]')?.addEventListener('click', () => {
    lessonDisplayLimit = expanded ? LESSON_PAGE_SIZE : filtered.length;
    renderLessons(filter);
    if (expanded) document.querySelector('#lekce')?.scrollIntoView({ block: 'start' });
  });
}

function renderNextClass() {
  const lesson = lessons[0];
  const card = document.querySelector('#next-class-card');
  if (!lesson) {
    card.innerHTML = '<p>Nové termíny připravujeme.</p>';
    return;
  }
  card.innerHTML = `<div class="date"><span>NEJBLIŽŠÍ LEKCE</span><span>${lesson.date}</span></div><h3>${escapeHtml(lesson.title)}</h3><p><strong>${escapeHtml(lesson.time)}</strong><br>${instructorRole(lesson.teacher)}: ${escapeHtml(instructorDisplayName(lesson.teacher))}</p><div class="spots"><span>${attendanceLabel(lesson)}</span><a href="#lekce">Rezervovat →</a></div>`;
}

document.querySelectorAll('.filter').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.filter').forEach((item) => item.classList.remove('active'));
  button.classList.add('active');
  lessonDisplayLimit = LESSON_PAGE_SIZE;
  renderLessons(button.dataset.filter);
}));

async function openBooking(id) {
  const lesson = lessons.find((item) => item.id === id);
  if (!lesson) return;
  if (new Date(lesson.iso).getTime() + settingNumber('booking_grace_minutes') * 60_000 < Date.now()) {
    showSharedLessonStatus(lesson, 'Rezervace na tuto lekci už byla uzavřena. Vyber si prosím jiný termín.');
    return;
  }
  if (spotsLeft(lesson) <= 0) {
    showSharedLessonStatus(lesson, 'Tato lekce je už obsazená. Odkaz můžeš přesto sdílet.');
    return;
  }
  if (userSession && !accountData) {
    try {
      accountData = await loadAccountData();
    } catch {
      clearUserSession();
    }
  }
  const signedIn = Boolean(userSession && accountData?.profile);
  const languageNote = lesson.language === 'en' ? '<span class="language-badge">Lekce v angličtině</span>' : '';
  document.querySelector('#booking-content').innerHTML = `<form class="booking-panel" id="booking-form">
    <p class="eyebrow">Rezervace místa</p><h2>${escapeHtml(lesson.title)}</h2>
    <div class="booking-summary"><span><b>${lesson.day} ${lesson.date}</b><br>${escapeHtml(lesson.time)}<br><small>${instructorRole(lesson.teacher)}: ${escapeHtml(instructorDisplayName(lesson.teacher))}</small><br>${languageNote}</span><span>${escapeHtml(lesson.price)}</span></div>
    <p class="form-hint">Bezplatné zrušení je možné nejpozději ${settingNumber('cancellation_hours')} hodin před začátkem.</p>
    <div class="form-grid">
      ${signedIn ? '' : `<div class="field"><label for="name">Jméno a příjmení</label><input id="name" name="name" required autocomplete="name"></div>
      <div class="field"><label for="email">E-mail</label><input id="email" name="email" type="email" required autocomplete="email"></div>
      <div class="field full"><label for="relation">Jdu jako</label><select id="relation" name="relation"><option value="employee">Zaměstnanec Alzy</option><option value="guest">Host / externista</option></select></div>
      <p class="field full form-hint">Máš účet? <a href="#ucet" data-booking-account>Přihlas se</a> a příště už údaje vyplňovat nemusíš.</p>
      <label class="checkbox field full"><input type="checkbox" required><span>Souhlasím s <a href="/podminky" target="_blank" rel="noopener">podmínkami rezervace</a> a potvrzuji, že jsem se seznámil/a s <a href="/ochrana-osobnich-udaju" target="_blank" rel="noopener">informacemi o zpracování osobních údajů</a>.</span></label>`}
    </div><button class="button" type="submit">Potvrdit rezervaci</button><button class="text-button booking-share" type="button" data-share-lesson="${lesson.id}">Sdílet lekci</button>
  </form>`;
  bindLessonShareButtons(document.querySelector('#booking-content'));
  document.querySelector('#booking-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = event.target.querySelector('[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Ukládám…';
    const data = new FormData(event.target);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/book-lesson`, {
        method: 'POST',
        headers: { apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json', ...(signedIn ? { Authorization: `Bearer ${userSession.access_token}` } : {}) },
        body: JSON.stringify({
          lessonId: id,
          name: signedIn ? accountData.profile.fullName : data.get('name'),
          email: signedIn ? accountData.email : data.get('email'),
          relation: signedIn ? accountData.profile.relation : data.get('relation'),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Rezervaci se nepodařilo uložit.');

      const confirmation = result.emailSent
        ? '<p>Potvrzení jsme poslali e-mailem.</p>'
        : result.cancelUrl
          ? `<p>E-mail se nepodařilo odeslat. Ulož si proto tento odkaz: <a href="${escapeHtml(result.cancelUrl)}">zrušit rezervaci</a>.</p>`
          : '<p>Potvrzení se nepodařilo odeslat. Obrať se prosím na lektora.</p>';
      document.querySelector('#booking-content').innerHTML = `<div class="booking-panel booking-confirmation"><p class="eyebrow">Místo je rezervované</p><h2>${escapeHtml(lesson.title)}</h2>${confirmation}${calendarControls(lesson.id)}<button class="text-button booking-done" type="button" data-dialog-done>Zavřít</button></div>`;
      bindCalendarButtons(document.querySelector('#booking-content'));
      document.querySelector('[data-dialog-done]').addEventListener('click', closeDialog);
      await loadLessons();
      if (signedIn) accountData = await loadAccountData();
      showToast(result.emailSent ? 'Místo je rezervované. Potvrzení jsme poslali e-mailem.' : 'Místo je rezervované. Ulož si odkaz pro zrušení.');
    } catch (error) {
      submitButton.disabled = false;
      submitButton.textContent = 'Potvrdit rezervaci';
      showToast(error.message);
    }
  });
  document.querySelector('[data-booking-account]')?.addEventListener('click', closeDialog);
  dialog.showModal();
}

function lessonFromDatabase(row) {
  const starts = new Date(row.starts_at);
  const ends = new Date(row.ends_at);
  const dateParts = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric', timeZone: 'Europe/Prague' }).format(starts);
  const day = new Intl.DateTimeFormat('cs-CZ', { weekday: 'short', timeZone: 'Europe/Prague' }).format(starts).replace('.', '');
  const time = `${new Intl.DateTimeFormat('cs-CZ', { hour: 'numeric', minute: '2-digit', timeZone: 'Europe/Prague' }).format(starts)}–${new Intl.DateTimeFormat('cs-CZ', { hour: 'numeric', minute: '2-digit', timeZone: 'Europe/Prague' }).format(ends)}`;
  const instructor = row.instructors;
  const donation = row.payment_mode === 'donation';
  return {
    id: row.id,
    instructorId: row.instructor_id,
    day: day.charAt(0).toUpperCase() + day.slice(1),
    date: dateParts,
    iso: row.starts_at,
    endsAt: row.ends_at,
    location: row.location || 'Jógová místnost, 3. patro, HALL',
    time,
    title: row.title,
    teacher: instructor.name,
    type: donation ? 'charity' : 'paid',
    price: donation ? 'Dobrovolný příspěvek' : `${row.price_czk} Kč`,
    capacity: row.capacity,
    booked: row.booked_count,
    status: row.status || 'published',
    language: row.language || 'cs',
    paymentMode: row.payment_mode,
    priceCzk: row.price_czk,
    paymentNote: row.payment_note || '',
    minimumAttendance: row.minimum_attendance || 5,
    lowAttendanceConfirmedAt: row.low_attendance_confirmed_at || null,
  };
}

function lessonFromShareData(row) {
  return lessonFromDatabase({
    ...row,
    instructor_id: null,
    payment_note: '',
    minimum_attendance: PUBLIC_SETTING_DEFAULTS.minimum_attendance,
    low_attendance_confirmed_at: null,
    instructors: { name: row.teacher },
  });
}

function sharedLessonIdFromLocation() {
  const match = location.pathname.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
  return match?.[0] || new URLSearchParams(location.search).get('lesson') || '';
}

async function loadSharedLesson(id) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/public_lesson_share`, {
    method: 'POST',
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_lesson_id: id }),
  });
  if (!response.ok) throw new Error('Lekci se nepodařilo načíst.');
  return response.json();
}

function showSharedLessonStatus(lesson, message) {
  document.querySelector('#booking-content').innerHTML = `<article class="booking-panel"><p class="eyebrow">Sdílená lekce</p><h2>${escapeHtml(lesson?.title || 'Lekce nenalezena')}</h2>${lesson ? `<div class="booking-summary"><span><b>${escapeHtml(lesson.day)} ${escapeHtml(lesson.date)}</b><br>${escapeHtml(lesson.time)}<br><small>${instructorRole(lesson.teacher)}: ${escapeHtml(instructorDisplayName(lesson.teacher))}</small></span><span>${escapeHtml(lesson.price)}</span></div>` : ''}<p class="form-hint">${escapeHtml(message)}</p>${lesson ? `<button class="button" type="button" data-share-lesson="${lesson.id}">Sdílet lekci</button>` : '<a class="button" href="/#lekce">Vybrat jinou lekci</a>'}</article>`;
  bindLessonShareButtons(document.querySelector('#booking-content'));
  dialog.showModal();
}

async function openSharedLessonFromUrl() {
  if (sharedLessonHandled) return;
  const id = sharedLessonIdFromLocation();
  if (!id) return;
  sharedLessonHandled = true;
  try {
    let lesson = lessons.find((item) => item.id === id);
    if (!lesson) {
      const shared = await loadSharedLesson(id);
      if (!shared) return showSharedLessonStatus(null, 'Tuto lekci se nepodařilo najít.');
      lesson = lessonFromShareData(shared);
    }
    if (lesson.status === 'cancelled') return showSharedLessonStatus(lesson, 'Tato lekce byla zrušena. Vyber si prosím jiný termín.');
    if (new Date(lesson.iso).getTime() + settingNumber('booking_grace_minutes') * 60_000 < Date.now()) return showSharedLessonStatus(lesson, 'Rezervace na tuto lekci už byla uzavřena. Vyber si prosím jiný termín.');
    if (!lessons.some((item) => item.id === lesson.id)) lessons.push(lesson);
    openBooking(lesson.id);
  } catch (error) {
    console.error(error);
    showSharedLessonStatus(null, 'Lekci se teď nepodařilo načíst. Zkus to prosím znovu.');
  }
}

async function loadLessons() {
  const bookingCutoff = new Date(Date.now() - settingNumber('booking_grace_minutes') * 60_000);
  const query = new URLSearchParams({
    select: 'id,instructor_id,title,starts_at,ends_at,capacity,booked_count,location,language,payment_mode,price_czk,payment_note,minimum_attendance,low_attendance_confirmed_at,instructors(name)',
    status: 'eq.published',
    starts_at: `gte.${bookingCutoff.toISOString()}`,
    order: 'starts_at.asc',
  });
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/lessons?${query}`, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
    });
    if (!response.ok) throw new Error('Termíny se nepodařilo načíst.');
    lessons = (await response.json()).map(lessonFromDatabase);
    renderLessons(document.querySelector('.filter.active')?.dataset.filter || 'all');
    renderNextClass();
    renderPublicCalendar(publicStudioBlocksError);
    await openSharedLessonFromUrl();
  } catch (error) {
    console.error(error);
    showToast('Živé termíny se nepodařilo načíst. Zobrazuji poslední dostupný přehled.');
    await openSharedLessonFromUrl();
  }
}

async function loadPublicStudioBlocks() {
  const rangeEnd = addDays(publicCalendarStart, 7);
  try {
    const occupancyQuery = new URLSearchParams({
      select: 'starts_at,ends_at',
      starts_at: `lt.${rangeEnd.toISOString()}`,
      ends_at: `gt.${publicCalendarStart.toISOString()}`,
      order: 'starts_at.asc',
    });
    const lessonQuery = new URLSearchParams({
      select: 'id,title,starts_at,ends_at,instructors(name)',
      status: 'eq.published',
      starts_at: `lt.${rangeEnd.toISOString()}`,
      ends_at: `gt.${publicCalendarStart.toISOString()}`,
      order: 'starts_at.asc',
    });
    const [occupancyResponse, lessonResponse] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/studio_occupancy?${occupancyQuery}`, { headers: { apikey: SUPABASE_PUBLISHABLE_KEY } }),
      fetch(`${SUPABASE_URL}/rest/v1/lessons?${lessonQuery}`, { headers: { apikey: SUPABASE_PUBLISHABLE_KEY } }),
    ]);
    if (!occupancyResponse.ok || !lessonResponse.ok) throw new Error('Dostupnost studia se nepodařilo načíst.');
    publicStudioBlocks = (await occupancyResponse.json()).map((block, index) => ({
      id: `public-${index}`,
      kind: 'private',
      title: 'Studio obsazeno',
      startsAt: block.starts_at,
      endsAt: block.ends_at,
    }));
    publicCalendarLessons = (await lessonResponse.json()).map((lesson) => {
      const teacher = lesson.instructors?.name || '';
      return {
        id: lesson.id,
        kind: 'public',
        title: lesson.title,
        teacher,
        startsAt: lesson.starts_at,
        endsAt: lesson.ends_at,
      };
    });
    publicStudioBlocksError = '';
    renderPublicCalendar();
  } catch (error) {
    console.error(error);
    publicCalendarLessons = [];
    publicStudioBlocks = [];
    publicStudioBlocksError = 'Dostupnost neveřejných rezervací se nepodařilo načíst.';
    renderPublicCalendar(publicStudioBlocksError);
  }
}

function publicCalendarEvents() {
  return [...publicCalendarLessons, ...publicStudioBlocks];
}

function renderPublicCalendar(errorMessage = '') {
  const calendar = document.querySelector('#public-studio-calendar');
  if (!calendar) return;
  document.querySelector('#public-calendar-range').textContent = calendarRangeLabel(publicCalendarStart);
  calendar.innerHTML = errorMessage ? `<p class="calendar-error">${escapeHtml(errorMessage)}</p>` : calendarDays(publicCalendarStart, publicCalendarEvents());
}

async function movePublicCalendar(days) {
  publicCalendarStart = addDays(publicCalendarStart, days);
  await loadPublicStudioBlocks();
}

document.querySelector('#public-calendar-prev')?.addEventListener('click', () => movePublicCalendar(-7));
document.querySelector('#public-calendar-next')?.addEventListener('click', () => movePublicCalendar(7));

function instructorFromDatabase(row) {
  const donation = row.payment_mode === 'donation';
  return {
    id: row.id,
    name: row.name,
    photo: row.photo_url || '',
    styles: (row.styles || []).join(' · '),
    payment: donation ? (row.payment_note || 'Dobrovolný příspěvek') : `${row.price_czk || 0} Kč · ${row.payment_note || 'QR po skončení lekce'}`,
    charity: donation,
    bio: row.bio || '',
    quote: row.practice_quote || '',
    paymentMode: row.payment_mode,
    priceCzk: row.price_czk,
    paymentNote: row.payment_note || '',
  };
}

function renderPublicTeachers() {
  const grid = document.querySelector('#teachers-grid');
  if (!grid) return;
  grid.innerHTML = teachers.map((teacher, index) => {
    const photoOrientation = teacher.name.trim().toLocaleLowerCase('cs-CZ').startsWith('petr ') ? 'portrait' : 'landscape';
    return `<article class="teacher-card${index % 2 ? ' reverse' : ''}">
    <div class="teacher-photo teacher-photo-${photoOrientation}"><img src="${escapeHtml(teacher.photo)}" alt="${instructorRole(teacher.name)} jógy ${escapeHtml(instructorDisplayName(teacher.name))}"></div>
    <div class="teacher-card-copy">
      <p class="teacher-kicker">${escapeHtml(teacher.styles)}</p>
      <h3>${escapeHtml(instructorDisplayName(teacher.name))}</h3>
      <p>${escapeHtml(teacher.bio)}</p>
      ${teacher.quote ? `<blockquote>„${escapeHtml(teacher.quote)}“</blockquote>` : ''}
    </div>
  </article>`;
  }).join('');
}

function renderPublicNews() {
  const grid = document.querySelector('#news-grid');
  if (!grid) return;
  if (!newsItems.length) {
    grid.innerHTML = '<p class="news-empty">Nové zprávy ze studia právě připravujeme.</p>';
    return;
  }
  const allowedTones = new Set(['sage', 'clay', 'sand', 'ink']);
  grid.innerHTML = newsItems.map((item) => {
    const charityStory = item.id === 'e7c10ab2-3bba-419b-8c73-6139de7ed7ee'
      || ['cvičením pomáháme', 'jógou pomáháme'].includes(item.title.trim().toLocaleLowerCase('cs-CZ'));
    if (item.image_url) return `<article class="news-card featured" role="button" tabindex="0" data-news-detail="${escapeHtml(item.id)}" aria-label="Přečíst celý článek: ${escapeHtml(item.title)}"><img src="${escapeHtml(item.image_url)}" alt=""><div><span>Ze studia</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary || item.body)}</p>${charityStory ? '<p data-donation-summary hidden></p>' : ''}<strong class="news-card-action">Číst dál →</strong></div></article>`;
    const tone = `tone-${allowedTones.has(item.background_tone) ? item.background_tone : 'sage'}`;
    return `<article class="news-card text-card ${tone}${charityStory ? ' charity-card' : ''}" role="button" tabindex="0" data-news-detail="${escapeHtml(item.id)}" aria-label="Přečíst celý článek: ${escapeHtml(item.title)}">${charityStory ? '<img class="charity-logo" src="assets/dobry-andel-logo.svg" alt="Dobrý Anděl">' : ''}<span>${charityStory ? 'Dobrá věc' : 'Novinka'}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary || item.body)}</p>${charityStory ? '<p data-donation-summary hidden></p>' : ''}<strong class="news-card-action">Číst dál →</strong></article>`;
  }).join('');
  grid.querySelectorAll('[data-news-detail]').forEach((card) => {
    const openDetail = () => openNewsDetail(card.dataset.newsDetail);
    card.addEventListener('click', openDetail);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openDetail();
      }
    });
  });
  applyPublicSettings(publicSettings);
}

function openNewsDetail(id) {
  const item = newsItems.find((newsItem) => String(newsItem.id) === String(id));
  if (!item) return;
  document.querySelector('#booking-content').innerHTML = `<article class="booking-panel news-detail">
    <p class="eyebrow">Novinky a jógové tipy</p>
    <h2>${escapeHtml(item.title)}</h2>
    ${item.summary ? `<p class="news-detail-summary">${renderNewsText(item.summary)}</p>` : ''}
    ${item.image_url ? `<img src="${escapeHtml(item.image_url)}" alt="">` : ''}
    <div class="news-detail-body">${renderNewsText(item.body || item.summary || '')}</div>
  </article>`;
  dialog.showModal();
}

function openPrivateLessonInquiry(instructorName) {
  const openedAt = Date.now();
  document.querySelector('#booking-content').innerHTML = `<form class="booking-panel" id="private-lesson-form">
    <p class="eyebrow">Soukromá lekce</p><h2>${escapeHtml(instructorDisplayName(instructorName))}</h2>
    <p class="form-hint">Napiš krátce, o jakou lekci máš zájem. Zpráva přijde přímo vybranému lektorovi.</p>
    <div class="form-grid">
      <div class="field"><label for="private-name">Jméno a příjmení</label><input id="private-name" name="name" maxlength="120" autocomplete="name" required></div>
      <div class="field"><label for="private-email">E-mail</label><input id="private-email" name="email" type="email" maxlength="320" autocomplete="email" required></div>
      <div class="field full"><label for="private-phone">Telefon (nepovinné)</label><input id="private-phone" name="phone" type="tel" maxlength="40" autocomplete="tel"></div>
      <div class="field full"><label for="private-message">Co bys od lekce potřeboval/a?</label><textarea id="private-message" name="message" rows="5" minlength="10" maxlength="2000" required></textarea></div>
      <div hidden aria-hidden="true"><label>Web<input name="website" tabindex="-1" autocomplete="off"></label></div>
      <label class="checkbox field full"><input name="consent" type="checkbox" required><span>Souhlasím s odesláním údajů vybranému lektorovi a potvrzuji, že jsem se seznámil/a s <a href="/ochrana-osobnich-udaju" target="_blank" rel="noopener">informacemi o zpracování osobních údajů</a>.</span></label>
    </div>
    <button class="button" type="submit">Odeslat poptávku</button>
  </form>`;
  document.querySelector('#private-lesson-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.target.querySelector('[type="submit"]');
    const data = new FormData(event.target);
    button.disabled = true;
    button.textContent = 'Odesílám…';
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/contact-instructor`, {
        method: 'POST',
        headers: { apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instructorName,
          name: data.get('name'),
          email: data.get('email'),
          phone: data.get('phone'),
          message: data.get('message'),
          website: data.get('website'),
          consent: data.get('consent') === 'on',
          openedAt,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Poptávku se nepodařilo odeslat.');
      closeDialog();
      showToast(`Poptávka byla odeslána lektorovi ${instructorDisplayName(instructorName)}.`);
    } catch (error) {
      button.disabled = false;
      button.textContent = 'Odeslat poptávku';
      showToast(error.message);
    }
  });
  dialog.showModal();
}

document.querySelectorAll('[data-private-instructor]').forEach((button) => button.addEventListener('click', () => {
  openPrivateLessonInquiry(button.dataset.privateInstructor);
}));

async function loadPublicContent() {
  try {
    const [instructorsResponse, newsResponse] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/instructors?select=id,name,bio,practice_quote,styles,photo_url,payment_mode,price_czk,payment_note&active=eq.true&order=sort_order.asc`, { headers: { apikey: SUPABASE_PUBLISHABLE_KEY } }),
      fetch(`${SUPABASE_URL}/rest/v1/news_items?select=id,title,summary,body,image_url,published_at,display_order,background_tone&published_at=not.is.null&order=display_order.asc,created_at.desc`, { headers: { apikey: SUPABASE_PUBLISHABLE_KEY } }),
    ]);
    if (instructorsResponse.ok) {
      const rows = await instructorsResponse.json();
      if (rows.length) teachers = rows.map(instructorFromDatabase);
      renderPublicTeachers();
    }
    if (newsResponse.ok) {
      newsItems = await newsResponse.json();
      renderPublicNews();
    }
  } catch (error) {
    console.error('Veřejný obsah se nepodařilo načíst.', error);
  }
}

function openCancellation(token) {
  document.querySelector('#booking-content').innerHTML = `<div class="booking-panel">
    <p class="eyebrow">Zrušení rezervace</p><h2>Opravdu chceš rezervaci zrušit?</h2>
    <p>Zrušení je bezplatné nejpozději ${settingNumber('cancellation_hours')} hodin před začátkem lekce.</p>
    <button class="button" type="button" data-confirm-cancel>Zrušit rezervaci</button>
  </div>`;
  document.querySelector('[data-confirm-cancel]').addEventListener('click', async (event) => {
    event.target.disabled = true;
    event.target.textContent = 'Ruším…';
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/cancel-reservation`, {
        method: 'POST',
        headers: { apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Rezervaci se nepodařilo zrušit.');
      closeDialog();
      history.replaceState({}, '', `${location.pathname}${location.hash}`);
      await loadLessons();
      showToast(result.alreadyCancelled ? 'Rezervace už byla zrušená.' : 'Rezervace byla zrušená.');
    } catch (error) {
      event.target.disabled = false;
      event.target.textContent = 'Zrušit rezervaci';
      showToast(error.message);
    }
  });
  dialog.showModal();
}

function closeDialog() {
  if (dialog.open) dialog.close();
  document.querySelector('#booking-content').replaceChildren();
}

document.querySelector('.dialog-close').addEventListener('click', closeDialog);

function showToast(message) {
  if (dialog.open) {
    const panel = dialog.querySelector('.booking-panel') || document.querySelector('#booking-content');
    let feedback = dialog.querySelector('.dialog-feedback');
    if (!feedback) {
      feedback = document.createElement('p');
      feedback.className = 'dialog-feedback';
      feedback.setAttribute('role', 'alert');
      const submitButton = panel.querySelector('[type="submit"]');
      if (submitButton) submitButton.insertAdjacentElement('beforebegin', feedback);
      else panel.append(feedback);
    }
    feedback.textContent = message;
    feedback.scrollIntoView({ block: 'nearest' });
    return;
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3800);
}

dialog.addEventListener('submit', () => dialog.querySelector('.dialog-feedback')?.remove(), true);

const publicView = document.querySelector('#public-view');
const accountView = document.querySelector('#account-view');
const accountPanel = document.querySelector('#account-panel');
const adminView = document.querySelector('#admin-view');
const adminSidebar = document.querySelector('.admin-sidebar');

function saveUserSession(result) {
  userSession = {
    access_token: result.access_token,
    refresh_token: result.refresh_token,
    expires_at: result.expires_at || Math.floor(Date.now() / 1000) + Number(result.expires_in || 3600),
  };
  localStorage.setItem('jogaUserSession', JSON.stringify(userSession));
}

function clearUserSession() {
  userSession = null;
  accountData = null;
  accountRecoveryMode = false;
  localStorage.removeItem('jogaUserSession');
}

async function refreshUserSession() {
  if (!userSession?.refresh_token) return false;
  if (userRefreshPromise) return userRefreshPromise;
  userRefreshPromise = (async () => {
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: userSession.refresh_token }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.access_token || !result.refresh_token) {
        clearUserSession();
        return false;
      }
      saveUserSession(result);
      return true;
    } catch {
      clearUserSession();
      return false;
    } finally {
      userRefreshPromise = null;
    }
  })();
  return userRefreshPromise;
}

async function accountApi(payload, retry = true) {
  if (userSession?.expires_at && userSession.expires_at <= Math.floor(Date.now() / 1000) + 30) {
    await refreshUserSession();
  }
  const response = await fetch(`${SUPABASE_URL}/functions/v1/account`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
      ...(userSession?.access_token ? { Authorization: `Bearer ${userSession.access_token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (response.status === 401 && retry && await refreshUserSession()) return accountApi(payload, false);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || 'Požadavek se nepodařilo dokončit.');
  return result;
}

async function loadAccountData() {
  const result = await accountApi({ action: 'dashboard' });
  accountData = result;
  return result;
}

async function journeyRpc(functionName, payload = {}) {
  if (userSession?.expires_at && userSession.expires_at <= Math.floor(Date.now() / 1000) + 30) {
    await refreshUserSession();
  }
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${functionName}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${userSession.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const result = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const code = result?.message || '';
    if (code.includes('PUBLIC_NAME_REQUIRED')) throw new Error('Pro veřejné zobrazení vyplň veřejné jméno.');
    if (code.includes('INVALID_PUBLIC_NAME')) throw new Error('Veřejné jméno musí mít 2 až 40 znaků.');
    throw new Error('Nastavení Cesty praxe se nepodařilo uložit.');
  }
  return result;
}

function journeyPanel(data) {
  const attendedCount = Number(data.journey?.attendedCount || 0);
  const current = journeyMilestone(attendedCount);
  const next = nextJourneyMilestone(attendedCount);
  const progress = journeyProgress(attendedCount, current, next);
  const achieved = JOURNEY_MILESTONES.filter((item) => attendedCount >= item.count);
  const lessonsLeft = next ? next.count - attendedCount : 0;
  const remainingText = next
    ? `${lessonsLeft} ${lessonsLeft === 1 ? 'lekce' : lessonsLeft < 5 ? 'lekce' : 'lekcí'} do milníku ${next.name}`
    : 'Nejvyšší milník je dosažený';
  const milestoneNotice = current.count > Number(data.journey?.lastMilestoneSeen || 0)
    ? `<div class="journey-celebration"><p class="eyebrow">Nový milník</p><h3>${escapeHtml(current.name)}</h3><p>Máš za sebou ${attendedCount} společných ${attendedCount === 1 ? 'lekci' : attendedCount < 5 ? 'lekce' : 'lekcí'}. Děkujeme, že tvoříš Jógu na HALLU s námi.</p></div>`
    : '';

  return `<div class="account-dashboard-content journey-account">
    ${milestoneNotice}
    <section class="journey-summary">
      <div><p class="eyebrow">Tvůj současný status</p><h2>${escapeHtml(current.name)}</h2><p>${escapeHtml(current.note)}</p></div>
      <strong>${attendedCount}<small>absolvovaných lekcí</small></strong>
    </section>
    <section class="account-card">
      <div class="journey-progress-copy"><b>${escapeHtml(remainingText)}</b><span>${next ? `${attendedCount} / ${next.count}` : '500+'}</span></div>
      <div class="journey-progress" role="progressbar" aria-valuenow="${Math.round(progress)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${progress}%"></i></div>
      <p class="form-hint">Každá lekce se počítá. Pravidelnost dělá rozdíl.</p>
    </section>
    <section class="account-card">
      <div class="account-card-heading"><div><p class="eyebrow">Tvoje milníky</p><h2>Dosavadní cesta</h2></div><a class="text-button" href="/cesta-praxe">Zobrazit Cestu jógové praxe</a></div>
      <div class="journey-earned">${achieved.length ? achieved.map((item) => `<div><span>${item.count}</span><b>${escapeHtml(item.name)}</b></div>`).join('') : '<p class="account-empty">První milník získáš po své první absolvované lekci.</p>'}</div>
    </section>
    <section class="account-card">
      <div class="account-card-heading"><div><p class="eyebrow">Dobrovolné nastavení</p><h2>Společně na cestě</h2></div></div>
      <p class="form-hint">Veřejné zobrazení je nepovinné. E-mail ani celé jméno nikdy nezveřejníme.</p>
      <form class="journey-visibility-form" data-journey-settings>
        <div class="field"><label for="journey-public-name">Veřejné jméno nebo přezdívka</label><input id="journey-public-name" name="publicDisplayName" maxlength="40" value="${escapeHtml(data.profile.publicDisplayName || '')}" placeholder="Například Petr B."><small>Takto se zobrazíš na veřejné stránce.</small></div>
        <label class="checkbox"><input name="leaderboardOptIn" type="checkbox" ${data.profile.leaderboardOptIn ? 'checked' : ''}><span>Chci se dobrovolně zobrazovat mezi prvními 20 účastníky na stránce Cesta jógové praxe.</span></label>
        <button class="button button-small" type="submit">Uložit nastavení</button>
      </form>
    </section>
  </div>`;
}

function accountLessonCard(reservation, upcoming) {
  const startsAt = new Date(reservation.startsAt);
  const day = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', timeZone: 'Europe/Prague' }).format(startsAt);
  const month = new Intl.DateTimeFormat('cs-CZ', { month: 'short', timeZone: 'Europe/Prague' }).format(startsAt).replace('.', '');
  const date = new Intl.DateTimeFormat('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Europe/Prague' }).format(startsAt);
  const status = reservation.status === 'cancelled' ? 'Zrušeno' : reservation.status === 'attended' ? 'Zúčastnil/a ses' : reservation.status === 'no_show' ? 'Nedorazil/a' : upcoming ? 'Rezervováno' : 'Lekce proběhla';
  const canCancel = upcoming && reservation.status === 'confirmed' && new Date(reservation.cancelBefore) >= new Date();
  const paymentLabel = reservation.paymentMode === 'donation' ? 'Dobrovolný příspěvek' : `${reservation.priceCzk ?? 0} Kč`;
  const paymentQr = reservation.status === 'attended' && reservation.paymentQrUrl
    ? `<button class="account-payment-qr" type="button" data-account-payment="${reservation.id}" aria-label="Zvětšit QR kód k platbě"><img src="${escapeHtml(reservation.paymentQrUrl)}" alt=""><span>${escapeHtml(paymentLabel)}</span></button>`
    : '';
  const calendarAction = upcoming && reservation.status === 'confirmed' ? calendarControls(reservation.id, 'account', true) : '';
  return `<article class="account-lesson-card${reservation.status === 'cancelled' ? ' is-cancelled' : ''}"><div class="account-lesson-date"><strong>${escapeHtml(day)}</strong><span>${escapeHtml(month)}</span></div><div class="account-lesson-details"><h3>${escapeHtml(reservation.title)}</h3><p>${escapeHtml(date)}<br>${instructorRole(reservation.teacher)}: ${escapeHtml(instructorDisplayName(reservation.teacher))}<br>${escapeHtml(reservation.location)}</p></div><div class="account-lesson-actions"><span class="status-pill${reservation.status === 'cancelled' ? ' warn' : ''}">${status}</span>${calendarAction}${paymentQr}${canCancel ? `<button class="text-button" type="button" data-account-cancel="${reservation.id}">Zrušit rezervaci</button>` : ''}</div></article>`;
}

function openAccountPaymentQr(reservationId) {
  const reservation = accountData?.reservations.find((item) => item.id === reservationId);
  if (!reservation?.paymentQrUrl || reservation.status !== 'attended') return;
  const donation = reservation.paymentMode === 'donation';
  const paymentLabel = donation ? 'Dobrovolný příspěvek' : `${reservation.priceCzk ?? 0} Kč`;
  document.querySelector('#booking-content').innerHTML = `<div class="booking-panel account-payment-panel"><p class="eyebrow">Platba po lekci</p><h2>${escapeHtml(reservation.title)}</h2><img class="account-payment-qr-large" src="${escapeHtml(reservation.paymentQrUrl)}" alt="QR kód – ${escapeHtml(paymentLabel)}"><strong class="account-payment-amount">${escapeHtml(paymentLabel)}</strong>${reservation.paymentNote ? `<p class="form-hint">${escapeHtml(reservation.paymentNote)}</p>` : ''}</div>`;
  dialog.showModal();
}

function openAccountDeletion() {
  document.querySelector('#booking-content').innerHTML = `<form class="booking-panel" id="account-delete-form"><p class="eyebrow">Smazání účtu</p><h2>Opravdu smazat účet?</h2><p class="form-hint">Profil bude odstraněn a dřívější rezervace se od něj odpojí. Tuto akci nelze vrátit zpět.</p><div class="field"><label for="account-delete-password">Současné heslo</label><input id="account-delete-password" name="password" type="password" autocomplete="current-password" required></div><div class="field"><label for="account-delete-confirmation">Pro potvrzení napiš SMAZAT</label><input id="account-delete-confirmation" name="confirmation" autocomplete="off" required></div><button class="button" type="submit">Smazat účet</button></form>`;
  document.querySelector('#account-delete-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.target.querySelector('[type="submit"]');
    const data = new FormData(event.target);
    if (String(data.get('confirmation')).trim().toLocaleUpperCase('cs-CZ') !== 'SMAZAT') {
      return showToast('Pro potvrzení napiš přesně SMAZAT.');
    }
    if (!confirm('Opravdu chceš účet trvale smazat?')) return;
    button.disabled = true;
    try {
      const result = await accountApi({ action: 'delete-account', password: data.get('password') });
      closeDialog();
      clearUserSession();
      renderAccountLogin(result.adminAccessPreserved
        ? 'Účastnický účet byl smazán. Přístup do administrace zůstal zachovaný.'
        : 'Účet byl smazán.');
    } catch (error) {
      button.disabled = false;
      showToast(error.message);
    }
  });
  dialog.showModal();
}

function openAccountProfileEditor() {
  const profile = accountData.profile;
  document.querySelector('#booking-content').innerHTML = `<form class="booking-panel" id="account-profile-form"><p class="eyebrow">Nastavení účtu</p><h2>Osobní údaje</h2><div class="field"><label for="account-full-name">Jméno a příjmení</label><input id="account-full-name" name="fullName" maxlength="120" value="${escapeHtml(profile.fullName)}" autocomplete="name" required></div><div class="field"><label for="account-relation">Jdu jako</label><select id="account-relation" name="relation"><option value="employee" ${profile.relation === 'employee' ? 'selected' : ''}>Zaměstnanec Alzy</option><option value="guest" ${profile.relation === 'guest' ? 'selected' : ''}>Host / externista</option></select></div><button class="button" type="submit">Uložit údaje</button></form>`;
  document.querySelector('#account-profile-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.target.querySelector('[type="submit"]');
    const data = new FormData(event.target);
    button.disabled = true;
    try {
      await accountApi({ action: 'update-profile', fullName: data.get('fullName'), relation: data.get('relation') });
      closeDialog();
      await renderAccountDashboard();
      showToast('Údaje jsou uložené.');
    } catch (error) {
      button.disabled = false;
      showToast(error.message);
    }
  });
  dialog.showModal();
}

function openAccountPasswordEditor() {
  document.querySelector('#booking-content').innerHTML = `<form class="booking-panel" id="account-password-form"><p class="eyebrow">Nastavení účtu</p><h2>${accountRecoveryMode ? 'Nové heslo' : 'Změna hesla'}</h2><div class="field"><label for="account-password-new">Nové heslo</label><input id="account-password-new" name="password" type="password" minlength="12" autocomplete="new-password" required><small>Alespoň 12 znaků.</small></div><div class="field"><label for="account-password-confirm">Nové heslo znovu</label><input id="account-password-confirm" name="passwordConfirm" type="password" minlength="12" autocomplete="new-password" required></div><button class="button" type="submit">Změnit heslo</button></form>`;
  document.querySelector('#account-password-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.target.querySelector('[type="submit"]');
    const data = new FormData(event.target);
    if (data.get('password') !== data.get('passwordConfirm')) return showToast('Zadaná hesla se neshodují.');
    button.disabled = true;
    try {
      await accountApi({ action: 'change-password', password: data.get('password') });
      accountRecoveryMode = false;
      closeDialog();
      await renderAccountDashboard();
      showToast('Heslo bylo změněno.');
    } catch (error) {
      button.disabled = false;
      showToast(error.message);
    }
  });
  dialog.showModal();
}

function bindAccountDashboard() {
  bindCalendarButtons(accountPanel);
  accountPanel.querySelectorAll('[data-account-tab]').forEach((button) => button.addEventListener('click', async () => {
    activeAccountTab = button.dataset.accountTab;
    await renderAccountDashboard();
  }));
  accountPanel.querySelectorAll('[data-account-cancel]').forEach((button) => button.addEventListener('click', async () => {
    if (!confirm('Opravdu chceš tuto rezervaci zrušit?')) return;
    button.disabled = true;
    try {
      await accountApi({ action: 'cancel-reservation', reservationId: button.dataset.accountCancel });
      await Promise.all([renderAccountDashboard(), loadLessons()]);
      showToast('Rezervace byla zrušená.');
    } catch (error) {
      button.disabled = false;
      showToast(error.message);
    }
  }));
  accountPanel.querySelectorAll('[data-account-payment]').forEach((button) => button.addEventListener('click', () => openAccountPaymentQr(button.dataset.accountPayment)));
  accountPanel.querySelector('[data-account-logout]')?.addEventListener('click', () => {
    clearUserSession();
    renderAccountLogin('Byl/a jsi odhlášen/a.');
  });
  accountPanel.querySelector('[data-account-edit-profile]')?.addEventListener('click', openAccountProfileEditor);
  accountPanel.querySelector('[data-account-edit-password]')?.addEventListener('click', openAccountPasswordEditor);
  accountPanel.querySelector('[data-account-delete]')?.addEventListener('click', openAccountDeletion);
  accountPanel.querySelector('[data-journey-settings]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.target.querySelector('[type="submit"]');
    const formData = new FormData(event.target);
    const publicDisplayName = String(formData.get('publicDisplayName') || '').trim();
    const leaderboardOptIn = formData.get('leaderboardOptIn') === 'on';
    if (leaderboardOptIn && publicDisplayName.length < 2) {
      showToast('Pro veřejné zobrazení vyplň veřejné jméno.');
      return;
    }
    button.disabled = true;
    try {
      await journeyRpc('account_update_journey', {
        p_public_display_name: publicDisplayName || null,
        p_leaderboard_opt_in: leaderboardOptIn,
      });
      await renderAccountDashboard();
      showToast('Nastavení Cesty praxe je uložené.');
    } catch (error) {
      button.disabled = false;
      showToast(error.message);
    }
  });
}

async function renderAccountDashboard() {
  const data = await loadAccountData();
  if (accountRecoveryMode) activeAccountTab = 'settings';
  const now = new Date();
  const upcoming = data.reservations.filter((item) => new Date(item.startsAt) >= now && item.status !== 'cancelled').sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
  const history = data.reservations.filter((item) => new Date(item.startsAt) < now && item.status !== 'cancelled').sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt));
  const relation = data.profile.relation === 'guest' ? 'Host / externista' : 'Zaměstnanec Alzy';
  const lessonsPanel = `<div class="account-dashboard-content"><section class="account-card account-reservations"><div class="account-card-heading"><div><p class="eyebrow">Co tě čeká</p><h2>Naplánované lekce</h2></div>${upcoming.length ? '<a class="text-button" href="#lekce">Vybrat další lekci</a>' : ''}</div><div class="account-lesson-list">${upcoming.map((item) => accountLessonCard(item, true)).join('') || '<div class="account-empty-state"><h3>Zatím nemáš naplánovanou žádnou lekci</h3><p>Vyber si termín, který ti vyhovuje.</p><a class="button button-small" href="#lekce">Vybrat lekci</a></div>'}</div></section><section class="account-card account-history"><div class="account-card-heading"><div><p class="eyebrow">Tvoje praxe</p><h2>Historie lekcí</h2></div></div><div class="account-lesson-list">${history.map((item) => accountLessonCard(item, false)).join('') || '<p class="account-empty">Historie je zatím prázdná.</p>'}</div></section></div>`;
  const journey = journeyPanel(data);
  const settingsPanel = `<section class="account-card account-settings"><div class="account-card-heading"><div><p class="eyebrow">Přihlášení a profil</p><h2>Nastavení účtu</h2></div></div><div class="account-setting-row"><div><h3>Osobní údaje</h3><p>${escapeHtml(data.profile.fullName)} · ${escapeHtml(relation)}<br>${escapeHtml(data.email)}</p></div><button class="button button-small button-secondary" type="button" data-account-edit-profile>Upravit</button></div><div class="account-setting-row"><div><h3>Heslo</h3><p>Změň si heslo používané k přihlášení.</p></div><button class="button button-small button-secondary" type="button" data-account-edit-password>Změnit heslo</button></div><div class="account-setting-row account-setting-danger"><div><h3>Smazání účtu</h3><p>Profil se odstraní a dřívější rezervace se od něj odpojí.</p></div><button class="text-button danger" type="button" data-account-delete>Smazat účet</button></div></section>`;
  accountPanel.innerHTML = `${accountRecoveryMode ? '<div class="account-notice"><strong>Nastav si nové heslo.</strong> Odkaz z e-mailu byl ověřený.</div>' : ''}<div class="account-profile-bar"><div class="account-avatar" aria-hidden="true">${escapeHtml(data.profile.fullName.trim().charAt(0).toLocaleUpperCase('cs-CZ'))}</div><div><h2>${escapeHtml(data.profile.fullName)}</h2><p>${escapeHtml(data.email)} <span>·</span> ${escapeHtml(relation)}</p></div><button class="text-button" type="button" data-account-logout>Odhlásit se</button></div><div class="account-tabs" role="tablist" aria-label="Obsah účtu"><button type="button" role="tab" aria-selected="${activeAccountTab === 'lessons'}" class="${activeAccountTab === 'lessons' ? 'active' : ''}" data-account-tab="lessons">Moje lekce</button><button type="button" role="tab" aria-selected="${activeAccountTab === 'journey'}" class="${activeAccountTab === 'journey' ? 'active' : ''}" data-account-tab="journey">Moje cesta</button><button type="button" role="tab" aria-selected="${activeAccountTab === 'settings'}" class="${activeAccountTab === 'settings' ? 'active' : ''}" data-account-tab="settings">Nastavení účtu</button></div>${activeAccountTab === 'settings' ? settingsPanel : activeAccountTab === 'journey' ? journey : lessonsPanel}`;
  bindAccountDashboard();
  const currentMilestone = journeyMilestone(Number(data.journey?.attendedCount || 0));
  if (activeAccountTab === 'journey' && currentMilestone.count > Number(data.journey?.lastMilestoneSeen || 0)) {
    journeyRpc('account_mark_milestone_seen', { p_milestone: currentMilestone.count }).catch(() => {});
  }
  if (accountRecoveryMode && !dialog.open) openAccountPasswordEditor();
}

function openRecoveryRequest() {
  document.querySelector('#booking-content').innerHTML = `<form class="booking-panel" id="recovery-form"><p class="eyebrow">Obnova přístupu</p><h2>Zapomenuté heslo</h2><p class="form-hint">Pošleme ti bezpečný odkaz pro nastavení nového hesla.</p><div class="field"><label for="recovery-email">E-mail</label><input id="recovery-email" name="email" type="email" autocomplete="email" required></div><button class="button" type="submit">Odeslat odkaz</button></form>`;
  document.querySelector('#recovery-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.target.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      const result = await accountApi({ action: 'recover', email: new FormData(event.target).get('email') });
      closeDialog();
      showToast(result.message);
    } catch (error) {
      button.disabled = false;
      showToast(error.message);
    }
  });
  dialog.showModal();
}

function renderAccountLogin(message = '') {
  accountPanel.innerHTML = `${message ? `<p class="account-notice">${escapeHtml(message)}</p>` : ''}<div class="account-grid">
    <form class="account-card account-form" id="account-login-form"><p class="eyebrow">Mám účet</p><h2>Přihlášení</h2><div class="field"><label for="user-login-email">E-mail</label><input id="user-login-email" name="email" type="email" autocomplete="email" required></div><div class="field"><label for="user-login-password">Heslo</label><input id="user-login-password" name="password" type="password" autocomplete="current-password" required></div><button class="button" type="submit">Přihlásit se</button><button class="text-button account-recovery-link" type="button" data-account-recovery>Zapomenuté heslo</button></form>
    <form class="account-card account-form" id="account-register-form"><p class="eyebrow">Nový účet</p><h2>Vytvoření účtu</h2><p class="form-hint">Účet je dobrovolný. Existující správce se může přihlásit stejným e-mailem a heslem jako do administrace.</p><div class="field"><label for="user-register-name">Jméno a příjmení</label><input id="user-register-name" name="fullName" maxlength="120" autocomplete="name" required></div><div class="field"><label for="user-register-email">E-mail</label><input id="user-register-email" name="email" type="email" maxlength="320" autocomplete="email" required></div><div class="field"><label for="user-register-relation">Jdu jako</label><select id="user-register-relation" name="relation"><option value="employee">Zaměstnanec Alzy</option><option value="guest">Host / externista</option></select></div><div class="field"><label for="user-register-password">Heslo</label><input id="user-register-password" name="password" type="password" minlength="12" autocomplete="new-password" required><small>Alespoň 12 znaků.</small></div><label class="checkbox"><input name="consent" type="checkbox" required><span>Souhlasím s <a href="/podminky" target="_blank" rel="noopener">podmínkami</a> a seznámil/a jsem se s <a href="/ochrana-osobnich-udaju" target="_blank" rel="noopener">ochranou osobních údajů</a>.</span></label><button class="button" type="submit">Vytvořit účet</button></form>
  </div>`;
  accountPanel.querySelector('#account-login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.target.querySelector('[type="submit"]');
    const data = new FormData(event.target);
    button.disabled = true;
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: data.get('email'), password: data.get('password') }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error('E-mail nebo heslo není správné.');
      saveUserSession(result);
      await renderAccountDashboard();
    } catch (error) {
      button.disabled = false;
      showToast(error.message);
    }
  });
  accountPanel.querySelector('#account-register-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.target.querySelector('[type="submit"]');
    const data = new FormData(event.target);
    button.disabled = true;
    try {
      const result = await accountApi({ action: 'register', fullName: data.get('fullName'), email: data.get('email'), relation: data.get('relation'), password: data.get('password') });
      event.target.reset();
      button.disabled = false;
      showToast(result.message);
    } catch (error) {
      button.disabled = false;
      showToast(error.message);
    }
  });
  accountPanel.querySelector('[data-account-recovery]').addEventListener('click', openRecoveryRequest);
}

async function openAccount() {
  publicView.hidden = true;
  adminView.hidden = true;
  accountView.hidden = false;
  document.querySelector('.site-header').hidden = false;
  document.querySelector('.announcement').hidden = true;
  document.querySelector('footer').hidden = false;
  try {
    if (userSession) await renderAccountDashboard();
    else renderAccountLogin();
  } catch {
    clearUserSession();
    renderAccountLogin('Přihlášení vypršelo. Přihlas se prosím znovu.');
  }
  window.scrollTo(0, 0);
}

function showPublicView() {
  adminView.hidden = true;
  accountView.hidden = true;
  publicView.hidden = false;
  document.querySelector('.site-header').hidden = false;
  document.querySelector('.announcement').hidden = false;
  document.querySelector('footer').hidden = false;
}

function setAdminAuthenticatedLayout(isAuthenticated) {
  adminView.classList.toggle('admin-login-mode', !isAuthenticated);
  adminSidebar.hidden = !isAuthenticated;
}

function adminTabFromHash(hash = location.hash) {
  const match = hash.match(/^#admin(?:\/([^/?]+))?$/);
  if (!match) return null;
  return match[1] ? ADMIN_SLUG_TABS[match[1]] || null : 'overview';
}

function setAdminTabUrl(tab, { replace = false } = {}) {
  const hash = `#admin/${ADMIN_TAB_SLUGS[tab] || ADMIN_TAB_SLUGS.overview}`;
  if (location.hash === hash) return;
  const method = replace ? 'replaceState' : 'pushState';
  history[method]({}, '', `${location.pathname}${location.search}${hash}`);
}

function scrollAdminToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  adminView.scrollTop = 0;
  document.querySelector('.admin-content').scrollTop = 0;
}

async function openAdmin({ updateUrl = true } = {}) {
  const requestedTab = adminTabFromHash() || 'overview';
  if (updateUrl) setAdminTabUrl(requestedTab);
  publicView.hidden = true;
  accountView.hidden = true;
  document.querySelector('.site-header').hidden = true;
  document.querySelector('.announcement').hidden = true;
  document.querySelector('footer').hidden = true;
  adminView.hidden = false;
  document.querySelector('#admin-title').textContent = 'Správa studia';
  scrollAdminToTop();
  setAdminAuthenticatedLayout(false);
  const adminSessionValidity = adminSession ? await isAdminSessionValid() : false;
  if (adminSessionValidity === true) {
    setAdminAuthenticatedLayout(true);
    document.querySelector('#admin-panel').innerHTML = '<div class="admin-card"><p>Načítám administraci…</p></div>';
    try {
      await loadAdminCapabilities();
      await loadAdminTabData(requestedTab);
      renderAdmin(requestedTab);
    } catch (error) {
      document.querySelector('#admin-panel').innerHTML = '<div class="admin-card"><h2>Administraci se nepodařilo načíst</h2><p>Zkus prosím záložku otevřít znovu.</p></div>';
      showToast(error.message);
    }
  } else if (adminSessionValidity === false) {
    clearAdminSession();
    renderAdminLogin();
  } else {
    setAdminAuthenticatedLayout(true);
    document.querySelector('#admin-panel').innerHTML = '<div class="admin-card"><h2>Administraci se nepodařilo připojit</h2><p>Přihlášení zůstalo uložené. Zkontroluj připojení a obnov stránku.</p></div>';
  }
  scrollAdminToTop();
  requestAnimationFrame(scrollAdminToTop);
}

function closeAdmin() {
  setAdminMenuOpen(false);
  showPublicView();
  window.scrollTo(0, 0);
}

document.querySelectorAll('[data-open-admin]').forEach((button) => button.addEventListener('click', (event) => {
  event.preventDefault();
  event.currentTarget.blur();
  openAdmin();
}));

document.querySelectorAll('[data-close-admin]').forEach((button) => button.addEventListener('click', () => {
  history.pushState({}, '', `${location.pathname}${location.search}#top`);
  closeAdmin();
}));

window.addEventListener('hashchange', async () => {
  if (adminTabFromHash()) await openAdmin({ updateUrl: false });
  else if (location.hash === '#ucet') await openAccount();
  else if (!adminView.hidden || !accountView.hidden) showPublicView();
});

function clearAdminSession() {
  adminSession = null;
  adminLessons = [];
  adminInstructors = [];
  adminNews = [];
  adminReservations = [];
  adminFeedback = [];
  adminStudioBlocks = [];
  adminCanManageAdmins = false;
  adminAccounts = [];
  adminGreeting = 'Dobrý den';
  adminShowCancelledLessons = false;
  adminSettings = { ...PUBLIC_SETTING_DEFAULTS };
  localStorage.removeItem('jogaAdminSession');
  sessionStorage.removeItem('jogaAdminSession');
}

function saveAdminSession(result) {
  adminSession = {
    access_token: result.access_token,
    refresh_token: result.refresh_token,
    expires_at: result.expires_at || Math.floor(Date.now() / 1000) + Number(result.expires_in || 3600),
  };
  localStorage.setItem('jogaAdminSession', JSON.stringify(adminSession));
  sessionStorage.removeItem('jogaAdminSession');
}

async function refreshAdminSession() {
  if (!adminSession?.refresh_token) return false;
  if (adminRefreshPromise) return adminRefreshPromise;
  adminRefreshPromise = (async () => {
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: adminSession.refresh_token }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (![400, 401, 403].includes(response.status)) return null;
        clearAdminSession();
        return false;
      }
      if (result.user?.app_metadata?.role !== 'admin' || !result.access_token || !result.refresh_token) {
        clearAdminSession();
        return false;
      }
      saveAdminSession(result);
      return true;
    } catch {
      return null;
    }
  })();
  try {
    return await adminRefreshPromise;
  } finally {
    adminRefreshPromise = null;
  }
}

async function adminFetch(url, options = {}) {
  const expiresSoon = Number(adminSession?.expires_at || 0) * 1000 <= Date.now() + 60_000;
  if (expiresSoon) {
    const refreshResult = await refreshAdminSession();
    if (refreshResult === null) throw new Error('Přihlášení se nyní nepodařilo ověřit. Zkontroluj připojení a zkus to znovu.');
  }
  const send = () => fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${adminSession?.access_token || ''}`,
    },
  });
  let response = await send();
  if ([401, 403].includes(response.status)) {
    const refreshResult = await refreshAdminSession();
    if (refreshResult === true) response = await send();
    else if (refreshResult === null) throw new Error('Přihlášení se nyní nepodařilo ověřit. Zkontroluj připojení a zkus to znovu.');
  }
  return response;
}

async function isAdminSessionValid() {
  if (!adminSession?.access_token || !adminSession?.refresh_token) return false;
  try {
    const response = await adminFetch(`${SUPABASE_URL}/auth/v1/user`);
    if ([401, 403].includes(response.status)) return false;
    if (!response.ok) return null;
    const user = await response.json();
    return user.app_metadata?.role === 'admin';
  } catch {
    return null;
  }
}

async function loadAdminLessons() {
  const historyStart = new Date();
  historyStart.setMonth(historyStart.getMonth() - 12);
  const query = new URLSearchParams({
    select: 'id,instructor_id,title,starts_at,ends_at,capacity,booked_count,status,location,language,payment_mode,price_czk,payment_note,minimum_attendance,low_attendance_confirmed_at,instructors(name)',
    starts_at: `gte.${historyStart.toISOString()}`,
    order: 'starts_at.asc',
  });
  const response = await adminFetch(`${SUPABASE_URL}/rest/v1/lessons?${query}`);
  if (!response.ok) throw new Error('Lekce pro správu se nepodařilo načíst.');
  adminLessons = (await response.json()).map(lessonFromDatabase);
}

async function loadAdminInstructors() {
  const query = new URLSearchParams({ select: 'id,name,bio,practice_quote,styles,photo_url,payment_mode,price_czk,payment_note,paid_qr_url,donation_qr_url,active,sort_order', order: 'sort_order.asc' });
  const [response, contacts] = await Promise.all([
    adminFetch(`${SUPABASE_URL}/rest/v1/instructors?${query}`),
    manageLesson({ action: 'instructor-contacts' }),
  ]);
  if (!response.ok) throw new Error('Lektory se nepodařilo načíst.');
  const emailByInstructor = new Map((contacts.instructors || []).map((contact) => [contact.instructor_id, contact.email]));
  adminInstructors = (await response.json()).map((teacher) => ({ ...teacher, email: emailByInstructor.get(teacher.id) || '' }));
}

async function loadAdminNews() {
  const query = new URLSearchParams({ select: 'id,title,summary,body,image_url,published_at,created_at,display_order,background_tone', order: 'display_order.asc,created_at.desc' });
  const response = await adminFetch(`${SUPABASE_URL}/rest/v1/news_items?${query}`);
  if (!response.ok) throw new Error('Novinky se nepodařilo načíst.');
  adminNews = await response.json();
}

async function loadAdminReservations() {
  const historyStart = new Date();
  historyStart.setMonth(historyStart.getMonth() - 12);
  const select = 'id,attendee_name,attendee_email,status,cancelled_at,late_cancelled_at,payment_waived_at,payment_email_sent_at,payment_email_last_resent_at,payment_email_recipient,created_at,lessons!inner(id,title,starts_at,ends_at,status,instructors(name))';
  const query = new URLSearchParams({ select, status: 'in.(confirmed,attended,no_show,cancelled)', 'lessons.starts_at': `gte.${historyStart.toISOString()}` });
  const response = await adminFetch(`${SUPABASE_URL}/rest/v1/reservations?${query}`);
  if (!response.ok) throw new Error('Účastníky se nepodařilo načíst.');
  adminReservations = (await response.json()).sort((a, b) => new Date(a.lessons.starts_at) - new Date(b.lessons.starts_at));
}

async function loadAdminFeedback() {
  const result = await manageLesson({ action: 'feedback-overview' });
  adminFeedback = result.feedback || [];
}

async function loadAdminStudioBlocks() {
  const historyStart = new Date();
  historyStart.setMonth(historyStart.getMonth() - 12);
  const query = new URLSearchParams({
    select: 'id,title,category,starts_at,ends_at,buffer_minutes,contact_name,contact_email,notes,created_at',
    ends_at: `gte.${historyStart.toISOString()}`,
    order: 'starts_at.asc',
  });
  const response = await adminFetch(`${SUPABASE_URL}/rest/v1/studio_blocks?${query}`);
  if (!response.ok) throw new Error('Neveřejné rezervace studia se nepodařilo načíst.');
  adminStudioBlocks = await response.json();
}

async function loadAdminSettings() {
  const query = new URLSearchParams({ select: 'key,value', order: 'key.asc' });
  const response = await adminFetch(`${SUPABASE_URL}/rest/v1/site_settings?${query}`);
  if (!response.ok) throw new Error('Nastavení se nepodařilo načíst.');
  adminSettings = (await response.json()).reduce((settings, row) => ({ ...settings, [row.key]: row.value }), { ...PUBLIC_SETTING_DEFAULTS });
}

async function loadAdminCapabilities() {
  const capabilities = await manageLesson({ action: 'capabilities' });
  adminCanManageAdmins = capabilities.canManageAdmins === true;
  adminCanDeleteLessons = capabilities.canDeleteLessons === true;
  adminGreeting = String(capabilities.greeting || 'Dobrý den');
  document.querySelector('#admin-title').textContent = adminGreeting;
}

async function loadAdminAccounts() {
  if (!adminCanManageAdmins) {
    adminAccounts = [];
    return;
  }
  const result = await manageLesson({ action: 'list-admins' });
  adminAccounts = result.admins || [];
}

async function loadAdminTabData(tab) {
  if (tab === 'overview') await Promise.all([loadAdminLessons(), loadAdminReservations(), loadAdminInstructors()]);
  if (tab === 'completed') await Promise.all([loadAdminLessons(), loadAdminReservations(), loadAdminFeedback(), loadAdminInstructors()]);
  if (tab === 'feedback') await Promise.all([loadAdminFeedback(), loadAdminInstructors()]);
  if (tab === 'calendar') await Promise.all([loadAdminLessons(), loadAdminStudioBlocks(), loadPublicStudioBlocks()]);
  if (tab === 'teachers') await loadAdminInstructors();
  if (tab === 'people') await loadAdminReservations();
  if (tab === 'content') await loadAdminNews();
  if (tab === 'accounts') await loadAdminAccounts();
  if (tab === 'settings') await Promise.all([loadAdminSettings(), loadAdminInstructors()]);
}

function renderAdminLogin(message = '') {
  setAdminAuthenticatedLayout(false);
  document.querySelector('#admin-title').textContent = 'Přihlášení do správy';
  const addButton = document.querySelector('#add-lesson');
  addButton.hidden = true;
  document.querySelector('#admin-logout').hidden = true;
  document.querySelector('#admin-panel').innerHTML = `<div class="admin-card"><h2>Správa lekcí</h2>
    <p>Přihlásit se může pouze účet s oprávněním administrátora.</p>
    ${message ? `<p><b>${escapeHtml(message)}</b></p>` : ''}
    <form id="admin-login-form" class="booking-panel">
      <div class="form-grid">
        <div class="field full"><label for="admin-email">E-mail</label><input id="admin-email" name="email" type="email" required autocomplete="username"></div>
        <div class="field full"><label for="admin-password">Heslo</label><input id="admin-password" name="password" type="password" required autocomplete="current-password"></div>
      </div>
      <button class="button" type="submit">Přihlásit se</button>
    </form>
  </div>`;
  document.querySelector('#admin-login-form').addEventListener('submit', signInAdmin);
}

async function signInAdmin(event) {
  event.preventDefault();
  const button = event.target.querySelector('[type="submit"]');
  const data = new FormData(event.target);
  button.disabled = true;
  button.textContent = 'Přihlašuji…';
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: data.get('email'), password: data.get('password') }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error('Přihlášení se nezdařilo. Zkontroluj e-mail a heslo.');
    if (result.user?.app_metadata?.role !== 'admin' || !result.access_token || !result.refresh_token) throw new Error('Tento účet nemá oprávnění správce.');
    saveAdminSession(result);
    const requestedTab = adminTabFromHash() || 'overview';
    await loadAdminCapabilities();
    await loadAdminTabData(requestedTab);
    renderAdmin(requestedTab);
    scrollAdminToTop();
    requestAnimationFrame(scrollAdminToTop);
  } catch (error) {
    if (adminSession) {
      setAdminAuthenticatedLayout(true);
      document.querySelector('#admin-panel').innerHTML = '<div class="admin-card"><h2>Administraci se nepodařilo načíst</h2><p>Přihlášení zůstalo uložené. Zkontroluj připojení a obnov stránku.</p></div>';
      showToast(error.message);
    } else {
      clearAdminSession();
      renderAdminLogin(error.message);
    }
  }
}

function lessonTable(sourceLessons = adminLessons, emptyMessage = 'Nejsou naplánované žádné lekce.') {
  const rows = sourceLessons.map((lesson) => {
    const cancelled = lesson.status === 'cancelled';
    const ended = new Date(lesson.endsAt) <= new Date();
    const belowMinimum = !cancelled && !ended && lesson.booked < lesson.minimumAttendance;
    const attendanceStatus = belowMinimum
      ? lesson.lowAttendanceConfirmedAt
        ? '<br><span class="attendance-note confirmed">Koná se i v menším počtu</span>'
        : `<br><span class="attendance-note">Chybí ${lesson.minimumAttendance - lesson.booked} do minima</span>`
      : !cancelled && !ended
        ? '<br><span class="attendance-note confirmed">Minimum splněno</span>'
        : '';
    const status = cancelled ? 'Zrušeno' : ended ? 'Proběhla' : 'Otevřeno';
    const feedback = ended ? adminFeedback.find((item) => item.lesson_id === lesson.id) : null;
    const feedbackLabel = !ended || cancelled
      ? ''
      : feedback?.requested
        ? feedback.total
          ? `Zpětná vazba: ${feedback.total} ${feedback.total === 1 ? 'odpověď' : feedback.total < 5 ? 'odpovědi' : 'odpovědí'}`
          : 'Zpětná vazba: zatím bez odpovědi'
        : 'Zpětná vazba: nevyžádána';
    const attendanceAction = belowMinimum && !lesson.lowAttendanceConfirmedAt
      ? `<button class="button button-small button-secondary" data-confirm-lesson="${lesson.id}">Potvrdit konání lekce</button>`
      : `<span class="lesson-action-state">${belowMinimum ? 'Koná se i v menším počtu' : 'Minimum splněno'}</span>`;
    const deleteAction = adminCanDeleteLessons
      ? `<button class="text-button danger" data-delete-lesson="${lesson.id}">Trvale smazat</button>`
      : '';
    const shareAction = `<button class="text-button admin-lesson-share" type="button" data-copy-lesson="${lesson.id}">Kopírovat odkaz</button>`;
    const calendarAction = !cancelled && !ended ? calendarControls(lesson.id, 'lesson', true) : '';
    const actions = cancelled
      ? `<div class="lesson-actions-stack${deleteAction ? '' : ' lesson-actions-disabled'}"><span class="lesson-action-state">Bez dalších akcí</span>${shareAction}${deleteAction}</div>`
      : ended
        ? `<div class="lesson-actions-stack"><button class="button button-small" data-payment-lesson="${lesson.id}">Docházka a platby</button>${shareAction}${deleteAction}</div>`
        : `<div class="lesson-actions-stack"><div class="lesson-action-primary">${attendanceAction}</div><div class="lesson-action-buttons"><button class="button button-small" data-edit-lesson="${lesson.id}">Upravit</button><button class="button button-small" data-cancel-lesson="${lesson.id}">Zrušit</button></div>${calendarAction}${shareAction}${deleteAction}</div>`;
    const payment = lesson.paymentMode === 'donation' ? 'Dobrovolný příspěvek' : `${lesson.priceCzk ?? 0} Kč`;
    const weekday = new Intl.DateTimeFormat('cs-CZ', { weekday: 'long', timeZone: 'Europe/Prague' }).format(new Date(lesson.iso));
    const weekdayDate = `${weekday.charAt(0).toLocaleUpperCase('cs-CZ')}${weekday.slice(1)} ${lesson.date}`;
    return `<tr class="${cancelled ? 'is-cancelled' : ''}"><td data-label="Termín"><b>${escapeHtml(weekdayDate)}</b><br>${escapeHtml(lesson.time)}</td><td data-label="Lekce"><button class="admin-lesson-link" data-open-participants="${lesson.id}">${escapeHtml(lesson.title)}</button>${lesson.language === 'en' ? '<br><span class="language-badge">Angličtina</span>' : ''}<br><small>${escapeHtml(payment)}</small></td><td data-label="Lektor">${escapeHtml(instructorDisplayName(lesson.teacher))}</td><td data-label="Stav"><span class="status-pill${cancelled ? ' warn' : ended ? ' done' : ''}">${status}</span>${feedbackLabel ? `<button class="feedback-lesson-state" type="button" data-payment-lesson="${lesson.id}">${escapeHtml(feedbackLabel)}</button>` : ''}</td><td data-label="Obsazeno"><button class="admin-count-link" data-open-participants="${lesson.id}">${lesson.booked}/${lesson.capacity}</button>${attendanceStatus}</td><td class="lesson-actions" data-label="Akce">${actions}</td></tr>`;
  }).join('');
  return `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Termín</th><th>Lekce</th><th>Lektor</th><th>Stav</th><th>Obsazeno</th><th>Akce</th></tr></thead><tbody>${rows || `<tr><td colspan="6">${escapeHtml(emptyMessage)}</td></tr>`}</tbody></table></div>`;
}

function adminLessonFilter() {
  const options = adminInstructors.map((teacher) => `<option value="${escapeHtml(teacher.id)}" ${adminLessonInstructorFilter === teacher.id ? 'selected' : ''}>${escapeHtml(instructorDisplayName(teacher.name))}</option>`).join('');
  return `<div class="admin-lesson-filter field"><label for="admin-lesson-instructor">Filtrovat podle lektora</label><select id="admin-lesson-instructor" data-admin-lesson-instructor><option value="all">Všichni lektoři</option>${options}</select></div>`;
}

function adminLessonTools() {
  return `<div class="admin-lesson-tools">${adminLessonFilter()}<button class="button button-small button-secondary" type="button" data-calendar-export>Stáhnout termíny</button></div>`;
}

function filteredAdminLessons(sourceLessons) {
  if (adminLessonInstructorFilter === 'all') return sourceLessons;
  return sourceLessons.filter((lesson) => lesson.instructorId === adminLessonInstructorFilter);
}

function feedbackPanel() {
  const feedback = adminLessonInstructorFilter === 'all'
    ? adminFeedback
    : adminFeedback.filter((item) => item.instructor_id === adminLessonInstructorFilter);
  const totals = feedback.reduce((summary, item) => ({
    total: summary.total + Number(item.total || 0),
    great: summary.great + Number(item.ratings?.great || 0),
    good: summary.good + Number(item.ratings?.good || 0),
    notRight: summary.notRight + Number(item.ratings?.not_right || 0),
  }), { total: 0, great: 0, good: 0, notRight: 0 });
  const ratingLabels = { great: 'Skvěle', good: 'Dobře', not_right: 'Něco mi nesedlo' };
  const responseCountLabel = (count) => `${count} ${count === 1 ? 'odpověď' : count >= 2 && count <= 4 ? 'odpovědi' : 'odpovědí'}`;
  const cards = feedback.filter((item) => Number(item.total || 0) > 0).map((item) => {
    const responses = Number(item.total || 0);
    const responseLabel = responseCountLabel(responses);
    const responseCards = (item.responses || []).map((response, index) => {
      const rating = ratingLabels[response.rating] || response.rating;
      const topics = (response.topics || []).map((topic) => `<span>${escapeHtml(topic)}</span>`).join('');
      const comment = String(response.comment || '').trim();
      return `<div class="feedback-response">
        <div class="feedback-response-heading"><span class="feedback-rating-badge ${escapeHtml(response.rating || '')}">${escapeHtml(rating || 'Bez hodnocení')}</span><small>Anonymní odpověď ${index + 1}</small></div>
        ${topics ? `<div class="feedback-response-topics">${topics}</div>` : ''}
        ${comment ? `<blockquote>${escapeHtml(comment)}</blockquote>` : '<p class="admin-help">Bez slovního komentáře.</p>'}
      </div>`;
    }).join('');
    return `<article class="feedback-overview-item">
      <div class="feedback-overview-heading"><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(formatAdminDate(item.starts_at))}<br>${instructorRole(item.teacher)}: ${escapeHtml(instructorDisplayName(item.teacher))}</p></div><span class="status-pill${responses ? '' : ' done'}">${escapeHtml(responseLabel)}</span></div>
      <div class="feedback-response-list">${responseCards}</div>
    </article>`;
  }).join('');
  const withoutResponses = feedback.filter((item) => Number(item.total || 0) === 0);
  const emptyLessons = withoutResponses.length ? `<section class="feedback-empty-lessons"><h3>Bez odpovědi</h3><p class="admin-help">U těchto lekcí byla zpětná vazba vyžádána, ale zatím nikdo neodpověděl.</p><div>${withoutResponses.map((item) => `<p><b>${escapeHtml(item.title)}</b><span>${escapeHtml(formatAdminDate(item.starts_at))}<br>${instructorRole(item.teacher)}: ${escapeHtml(instructorDisplayName(item.teacher))}</span></p>`).join('')}</div></section>` : '';
  return `<div class="admin-card"><div class="admin-list-heading"><div><p class="admin-help">Anonymní hodnocení z proběhlých lekcí, u kterých byla zpětná vazba vyžádána.</p></div>${adminLessonFilter()}</div>
    <div class="feedback-overview-summary"><strong>${responseCountLabel(totals.total)}</strong><span><b>${totals.great}</b> Skvěle</span><span><b>${totals.good}</b> Dobře</span><span><b>${totals.notRight}</b> Něco mi nesedlo</span></div>
    <div class="feedback-overview-list">${cards || '<p>Tomuto filtru zatím neodpovídá žádná odeslaná zpětná vazba.</p>'}</div>
    ${emptyLessons}
  </div>`;
}

function overviewPanel() {
  const upcomingLessons = adminLessons.filter((lesson) => lesson.status === 'published' && new Date(lesson.endsAt) > new Date());
  return `<div class="admin-card"><div class="admin-list-heading"><div><p class="admin-help">Kliknutím na název lekce nebo obsazenost otevřeš její účastníky.</p></div>${adminLessonTools()}</div>${lessonTable(filteredAdminLessons(upcomingLessons), 'Tomuto filtru neodpovídá žádná naplánovaná lekce.')}</div>`;
}

function completedLessonsPanel() {
  const completedLessons = filteredAdminLessons(adminLessons.filter((lesson) => new Date(lesson.endsAt) <= new Date()).reverse());
  const cancelledCount = completedLessons.filter((lesson) => lesson.status === 'cancelled').length;
  const visibleLessons = adminShowCancelledLessons ? completedLessons : completedLessons.filter((lesson) => lesson.status !== 'cancelled');
  const cancelledToggle = cancelledCount
    ? `<button class="button button-small button-secondary" type="button" data-toggle-cancelled-lessons aria-pressed="${adminShowCancelledLessons}">${adminShowCancelledLessons ? 'Skrýt zrušené' : `Zobrazit zrušené (${cancelledCount})`}</button>`
    : '';
  return `<div class="admin-card"><div class="admin-list-heading"><div><p class="admin-help">U každé lekce jednou potvrď docházku. Platební nebo příspěvkové e-maily se odešlou automaticky.</p></div><div class="admin-lesson-tools">${adminLessonFilter()}${cancelledToggle}</div></div>${lessonTable(visibleLessons, 'Tomuto filtru neodpovídá žádná proběhlá lekce.')}</div>`;
}

function teachersPanel() {
  return `<div class="admin-card">${adminInstructors.map((teacher) => `<article class="admin-teacher"><img src="${escapeHtml(teacher.photo_url || '')}" alt="${escapeHtml(instructorDisplayName(teacher.name))}"><div><h3>${escapeHtml(instructorDisplayName(teacher.name))}</h3><p><b>${escapeHtml((teacher.styles || []).join(' · '))}</b></p><p>${escapeHtml(teacher.email || 'E-mail není nastavený')}</p><p>${escapeHtml(teacher.bio)}</p>${teacher.practice_quote ? `<blockquote>„${escapeHtml(teacher.practice_quote)}“</blockquote>` : ''}</div><button class="button button-small" data-edit-teacher="${teacher.id}">Upravit profil</button></article>`).join('')}</div>`;
}

function accountsPanel() {
  const createAdminPanel = adminCanManageAdmins
    ? `<form class="admin-card account-form" id="create-admin-form">
      <h2>Přidat administrátora</h2>
      <p class="admin-help">Nový účet bude ihned aktivní a bude se moci přihlásit do správy.</p>
      <div class="field"><label for="new-admin-name">Jméno a příjmení</label><input id="new-admin-name" name="displayName" maxlength="120" autocomplete="name" required></div>
      <div class="field"><label for="new-admin-email">E-mail</label><input id="new-admin-email" name="email" type="email" autocomplete="email" required></div>
      <div class="field"><label for="new-admin-password">Počáteční heslo</label><input id="new-admin-password" name="password" type="password" minlength="12" maxlength="72" autocomplete="new-password" required><small>Nejméně 12 znaků.</small></div>
      <div class="field"><label for="new-admin-password-confirm">Heslo znovu</label><input id="new-admin-password-confirm" name="passwordConfirm" type="password" minlength="12" maxlength="72" autocomplete="new-password" required></div>
      <button class="button" type="submit">Vytvořit administrátora</button>
    </form>`
    : `<div class="admin-card account-form"><h2>Administrátoři</h2><p class="admin-help">Nové administrátory může přidávat pouze Petr.</p></div>`;
  const adminRows = adminAccounts.map((account) => `<tr><td data-label="E-mail"><b>${escapeHtml(account.email || 'Bez e-mailu')}</b>${account.isOwner ? '<br><small>Vlastník správy</small>' : ''}</td><td data-label="Vytvořen">${account.createdAt ? escapeHtml(formatAdminDate(account.createdAt)) : '—'}</td><td data-label="Poslední přihlášení">${account.lastSignInAt ? escapeHtml(formatAdminDate(account.lastSignInAt)) : 'Dosud nepřihlášen/a'}</td><td data-label="Akce">${account.isOwner ? '<span class="status-pill">Nelze smazat</span>' : `<button class="text-button danger" data-delete-admin="${account.id}" data-admin-email="${escapeHtml(account.email || '')}">Smazat</button>`}</td></tr>`).join('');
  const adminListPanel = adminCanManageAdmins
    ? `<div class="admin-card admin-card-spaced"><h2>Aktivní administrátoři</h2><p class="admin-help">Vlastní účet smazat nelze. Odebráním ostatního účtu zanikne jeho přístup do správy.</p><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>E-mail</th><th>Vytvořen</th><th>Poslední přihlášení</th><th>Akce</th></tr></thead><tbody>${adminRows || '<tr><td colspan="4">Nejsou evidováni žádní administrátoři.</td></tr>'}</tbody></table></div></div>`
    : '';
  return `<div class="account-grid">
    ${createAdminPanel}
    <form class="admin-card account-form" id="change-password-form">
      <h2>Změnit moje heslo</h2>
      <p class="admin-help">Po změně se znovu přihlásíš novým heslem.</p>
      <div class="field"><label for="admin-new-password">Nové heslo</label><input id="admin-new-password" name="password" type="password" minlength="12" maxlength="72" autocomplete="new-password" required><small>Nejméně 12 znaků.</small></div>
      <div class="field"><label for="admin-new-password-confirm">Nové heslo znovu</label><input id="admin-new-password-confirm" name="passwordConfirm" type="password" minlength="12" maxlength="72" autocomplete="new-password" required></div>
      <button class="button" type="submit">Změnit heslo</button>
    </form>
  </div>${adminListPanel}`;
}

function bookingsPanel() {
  const people = Array.from(adminReservations.reduce((map, reservation) => {
    if (reservation.status === 'cancelled' || !reservation.lessons || reservation.lessons.status === 'cancelled') return map;
    const key = reservation.attendee_email ? reservation.attendee_email.toLowerCase() : `walk-in:${reservation.id}`;
    const current = map.get(key) || { name: reservation.attendee_name, email: reservation.attendee_email, reservations: [] };
    current.reservations.push(reservation);
    map.set(key, current);
    return map;
  }, new Map()).values()).sort((a, b) => a.name.localeCompare(b.name, 'cs'));
  const rows = people.map((person) => {
    const latest = [...person.reservations].sort((a, b) => new Date(b.lessons.starts_at) - new Date(a.lessons.starts_at))[0];
    return `<tr><td data-label="Jméno"><b>${escapeHtml(person.name)}</b></td><td data-label="E-mail">${person.email ? escapeHtml(person.email) : 'Bez e-mailu'}</td><td data-label="Počet rezervací">${person.reservations.length}</td><td data-label="Poslední lekce">${escapeHtml(latest.lessons.title)}<br><small>${escapeHtml(formatAdminDate(latest.lessons.starts_at))}</small></td></tr>`;
  }).join('');
  return `<div class="admin-card"><p class="admin-help">Přehled lidí s aktivní nebo evidovanou účastí za posledních 12 měsíců.</p><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Jméno</th><th>E-mail</th><th>Rezervace</th><th>Poslední lekce</th></tr></thead><tbody>${rows || '<tr><td colspan="4">Zatím nejsou evidováni žádní účastníci.</td></tr>'}</tbody></table></div></div>`;
}

function lessonParticipantsPanel(lessonId, returnTab) {
  const lesson = adminLessons.find((item) => item.id === lessonId);
  if (!lesson) return '<div class="admin-card"><p>Lekci se nepodařilo najít.</p></div>';
  const participants = adminReservations.filter((reservation) => reservation.lessons.id === lessonId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const canCancel = lesson.status !== 'cancelled' && new Date(lesson.iso) > new Date();
  const completed = new Date(lesson.endsAt) <= new Date();
  const cancelled = participants.filter((r) => r.status === 'cancelled' || (r.status === 'no_show' && r.late_cancelled_at));
  const active = participants.filter((r) => !cancelled.includes(r));
  const timestamp = (value) => value && Number.isFinite(new Date(value).getTime()) ? new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Prague' }).format(new Date(value)) : 'Čas není evidovaný';
  const paymentCell = (r) => {
    if (!r.payment_email_sent_at) return r.payment_waived_at ? 'Platba prominuta' : !r.attendee_email ? 'Bez e-mailu' : r.status === 'cancelled' ? 'Bez platebního e-mailu' : 'Čeká na potvrzení docházky nebo odeslání';
    const canResend = lesson.status !== 'cancelled' && ['attended', 'no_show'].includes(r.status) && !r.payment_waived_at;
    return `<div>Odesláno: ${escapeHtml(timestamp(r.payment_email_sent_at))}</div>${r.payment_email_last_resent_at ? `<div>Znovu odesláno: ${escapeHtml(timestamp(r.payment_email_last_resent_at))}</div>` : ''}${r.payment_email_recipient && r.payment_email_recipient !== r.attendee_email ? `<small>Komu: ${escapeHtml(r.payment_email_recipient)}</small>` : ''}<div class="participant-email-actions"><button class="button button-small button-secondary" data-view-payment-email="${r.id}">Zobrazit e-mail</button>${canResend ? `<button class="button button-small button-secondary" data-resend-payment-email="${r.id}" data-lesson-id="${lesson.id}" data-return-tab="${returnTab}">Odeslat znovu</button>` : ''}</div>`;
  };
  const table = (items) => `<div class="admin-table-wrap"><table class="admin-table participant-detail-table"><thead><tr><th>Jméno</th><th>E-mail</th><th>Stav</th><th>Rezervace a změny</th>${completed ? '<th>Platební e-mail</th>' : ''}</tr></thead><tbody>${items.map((r) => {
    const status = r.status === 'cancelled' ? 'Zrušeno' : r.late_cancelled_at && r.status === 'no_show' ? 'Pozdní storno' : r.status === 'attended' ? 'Účast potvrzena' : r.status === 'no_show' ? r.payment_waived_at ? 'Nedorazil/a · bez platby' : 'Nedorazil/a' : 'Přihlášen/a';
    return `<tr><td data-label="Jméno"><b>${escapeHtml(r.attendee_name)}</b></td><td data-label="E-mail">${escapeHtml(r.attendee_email || 'Bez e-mailu')}</td><td data-label="Stav"><span class="status-pill${r.status === 'cancelled' ? ' done' : ''}">${status}</span>${canCancel && r.status === 'confirmed' ? `<div class="participant-email-actions"><button class="button button-small button-secondary" data-cancel-reservation="${r.id}" data-lesson-id="${lesson.id}" data-return-tab="${returnTab}">Zrušit rezervaci</button></div>` : ''}</td><td data-label="Rezervace a změny"><div>Rezervováno: ${escapeHtml(timestamp(r.created_at))}</div>${r.cancelled_at || r.late_cancelled_at || r.status === 'cancelled' ? `<div>Zrušeno: ${escapeHtml(timestamp(r.cancelled_at || r.late_cancelled_at))}</div>` : ''}</td>${completed ? `<td data-label="Platební e-mail">${paymentCell(r)}</td>` : ''}</tr>`;
  }).join('') || `<tr><td colspan="${completed ? 5 : 4}">Na tuto lekci zatím není nikdo přihlášený.</td></tr>`}</tbody></table></div>`;
  return `<div class="admin-card"><button class="text-button admin-detail-back" data-return-tab="${returnTab}">← Zpět</button><h2>${escapeHtml(lesson.title)}</h2><p class="admin-help">${escapeHtml(lesson.date)} · ${escapeHtml(lesson.time)}<br>${instructorRole(lesson.teacher)}: ${escapeHtml(instructorDisplayName(lesson.teacher))}<br>Přihlášeno ${lesson.booked ?? active.length}/${lesson.capacity}</p><h3>Účastníci (${active.length})</h3>${table(active)}${cancelled.length ? `<section class="cancelled-reservations"><h3>Zrušené rezervace (${cancelled.length})</h3><p class="admin-help">Pozdní storno uvolňuje místo. Pro docházku a platby zůstává evidované podle pravidel lekce.</p>${table(cancelled)}</section>` : ''}<p class="admin-help">Časy jsou uvedené v časovém pásmu Praha. U starších pozdních storen nemusí být čas zrušení evidovaný. Odeslání e-mailu neznamená potvrzení doručení ani zaplacení.</p></div>`;
}

function newsPanel() {
  const toneLabels = { sage: 'Zelená', clay: 'Terakotová', sand: 'Písková', ink: 'Tmavá' };
  const items = adminNews.map((item, index) => `<article class="admin-news-item"><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary || item.body)}</p><div class="admin-news-meta"><span class="status-pill${item.published_at ? '' : ' done'}">${item.published_at ? 'Zveřejněná' : 'Skrytá'}</span><span class="news-tone-label"><i class="news-tone-swatch tone-${escapeHtml(item.background_tone || 'sage')}"></i>${escapeHtml(toneLabels[item.background_tone] || toneLabels.sage)}</span></div></div><div class="admin-news-actions"><div class="admin-news-order" aria-label="Pořadí novinky"><button class="button button-small button-secondary" type="button" data-move-news="${item.id}" data-move-direction="-1" ${index === 0 ? 'disabled' : ''} title="Posunout nahoru">↑</button><button class="button button-small button-secondary" type="button" data-move-news="${item.id}" data-move-direction="1" ${index === adminNews.length - 1 ? 'disabled' : ''} title="Posunout dolů">↓</button></div><button class="button button-small" data-edit-news="${item.id}">Upravit</button><button class="button button-small button-secondary" data-toggle-news="${item.id}">${item.published_at ? 'Skrýt' : 'Zveřejnit'}</button><button class="text-button danger" data-delete-news="${item.id}">Smazat</button></div></article>`).join('');
  return `<div class="admin-card"><div class="admin-card-heading"><button class="button button-small" data-add-news>+ Přidat novinku nebo tip</button></div>${items || '<p>Zatím nejsou vytvořené žádné novinky ani tipy.</p>'}</div>`;
}

function donationSummarySettingsPanel() {
  const summary = adminSettings.donation_summary || {};
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Prague', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return `<form class="admin-card settings-form" id="donation-summary-form" style="margin-bottom:24px">
    <h2>Příspěvky Dobrému andělovi</h2>
    <p class="admin-help">Ručně zadej celkovou vybranou částku a datum, ke kterému platí. Souhrn se zobrazí na homepage a v nově odesílaných příspěvkových e-mailech. Nejde o automatické párování s bankou.</p>
    <div class="settings-grid">
      <div class="field"><label for="donation-total">Celkem vybráno v Kč</label><input id="donation-total" name="amountCzk" type="number" min="0" max="999999999.99" step="0.01" value="${escapeHtml(String(summary.amount_czk ?? ''))}" required></div>
      <div class="field"><label for="donation-as-of">Stav k datu</label><input id="donation-as-of" name="asOf" type="date" min="2000-01-01" max="${today}" value="${escapeHtml(String(summary.as_of ?? ''))}" required></div>
    </div>
    <p class="admin-help" data-donation-summary-preview>${escapeHtml(donationSummaryText(summary) || 'Souhrn zatím není zveřejněný. Zobrazí se po uložení částky a data.')}</p>
    <div class="settings-actions"><button class="button" type="submit">Uložit souhrn příspěvků</button></div>
  </form>`;
}

function settingsPanel() {
  const instructorSettings = adminInstructors.map((teacher) => `<div class="settings-instructor">
    <h4>${escapeHtml(instructorDisplayName(teacher.name))}</h4>
    <div class="field"><label for="setting-mode-${teacher.id}">Výchozí typ lekce</label><select id="setting-mode-${teacher.id}" name="teacherMode-${teacher.id}"><option value="paid" ${teacher.payment_mode === 'paid' ? 'selected' : ''}>Placená</option><option value="donation" ${teacher.payment_mode === 'donation' ? 'selected' : ''}>Dobrovolný příspěvek</option></select></div>
    <div class="field"><label for="setting-price-${teacher.id}">Výchozí cena v Kč</label><input id="setting-price-${teacher.id}" name="teacherPrice-${teacher.id}" type="number" min="0" max="10000" value="${teacher.price_czk ?? Number(adminSettings.default_paid_price)}" required></div>
    <div class="field"><label for="setting-paid-qr-${teacher.id}">QR pro placenou lekci</label><input id="setting-paid-qr-${teacher.id}" name="teacherPaidQr-${teacher.id}" value="${escapeHtml(teacher.paid_qr_url || '')}" placeholder="assets/qr-platba.jpg"></div>
    <div class="field"><label for="setting-donation-qr-${teacher.id}">QR pro dobrovolný příspěvek</label><input id="setting-donation-qr-${teacher.id}" name="teacherDonationQr-${teacher.id}" value="${escapeHtml(teacher.donation_qr_url || '')}" placeholder="assets/qr-dobry-andel.jpg"></div>
  </div>`).join('');
  return `${donationSummarySettingsPanel()}<form class="admin-card settings-form" id="settings-form"><h2>Nastavení rezervací a plateb</h2><p class="admin-help">Změny se propíšou na veřejný web, do podmínek, nových rezervací, e-mailů a budoucích lekcí.</p><section class="settings-section"><h3>Pravidla rezervací</h3><div class="settings-grid"><div class="field"><label for="setting-capacity">Kapacita studia</label><input id="setting-capacity" name="studioCapacity" type="number" min="1" max="100" value="${Number(adminSettings.studio_capacity)}" required><small>Po uložení se nastaví jako kapacita všech budoucích zveřejněných lekcí.</small></div><div class="field"><label for="setting-cancellation">Bezplatné zrušení před lekcí v hodinách</label><input id="setting-cancellation" name="cancellationHours" type="number" min="0" max="168" value="${Number(adminSettings.cancellation_hours)}" required></div><div class="field"><label for="setting-booking-grace">Přihlášení po začátku v minutách</label><input id="setting-booking-grace" name="bookingGraceMinutes" type="number" min="0" max="60" value="${Number(adminSettings.booking_grace_minutes)}" required><small>Po tuto dobu zůstane lekce dostupná pro rezervaci.</small></div><div class="field"><label for="setting-minimum">Standardní minimum přihlášených</label><input id="setting-minimum" name="minimumAttendance" type="number" min="1" max="100" value="${Number(adminSettings.minimum_attendance)}" required></div></div></section><section class="settings-section"><h3>Výchozí platba podle lektora</h3><p class="admin-help">Každá nová lekce převezme nastavení zvoleného lektora. U konkrétní lekce lze typ platby i cenu změnit.</p><div class="settings-instructors">${instructorSettings}</div></section><div class="settings-actions"><button class="button" type="submit">Uložit nastavení</button></div></form>`;
}

const STUDIO_BLOCK_CATEGORIES = {
  private_lesson: 'Privátní lekce',
  team_event: 'Týmová akce',
  private_practice: 'Soukromé cvičení',
  maintenance: 'Údržba / blokace',
  other: 'Jiná neveřejná akce',
};

function adminCalendarEvents(from, to) {
  const lessonEvents = adminLessons
    .filter((lesson) => lesson.status === 'published' && new Date(lesson.iso) < to && new Date(lesson.endsAt) > from)
    .map((lesson) => ({ id: lesson.id, kind: 'public', title: lesson.title, teacher: lesson.teacher, startsAt: lesson.iso, endsAt: lesson.endsAt }));
  const privateEvents = adminStudioBlocks
    .filter((block) => new Date(block.starts_at) < to && new Date(block.ends_at) > from)
    .map((block) => ({
      id: block.id,
      kind: 'private',
      title: block.title,
      startsAt: block.starts_at,
      endsAt: block.ends_at,
      occupiedStartsAt: new Date(new Date(block.starts_at).getTime() - 15 * 60_000).toISOString(),
      occupiedEndsAt: new Date(new Date(block.ends_at).getTime() + 15 * 60_000).toISOString(),
    }));
  return [...lessonEvents, ...privateEvents];
}

function calendarPanel() {
  const { gridStart, gridEnd } = adminMonthRange(adminCalendarMonth);
  const events = adminCalendarEvents(gridStart, gridEnd);
  return `<div class="admin-card"><div class="admin-card-heading"><div><p class="admin-help">Veřejné lekce i neveřejné rezervace na jednom místě. Každá neveřejná akce automaticky blokuje dalších 15 minut před začátkem i po konci.</p></div><button class="button button-small" data-add-studio-block>+ Neveřejná rezervace</button></div><div class="calendar-toolbar admin-calendar-toolbar"><button class="button button-small button-secondary" data-admin-calendar-move="-1">← Předchozí měsíc</button><strong>${escapeHtml(calendarMonthLabel(adminCalendarMonth))}</strong><button class="button button-small button-secondary" data-admin-calendar-today>Dnes</button><button class="button button-small button-secondary" data-admin-calendar-move="1">Další měsíc →</button></div><div class="admin-month-calendar" aria-label="Měsíční kalendář studia">${adminMonthCalendar(adminCalendarMonth, events)}</div><div class="admin-calendar-agenda" aria-label="Agenda studia pro vybraný měsíc">${adminMonthAgenda(adminCalendarMonth, events)}</div><p class="calendar-legend"><span class="legend-daniela"></span> Danča <span class="legend-petr"></span> Petr <span class="legend-private"></span> Neveřejná rezervace včetně rezervy</p></div>`;
}

function studioBlockForm(block = null, presetStart = null) {
  const defaultStart = new Date();
  defaultStart.setMinutes(Math.ceil(defaultStart.getMinutes() / 15) * 15, 0, 0);
  defaultStart.setHours(defaultStart.getHours() + 1);
  const start = block?.starts_at || presetStart || defaultStart;
  const end = block?.ends_at || new Date(new Date(start).getTime() + 60 * 60_000);
  const options = Object.entries(STUDIO_BLOCK_CATEGORIES).map(([value, label]) => `<option value="${value}" ${block?.category === value ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('');
  return `<form class="booking-panel" id="studio-block-form"><p class="eyebrow">${block ? 'Úprava rezervace' : 'Nová rezervace'}</p><h2>Neveřejná rezervace studia</h2><div class="form-grid"><div class="field full"><label for="studio-block-title">Název pro administraci</label><input id="studio-block-title" name="title" maxlength="120" value="${escapeHtml(block?.title || '')}" placeholder="Např. privátní lekce pro tým HR" required></div><div class="field"><label for="studio-block-category">Typ akce</label><select id="studio-block-category" name="category" required>${options}</select></div><div class="field"><label>Rezerva</label><input value="15 minut před i po akci" disabled></div><div class="field"><label for="studio-block-start">Začátek akce</label><input id="studio-block-start" name="startsAt" type="datetime-local" value="${dateTimeLocalValue(start)}" required></div><div class="field"><label for="studio-block-end">Konec akce</label><input id="studio-block-end" name="endsAt" type="datetime-local" value="${dateTimeLocalValue(end)}" required></div><div class="field"><label for="studio-block-contact">Kontaktní osoba</label><input id="studio-block-contact" name="contactName" maxlength="120" value="${escapeHtml(block?.contact_name || '')}"></div><div class="field"><label for="studio-block-email">Kontaktní e-mail</label><input id="studio-block-email" name="contactEmail" type="email" maxlength="320" value="${escapeHtml(block?.contact_email || '')}"></div><div class="field full"><label for="studio-block-notes">Interní poznámka</label><textarea id="studio-block-notes" name="notes" maxlength="2000">${escapeHtml(block?.notes || '')}</textarea></div></div><p class="form-hint">Na veřejném webu se zobrazí pouze šedý blok „Studio obsazeno“. Název, kontakt ani poznámka se nezveřejní.</p><button class="button" type="submit">${block ? 'Uložit změny' : 'Rezervovat studio'}</button></form>`;
}

function openStudioBlockEditor(id = '', requestedDate = '') {
  const block = adminStudioBlocks.find((item) => item.id === id) || null;
  const requestedStart = !block && requestedDate ? new Date(`${requestedDate}T09:00:00`) : null;
  const presetStart = requestedStart && !Number.isNaN(requestedStart.getTime()) ? requestedStart : null;
  document.querySelector('#booking-content').innerHTML = studioBlockForm(block, presetStart);
  document.querySelector('#studio-block-start').addEventListener('change', (event) => {
    const start = new Date(event.target.value);
    if (Number.isNaN(start.getTime())) return;
    document.querySelector('#studio-block-end').value = dateTimeLocalValue(new Date(start.getTime() + 60 * 60 * 1000));
  });
  document.querySelector('#studio-block-form').addEventListener('submit', (event) => saveStudioBlock(event, block));
  dialog.showModal();
}

async function saveStudioBlock(event, block) {
  event.preventDefault();
  const data = new FormData(event.target);
  const startsAt = new Date(data.get('startsAt'));
  const endsAt = new Date(data.get('endsAt'));
  if (endsAt <= startsAt) return showToast('Konec akce musí být později než začátek.');
  const payload = {
    title: String(data.get('title')).trim(),
    category: data.get('category'),
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    buffer_minutes: 15,
    contact_name: String(data.get('contactName')).trim(),
    contact_email: String(data.get('contactEmail')).trim().toLowerCase(),
    notes: String(data.get('notes')).trim(),
  };
  const button = event.target.querySelector('[type="submit"]');
  button.disabled = true;
  button.textContent = 'Ukládám…';
  try {
    const url = block ? `${SUPABASE_URL}/rest/v1/studio_blocks?id=eq.${block.id}` : `${SUPABASE_URL}/rest/v1/studio_blocks`;
    const response = await adminFetch(url, { method: block ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(payload) });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(String(result.message || '').includes('STUDIO_CONFLICT') ? 'Studio je v tomto čase už obsazené, včetně 15minutové rezervy.' : 'Rezervaci studia se nepodařilo uložit.');
    }
    closeDialog();
    await Promise.all([loadAdminStudioBlocks(), loadPublicStudioBlocks()]);
    renderAdmin('calendar');
    showToast(block ? 'Neveřejná rezervace byla upravena.' : 'Studio je rezervované.');
  } catch (error) {
    button.disabled = false;
    button.textContent = block ? 'Uložit změny' : 'Rezervovat studio';
    showToast(error.message);
  }
}

async function deleteStudioBlock(id) {
  const block = adminStudioBlocks.find((item) => item.id === id);
  if (!block || !confirm(`Opravdu smazat neveřejnou rezervaci „${block.title}“?`)) return;
  const response = await adminFetch(`${SUPABASE_URL}/rest/v1/studio_blocks?id=eq.${id}`, { method: 'DELETE' });
  if (!response.ok) return showToast('Rezervaci studia se nepodařilo smazat.');
  await Promise.all([loadAdminStudioBlocks(), loadPublicStudioBlocks()]);
  renderAdmin('calendar');
  showToast('Neveřejná rezervace byla smazána.');
}

function renderAdmin(tab) {
  if (!adminSession) {
    renderAdminLogin();
    return;
  }
  setAdminAuthenticatedLayout(true);
  setAdminTabUrl(tab, { replace: true });
  const panel = document.querySelector('#admin-panel');
  activeAdminTab = tab;
  document.querySelectorAll('.admin-nav').forEach((button) => button.classList.toggle('active', button.dataset.adminTab === tab));
  const titles = { overview: 'Lekce', calendar: 'Kalendář studia', completed: 'Proběhlé lekce a platby', feedback: 'Zpětná vazba', people: 'Účastníci', content: 'Novinky a jógové tipy', teachers: 'Profily lektorů', accounts: 'Administrátoři', settings: 'Nastavení' };
  const addButton = document.querySelector('#add-lesson');
  addButton.hidden = tab !== 'overview';
  document.querySelector('#admin-logout').hidden = false;
  addButton.textContent = '+ Nová lekce';
  document.querySelector('#admin-title').textContent = titles[tab];
  if (tab === 'overview') panel.innerHTML = overviewPanel();
  if (tab === 'calendar') panel.innerHTML = calendarPanel();
  if (tab === 'completed') panel.innerHTML = completedLessonsPanel();
  if (tab === 'feedback') panel.innerHTML = feedbackPanel();
  if (tab === 'teachers') panel.innerHTML = teachersPanel();
  if (tab === 'people') panel.innerHTML = bookingsPanel();
  if (tab === 'content') panel.innerHTML = newsPanel();
  if (tab === 'accounts') panel.innerHTML = accountsPanel();
  if (tab === 'settings') panel.innerHTML = settingsPanel();
  bindLessonShareButtons(panel);
  bindCalendarButtons(panel);

  document.querySelectorAll('[data-edit-teacher]').forEach((button) => button.addEventListener('click', () => openTeacherEditor(button.dataset.editTeacher)));
  document.querySelector('[data-add-news]')?.addEventListener('click', () => openNewsEditor());
  document.querySelectorAll('[data-edit-news]').forEach((button) => button.addEventListener('click', () => openNewsEditor(button.dataset.editNews)));
  document.querySelectorAll('[data-toggle-news]').forEach((button) => button.addEventListener('click', () => toggleNews(button.dataset.toggleNews)));
  document.querySelectorAll('[data-delete-news]').forEach((button) => button.addEventListener('click', () => deleteNews(button.dataset.deleteNews)));
  document.querySelectorAll('[data-move-news]').forEach((button) => button.addEventListener('click', () => moveNews(button.dataset.moveNews, Number(button.dataset.moveDirection))));
  document.querySelector('[data-admin-lesson-instructor]')?.addEventListener('change', (event) => {
    adminLessonInstructorFilter = event.target.value;
    renderAdmin(tab);
  });
  document.querySelector('[data-toggle-cancelled-lessons]')?.addEventListener('click', () => {
    adminShowCancelledLessons = !adminShowCancelledLessons;
    renderAdmin('completed');
  });
  document.querySelectorAll('[data-edit-lesson]').forEach((button) => button.addEventListener('click', () => openLessonEditor(button.dataset.editLesson)));
  document.querySelector('[data-add-studio-block]')?.addEventListener('click', () => openStudioBlockEditor());
  document.querySelectorAll('[data-add-studio-block-date]').forEach((button) => button.addEventListener('click', () => openStudioBlockEditor('', button.dataset.addStudioBlockDate)));
  document.querySelectorAll('[data-edit-studio-block]').forEach((button) => button.addEventListener('click', () => openStudioBlockEditor(button.dataset.editStudioBlock)));
  document.querySelectorAll('[data-delete-studio-block]').forEach((button) => button.addEventListener('click', () => deleteStudioBlock(button.dataset.deleteStudioBlock)));
  document.querySelectorAll('[data-admin-calendar-move]').forEach((button) => button.addEventListener('click', async () => {
    adminCalendarMonth = addMonths(adminCalendarMonth, Number(button.dataset.adminCalendarMove));
    renderAdmin('calendar');
  }));
  document.querySelector('[data-admin-calendar-today]')?.addEventListener('click', () => {
    adminCalendarMonth = startOfMonth(new Date());
    renderAdmin('calendar');
  });
  document.querySelectorAll('[data-cancel-lesson]').forEach((button) => button.addEventListener('click', () => cancelLesson(button.dataset.cancelLesson)));
  document.querySelectorAll('[data-delete-lesson]').forEach((button) => button.addEventListener('click', () => deleteLesson(button.dataset.deleteLesson)));
  document.querySelectorAll('[data-confirm-lesson]').forEach((button) => button.addEventListener('click', () => confirmLowAttendance(button.dataset.confirmLesson)));
  document.querySelectorAll('[data-payment-lesson]').forEach((button) => button.addEventListener('click', () => openPaymentEmails(button.dataset.paymentLesson)));
  document.querySelectorAll('[data-open-participants]').forEach((button) => button.addEventListener('click', () => {
    panel.innerHTML = lessonParticipantsPanel(button.dataset.openParticipants, tab);
    bindParticipantDetailNavigation();
  }));
  document.querySelector('#settings-form')?.addEventListener('submit', saveSettings);
  document.querySelector('#donation-summary-form')?.addEventListener('submit', saveDonationSummary);
  document.querySelector('#create-admin-form')?.addEventListener('submit', createAdminAccount);
  document.querySelector('#change-password-form')?.addEventListener('submit', changeAdminPassword);
  document.querySelectorAll('[data-delete-admin]').forEach((button) => button.addEventListener('click', () => deleteAdminAccount(button.dataset.deleteAdmin, button.dataset.adminEmail)));
}

async function createAdminAccount(event) {
  event.preventDefault();
  const data = new FormData(event.target);
  const password = String(data.get('password'));
  if (password !== String(data.get('passwordConfirm'))) return showToast('Zadaná hesla se neshodují.');
  const button = event.target.querySelector('[type="submit"]');
  button.disabled = true;
  button.textContent = 'Vytvářím…';
  try {
    await manageLesson({ action: 'create-admin', displayName: String(data.get('displayName')).trim(), email: String(data.get('email')).trim(), password });
    event.target.reset();
    await loadAdminAccounts();
    renderAdmin('accounts');
    showToast('Administrátor byl vytvořen. Přihlašovací údaje mu předej bezpečnou cestou.');
  } catch (error) {
    showToast(error.message);
  } finally {
    button.disabled = false;
    button.textContent = 'Vytvořit administrátora';
  }
}

async function deleteAdminAccount(userId, email) {
  if (!confirm(`Opravdu smazat administrátora ${email}? Tento účet se už nebude moci přihlásit.`)) return;
  try {
    await manageLesson({ action: 'delete-admin', userId });
    await loadAdminAccounts();
    renderAdmin('accounts');
    showToast('Administrátor byl smazán.');
  } catch (error) {
    showToast(error.message);
  }
}

async function changeAdminPassword(event) {
  event.preventDefault();
  const data = new FormData(event.target);
  const password = String(data.get('password'));
  if (password !== String(data.get('passwordConfirm'))) return showToast('Zadaná hesla se neshodují.');
  const button = event.target.querySelector('[type="submit"]');
  button.disabled = true;
  button.textContent = 'Měním…';
  try {
    await manageLesson({ action: 'change-password', password });
    clearAdminSession();
    renderAdminLogin('Heslo bylo změněno. Přihlas se novým heslem.');
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Změnit heslo';
    showToast(error.message);
  }
}

function bindParticipantDetailNavigation() {
  document.querySelector('[data-return-tab]')?.addEventListener('click', (event) => renderAdmin(event.currentTarget.dataset.returnTab));
  document.querySelectorAll('[data-cancel-reservation]').forEach((button) => button.addEventListener('click', () => cancelAdminReservation(
    button.dataset.cancelReservation,
    button.dataset.lessonId,
    button.dataset.returnTab,
  )));
  document.querySelectorAll('[data-view-payment-email]').forEach((button) => button.addEventListener('click', () => viewPaymentEmail(button.dataset.viewPaymentEmail)));
  document.querySelectorAll('[data-resend-payment-email]').forEach((button) => button.addEventListener('click', () => resendParticipantPaymentEmail(button)));
}

async function viewPaymentEmail(reservationId) {
  document.querySelector('#booking-content').innerHTML = '<div class="booking-panel email-history-panel"><p>Načítám původní odeslaný e-mail…</p></div>';
  const requestPanel = document.querySelector('.email-history-panel');
  dialog.showModal();
  try {
    const email = await manageLesson({ action: 'payment-email-content', reservationId });
    if (!dialog.open || !requestPanel.isConnected) return;
    document.querySelector('#booking-content').innerHTML = `<div class="booking-panel email-history-panel"><p class="eyebrow">Původní odeslaná zpráva</p><h2>${escapeHtml(email.subject)}</h2><p>Komu: <strong>${escapeHtml(email.recipient)}</strong></p><p class="admin-help">Obsah pochází z archivu poskytovatele, nikoli z dnešní šablony. Náhled blokuje skripty, odkazy a sledovací obrázky.</p><iframe class="email-history-frame" title="Původní obsah e-mailu" sandbox="" referrerpolicy="no-referrer"></iframe></div>`;
    const parsed = new DOMParser().parseFromString(email.html, 'text/html');
    parsed.querySelectorAll('script,iframe,object,embed,base,link,meta[http-equiv],form').forEach((node) => node.remove());
    parsed.querySelectorAll('a').forEach((node) => { node.removeAttribute('href'); node.removeAttribute('target'); });
    const policy = parsed.createElement('meta');
    policy.httpEquiv = 'Content-Security-Policy';
    policy.content = "default-src 'none'; img-src https://joganahallu.cz data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'";
    parsed.head.prepend(policy);
    document.querySelector('.email-history-frame').srcdoc = '<!doctype html>' + parsed.documentElement.outerHTML;
  } catch (error) {
    if (dialog.open && requestPanel.isConnected) document.querySelector('#booking-content').innerHTML = `<div class="booking-panel"><h2>E-mail není dostupný</h2><p>${escapeHtml(error.message)}</p></div>`;
  }
}

async function resendParticipantPaymentEmail(button) {
  if (button.disabled) return;
  const reservation = adminReservations.find((r) => r.id === button.dataset.resendPaymentEmail);
  if (!reservation) return;
  const recipient = reservation.payment_email_recipient || reservation.attendee_email;
  if (!confirm(`Odeslat původní platební e-mail znovu účastníkovi ${reservation.attendee_name} na ${recipient}? Ostatním účastníkům se nic neodešle.`)) return;
  button.disabled = true;
  button.textContent = 'Odesílám…';
  try {
    const result = await manageLesson({ action: 'payment-email-resend', reservationId: reservation.id, confirmed: true });
    button.textContent = 'Předáno k odeslání';
    showToast(result.recorded ? 'Původní e-mail byl znovu předán k odeslání.' : 'E-mail byl předán k odeslání, ale čas se nepodařilo uložit. Neodesílej ho hned znovu.');
    try {
      await loadAdminReservations();
      document.querySelector('#admin-panel').innerHTML = lessonParticipantsPanel(button.dataset.lessonId, button.dataset.returnTab);
      bindParticipantDetailNavigation();
    } catch { showToast('E-mail byl předán k odeslání, ale seznam se nepodařilo obnovit. Neodesílej ho znovu; obnov stránku.'); }
  } catch (error) {
    showToast(error.message);
    button.disabled = false;
    button.textContent = 'Odeslat znovu';
  }
}

async function cancelAdminReservation(reservationId, lessonId, returnTab) {
  const reservation = adminReservations.find((item) => item.id === reservationId);
  if (!reservation || !confirm(`Zrušit rezervaci účastníka ${reservation.attendee_name}? Udělat to můžeš i méně než 24 hodin před lekcí.`)) return;
  try {
    const result = await manageLesson({ action: 'cancel-reservation', reservationId });
    await Promise.all([loadAdminLessons(), loadAdminReservations()]);
    document.querySelector('#admin-panel').innerHTML = lessonParticipantsPanel(lessonId, returnTab);
    bindParticipantDetailNavigation();
    const savedMessage = result.lateCancellation ? 'Pozdní storno bylo uložené jako neúčast s platbou.' : 'Rezervace byla zrušena.';
    showToast(result.emailSent ? `${savedMessage} Účastník dostal e-mail.` : `${savedMessage} E-mail se nepodařilo odeslat.`);
  } catch (error) {
    showToast(error.message);
  }
}

async function adminRest(path, method = 'GET', body) {
  const mutating = method !== 'GET' && method !== 'HEAD';
  const response = await adminFetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Prefer: mutating ? 'return=representation' : 'return=minimal',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 401 || response.status === 403) {
    closeDialog();
    clearAdminSession();
    renderAdminLogin('Přihlášení vypršelo. Přihlas se prosím znovu.');
  }
  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    throw new Error(details.message || 'Změnu se nepodařilo uložit.');
  }
  const result = await response.json().catch(() => null);
  if (mutating && (!Array.isArray(result) || result.length === 0)) {
    throw new Error('Databáze změnu nepotvrdila. Obnov stránku a přihlas se znovu.');
  }
  return result;
}

async function saveDonationSummary(event) {
  event.preventDefault();
  const form = event.target;
  const button = form.querySelector('[type="submit"]');
  if (button.disabled) return;
  const data = new FormData(form);
  button.disabled = true;
  button.textContent = 'Ukládám…';
  try {
    const result = await manageLesson({ action: 'update-donation-summary', amountCzk: Number(data.get('amountCzk')), asOf: String(data.get('asOf')) });
    adminSettings.donation_summary = result.summary;
    publicSettings.donation_summary = result.summary;
    applyPublicSettings(publicSettings);
    form.querySelector('[data-donation-summary-preview]').textContent = donationSummaryText(result.summary);
    showToast('Souhrn příspěvků byl uložen. Použije se na webu a v nových příspěvkových e-mailech.');
  } catch (error) {
    showToast(error.message);
  } finally {
    button.disabled = false;
    button.textContent = 'Uložit souhrn příspěvků';
  }
}

async function saveSettings(event) {
  event.preventDefault();
  const button = event.target.querySelector('[type="submit"]');
  const data = new FormData(event.target);
  button.disabled = true;
  button.textContent = 'Ukládám…';
  try {
    await Promise.all(adminInstructors.map((teacher) => {
      const mode = String(data.get(`teacherMode-${teacher.id}`));
      const paymentNote = mode === teacher.payment_mode
        ? teacher.payment_note
        : mode === 'paid'
          ? 'Platba QR kódem po skončení lekce.'
          : DONATION_PAYMENT_COPY;
      return adminRest(`instructors?id=eq.${encodeURIComponent(teacher.id)}`, 'PATCH', {
        payment_mode: mode,
        price_czk: mode === 'paid' ? Number(data.get(`teacherPrice-${teacher.id}`)) : null,
        payment_note: paymentNote,
        paid_qr_url: String(data.get(`teacherPaidQr-${teacher.id}`)).trim() || null,
        donation_qr_url: String(data.get(`teacherDonationQr-${teacher.id}`)).trim() || null,
      });
    }));
    await manageLesson({
      action: 'update-settings',
      cancellationHours: Number(data.get('cancellationHours')),
      bookingGraceMinutes: Number(data.get('bookingGraceMinutes')),
      minimumAttendance: Number(data.get('minimumAttendance')),
      defaultPaidPrice: Number(adminSettings.default_paid_price),
      studioCapacity: Number(data.get('studioCapacity')),
    });
    await Promise.all([loadAdminSettings(), loadAdminInstructors(), loadAdminLessons(), loadPublicContent()]);
    await refreshPublicSettings();
    await loadLessons();
    renderAdmin('settings');
    showToast('Nastavení bylo uloženo a propsáno do budoucích lekcí.');
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Uložit nastavení';
    showToast(error.message);
  }
}

function openTeacherEditor(id) {
  const teacher = adminInstructors.find((item) => item.id === id);
  if (!teacher) return;
  document.querySelector('#booking-content').innerHTML = `<form class="booking-panel" id="teacher-form">
    <p class="eyebrow">Profil lektora</p><h2>${escapeHtml(instructorDisplayName(teacher.name))}</h2>
    <div class="form-grid">
      <div class="field full"><label for="teacher-name">Jméno</label><input id="teacher-name" name="name" value="${escapeHtml(instructorDisplayName(teacher.name))}" maxlength="120" required></div>
      <div class="field full"><label for="teacher-email">E-mail pro souhrny po lekci</label><input id="teacher-email" name="email" type="email" value="${escapeHtml(teacher.email || '')}" maxlength="320" required><small>Po odeslání platebních údajů dostane lektor na tuto adresu souhrn.</small></div>
      <div class="field full"><label for="teacher-styles">Styly jógy</label><input id="teacher-styles" name="styles" value="${escapeHtml((teacher.styles || []).join(', '))}" placeholder="Power, Vinyasa, Hatha"></div>
      <div class="field full"><label for="teacher-bio">Medailonek</label><textarea id="teacher-bio" name="bio" rows="7" required>${escapeHtml(teacher.bio)}</textarea></div>
      <div class="field full"><label for="teacher-quote">Osobní citát o praxi</label><textarea id="teacher-quote" name="practiceQuote" rows="4" maxlength="1000">${escapeHtml(teacher.practice_quote || '')}</textarea></div>
      <div class="field full"><label for="teacher-photo">Adresa fotografie</label><input id="teacher-photo" name="photoUrl" value="${escapeHtml(teacher.photo_url || '')}"></div>
      <div class="field"><label for="teacher-payment-mode">Typ lekce</label><select id="teacher-payment-mode" name="paymentMode"><option value="paid" ${teacher.payment_mode === 'paid' ? 'selected' : ''}>Placená</option><option value="donation" ${teacher.payment_mode === 'donation' ? 'selected' : ''}>Dobrovolný příspěvek</option></select></div>
      <div class="field"><label for="teacher-price">Cena v Kč</label><input id="teacher-price" name="priceCzk" type="number" min="0" value="${teacher.price_czk ?? ''}"></div>
      <div class="field full"><label for="teacher-payment-note">Informace k platbě</label><input id="teacher-payment-note" name="paymentNote" value="${escapeHtml(teacher.payment_note || '')}"></div>
      <div class="field full"><label for="teacher-paid-qr">QR kód pro placenou lekci</label><input id="teacher-paid-qr" name="paidQrUrl" value="${escapeHtml(teacher.paid_qr_url || '')}" placeholder="assets/qr-platba.jpg"><small>Pokud chybí, platební e-mail pro placenou lekci nepůjde odeslat.</small></div>
      <div class="field full"><label for="teacher-donation-qr">QR kód pro dobrovolný příspěvek</label><input id="teacher-donation-qr" name="donationQrUrl" value="${escapeHtml(teacher.donation_qr_url || '')}" placeholder="assets/qr-dobry-andel.jpg"></div>
    </div>
    <button class="button" type="submit">Uložit profil</button>
  </form>`;
  document.querySelector('#teacher-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.target.querySelector('[type="submit"]');
    const data = new FormData(event.target);
    const paymentMode = data.get('paymentMode');
    const price = data.get('priceCzk');
    const enteredPaymentNote = data.get('paymentNote').trim();
    const paymentNote = paymentMode !== teacher.payment_mode && enteredPaymentNote === teacher.payment_note
      ? paymentMode === 'paid'
        ? 'Platba QR kódem po skončení lekce.'
        : DONATION_PAYMENT_COPY
      : enteredPaymentNote;
    button.disabled = true;
    button.textContent = 'Ukládám…';
    try {
      await manageLesson({
        action: 'update-instructor-profile',
        instructorId: id,
        email: data.get('email').trim(),
        name: data.get('name').trim() === instructorDisplayName(teacher.name) ? teacher.name : data.get('name').trim(),
        styles: String(data.get('styles')).split(',').map((item) => item.trim()).filter(Boolean),
        bio: data.get('bio').trim(),
        practiceQuote: data.get('practiceQuote').trim(),
        photoUrl: data.get('photoUrl').trim() || null,
        paymentMode,
        priceCzk: paymentMode === 'paid' ? Number(price) : null,
        paymentNote,
        paidQrUrl: data.get('paidQrUrl').trim() || null,
        donationQrUrl: data.get('donationQrUrl').trim() || null,
      });
      closeDialog();
      await Promise.all([loadAdminInstructors(), loadPublicContent()]);
      renderAdmin('teachers');
      showToast('Profil lektora byl uložen.');
    } catch (error) {
      button.disabled = false;
      button.textContent = 'Uložit profil';
      showToast(error.message);
    }
  });
  dialog.showModal();
}

function openNewsEditor(id = null) {
  const item = id ? adminNews.find((news) => news.id === id) : null;
  document.querySelector('#booking-content').innerHTML = `<form class="booking-panel" id="news-form">
    <p class="eyebrow">${item ? 'Úprava novinky' : 'Nová novinka'}</p><h2>${item ? escapeHtml(item.title) : 'Přidat novinku'}</h2>
    <div class="form-grid">
      <div class="field full"><label for="news-title">Název</label><input id="news-title" name="title" maxlength="160" value="${escapeHtml(item?.title || '')}" required></div>
      <div class="field full"><label for="news-summary">Krátké shrnutí</label><textarea id="news-summary" name="summary" rows="3" required>${escapeHtml(item?.summary || '')}</textarea></div>
      <div class="field full"><label for="news-body">Delší text</label><textarea id="news-body" name="body" rows="6">${escapeHtml(item?.body || '')}</textarea></div>
      <div class="field full"><label for="news-image">Adresa obrázku (nepovinné)</label><input id="news-image" name="imageUrl" value="${escapeHtml(item?.image_url || '')}" placeholder="assets/studio-lamps.jpeg"></div>
      <div class="field full"><label for="news-tone">Podkladová barva</label><select id="news-tone" name="backgroundTone"><option value="sage" ${!item || item.background_tone === 'sage' ? 'selected' : ''}>Zelená</option><option value="clay" ${item?.background_tone === 'clay' ? 'selected' : ''}>Terakotová</option><option value="sand" ${item?.background_tone === 'sand' ? 'selected' : ''}>Písková</option><option value="ink" ${item?.background_tone === 'ink' ? 'selected' : ''}>Tmavá</option></select></div>
      <label class="checkbox field full"><input type="checkbox" name="published" ${item?.published_at || !item ? 'checked' : ''}><span>Zobrazovat novinku na veřejném webu</span></label>
    </div>
    <button class="button" type="submit">${item ? 'Uložit změny' : 'Přidat novinku'}</button>
  </form>`;
  document.querySelector('#news-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.target.querySelector('[type="submit"]');
    const data = new FormData(event.target);
    const payload = {
      title: data.get('title').trim(),
      summary: data.get('summary').trim(),
      body: data.get('body').trim(),
      image_url: data.get('imageUrl').trim() || null,
      background_tone: data.get('backgroundTone'),
      published_at: data.get('published') ? (item?.published_at || new Date().toISOString()) : null,
    };
    if (!item) payload.display_order = Math.min(0, ...adminNews.map((news) => Number(news.display_order) || 0)) - 1;
    button.disabled = true;
    button.textContent = 'Ukládám…';
    try {
      await adminRest(item ? `news_items?id=eq.${encodeURIComponent(item.id)}` : 'news_items', item ? 'PATCH' : 'POST', payload);
      closeDialog();
      await Promise.all([loadAdminNews(), loadPublicContent()]);
      renderAdmin('content');
      showToast(item ? 'Novinka byla upravena.' : 'Novinka byla přidána.');
    } catch (error) {
      button.disabled = false;
      button.textContent = item ? 'Uložit změny' : 'Přidat novinku';
      showToast(error.message);
    }
  });
  dialog.showModal();
}

async function moveNews(id, direction) {
  const index = adminNews.findIndex((item) => item.id === id);
  const neighborIndex = index + direction;
  if (index < 0 || neighborIndex < 0 || neighborIndex >= adminNews.length) return;
  const orderedIds = adminNews.map((item) => item.id);
  [orderedIds[index], orderedIds[neighborIndex]] = [orderedIds[neighborIndex], orderedIds[index]];
  try {
    await adminRest('rpc/admin_reorder_news_items', 'POST', { p_ordered_ids: orderedIds });
    await Promise.all([loadAdminNews(), loadPublicContent()]);
    renderAdmin('content');
    showToast('Pořadí novinek bylo změněno.');
  } catch (error) {
    await loadAdminNews();
    renderAdmin('content');
    showToast(error.message);
  }
}

async function toggleNews(id) {
  const item = adminNews.find((news) => news.id === id);
  if (!item) return;
  try {
    await adminRest(`news_items?id=eq.${encodeURIComponent(id)}`, 'PATCH', { published_at: item.published_at ? null : new Date().toISOString() });
    await Promise.all([loadAdminNews(), loadPublicContent()]);
    renderAdmin('content');
    showToast(item.published_at ? 'Novinka je skrytá.' : 'Novinka je zveřejněná.');
  } catch (error) {
    showToast(error.message);
  }
}

async function deleteNews(id) {
  const item = adminNews.find((news) => news.id === id);
  if (!item || !confirm(`Opravdu trvale smazat novinku „${item.title}“?`)) return;
  try {
    await adminRest(`news_items?id=eq.${encodeURIComponent(id)}`, 'DELETE');
    await Promise.all([loadAdminNews(), loadPublicContent()]);
    renderAdmin('content');
    showToast('Novinka byla smazána.');
  } catch (error) {
    showToast(error.message);
  }
}

async function openPaymentEmails(lessonId) {
  document.querySelector('#booking-content').innerHTML = '<div class="booking-panel"><p>Načítám účastníky…</p></div>';
  dialog.showModal();
  try {
    const preview = await manageLesson({ lessonId, action: 'payment-preview' });
    const donation = preview.payment_mode === 'donation';
    const qrPath = preview.payment_qr_url || '';
    const paymentText = donation ? (preview.payment_note || 'Dobrovolný příspěvek') : `Platba ${preview.price_czk ?? 0} Kč – ${preview.teacher}`;
    const participantRows = preview.participants.map((participant) => {
      const sent = Boolean(participant.payment_email_sent_at);
      const outcome = participant.payment_waived_at ? 'waived' : participant.status === 'no_show' ? 'no_show' : 'attended';
      const sentLabel = sent ? `<span class="payment-sent">Odesláno ${new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(participant.payment_email_sent_at))}</span>` : '';
      const recipientEmail = participant.payment_email_recipient || participant.email || '';
      return `<article class="attendance-recipient${sent ? ' is-sent' : ''}" data-attendance-recipient="${participant.reservation_id}">
        <div class="payment-person"><b>${escapeHtml(participant.name)}</b>${sentLabel}</div>
        <div class="attendance-options" role="radiogroup" aria-label="Docházka – ${escapeHtml(participant.name)}">
          <label><input type="radio" name="attendance-${participant.reservation_id}" value="attended" ${outcome === 'attended' ? 'checked' : ''} ${sent ? 'disabled' : ''}><span><b>Účast potvrzena</b><small>Účast + platba</small></span></label>
          <label><input type="radio" name="attendance-${participant.reservation_id}" value="no_show" ${outcome === 'no_show' ? 'checked' : ''} ${sent ? 'disabled' : ''}><span><b>Bez účasti</b><small>Platba ano</small></span></label>
          <label><input type="radio" name="attendance-${participant.reservation_id}" value="waived" ${outcome === 'waived' ? 'checked' : ''} ${sent ? 'disabled' : ''}><span><b>Bez platby</b><small>Výjimečné prominutí</small></span></label>
        </div>
        ${recipientEmail ? `<input type="email" data-payment-email="${participant.reservation_id}" value="${escapeHtml(recipientEmail)}" ${sent || outcome === 'waived' ? 'disabled' : ''} aria-label="E-mail – ${escapeHtml(participant.name)}" required>` : `<input type="hidden" data-payment-email="${participant.reservation_id}" value=""><span class="attendance-email-missing"><b>Bez e-mailu</b><small>Účast se uloží, platbu nelze odeslat.</small></span>`}
      </article>`;
    }).join('');
    const unsentCount = preview.participants.filter((participant) => !participant.payment_email_sent_at && Boolean(participant.payment_email_recipient || participant.email)).length;
    const feedback = preview.feedback || { requested: false, total: 0, ratings: {}, topics: [], comments: [] };
    const ratingSummary = feedback.total ? `<div class="feedback-results">
      <div class="feedback-result-counts">
        <span><b>${feedback.ratings.great || 0}</b> Skvěle</span>
        <span><b>${feedback.ratings.good || 0}</b> Dobře</span>
        <span><b>${feedback.ratings.not_right || 0}</b> Něco mi nesedlo</span>
      </div>
      ${feedback.topics?.length ? `<p><b>Nejčastěji označeno:</b> ${feedback.topics.map((item) => `${escapeHtml(item.topic)} (${item.count})`).join(', ')}</p>` : ''}
      ${feedback.comments?.length ? `<div class="feedback-comments"><b>Anonymní komentáře</b>${feedback.comments.map((comment) => `<blockquote>${escapeHtml(comment)}</blockquote>`).join('')}</div>` : ''}
    </div>` : '';
    document.querySelector('#booking-content').innerHTML = `<form class="booking-panel payment-panel" id="payment-email-form">
      <p class="eyebrow">Docházka a platby</p><h2>${escapeHtml(preview.title)}</h2>
      <p>${escapeHtml(formatAdminDate(preview.starts_at))}<br>${instructorRole(preview.teacher)}: <b>${escapeHtml(instructorDisplayName(preview.teacher))}</b></p>
      <p class="form-hint">Souhrn odeslání dostane lektor na <b>${escapeHtml(preview.instructor_email || 'nenastavený e-mail')}</b>.</p>
      <div class="payment-preview">${qrPath ? `<img src="${escapeHtml(qrPath)}" alt="${escapeHtml(paymentText)}">` : '<div class="payment-qr-missing">QR kód chybí</div>'}<div><b>${escapeHtml(paymentText)}</b><p>${escapeHtml(preview.payment_note || '')}</p>${qrPath ? '' : '<p class="attendance-note">Nejdřív doplň QR kód v profilu lektora.</p>'}</div></div>
      <div class="payment-list-heading"><b>Potvrď skutečnou účast</b><span>${unsentCount} neodeslaných plateb</span></div>
      <p class="form-hint">Všechny rezervace jsou předvyplněné jako „Účast potvrzena“. Změň pouze výjimky. Volba „Bez platby“ neodešle e-mail a účast nezapočítá.</p>
      <div class="payment-walk-in-action"><button class="button button-small button-secondary" type="button" data-add-walk-in>+ Přidat účast bez rezervace</button></div>
      <div class="payment-recipient-list">${participantRows || '<p>Na této lekci nejsou žádní aktivní účastníci.</p>'}</div>
      <label class="feedback-request-choice"><input type="checkbox" name="feedbackRequested" ${feedback.requested ? 'checked' : ''}><span><b>Požádat o krátkou zpětnou vazbu</b><small>Odkaz na anonymní hodnocení dostanou pouze lidé s potvrzenou účastí.</small></span></label>
      ${feedback.total ? `<section class="feedback-summary"><p class="eyebrow">Zpětná vazba · ${feedback.total} ${feedback.total === 1 ? 'odpověď' : feedback.total < 5 ? 'odpovědi' : 'odpovědí'}</p>${ratingSummary}</section>` : ''}
      ${preview.instructor_email ? '' : '<p class="attendance-note">Nejdřív doplň e-mail lektora v jeho profilu.</p>'}
      <button class="button" type="submit" ${preview.participants.length ? '' : 'disabled'}>Potvrdit docházku a odeslat</button>
    </form>`;
    document.querySelectorAll('.attendance-options input').forEach((radio) => radio.addEventListener('change', () => {
      const reservationId = radio.name.replace('attendance-', '');
      const email = document.querySelector(`[data-payment-email="${reservationId}"]`);
      email.disabled = radio.value === 'waived';
    }));
    document.querySelector('[data-add-walk-in]').addEventListener('click', () => openWalkInForm(lessonId));
    document.querySelector('#payment-email-form').addEventListener('submit', (event) => sendPaymentEmails(event, lessonId));
  } catch (error) {
    closeDialog();
    showToast(error.message);
  }
}

function openWalkInForm(lessonId) {
  document.querySelector('#booking-content').innerHTML = `<form class="booking-panel walk-in-form" id="walk-in-form">
    <p class="eyebrow">Docházka bez rezervace</p>
    <h2>Přidat účastníka</h2>
    <p class="form-hint">Pro člověka, který přišel na lekci bez předchozí registrace. Pokud zadáš e-mail, účast se později propojí s jeho účtem.</p>
    <div class="field"><label for="walk-in-name">Jméno a příjmení</label><input id="walk-in-name" name="attendeeName" type="text" minlength="2" maxlength="120" autocomplete="name" required></div>
    <div class="field"><label for="walk-in-email">E-mail</label><input id="walk-in-email" name="attendeeEmail" type="email" maxlength="320" autocomplete="email" required><small>Slouží k platebnímu e-mailu a přiřazení k budoucímu účtu.</small></div>
    <label class="checkbox walk-in-email-unknown"><input type="checkbox" name="emailUnknown"><span>E-mail neznám</span></label>
    <div class="field"><label for="walk-in-relation">Vztah k Alze</label><select id="walk-in-relation" name="attendeeRelation"><option value="employee">Zaměstnanec Alzy</option><option value="guest">Host</option></select></div>
    <div class="walk-in-form-actions"><button class="button button-secondary" type="button" data-walk-in-back>Zpět</button><button class="button" type="submit">Přidat účast</button></div>
  </form>`;
  const form = document.querySelector('#walk-in-form');
  const emailInput = form.elements.attendeeEmail;
  form.elements.emailUnknown.addEventListener('change', () => {
    emailInput.disabled = form.elements.emailUnknown.checked;
    emailInput.required = !form.elements.emailUnknown.checked;
  });
  form.querySelector('[data-walk-in-back]').addEventListener('click', () => openPaymentEmails(lessonId));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    button.textContent = 'Přidávám…';
    try {
      const result = await manageLesson({
        action: 'add-walk-in',
        lessonId,
        attendeeName: form.elements.attendeeName.value.trim(),
        attendeeEmail: form.elements.emailUnknown.checked ? '' : emailInput.value.trim(),
        attendeeRelation: form.elements.attendeeRelation.value,
      });
      await Promise.all([loadAdminLessons(), loadAdminReservations()]);
      await openPaymentEmails(lessonId);
      showToast(result.over_capacity
        ? `Účast byla přidána. Evidováno je ${result.participant_count} lidí při kapacitě ${result.capacity}.`
        : 'Účast bez rezervace byla přidána.');
    } catch (error) {
      button.disabled = false;
      button.textContent = 'Přidat účast';
      showToast(error.message);
    }
  });
}

function formatAdminDate(value) {
  return new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Prague' }).format(new Date(value));
}

async function sendPaymentEmails(event, lessonId) {
  event.preventDefault();
  const attendance = Array.from(event.target.querySelectorAll('[data-attendance-recipient]')).map((row) => {
    const reservationId = row.dataset.attendanceRecipient;
    const selected = row.querySelector('.attendance-options input:checked');
    return {
      reservationId,
      outcome: selected?.value || 'attended',
      email: row.querySelector(`[data-payment-email="${reservationId}"]`).value.trim(),
    };
  });
  if (!attendance.length) {
    showToast('Na lekci nejsou žádní účastníci k potvrzení.');
    return;
  }
  const button = event.target.querySelector('[type="submit"]');
  button.disabled = true;
  button.textContent = 'Ukládám a odesílám…';
  try {
    const feedbackRequested = Boolean(event.target.elements.feedbackRequested?.checked);
    const result = await manageLesson({ lessonId, action: 'payment-send', attendance, feedbackRequested });
    await Promise.all([loadAdminLessons(), loadAdminReservations(), loadAdminFeedback()]);
    closeDialog();
    renderAdmin(activeAdminTab);
    showToast(!result.sent && !result.failed
      ? 'Docházka byla uložena. Žádný platební e-mail nebyl potřeba.'
      : result.failed || !result.summarySent
      ? `Účastníkům odesláno: ${result.sent}, neúspěšné: ${result.failed}. ${result.summarySent ? 'Souhrn lektorovi odeslán.' : 'Souhrn lektorovi se nepodařilo odeslat.'}`
      : `Docházka byla uložena a platební e-maily byly odeslány: ${result.sent}.`);
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Potvrdit docházku a odeslat';
    showToast(error.message);
  }
}

async function feedbackRequest(payload) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/lesson-feedback`, {
    method: 'POST',
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || 'Zpětnou vazbu se nepodařilo načíst.');
  return result;
}

async function openLessonFeedback(token) {
  document.querySelector('#booking-content').innerHTML = '<div class="booking-panel"><p>Načítám zpětnou vazbu…</p></div>';
  dialog.showModal();
  try {
    const feedback = await feedbackRequest({ action: 'load', token });
    const topics = ['Tempo lekce', 'Náročnost', 'Vysvětlení pozic', 'Skladba lekce', 'Atmosféra', 'Hudba', 'Organizace'];
    const selectedTopics = new Set(feedback.topics || []);
    document.querySelector('#booking-content').innerHTML = `<form class="booking-panel lesson-feedback-form" id="lesson-feedback-form">
      <p class="eyebrow">Zpětná vazba po lekci</p>
      <h2>Jaká pro tebe lekce byla?</h2>
      <p><b>${escapeHtml(feedback.title)}</b><br>${escapeHtml(formatAdminDate(feedback.starts_at))}<br>${instructorRole(feedback.teacher)}: ${escapeHtml(instructorDisplayName(feedback.teacher))}</p>
      ${feedback.submitted ? '<p class="feedback-saved-note">Odpověď už je uložená. Můžeš ji zde upravit.</p>' : ''}
      <fieldset class="feedback-rating"><legend>Celkově</legend>
        <label><input type="radio" name="rating" value="great" ${feedback.rating === 'great' ? 'checked' : ''} required><span>Skvěle</span></label>
        <label><input type="radio" name="rating" value="good" ${feedback.rating === 'good' ? 'checked' : ''}><span>Dobře</span></label>
        <label><input type="radio" name="rating" value="not_right" ${feedback.rating === 'not_right' ? 'checked' : ''}><span>Něco mi nesedlo</span></label>
      </fieldset>
      <fieldset class="feedback-topics"><legend>Čeho se tvoje hodnocení týká? <small>Volitelné</small></legend>
        ${topics.map((topic) => `<label><input type="checkbox" name="topics" value="${escapeHtml(topic)}" ${selectedTopics.has(topic) ? 'checked' : ''}><span>${escapeHtml(topic)}</span></label>`).join('')}
      </fieldset>
      <label class="field"><span>Komentář <small>Volitelné</small></span><textarea name="comment" rows="4" maxlength="1500" placeholder="Co ti vyhovovalo nebo co by příště mohlo být jinak?">${escapeHtml(feedback.comment || '')}</textarea></label>
      <p class="form-hint">Odpověď se lektorovi zobrazí anonymně.</p>
      <button class="button" type="submit">Odeslat zpětnou vazbu</button>
    </form>`;
    document.querySelector('#lesson-feedback-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = event.target.querySelector('[type="submit"]');
      button.disabled = true;
      button.textContent = 'Ukládám…';
      try {
        const data = new FormData(event.target);
        await feedbackRequest({
          action: 'submit',
          token,
          rating: data.get('rating'),
          topics: data.getAll('topics'),
          comment: data.get('comment'),
        });
        document.querySelector('#booking-content').innerHTML = `<div class="booking-panel feedback-thanks"><p class="eyebrow">Děkujeme</p><h2>Děkujeme za zpětnou vazbu.</h2><p>Pomáhá nám vytvářet lekce, na kterých se budeš cítit dobře.</p><button class="button" type="button" data-close-feedback>Zavřít</button></div>`;
        document.querySelector('[data-close-feedback]').addEventListener('click', closeDialog);
        history.replaceState({}, '', location.pathname);
      } catch (error) {
        button.disabled = false;
        button.textContent = 'Odeslat zpětnou vazbu';
        showToast(error.message);
      }
    });
  } catch (error) {
    document.querySelector('#booking-content').innerHTML = `<div class="booking-panel feedback-thanks"><p class="eyebrow">Zpětná vazba</p><h2>Odkaz není dostupný</h2><p>${escapeHtml(error.message)}</p><button class="button" type="button" data-close-feedback>Zavřít</button></div>`;
    document.querySelector('[data-close-feedback]').addEventListener('click', closeDialog);
  }
}

function dateTimeLocalValue(value) {
  const date = new Date(value);
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 16);
}

function openNewLesson() {
  if (!adminSession || !adminInstructors.length) {
    showToast('Nejdřív se přihlas a načti seznam lektorů.');
    return;
  }
  const starts = new Date();
  starts.setDate(starts.getDate() + 1);
  starts.setHours(17, 0, 0, 0);
  const ends = new Date(starts.getTime() + 60 * 60 * 1000);
  const earliestStart = new Date();
  earliestStart.setSeconds(0, 0);
  earliestStart.setMinutes(earliestStart.getMinutes() + 1);
  const instructorOptions = adminInstructors.map((instructor) => `<option value="${instructor.id}">${escapeHtml(instructorDisplayName(instructor.name))}</option>`).join('');
  const initialPaymentMode = adminInstructors[0].payment_mode === 'donation' ? 'donation' : 'paid';
  const initialPrice = adminInstructors[0].price_czk ?? Number(adminSettings.default_paid_price);
  document.querySelector('#booking-content').innerHTML = `<form class="booking-panel" id="new-lesson-form">
    <p class="eyebrow">Nová lekce</p><h2>Vytvořit termín</h2>
    <div class="form-grid">
      <div class="field full"><label for="new-lesson-title">Název lekce</label><input id="new-lesson-title" name="title" maxlength="120" required></div>
      <div class="field"><label for="new-lesson-instructor">Lektor</label><select id="new-lesson-instructor" name="instructorId" required>${instructorOptions}</select></div>
      <div class="field"><label for="new-lesson-language">Jazyk</label><select id="new-lesson-language" name="language" required><option value="cs" selected>Čeština</option><option value="en">Angličtina</option></select></div>
      <div class="field"><label for="new-lesson-start">Začátek</label><input id="new-lesson-start" name="startsAt" type="datetime-local" min="${dateTimeLocalValue(earliestStart)}" value="${dateTimeLocalValue(starts)}" required></div>
      <div class="field"><label for="new-lesson-end">Konec</label><input id="new-lesson-end" name="endsAt" type="datetime-local" value="${dateTimeLocalValue(ends)}" required></div>
      <div class="field"><label for="new-lesson-capacity">Kapacita</label><input id="new-lesson-capacity" name="capacity" type="number" min="1" max="${Number(adminSettings.studio_capacity)}" value="${Number(adminSettings.studio_capacity)}" required><small>Maximum odpovídá kapacitě studia v nastavení.</small></div>
      <div class="field"><label for="new-lesson-repeat">Počet lekcí v sérii</label><input id="new-lesson-repeat" name="repeatCount" type="number" min="1" max="52" value="1" required></div>
      <fieldset class="field full payment-choice"><legend>Platba za lekci</legend>
        <label><input type="radio" name="paymentMode" value="paid" ${initialPaymentMode === 'paid' ? 'checked' : ''}> <span><b>Placená lekce</b><small>Po lekci přijde QR kód lektora pro platbu.</small></span></label>
        <label><input type="radio" name="paymentMode" value="donation" ${initialPaymentMode === 'donation' ? 'checked' : ''}> <span><b>Dobrovolný příspěvek</b><small>Použije se příspěvkový QR kód nastavený u lektora.</small></span></label>
      </fieldset>
      <div class="field"><label for="new-lesson-price">Cena placené lekce v Kč</label><input id="new-lesson-price" name="priceCzk" type="number" min="0" max="10000" value="${initialPrice}" required></div>
      <div class="field"><label for="new-lesson-minimum">Minimum přihlášených</label><input id="new-lesson-minimum" name="minimumAttendance" type="number" min="1" max="100" value="${Number(adminSettings.minimum_attendance)}" required></div>
    </div>
    <p class="form-hint">Při vyšším počtu se další lekce vytvoří vždy ve stejný den a čas po jednom týdnu.</p>
    <button class="button" type="submit">Vytvořit lekci</button>
  </form>`;
  document.querySelector('#new-lesson-start').addEventListener('change', (event) => {
    const start = new Date(event.target.value);
    if (Number.isNaN(start.getTime())) return;
    document.querySelector('#new-lesson-end').value = dateTimeLocalValue(new Date(start.getTime() + 60 * 60 * 1000));
  });
  document.querySelector('#new-lesson-instructor').addEventListener('change', (event) => {
    const instructor = adminInstructors.find((item) => item.id === event.target.value);
    const mode = instructor?.payment_mode === 'donation' ? 'donation' : 'paid';
    document.querySelector(`input[name="paymentMode"][value="${mode}"]`).checked = true;
    document.querySelector('#new-lesson-price').value = instructor?.price_czk ?? Number(adminSettings.default_paid_price);
    syncNewLessonPaymentFields();
  });
  document.querySelectorAll('[name="paymentMode"]').forEach((input) => input.addEventListener('change', syncNewLessonPaymentFields));
  syncNewLessonPaymentFields();
  document.querySelector('#new-lesson-form').addEventListener('submit', createLessons);
  dialog.showModal();
}

function syncNewLessonPaymentFields() {
  const paid = document.querySelector('[name="paymentMode"]:checked')?.value === 'paid';
  const price = document.querySelector('#new-lesson-price');
  if (!price) return;
  price.disabled = !paid;
  price.required = paid;
}

async function createLessons(event) {
  event.preventDefault();
  const button = event.target.querySelector('[type="submit"]');
  const data = new FormData(event.target);
  const startsAt = new Date(data.get('startsAt'));
  const endsAt = new Date(data.get('endsAt'));
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    showToast('Zkontroluj datum a čas lekce.');
    return;
  }
  if (startsAt <= new Date()) {
    showToast('Začátek nové lekce musí být v budoucnosti.');
    return;
  }
  if (endsAt <= startsAt) {
    showToast('Konec lekce musí být později než začátek.');
    return;
  }
  button.disabled = true;
  button.textContent = 'Vytvářím…';
  try {
    const result = await manageLesson({
      action: 'create',
      title: data.get('title'),
      instructorId: data.get('instructorId'),
      language: data.get('language'),
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      capacity: Number(data.get('capacity')),
      repeatCount: Number(data.get('repeatCount')),
      paymentMode: data.get('paymentMode'),
      priceCzk: data.get('paymentMode') === 'paid' ? Number(data.get('priceCzk')) : null,
      minimumAttendance: Number(data.get('minimumAttendance')),
    });
    if (!Number.isInteger(result.created) || result.created < 1) {
      throw new Error('Lekce nebyla vytvořena. Zkus to prosím znovu.');
    }
    closeDialog();
    await Promise.all([loadLessons(), loadAdminLessons()]);
    renderAdmin('overview');
    showToast(`Vytvořeno lekcí: ${result.created}.`);
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Vytvořit lekci';
    showToast(error.message);
  }
}

function openLessonEditor(id) {
  const lesson = adminLessons.find((item) => item.id === id);
  if (!lesson) return;
  const instructorOptions = adminInstructors.map((instructor) => `<option value="${instructor.id}" ${instructor.id === lesson.instructorId ? 'selected' : ''}>${escapeHtml(instructorDisplayName(instructor.name))}</option>`).join('');
  document.querySelector('#booking-content').innerHTML = `<form class="booking-panel" id="lesson-edit-form">
    <p class="eyebrow">Úprava lekce</p><h2>Upravit vypsanou lekci</h2>
    <div class="form-grid">
      <div class="field full"><label for="lesson-title">Název lekce</label><input id="lesson-title" name="title" maxlength="120" value="${escapeHtml(lesson.title)}" required></div>
      <div class="field"><label for="lesson-instructor">Lektor</label><select id="lesson-instructor" name="instructorId" required>${instructorOptions}</select></div>
      <div class="field"><label for="lesson-language">Jazyk</label><select id="lesson-language" name="language" required><option value="cs" ${lesson.language === 'cs' ? 'selected' : ''}>Čeština</option><option value="en" ${lesson.language === 'en' ? 'selected' : ''}>Angličtina</option></select></div>
      <div class="field"><label for="lesson-start">Začátek</label><input id="lesson-start" name="startsAt" type="datetime-local" value="${dateTimeLocalValue(lesson.iso)}" required></div>
      <div class="field"><label for="lesson-end">Konec</label><input id="lesson-end" name="endsAt" type="datetime-local" value="${dateTimeLocalValue(lesson.endsAt)}" required></div>
      <div class="field"><label for="lesson-capacity">Kapacita</label><input id="lesson-capacity" name="capacity" type="number" min="${Math.max(1, lesson.booked)}" max="${Number(adminSettings.studio_capacity)}" value="${lesson.capacity}" required><small>Maximum odpovídá kapacitě studia v nastavení.</small></div>
      <div class="field"><label for="lesson-minimum">Minimum přihlášených</label><input id="lesson-minimum" name="minimumAttendance" type="number" min="1" max="100" value="${lesson.minimumAttendance}" required></div>
      <fieldset class="field full payment-choice"><legend>Platba za lekci</legend>
        <label><input type="radio" name="editPaymentMode" value="paid" ${lesson.paymentMode === 'paid' ? 'checked' : ''}> <span><b>Placená lekce</b><small>Po lekci přijde QR kód zvoleného lektora pro platbu.</small></span></label>
        <label><input type="radio" name="editPaymentMode" value="donation" ${lesson.paymentMode === 'donation' ? 'checked' : ''}> <span><b>Dobrovolný příspěvek</b><small>Použije se příspěvkový QR kód zvoleného lektora.</small></span></label>
      </fieldset>
      <div class="field"><label for="lesson-price">Cena placené lekce v Kč</label><input id="lesson-price" name="priceCzk" type="number" min="0" max="10000" value="${lesson.priceCzk ?? Number(adminSettings.default_paid_price)}" required></div>
    </div>
    <p><button class="button button-small" type="button" data-shift="-15">− 15 minut</button> <button class="button button-small" type="button" data-shift="15">+ 15 minut</button></p>
    <p class="form-hint">Po uložení dostanou všichni přihlášení e-mail s aktuálními údaji lekce.</p>
    <button class="button" type="submit">Uložit změny</button>
  </form>`;
  document.querySelectorAll('[data-shift]').forEach((button) => button.addEventListener('click', () => {
    const minutes = Number(button.dataset.shift);
    ['lesson-start', 'lesson-end'].forEach((fieldId) => {
      const field = document.querySelector(`#${fieldId}`);
      const value = new Date(field.value);
      value.setMinutes(value.getMinutes() + minutes);
      field.value = dateTimeLocalValue(value);
    });
  }));
  document.querySelector('#lesson-start').addEventListener('change', (event) => {
    const start = new Date(event.target.value);
    if (Number.isNaN(start.getTime())) return;
    document.querySelector('#lesson-end').value = dateTimeLocalValue(new Date(start.getTime() + 60 * 60 * 1000));
  });
  const syncEditorPaymentFields = () => {
    const paid = document.querySelector('[name="editPaymentMode"]:checked')?.value === 'paid';
    const price = document.querySelector('#lesson-price');
    price.disabled = !paid;
    price.required = paid;
  };
  document.querySelector('#lesson-instructor').addEventListener('change', (event) => {
    const instructor = adminInstructors.find((item) => item.id === event.target.value);
    const mode = instructor?.payment_mode === 'donation' ? 'donation' : 'paid';
    document.querySelector(`[name="editPaymentMode"][value="${mode}"]`).checked = true;
    document.querySelector('#lesson-price').value = instructor?.price_czk ?? Number(adminSettings.default_paid_price);
    syncEditorPaymentFields();
  });
  document.querySelectorAll('[name="editPaymentMode"]').forEach((input) => input.addEventListener('change', syncEditorPaymentFields));
  syncEditorPaymentFields();
  document.querySelector('#lesson-edit-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.target.querySelector('[type="submit"]');
    const data = new FormData(event.target);
    const startsAt = new Date(data.get('startsAt'));
    const endsAt = new Date(data.get('endsAt'));
    if (endsAt <= startsAt) {
      showToast('Konec lekce musí být později než začátek.');
      return;
    }
    const paymentMode = data.get('editPaymentMode');
    button.disabled = true;
    button.textContent = 'Ukládám…';
    try {
      const result = await manageLesson({
        lessonId: id,
        action: 'update',
        title: data.get('title'),
        instructorId: data.get('instructorId'),
        language: data.get('language'),
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        capacity: Number(data.get('capacity')),
        paymentMode,
        priceCzk: paymentMode === 'paid' ? Number(document.querySelector('#lesson-price').value) : null,
        minimumAttendance: Number(data.get('minimumAttendance')),
      });
      closeDialog();
      await Promise.all([loadLessons(), loadAdminLessons()]);
      renderAdmin('overview');
      showToast(result.failed ? `Lekce je upravená. ${result.failed} e-mailů se nepodařilo odeslat.` : `Lekce je upravená. Odesláno e-mailů: ${result.notified}.`);
    } catch (error) {
      button.disabled = false;
      button.textContent = 'Uložit změny';
      showToast(error.message);
    }
  });
  dialog.showModal();
}

async function cancelLesson(id) {
  const lesson = adminLessons.find((item) => item.id === id);
  if (!lesson || !confirm(`Opravdu zrušit lekci „${lesson.title}“ ${lesson.date} v ${lesson.time}? Přihlášení dostanou e-mail.`)) return;
  try {
    const result = await manageLesson({ lessonId: id, action: 'cancel' });
    await Promise.all([loadLessons(), loadAdminLessons()]);
    renderAdmin('overview');
    showToast(result.failed ? `Lekce je zrušená. ${result.failed} e-mailů se nepodařilo odeslat.` : `Lekce je zrušená. Odesláno e-mailů: ${result.notified}.`);
  } catch (error) {
    showToast(error.message);
  }
}

async function deleteLesson(id) {
  const lesson = adminLessons.find((item) => item.id === id);
  if (!lesson || !adminCanDeleteLessons) return;
  if (!confirm(`Opravdu TRVALE smazat lekci „${lesson.title}“ ${lesson.date} v ${lesson.time} včetně všech souvisejících rezervací? Tuto akci nelze vrátit zpět a neodesílá žádné e-maily.`)) return;
  try {
    const result = await manageLesson({ lessonId: id, action: 'delete-lesson' });
    await Promise.all([loadLessons(), loadAdminLessons(), loadAdminReservations()]);
    renderAdmin(activeAdminTab);
    showToast(`Lekce byla trvale smazána včetně ${result.deletedReservations} rezervací.`);
  } catch (error) {
    showToast(error.message);
  }
}

async function confirmLowAttendance(id) {
  const lesson = adminLessons.find((item) => item.id === id);
  if (!lesson || !confirm(`Potvrdit, že lekce „${lesson.title}“ se koná i s ${lesson.booked} přihlášenými?`)) return;
  try {
    await manageLesson({ lessonId: id, action: 'confirm-low-attendance' });
    await loadAdminLessons();
    renderAdmin('overview');
    showToast('Uloženo: lekce se koná i v menším počtu.');
  } catch (error) {
    showToast(error.message);
  }
}

async function manageLesson(payload) {
  const response = await adminFetch(`${SUPABASE_URL}/functions/v1/manage-lesson`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (response.status === 401 || (response.status === 403 && result.error === 'FORBIDDEN')) {
    closeDialog();
    clearAdminSession();
    renderAdminLogin(result.message || 'Přihlášení vypršelo. Přihlas se prosím znovu.');
  }
  if (!response.ok) throw new Error(result.message || 'Změnu se nepodařilo uložit.');
  return result;
}

document.querySelectorAll('.admin-nav').forEach((button) => button.addEventListener('click', async () => {
  if (!adminSession) return;
  document.querySelectorAll('.admin-nav').forEach((item) => item.classList.remove('active'));
  button.classList.add('active');
  const tab = button.dataset.adminTab;
  try {
    document.querySelector('#admin-panel').innerHTML = '<div class="admin-card"><p>Načítám…</p></div>';
    await loadAdminTabData(tab);
    setAdminTabUrl(tab);
    renderAdmin(tab);
    scrollAdminToTop();
    requestAnimationFrame(scrollAdminToTop);
    setAdminMenuOpen(false);
  } catch (error) {
    document.querySelector('#admin-panel').innerHTML = '<div class="admin-card"><h2>Záložku se nepodařilo načíst</h2><p>Zkus ji prosím otevřít znovu.</p></div>';
    showToast(error.message);
  }
}));

document.querySelector('#add-lesson').addEventListener('click', openNewLesson);
document.querySelector('#admin-logout').addEventListener('click', () => {
  clearAdminSession();
  renderAdminLogin('Byl/a jsi odhlášen/a.');
});
const adminMenuToggle = document.querySelector('#admin-menu-toggle');
const adminMenu = document.querySelector('#admin-menu');
function setAdminMenuOpen(open) {
  adminMenu.classList.toggle('is-open', open);
  adminMenuToggle.setAttribute('aria-expanded', String(open));
  adminMenuToggle.setAttribute('aria-label', open ? 'Zavřít menu správy' : 'Otevřít menu správy');
  adminMenuToggle.querySelector('span').textContent = open ? '×' : '☰';
}
adminMenuToggle.addEventListener('click', () => {
  setAdminMenuOpen(!adminMenu.classList.contains('is-open'));
});
const menuToggle = document.querySelector('.menu-toggle');
const mainMenu = document.querySelector('#main-menu');
menuToggle.addEventListener('click', () => {
  const open = mainMenu.classList.toggle('is-open');
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Zavřít hlavní menu' : 'Otevřít hlavní menu');
});
mainMenu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  mainMenu.classList.remove('is-open');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Otevřít hlavní menu');
}));
renderLessons();
renderNextClass();
initializeHeroClaim();
initializeYogaReflection();
refreshPublicSettings().then(loadLessons);
loadPublicStudioBlocks();
loadPublicContent();

async function initializeRoute() {
  const accountParams = new URLSearchParams(location.search);
  const feedbackToken = accountParams.get('feedback');
  if (feedbackToken) {
    await openLessonFeedback(feedbackToken);
    return;
  }
  const tokenHash = accountParams.get('token_hash');
  const verificationType = accountParams.get('type');
  if (tokenHash && ['signup', 'magiclink', 'recovery'].includes(verificationType)) {
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
        method: 'POST',
        headers: { apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_hash: tokenHash, type: verificationType }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.access_token || !result.refresh_token) throw new Error('INVALID_AUTH_LINK');
      saveUserSession(result);
      accountRecoveryMode = verificationType === 'recovery';
      history.replaceState({}, '', `${location.pathname}#ucet`);
      await openAccount();
      showToast(accountRecoveryMode ? 'Odkaz je ověřený. Nastav si nové heslo.' : 'E-mail je potvrzený. Účet je připravený.');
      return;
    } catch {
      history.replaceState({}, '', `${location.pathname}#ucet`);
      await openAccount();
      renderAccountLogin('Odkaz je neplatný nebo už vypršel. Vyžádej si prosím nový.');
      return;
    }
  }
  const authFragment = new URLSearchParams(location.hash.startsWith('#') ? location.hash.slice(1) : location.hash);
  if (authFragment.get('access_token') && authFragment.get('refresh_token')) {
    saveUserSession({
      access_token: authFragment.get('access_token'),
      refresh_token: authFragment.get('refresh_token'),
      expires_in: Number(authFragment.get('expires_in') || 3600),
    });
    accountRecoveryMode = authFragment.get('type') === 'recovery' || new URLSearchParams(location.search).get('account') === 'recovery';
    history.replaceState({}, '', `${location.pathname}#ucet`);
    await openAccount();
    showToast(accountRecoveryMode ? 'Odkaz je ověřený. Nastav si nové heslo.' : 'E-mail je potvrzený. Účet je připravený.');
    return;
  }
  const cancellationToken = new URLSearchParams(location.search).get('cancel');
  if (cancellationToken) openCancellation(cancellationToken);
  else if (adminTabFromHash()) await openAdmin({ updateUrl: false });
  else if (location.hash === '#ucet') await openAccount();
}

initializeRoute();
