const SUPABASE_URL = 'https://zltcizbzckyazlxilzwq.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_X1KLjQkjhSe3Sl-McSQNBA_hz9d5HKR';

const fallbackLessons = [
  { id: 1, day: 'Út', date: '20. 10.', iso: '2026-10-20T08:00:00+02:00', time: '8:00–9:00', title: 'Ranní flow', teacher: 'Daniela Šťastná', type: 'paid', price: '150 Kč', capacity: 20, booked: 7 },
  { id: 2, day: 'Út', date: '20. 10.', iso: '2026-10-20T12:00:00+02:00', time: '12:00–13:00', title: 'Polední restart', teacher: 'Daniela Šťastná', type: 'paid', price: '150 Kč', capacity: 20, booked: 9 },
  { id: 3, day: 'Čt', date: '22. 10.', iso: '2026-10-22T16:45:00+02:00', time: '16:45–17:45', title: 'Strong slow flow', teacher: 'Petr Bena', type: 'charity', price: 'Dobrovolný příspěvek', capacity: 20, booked: 5 },
  { id: 4, day: 'Út', date: '27. 10.', iso: '2026-10-27T08:00:00+01:00', time: '8:00–9:00', title: 'Ranní flow', teacher: 'Daniela Šťastná', type: 'paid', price: '150 Kč', capacity: 20, booked: 4 }
];

let lessons = fallbackLessons;

const teachers = [
  { name: 'Daniela Šťastná', photo: 'assets/daniela-stastna.jpg', styles: 'Fyzio · Hatha · Power · Vinyasa', payment: '150 Kč · QR po skončení lekce', charity: false, bio: 'Jógu aktivně praktikuje od roku 2014. V roce 2023 dokončila akreditovaný 200hodinový kurz MŠMT od Yoga4Everybody.' },
  { name: 'Petr Bena', photo: 'assets/petr-bena.jpeg', styles: 'Power · Vinyasa · Strong slow flow', payment: 'Dobrovolně · Dobrý anděl', charity: true, bio: 'Od prosince 2023 praktikuje jógu denně. V roce 2026 dokončil 200hodinový kurz pro učitele power a vinyasa jógy v Ubudu na Bali.' }
];

const savedBookings = JSON.parse(localStorage.getItem('alzaYogaBookings') || '[]');
const settings = JSON.parse(localStorage.getItem('alzaYogaSettings') || '{"petrCharity":true,"capacity":20}');
let adminSession = JSON.parse(sessionStorage.getItem('jogaAdminSession') || 'null');
let adminLessons = [];
let adminInstructors = [];
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

document.querySelector('#open-admin').addEventListener('click', async () => {
  publicView.hidden = true;
  document.querySelector('.site-header').hidden = true;
  document.querySelector('.announcement').hidden = true;
  document.querySelector('footer').hidden = true;
  adminView.hidden = false;
  if (adminSession && await isAdminSessionValid()) {
    await Promise.all([loadAdminLessons(), loadAdminInstructors()]);
    renderAdmin('overview');
  } else {
    clearAdminSession();
    renderAdminLogin();
  }
  window.scrollTo(0, 0);
});

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
  const query = new URLSearchParams({
    select: 'id,title,starts_at,ends_at,capacity,booked_count,status,location,language,instructors(name,payment_mode,price_czk,payment_note)',
    starts_at: `gte.${new Date().toISOString()}`,
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
  const query = new URLSearchParams({ select: 'id,name', active: 'eq.true', order: 'sort_order.asc' });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/instructors?${query}`, {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${adminSession.access_token}` },
  });
  if (!response.ok) throw new Error('Lektory se nepodařilo načíst.');
  adminInstructors = await response.json();
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
    await Promise.all([loadAdminLessons(), loadAdminInstructors()]);
    renderAdmin('overview');
  } catch (error) {
    clearAdminSession();
    renderAdminLogin(error.message);
  }
}

function lessonTable() {
  const rows = adminLessons.map((lesson) => {
    const cancelled = lesson.status === 'cancelled';
    return `<tr><td data-label="Termín"><b>${escapeHtml(lesson.date)}</b><br>${escapeHtml(lesson.time)}</td><td data-label="Lekce">${escapeHtml(lesson.title)}${lesson.language === 'en' ? '<br><span class="language-badge">EN</span>' : ''}</td><td data-label="Lektor">${escapeHtml(lesson.teacher)}</td><td data-label="Obsazeno">${lesson.booked}/${lesson.capacity}</td><td data-label="Stav"><span class="status-pill${cancelled ? ' warn' : ''}">${cancelled ? 'Zrušeno' : 'Otevřeno'}</span></td><td class="lesson-actions" data-label="Akce">${cancelled ? '' : `<button class="button button-small" data-edit-lesson="${lesson.id}">Změnit čas</button><button class="button button-small" data-cancel-lesson="${lesson.id}">Zrušit</button>`}</td></tr>`;
  }).join('');
  return `<table class="admin-table"><thead><tr><th>Termín</th><th>Lekce</th><th>Lektor</th><th>Obsazeno</th><th>Stav</th><th>Akce</th></tr></thead><tbody>${rows || '<tr><td colspan="6">Nejsou naplánované žádné lekce.</td></tr>'}</tbody></table>`;
}

function overviewPanel() {
  const openLessons = adminLessons.filter((lesson) => lesson.status === 'published');
  const nextLesson = openLessons[0];
  return `<div class="stats"><div class="stat-card"><span>AKTIVNÍ REZERVACE</span><strong>${openLessons.reduce((sum, lesson) => sum + lesson.booked, 0)}</strong><small>v budoucích lekcích</small></div><div class="stat-card"><span>NEJBLIŽŠÍ LEKCE</span><strong>${nextLesson ? `${nextLesson.booked} / ${nextLesson.capacity}` : '—'}</strong><small>${nextLesson ? `${escapeHtml(nextLesson.date)} v ${escapeHtml(nextLesson.time.split('–')[0])}` : 'Bez termínu'}</small></div><div class="stat-card"><span>NAPLÁNOVANÉ LEKCE</span><strong>${openLessons.length}</strong><small>${adminLessons.filter((lesson) => lesson.status === 'cancelled').length} zrušených</small></div></div><div class="admin-grid"><div class="admin-card"><h2>Nejbližší lekce</h2>${lessonTable()}</div><div class="admin-card"><h2>Obsazenost</h2>${openLessons.slice(0, 3).map((lesson) => `<div class="progress-item"><div class="progress-label"><span>${escapeHtml(lesson.date)} · ${escapeHtml(lesson.time)}</span><b>${lesson.booked}/${lesson.capacity}</b></div><div class="progress-bar"><i style="width:${lesson.booked / lesson.capacity * 100}%"></i></div></div>`).join('') || '<p>Zatím nejsou naplánované žádné lekce.</p>'}</div></div>`;
}

function teachersPanel() {
  return `<div class="admin-card"><h2>Profily lektorů</h2>${teachers.map((teacher) => `<article class="admin-teacher"><img src="${teacher.photo}" alt="${teacher.name}"><div><h3>${teacher.name}</h3><p><b>${teacher.styles}</b></p><p>${teacher.bio}</p><p>${teacher.payment}</p></div><button class="button button-small" data-edit-teacher="${teacher.name}">Upravit profil</button></article>`).join('')}</div>`;
}

function bookingsPanel() {
  return `<div class="admin-card"><h2>Účastníci nejbližších lekcí</h2><table class="admin-table"><thead><tr><th>Jméno</th><th>Lekce</th><th>E-mail</th><th>Platba</th></tr></thead><tbody><tr><td>Ukázkový účastník</td><td>Ranní flow</td><td>ucastnik@example.cz</td><td><span class="status-pill warn">Po lekci</span></td></tr>${savedBookings.map((booking) => `<tr><td>${booking.name}</td><td>${lessons.find((lesson) => lesson.id === booking.lessonId)?.title}</td><td>${booking.email}</td><td><span class="status-pill warn">Po lekci</span></td></tr>`).join('')}</tbody></table></div>`;
}

function settingsPanel() {
  return `<div class="admin-grid"><div class="admin-card"><h2>Platby podle lektora</h2><div class="admin-setting"><b>Daniela Šťastná</b><br>150 Kč · QR po skončení lekce</div><div class="admin-setting" style="margin-top:10px"><label><input id="petr-charity" type="checkbox" ${settings.petrCharity ? 'checked' : ''}> <b>Petr Bena – dobrovolný příspěvek na Dobrého anděla</b></label><br>QR kód se odešle automaticky po lekci.</div></div><div class="admin-card"><h2>Pravidla rezervací</h2><div class="admin-form-row"><div class="admin-setting">Bezplatné zrušení<br><b>24 hodin</b></div><div class="admin-setting">Kapacita studia<br><b>20 míst · bude potvrzeno</b></div></div></div></div>`;
}

function renderAdmin(tab) {
  if (!adminSession) {
    renderAdminLogin();
    return;
  }
  const panel = document.querySelector('#admin-panel');
  const titles = { overview: 'Dobrý den, Petře', lessons: 'Lekce', teachers: 'Lektoři', people: 'Rezervace', content: 'Obsah webu', settings: 'Nastavení' };
  const addButton = document.querySelector('#add-lesson');
  addButton.hidden = false;
  document.querySelector('#admin-logout').hidden = false;
  addButton.textContent = '+ Nová lekce';
  document.querySelector('#admin-title').textContent = titles[tab];
  if (tab === 'overview') panel.innerHTML = overviewPanel();
  if (tab === 'lessons') panel.innerHTML = `<div class="admin-card"><h2>Všechny naplánované lekce</h2>${lessonTable()}</div>`;
  if (tab === 'teachers') panel.innerHTML = teachersPanel();
  if (tab === 'people') panel.innerHTML = bookingsPanel();
  if (tab === 'content') panel.innerHTML = `<div class="admin-grid"><div class="admin-card"><h2>Novinky</h2><p>Večerní lekce v novém světle</p><p>Cvičením pomáháme</p><button class="button">+ Přidat novinku</button></div><div class="admin-card"><h2>Rychlé odkazy</h2><p>WhatsApp skupina</p><p>Podmínky rezervace</p><p>Ochrana osobních údajů</p></div></div>`;
  if (tab === 'settings') panel.innerHTML = settingsPanel();

  document.querySelectorAll('[data-edit-teacher]').forEach((button) => button.addEventListener('click', () => showToast(`Profil „${button.dataset.editTeacher}“ bude možné upravit po napojení databáze.`)));
  const charityToggle = document.querySelector('#petr-charity');
  if (charityToggle) charityToggle.addEventListener('change', () => {
    settings.petrCharity = charityToggle.checked;
    localStorage.setItem('alzaYogaSettings', JSON.stringify(settings));
    showToast('Nastavení Petrovy benefiční lekce bylo uloženo.');
  });

  document.querySelectorAll('[data-edit-lesson]').forEach((button) => button.addEventListener('click', () => openLessonEditor(button.dataset.editLesson)));
  document.querySelectorAll('[data-cancel-lesson]').forEach((button) => button.addEventListener('click', () => cancelLesson(button.dataset.cancelLesson)));
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

document.querySelectorAll('.admin-nav').forEach((button) => button.addEventListener('click', () => {
  if (!adminSession) return;
  document.querySelectorAll('.admin-nav').forEach((item) => item.classList.remove('active'));
  button.classList.add('active');
  renderAdmin(button.dataset.adminTab);
}));

document.querySelector('#add-lesson').addEventListener('click', openNewLesson);
document.querySelector('#admin-logout').addEventListener('click', () => {
  clearAdminSession();
  renderAdminLogin('Byl/a jsi odhlášen/a.');
});
renderLessons();
renderNextClass();
loadLessons();
const cancellationToken = new URLSearchParams(location.search).get('cancel');
if (cancellationToken) openCancellation(cancellationToken);
