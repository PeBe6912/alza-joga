const SUPABASE_URL = 'https://zltcizbzckyazlxilzwq.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_X1KLjQkjhSe3Sl-McSQNBA_hz9d5HKR';

const fallbackLessons = [
  { id: 1, day: 'Út', date: '20. 10.', iso: '2026-10-20T08:00:00+02:00', time: '8:00–9:00', title: 'Ranní flow', teacher: 'Daniela Šťastná', type: 'paid', price: '150 Kč', capacity: 20, booked: 7 },
  { id: 2, day: 'Út', date: '20. 10.', iso: '2026-10-20T12:00:00+02:00', time: '12:00–13:00', title: 'Polední restart', teacher: 'Daniela Šťastná', type: 'paid', price: '150 Kč', capacity: 20, booked: 9 },
  { id: 3, day: 'Čt', date: '22. 10.', iso: '2026-10-22T16:45:00+02:00', time: '16:45–17:45', title: 'Strong slow flow', teacher: 'Petr Bena', type: 'charity', price: 'Dobrovolný příspěvek', capacity: 20, booked: 5 },
  { id: 4, day: 'Út', date: '27. 10.', iso: '2026-10-27T08:00:00+01:00', time: '8:00–9:00', title: 'Ranní flow', teacher: 'Daniela Šťastná', type: 'paid', price: '150 Kč', capacity: 20, booked: 4 }
];

let lessons = fallbackLessons;

const fallbackTeachers = [
  { name: 'Daniela Šťastná', photo: 'assets/daniela-stastna.jpg', styles: 'Fyzio · Hatha · Power · Vinyasa', payment: '150 Kč · QR po skončení lekce', charity: false, bio: 'Jógu aktivně praktikuje od roku 2014. V roce 2023 dokončila akreditovaný 200hodinový kurz MŠMT od Yoga4Everybody.' },
  { name: 'Petr Bena', photo: 'assets/petr-bena.jpeg', styles: 'Power · Vinyasa · Strong slow flow', payment: 'Dobrovolně · Dobrý anděl', charity: true, bio: 'Od prosince 2023 praktikuje jógu denně. V roce 2026 dokončil 200hodinový kurz pro učitele power a vinyasa jógy v Ubudu na Bali.' }
];
let teachers = fallbackTeachers;
let newsItems = [];

const savedBookings = JSON.parse(localStorage.getItem('alzaYogaBookings') || '[]');
const settings = JSON.parse(localStorage.getItem('alzaYogaSettings') || '{"petrCharity":true,"capacity":20}');
let adminSession = JSON.parse(sessionStorage.getItem('jogaAdminSession') || 'null');
let adminLessons = [];
let adminInstructors = [];
let adminNews = [];
let adminReservations = [];
const classList = document.querySelector('#class-list');
const toast = document.querySelector('#toast');
const dialog = document.querySelector('#booking-dialog');

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

function placesLabel(places) {
  if (places === 1) return '1 volné místo';
  if (places > 1 && places < 5) return `${places} volná místa`;
  return `${places} volných míst`;
}

function renderLessons(filter = 'all') {
  const visible = lessons.filter((lesson) => filter === 'all' || lesson.type === filter);
  classList.innerHTML = visible.map((lesson) => {
    const places = spotsLeft(lesson);
    const typeLabel = lesson.type === 'charity' ? 'Dobrovolný příspěvek' : 'Klasická lekce';
    const languageLabel = lesson.language === 'en' ? '<span class="language-badge">Lekce v angličtině</span>' : '';
    return `<article class="class-row">
      <div class="class-date"><strong>${lesson.day}</strong><span>${lesson.date}</span></div>
      <div class="class-teacher"><h3>${escapeHtml(lesson.title)}</h3><small>${escapeHtml(lesson.teacher)}</small><br><span>${typeLabel}</span>${languageLabel}</div>
      <div class="class-meta"><b>${escapeHtml(lesson.time)}</b><span>HALL · 3. patro</span><span>${escapeHtml(lesson.price)}</span></div>
      <div class="class-action"><button class="button" data-book="${lesson.id}" ${places <= 0 ? 'disabled' : ''}>${places <= 0 ? 'Obsazeno' : 'Rezervovat'}</button><small>${placesLabel(places)}</small></div>
    </article>`;
  }).join('');
  document.querySelectorAll('[data-book]').forEach((button) => button.addEventListener('click', () => openBooking(button.dataset.book)));
}

function renderNextClass() {
  const lesson = lessons[0];
  const card = document.querySelector('#next-class-card');
  if (!lesson) {
    card.innerHTML = '<p>Nové termíny připravujeme.</p>';
    return;
  }
  card.innerHTML = `<div class="date"><span>NEJBLIŽŠÍ LEKCE</span><span>${lesson.date}</span></div><h3>${escapeHtml(lesson.title)}</h3><p>${escapeHtml(lesson.time)} · ${escapeHtml(lesson.teacher)}</p><div class="spots"><span>${placesLabel(spotsLeft(lesson))}</span><a href="#lekce">Rezervovat →</a></div>`;
}

document.querySelectorAll('.filter').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.filter').forEach((item) => item.classList.remove('active'));
  button.classList.add('active');
  renderLessons(button.dataset.filter);
}));

function openBooking(id) {
  const lesson = lessons.find((item) => item.id === id);
  if (!lesson) return;
  const languageNote = lesson.language === 'en' ? '<span class="language-badge">Lekce v angličtině</span>' : '';
  document.querySelector('#booking-content').innerHTML = `<form class="booking-panel" id="booking-form">
    <p class="eyebrow">Rezervace místa</p><h2>${escapeHtml(lesson.title)}</h2>
    <div class="booking-summary"><span><b>${lesson.day} ${lesson.date}</b><br>${escapeHtml(lesson.time)}<br><small>S lektorem: ${escapeHtml(lesson.teacher)}</small><br>${languageNote}</span><span>${escapeHtml(lesson.price)}</span></div>
    <div class="form-grid">
      <div class="field"><label for="name">Jméno a příjmení</label><input id="name" name="name" required autocomplete="name"></div>
      <div class="field"><label for="email">E-mail</label><input id="email" name="email" type="email" required autocomplete="email"></div>
      <div class="field full"><label for="relation">Jdu jako</label><select id="relation" name="relation"><option value="employee">Zaměstnanec Alzy</option><option value="guest">Host / externista</option></select></div>
      <label class="checkbox field full"><input type="checkbox" required><span>Souhlasím s <a href="podminky.html" target="_blank" rel="noopener">podmínkami rezervace</a> a potvrzuji, že jsem se seznámil/a s <a href="ochrana-osobnich-udaju.html" target="_blank" rel="noopener">informacemi o zpracování osobních údajů</a>.</span></label>
    </div><button class="button" type="submit">Potvrdit rezervaci</button>
  </form>`;
  document.querySelector('#booking-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = event.target.querySelector('[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Ukládám…';
    const data = new FormData(event.target);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/book-lesson`, {
        method: 'POST',
        headers: { apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: id,
          name: data.get('name'),
          email: data.get('email'),
          relation: data.get('relation'),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Rezervaci se nepodařilo uložit.');

      const fallbackLink = result.cancelUrl
        ? `<p>E-mail zatím není nastavený. Ulož si proto tento odkaz: <a href="${escapeHtml(result.cancelUrl)}">zrušit rezervaci</a>.</p>`
        : '<p>Potvrzení a odkaz pro případné zrušení najdeš v e-mailu.</p>';
      document.querySelector('#booking-content').innerHTML = `<div class="booking-panel"><p class="eyebrow">Hotovo</p><h2>Místo je tvoje</h2>${fallbackLink}<button class="button" type="button" data-dialog-done>Zavřít</button></div>`;
      document.querySelector('[data-dialog-done]').addEventListener('click', () => dialog.close());
      await loadLessons();
      showToast(result.emailSent ? 'Místo je rezervované. Potvrzení jsme poslali e-mailem.' : 'Místo je rezervované. Ulož si odkaz pro zrušení.');
    } catch (error) {
      submitButton.disabled = false;
      submitButton.textContent = 'Potvrdit rezervaci';
      showToast(error.message);
    }
  });
  dialog.showModal();
}

function lessonFromDatabase(row) {
  const starts = new Date(row.starts_at);
  const ends = new Date(row.ends_at);
  const dateParts = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric', timeZone: 'Europe/Prague' }).format(starts);
  const day = new Intl.DateTimeFormat('cs-CZ', { weekday: 'short', timeZone: 'Europe/Prague' }).format(starts).replace('.', '');
  const time = `${new Intl.DateTimeFormat('cs-CZ', { hour: 'numeric', minute: '2-digit', timeZone: 'Europe/Prague' }).format(starts)}–${new Intl.DateTimeFormat('cs-CZ', { hour: 'numeric', minute: '2-digit', timeZone: 'Europe/Prague' }).format(ends)}`;
  const instructor = row.instructors;
  const donation = instructor.payment_mode === 'donation';
  return {
    id: row.id,
    day: day.charAt(0).toUpperCase() + day.slice(1),
    date: dateParts,
    iso: row.starts_at,
    endsAt: row.ends_at,
    time,
    title: row.title,
    teacher: instructor.name,
    type: donation ? 'charity' : 'paid',
    price: donation ? 'Dobrovolný příspěvek' : `${instructor.price_czk} Kč`,
    capacity: row.capacity,
    booked: row.booked_count,
    status: row.status || 'published',
    language: row.language || 'cs',
  };
}

async function loadLessons() {
  const query = new URLSearchParams({
    select: 'id,title,starts_at,ends_at,capacity,booked_count,location,language,instructors(name,payment_mode,price_czk,payment_note)',
    status: 'eq.published',
    starts_at: `gte.${new Date().toISOString()}`,
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
  } catch (error) {
    console.error(error);
    showToast('Živé termíny se nepodařilo načíst. Zobrazuji poslední dostupný přehled.');
  }
}

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
    paymentMode: row.payment_mode,
    priceCzk: row.price_czk,
    paymentNote: row.payment_note || '',
  };
}

function renderPublicTeachers() {
  const grid = document.querySelector('#teachers-grid');
  if (!grid) return;
  grid.innerHTML = teachers.map((teacher, index) => `<article class="teacher-card${index % 2 ? ' reverse' : ''}">
    <img src="${escapeHtml(teacher.photo)}" alt="Lektor jógy ${escapeHtml(teacher.name)}">
    <div class="teacher-card-copy">
      <p class="teacher-kicker">${escapeHtml(teacher.styles)}</p>
      <h3>${escapeHtml(teacher.name)}</h3>
      <p>${escapeHtml(teacher.bio)}</p>
      <span class="charity-note">${escapeHtml(teacher.payment)}</span>
    </div>
  </article>`).join('');
}

function renderPublicNews() {
  const grid = document.querySelector('#news-grid');
  if (!grid) return;
  if (!newsItems.length) {
    grid.innerHTML = '<p class="news-empty">Nové zprávy ze studia právě připravujeme.</p>';
    return;
  }
  const displayItems = [...newsItems].sort((a, b) => Number(Boolean(b.image_url)) - Number(Boolean(a.image_url)));
  grid.innerHTML = displayItems.map((item, index) => item.image_url
    ? `<article class="news-card featured"><img src="${escapeHtml(item.image_url)}" alt=""><div><span>Ze studia</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary || item.body)}</p></div></article>`
    : `<article class="news-card text-card${index % 2 ? ' warm' : ''}"><span>Novinka</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary || item.body)}</p></article>`).join('');
}

async function loadPublicContent() {
  try {
    const [instructorsResponse, newsResponse] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/instructors?select=id,name,bio,styles,photo_url,payment_mode,price_czk,payment_note&active=eq.true&order=sort_order.asc`, { headers: { apikey: SUPABASE_PUBLISHABLE_KEY } }),
      fetch(`${SUPABASE_URL}/rest/v1/news_items?select=id,title,summary,body,image_url,published_at&published_at=not.is.null&order=published_at.desc`, { headers: { apikey: SUPABASE_PUBLISHABLE_KEY } }),
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
    <p>Zrušení je bezplatné nejpozději 24 hodin před začátkem lekce.</p>
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
      document.querySelector('#booking-content').innerHTML = `<div class="booking-panel"><p class="eyebrow">Hotovo</p><h2>${result.alreadyCancelled ? 'Rezervace už byla zrušená' : 'Rezervace je zrušená'}</h2><button class="button" type="button" data-dialog-done>Zavřít</button></div>`;
      document.querySelector('[data-dialog-done]').addEventListener('click', () => dialog.close());
      history.replaceState({}, '', `${location.pathname}${location.hash}`);
      await loadLessons();
    } catch (error) {
      event.target.disabled = false;
      event.target.textContent = 'Zrušit rezervaci';
      showToast(error.message);
    }
  });
  dialog.showModal();
}

document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3800);
}

const publicView = document.querySelector('#public-view');
const adminView = document.querySelector('#admin-view');

async function openAdmin() {
  publicView.hidden = true;
  document.querySelector('.site-header').hidden = true;
  document.querySelector('.announcement').hidden = true;
  document.querySelector('footer').hidden = true;
  adminView.hidden = false;
  if (adminSession && await isAdminSessionValid()) {
    await loadAdminData();
    renderAdmin('overview');
  } else {
    clearAdminSession();
    renderAdminLogin();
  }
  window.scrollTo(0, 0);
}

document.querySelectorAll('[data-open-admin]').forEach((button) => button.addEventListener('click', openAdmin));

document.querySelector('#close-admin').addEventListener('click', () => {
  adminView.hidden = true;
  publicView.hidden = false;
  document.querySelector('.site-header').hidden = false;
  document.querySelector('.announcement').hidden = false;
  document.querySelector('footer').hidden = false;
  window.scrollTo(0, 0);
});

function clearAdminSession() {
  adminSession = null;
  adminLessons = [];
  adminInstructors = [];
  adminNews = [];
  adminReservations = [];
  sessionStorage.removeItem('jogaAdminSession');
}

async function isAdminSessionValid() {
  if (!adminSession?.access_token) return false;
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${adminSession.access_token}` },
    });
    if (!response.ok) return false;
    const user = await response.json();
    return user.app_metadata?.role === 'admin';
  } catch {
    return false;
  }
}

async function loadAdminLessons() {
  const historyStart = new Date();
  historyStart.setDate(historyStart.getDate() - 90);
  const query = new URLSearchParams({
    select: 'id,title,starts_at,ends_at,capacity,booked_count,status,location,language,instructors(name,payment_mode,price_czk,payment_note)',
    starts_at: `gte.${historyStart.toISOString()}`,
    order: 'starts_at.asc',
  });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/lessons?${query}`, {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${adminSession.access_token}`,
    },
  });
  if (!response.ok) throw new Error('Lekce pro správu se nepodařilo načíst.');
  adminLessons = (await response.json()).map(lessonFromDatabase);
}

async function loadAdminInstructors() {
  const query = new URLSearchParams({ select: 'id,name,bio,styles,photo_url,payment_mode,price_czk,payment_note,active,sort_order', order: 'sort_order.asc' });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/instructors?${query}`, {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${adminSession.access_token}` },
  });
  if (!response.ok) throw new Error('Lektory se nepodařilo načíst.');
  adminInstructors = await response.json();
}

async function loadAdminNews() {
  const query = new URLSearchParams({ select: 'id,title,summary,body,image_url,published_at,created_at', order: 'created_at.desc' });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/news_items?${query}`, {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${adminSession.access_token}` },
  });
  if (!response.ok) throw new Error('Novinky se nepodařilo načíst.');
  adminNews = await response.json();
}

async function loadAdminReservations() {
  const now = new Date().toISOString();
  const select = 'id,attendee_name,attendee_email,status,payment_email_sent_at,lessons!inner(id,title,starts_at,ends_at,status,instructors(name))';
  const query = new URLSearchParams({ select, status: 'in.(confirmed,attended,no_show)', 'lessons.starts_at': `gte.${now}` });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/reservations?${query}`, {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${adminSession.access_token}` },
  });
  if (!response.ok) throw new Error('Účastníky se nepodařilo načíst.');
  adminReservations = (await response.json()).sort((a, b) => new Date(a.lessons.starts_at) - new Date(b.lessons.starts_at));
}

async function loadAdminData() {
  await Promise.all([loadAdminLessons(), loadAdminInstructors(), loadAdminNews(), loadAdminReservations()]);
}

function renderAdminLogin(message = '') {
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
    if (result.user?.app_metadata?.role !== 'admin') throw new Error('Tento účet nemá oprávnění správce.');
    adminSession = { access_token: result.access_token };
    sessionStorage.setItem('jogaAdminSession', JSON.stringify(adminSession));
    await loadAdminData();
    renderAdmin('overview');
  } catch (error) {
    clearAdminSession();
    renderAdminLogin(error.message);
  }
}

function lessonTable(sourceLessons = adminLessons) {
  const rows = sourceLessons.map((lesson) => {
    const cancelled = lesson.status === 'cancelled';
    const ended = new Date(lesson.endsAt) <= new Date();
    const status = cancelled ? 'Zrušeno' : ended ? 'Proběhla' : 'Otevřeno';
    const actions = cancelled
      ? ''
      : ended
        ? `<button class="button button-small" data-payment-lesson="${lesson.id}">Platby a příspěvky</button>`
        : `<button class="button button-small" data-edit-lesson="${lesson.id}">Změnit čas</button><button class="button button-small" data-cancel-lesson="${lesson.id}">Zrušit</button>`;
    return `<tr><td data-label="Termín"><b>${escapeHtml(lesson.date)}</b><br>${escapeHtml(lesson.time)}</td><td data-label="Lekce">${escapeHtml(lesson.title)}${lesson.language === 'en' ? '<br><span class="language-badge">EN</span>' : ''}</td><td data-label="Lektor">${escapeHtml(lesson.teacher)}</td><td data-label="Obsazeno">${lesson.booked}/${lesson.capacity}</td><td data-label="Stav"><span class="status-pill${cancelled ? ' warn' : ended ? ' done' : ''}">${status}</span></td><td class="lesson-actions" data-label="Akce">${actions}</td></tr>`;
  }).join('');
  return `<table class="admin-table"><thead><tr><th>Termín</th><th>Lekce</th><th>Lektor</th><th>Obsazeno</th><th>Stav</th><th>Akce</th></tr></thead><tbody>${rows || '<tr><td colspan="6">Nejsou naplánované žádné lekce.</td></tr>'}</tbody></table>`;
}

function overviewPanel() {
  const openLessons = adminLessons.filter((lesson) => lesson.status === 'published' && new Date(lesson.endsAt) > new Date());
  const nextLesson = openLessons[0];
  return `<div class="stats"><div class="stat-card"><span>AKTIVNÍ REZERVACE</span><strong>${openLessons.reduce((sum, lesson) => sum + lesson.booked, 0)}</strong><small>v budoucích lekcích</small></div><div class="stat-card"><span>NEJBLIŽŠÍ LEKCE</span><strong>${nextLesson ? `${nextLesson.booked} / ${nextLesson.capacity}` : '—'}</strong><small>${nextLesson ? `${escapeHtml(nextLesson.date)} v ${escapeHtml(nextLesson.time.split('–')[0])}` : 'Bez termínu'}</small></div><div class="stat-card"><span>NAPLÁNOVANÉ LEKCE</span><strong>${openLessons.length}</strong><small>${adminLessons.filter((lesson) => lesson.status === 'cancelled').length} zrušených</small></div></div><div class="admin-grid"><div class="admin-card"><h2>Nejbližší lekce</h2>${lessonTable(openLessons.slice(0, 4))}</div><div class="admin-card"><h2>Obsazenost</h2>${openLessons.slice(0, 3).map((lesson) => `<div class="progress-item"><div class="progress-label"><span>${escapeHtml(lesson.date)} · ${escapeHtml(lesson.time)}</span><b>${lesson.booked}/${lesson.capacity}</b></div><div class="progress-bar"><i style="width:${lesson.booked / lesson.capacity * 100}%"></i></div></div>`).join('') || '<p>Zatím nejsou naplánované žádné lekce.</p>'}</div></div>`;
}

function teachersPanel() {
  return `<div class="admin-card"><h2>Profily lektorů</h2>${adminInstructors.map((teacher) => `<article class="admin-teacher"><img src="${escapeHtml(teacher.photo_url || '')}" alt="${escapeHtml(teacher.name)}"><div><h3>${escapeHtml(teacher.name)}</h3><p><b>${escapeHtml((teacher.styles || []).join(' · '))}</b></p><p>${escapeHtml(teacher.bio)}</p><p>${escapeHtml(teacher.payment_note)}</p></div><button class="button button-small" data-edit-teacher="${teacher.id}">Upravit profil</button></article>`).join('')}</div>`;
}

function bookingsPanel() {
  if (!adminReservations.length) return '<div class="admin-card"><h2>Účastníci nejbližších lekcí</h2><p>V nejbližších lekcích zatím nejsou žádné aktivní rezervace.</p></div>';
  const grouped = adminReservations.reduce((groups, reservation) => {
    const lessonId = reservation.lessons.id;
    if (!groups.has(lessonId)) groups.set(lessonId, { lesson: reservation.lessons, reservations: [] });
    groups.get(lessonId).reservations.push(reservation);
    return groups;
  }, new Map());
  return `<div class="admin-card"><h2>Účastníci nejbližších lekcí</h2><div class="reservation-groups">${Array.from(grouped.values()).map(({ lesson, reservations }) => `<section class="reservation-group">
    <div class="reservation-lesson"><div><h3>${escapeHtml(lesson.title)}</h3><p>${escapeHtml(formatAdminDate(lesson.starts_at))}–${escapeHtml(new Intl.DateTimeFormat('cs-CZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Prague' }).format(new Date(lesson.ends_at)))}</p></div><div><b>${escapeHtml(lesson.instructors.name)}</b><span>${reservations.length} přihlášených</span></div></div>
    <table class="admin-table"><thead><tr><th>Jméno</th><th>E-mail</th><th>Stav platby</th></tr></thead><tbody>${reservations.map((reservation) => `<tr><td data-label="Jméno">${escapeHtml(reservation.attendee_name)}</td><td data-label="E-mail">${escapeHtml(reservation.attendee_email)}</td><td data-label="Stav platby"><span class="status-pill${reservation.payment_email_sent_at ? ' done' : ' warn'}">${reservation.payment_email_sent_at ? 'Odesláno' : 'Po lekci'}</span></td></tr>`).join('')}</tbody></table>
  </section>`).join('')}</div></div>`;
}

function newsPanel() {
  const items = adminNews.map((item) => `<article class="admin-news-item"><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary || item.body)}</p><span class="status-pill${item.published_at ? '' : ' done'}">${item.published_at ? 'Zveřejněná' : 'Skrytá'}</span></div><div class="admin-news-actions"><button class="button button-small" data-edit-news="${item.id}">Upravit</button><button class="button button-small button-secondary" data-toggle-news="${item.id}">${item.published_at ? 'Skrýt' : 'Zveřejnit'}</button><button class="text-button danger" data-delete-news="${item.id}">Smazat</button></div></article>`).join('');
  return `<div class="admin-grid"><div class="admin-card"><div class="admin-card-heading"><h2>Novinky</h2><button class="button button-small" data-add-news>+ Přidat novinku</button></div>${items || '<p>Zatím nejsou vytvořené žádné novinky.</p>'}</div><div class="admin-card"><h2>Rychlé odkazy</h2><p>WhatsApp skupina</p><p>Podmínky rezervace</p><p>Ochrana osobních údajů</p></div></div>`;
}

function settingsPanel() {
  return `<div class="admin-grid"><div class="admin-card"><h2>Platby podle lektora</h2><div class="admin-setting"><b>Daniela Šťastná</b><br>150 Kč · QR kód se odešle ručně po kontrole účastníků.</div><div class="admin-setting" style="margin-top:10px"><label><input id="petr-charity" type="checkbox" ${settings.petrCharity ? 'checked' : ''}> <b>Petr Bena – dobrovolný příspěvek na Dobrého anděla</b></label><br>QR kód se odešle ručně po skončení lekce.</div></div><div class="admin-card"><h2>Pravidla rezervací</h2><div class="admin-form-row"><div class="admin-setting">Bezplatné zrušení<br><b>24 hodin</b></div><div class="admin-setting">Kapacita studia<br><b>20 míst · bude potvrzeno</b></div></div></div></div>`;
}

function renderAdmin(tab) {
  if (!adminSession) {
    renderAdminLogin();
    return;
  }
  const panel = document.querySelector('#admin-panel');
  const titles = { overview: 'Dobrý den, Petře', lessons: 'Lekce', teachers: 'Lektoři', people: 'Rezervace', content: 'Obsah webu', settings: 'Nastavení' };
  const addButton = document.querySelector('#add-lesson');
  addButton.hidden = tab !== 'lessons';
  document.querySelector('#admin-logout').hidden = false;
  addButton.textContent = '+ Nová lekce';
  document.querySelector('#admin-title').textContent = titles[tab];
  if (tab === 'overview') panel.innerHTML = overviewPanel();
  if (tab === 'lessons') {
    const now = new Date();
    const futureLessons = adminLessons.filter((lesson) => new Date(lesson.endsAt) > now);
    const pastLessons = adminLessons.filter((lesson) => new Date(lesson.endsAt) <= now).reverse();
    panel.innerHTML = `<div class="admin-card"><h2>Naplánované lekce</h2>${lessonTable(futureLessons)}</div><div class="admin-card admin-card-spaced"><h2>Proběhlé lekce a platby</h2><p class="admin-help">Po skončení lekce zkontroluj adresáty a ručně odešli platební nebo příspěvkový QR kód.</p>${lessonTable(pastLessons)}</div>`;
  }
  if (tab === 'teachers') panel.innerHTML = teachersPanel();
  if (tab === 'people') panel.innerHTML = bookingsPanel();
  if (tab === 'content') panel.innerHTML = newsPanel();
  if (tab === 'settings') panel.innerHTML = settingsPanel();

  document.querySelectorAll('[data-edit-teacher]').forEach((button) => button.addEventListener('click', () => openTeacherEditor(button.dataset.editTeacher)));
  document.querySelector('[data-add-news]')?.addEventListener('click', () => openNewsEditor());
  document.querySelectorAll('[data-edit-news]').forEach((button) => button.addEventListener('click', () => openNewsEditor(button.dataset.editNews)));
  document.querySelectorAll('[data-toggle-news]').forEach((button) => button.addEventListener('click', () => toggleNews(button.dataset.toggleNews)));
  document.querySelectorAll('[data-delete-news]').forEach((button) => button.addEventListener('click', () => deleteNews(button.dataset.deleteNews)));
  const charityToggle = document.querySelector('#petr-charity');
  if (charityToggle) charityToggle.addEventListener('change', () => {
    settings.petrCharity = charityToggle.checked;
    localStorage.setItem('alzaYogaSettings', JSON.stringify(settings));
    showToast('Nastavení Petrovy benefiční lekce bylo uloženo.');
  });

  document.querySelectorAll('[data-edit-lesson]').forEach((button) => button.addEventListener('click', () => openLessonEditor(button.dataset.editLesson)));
  document.querySelectorAll('[data-cancel-lesson]').forEach((button) => button.addEventListener('click', () => cancelLesson(button.dataset.cancelLesson)));
  document.querySelectorAll('[data-payment-lesson]').forEach((button) => button.addEventListener('click', () => openPaymentEmails(button.dataset.paymentLesson)));
}

async function adminRest(path, method = 'GET', body) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${adminSession.access_token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 401 || response.status === 403) {
    clearAdminSession();
    renderAdminLogin('Přihlášení vypršelo. Přihlas se prosím znovu.');
  }
  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    throw new Error(details.message || 'Změnu se nepodařilo uložit.');
  }
}

function openTeacherEditor(id) {
  const teacher = adminInstructors.find((item) => item.id === id);
  if (!teacher) return;
  document.querySelector('#booking-content').innerHTML = `<form class="booking-panel" id="teacher-form">
    <p class="eyebrow">Profil lektora</p><h2>${escapeHtml(teacher.name)}</h2>
    <div class="form-grid">
      <div class="field full"><label for="teacher-name">Jméno</label><input id="teacher-name" name="name" value="${escapeHtml(teacher.name)}" maxlength="120" required></div>
      <div class="field full"><label for="teacher-styles">Styly jógy</label><input id="teacher-styles" name="styles" value="${escapeHtml((teacher.styles || []).join(', '))}" placeholder="Power, Vinyasa, Hatha"></div>
      <div class="field full"><label for="teacher-bio">Medailonek</label><textarea id="teacher-bio" name="bio" rows="7" required>${escapeHtml(teacher.bio)}</textarea></div>
      <div class="field full"><label for="teacher-photo">Adresa fotografie</label><input id="teacher-photo" name="photoUrl" value="${escapeHtml(teacher.photo_url || '')}"></div>
      <div class="field"><label for="teacher-payment-mode">Typ lekce</label><select id="teacher-payment-mode" name="paymentMode"><option value="paid" ${teacher.payment_mode === 'paid' ? 'selected' : ''}>Placená</option><option value="donation" ${teacher.payment_mode === 'donation' ? 'selected' : ''}>Dobrovolný příspěvek</option></select></div>
      <div class="field"><label for="teacher-price">Cena v Kč</label><input id="teacher-price" name="priceCzk" type="number" min="0" value="${teacher.price_czk ?? ''}"></div>
      <div class="field full"><label for="teacher-payment-note">Informace k platbě</label><input id="teacher-payment-note" name="paymentNote" value="${escapeHtml(teacher.payment_note || '')}"></div>
    </div>
    <button class="button" type="submit">Uložit profil</button>
  </form>`;
  document.querySelector('#teacher-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.target.querySelector('[type="submit"]');
    const data = new FormData(event.target);
    const paymentMode = data.get('paymentMode');
    const price = data.get('priceCzk');
    button.disabled = true;
    button.textContent = 'Ukládám…';
    try {
      await adminRest(`instructors?id=eq.${encodeURIComponent(id)}`, 'PATCH', {
        name: data.get('name').trim(),
        styles: String(data.get('styles')).split(',').map((item) => item.trim()).filter(Boolean),
        bio: data.get('bio').trim(),
        photo_url: data.get('photoUrl').trim() || null,
        payment_mode: paymentMode,
        price_czk: paymentMode === 'paid' ? Number(price) : null,
        payment_note: data.get('paymentNote').trim(),
      });
      dialog.close();
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
      published_at: data.get('published') ? (item?.published_at || new Date().toISOString()) : null,
    };
    button.disabled = true;
    button.textContent = 'Ukládám…';
    try {
      await adminRest(item ? `news_items?id=eq.${encodeURIComponent(item.id)}` : 'news_items', item ? 'PATCH' : 'POST', payload);
      dialog.close();
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
    const qrPath = donation ? 'assets/qr-dobry-andel.jpg' : 'assets/qr-daniela-150.jpg';
    const paymentText = donation ? 'Dobrovolný příspěvek organizaci Dobrý anděl' : `Platba ${preview.price_czk || 150} Kč Daniele`;
    const participantRows = preview.participants.map((participant) => {
      const sent = Boolean(participant.payment_email_sent_at);
      const sentLabel = sent ? `<span class="payment-sent">Odesláno ${new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(participant.payment_email_sent_at))}</span>` : '';
      return `<label class="payment-recipient${sent ? ' is-sent' : ''}">
        <input type="checkbox" name="paymentRecipient" value="${participant.reservation_id}" ${sent ? 'disabled' : 'checked'}>
        <span class="payment-person"><b>${escapeHtml(participant.name)}</b>${sentLabel}</span>
        <input type="email" data-payment-email="${participant.reservation_id}" value="${escapeHtml(participant.payment_email_recipient || participant.email)}" ${sent ? 'disabled' : ''} required>
      </label>`;
    }).join('');
    const unsentCount = preview.participants.filter((participant) => !participant.payment_email_sent_at).length;
    document.querySelector('#booking-content').innerHTML = `<form class="booking-panel payment-panel" id="payment-email-form">
      <p class="eyebrow">E-mail po lekci</p><h2>${escapeHtml(preview.title)}</h2>
      <p><b>${escapeHtml(preview.teacher)}</b> · ${escapeHtml(formatAdminDate(preview.starts_at))}</p>
      <div class="payment-preview"><img src="${qrPath}" alt="${escapeHtml(paymentText)}"><div><b>${escapeHtml(paymentText)}</b><p>${escapeHtml(preview.payment_note || '')}</p></div></div>
      <div class="payment-list-heading"><b>Komu e-mail odeslat</b><span>${unsentCount} neodeslaných</span></div>
      <div class="payment-recipient-list">${participantRows || '<p>Na této lekci nejsou žádní aktivní účastníci.</p>'}</div>
      <p class="form-hint">Adresu můžeš před odesláním opravit. Odškrtnutému účastníkovi e-mail nepřijde.</p>
      <button class="button" type="submit" ${unsentCount ? '' : 'disabled'}>Zkontrolovat a odeslat</button>
    </form>`;
    document.querySelectorAll('[name="paymentRecipient"]').forEach((checkbox) => checkbox.addEventListener('change', () => {
      document.querySelector(`[data-payment-email="${checkbox.value}"]`).disabled = !checkbox.checked;
    }));
    document.querySelector('#payment-email-form').addEventListener('submit', (event) => sendPaymentEmails(event, lessonId));
  } catch (error) {
    dialog.close();
    showToast(error.message);
  }
}

function formatAdminDate(value) {
  return new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Prague' }).format(new Date(value));
}

async function sendPaymentEmails(event, lessonId) {
  event.preventDefault();
  const recipients = Array.from(event.target.querySelectorAll('[name="paymentRecipient"]:checked')).map((checkbox) => ({
    reservationId: checkbox.value,
    email: event.target.querySelector(`[data-payment-email="${checkbox.value}"]`).value.trim(),
  }));
  if (!recipients.length) {
    showToast('Vyber alespoň jednoho účastníka.');
    return;
  }
  if (!confirm(`Odeslat platební e-mail ${recipients.length} vybraným účastníkům?`)) return;
  const button = event.target.querySelector('[type="submit"]');
  button.disabled = true;
  button.textContent = 'Odesílám…';
  try {
    const result = await manageLesson({ lessonId, action: 'payment-send', recipients });
    dialog.close();
    showToast(result.failed ? `Odesláno: ${result.sent}. Neúspěšné: ${result.failed}.` : `Platební e-maily byly odeslány: ${result.sent}.`);
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Zkontrolovat a odeslat';
    showToast(error.message);
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
  const instructorOptions = adminInstructors.map((instructor) => `<option value="${instructor.id}">${escapeHtml(instructor.name)}</option>`).join('');
  document.querySelector('#booking-content').innerHTML = `<form class="booking-panel" id="new-lesson-form">
    <p class="eyebrow">Nová lekce</p><h2>Vytvořit termín</h2>
    <div class="form-grid">
      <div class="field full"><label for="new-lesson-title">Název lekce</label><input id="new-lesson-title" name="title" maxlength="120" required></div>
      <div class="field"><label for="new-lesson-instructor">Lektor</label><select id="new-lesson-instructor" name="instructorId" required>${instructorOptions}</select></div>
      <div class="field"><label for="new-lesson-language">Jazyk</label><select id="new-lesson-language" name="language" required><option value="cs" selected>Čeština</option><option value="en">Angličtina</option></select></div>
      <div class="field"><label for="new-lesson-start">Začátek</label><input id="new-lesson-start" name="startsAt" type="datetime-local" value="${dateTimeLocalValue(starts)}" required></div>
      <div class="field"><label for="new-lesson-end">Konec</label><input id="new-lesson-end" name="endsAt" type="datetime-local" value="${dateTimeLocalValue(ends)}" required></div>
      <div class="field"><label for="new-lesson-capacity">Kapacita</label><input id="new-lesson-capacity" name="capacity" type="number" min="1" max="100" value="20" required></div>
      <div class="field"><label for="new-lesson-repeat">Počet lekcí v sérii</label><input id="new-lesson-repeat" name="repeatCount" type="number" min="1" max="52" value="1" required></div>
    </div>
    <p class="form-hint">Při vyšším počtu se další lekce vytvoří vždy ve stejný den a čas po jednom týdnu.</p>
    <button class="button" type="submit">Vytvořit lekci</button>
  </form>`;
  document.querySelector('#new-lesson-start').addEventListener('change', (event) => {
    const start = new Date(event.target.value);
    if (Number.isNaN(start.getTime())) return;
    document.querySelector('#new-lesson-end').value = dateTimeLocalValue(new Date(start.getTime() + 60 * 60 * 1000));
  });
  document.querySelector('#new-lesson-form').addEventListener('submit', createLessons);
  dialog.showModal();
}

async function createLessons(event) {
  event.preventDefault();
  const button = event.target.querySelector('[type="submit"]');
  const data = new FormData(event.target);
  const startsAt = new Date(data.get('startsAt'));
  const endsAt = new Date(data.get('endsAt'));
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
    });
    dialog.close();
    await Promise.all([loadLessons(), loadAdminLessons()]);
    renderAdmin('lessons');
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
  document.querySelector('#booking-content').innerHTML = `<form class="booking-panel" id="lesson-time-form">
    <p class="eyebrow">Úprava lekce</p><h2>${escapeHtml(lesson.title)}</h2>
    <div class="form-grid">
      <div class="field"><label for="lesson-start">Začátek</label><input id="lesson-start" name="startsAt" type="datetime-local" value="${dateTimeLocalValue(lesson.iso)}" required></div>
      <div class="field"><label for="lesson-end">Konec</label><input id="lesson-end" name="endsAt" type="datetime-local" value="${dateTimeLocalValue(lesson.endsAt)}" required></div>
    </div>
    <p><button class="button button-small" type="button" data-shift="-15">− 15 minut</button> <button class="button button-small" type="button" data-shift="15">+ 15 minut</button></p>
    <p>Po uložení dostanou všichni přihlášení e-mail s novým časem.</p>
    <button class="button" type="submit">Uložit nový čas</button>
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
  document.querySelector('#lesson-time-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.target.querySelector('[type="submit"]');
    const data = new FormData(event.target);
    button.disabled = true;
    button.textContent = 'Ukládám…';
    try {
      const result = await manageLesson({
        lessonId: id,
        action: 'reschedule',
        startsAt: new Date(data.get('startsAt')).toISOString(),
        endsAt: new Date(data.get('endsAt')).toISOString(),
      });
      dialog.close();
      await Promise.all([loadLessons(), loadAdminLessons()]);
      renderAdmin('lessons');
      showToast(result.failed ? `Čas je změněný. ${result.failed} e-mailů se nepodařilo odeslat.` : `Čas je změněný. Odesláno e-mailů: ${result.notified}.`);
    } catch (error) {
      button.disabled = false;
      button.textContent = 'Uložit nový čas';
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
    renderAdmin('lessons');
    showToast(result.failed ? `Lekce je zrušená. ${result.failed} e-mailů se nepodařilo odeslat.` : `Lekce je zrušená. Odesláno e-mailů: ${result.notified}.`);
  } catch (error) {
    showToast(error.message);
  }
}

async function manageLesson(payload) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/manage-lesson`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${adminSession.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (response.status === 401 || response.status === 403) {
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
    if (tab === 'overview' || tab === 'lessons') await loadAdminLessons();
    if (tab === 'teachers') await loadAdminInstructors();
    if (tab === 'people') await loadAdminReservations();
    if (tab === 'content') await loadAdminNews();
    renderAdmin(tab);
  } catch (error) {
    showToast(error.message);
  }
}));

document.querySelector('#add-lesson').addEventListener('click', openNewLesson);
document.querySelector('#admin-logout').addEventListener('click', () => {
  clearAdminSession();
  renderAdminLogin('Byl/a jsi odhlášen/a.');
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
loadLessons();
loadPublicContent();
const cancellationToken = new URLSearchParams(location.search).get('cancel');
if (cancellationToken) openCancellation(cancellationToken);
