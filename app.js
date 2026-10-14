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
    return `<article class="class-row">
      <div class="class-date"><strong>${lesson.day}</strong><span>${lesson.date}</span></div>
      <div class="class-teacher"><h3>${escapeHtml(lesson.title)}</h3><small>${escapeHtml(lesson.teacher)}</small><br><span>${typeLabel}</span></div>
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
  document.querySelector('#booking-content').innerHTML = `<form class="booking-panel" id="booking-form">
    <p class="eyebrow">Rezervace místa</p><h2>${escapeHtml(lesson.title)}</h2>
    <div class="booking-summary"><span><b>${lesson.day} ${lesson.date}</b><br>${escapeHtml(lesson.time)}</span><span>${escapeHtml(lesson.price)}</span></div>
    <div class="form-grid">
      <div class="field"><label for="name">Jméno a příjmení</label><input id="name" name="name" required autocomplete="name"></div>
      <div class="field"><label for="email">E-mail</label><input id="email" name="email" type="email" required autocomplete="email"></div>
      <div class="field full"><label for="relation">Jdu jako</label><select id="relation" name="relation"><option value="employee">Zaměstnanec Alzy</option><option value="guest">Host / externista</option></select></div>
      <label class="checkbox field full"><input type="checkbox" required><span>Souhlasím s podmínkami rezervace a beru na vědomí pravidlo zrušení nejpozději 24 hodin před začátkem.</span></label>
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
    time,
    title: row.title,
    teacher: instructor.name,
    type: donation ? 'charity' : 'paid',
    price: donation ? 'Dobrovolný příspěvek' : `${instructor.price_czk} Kč`,
    capacity: row.capacity,
    booked: row.booked_count,
  };
}

async function loadLessons() {
  const query = new URLSearchParams({
    select: 'id,title,starts_at,ends_at,capacity,booked_count,location,instructors(name,payment_mode,price_czk,payment_note)',
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

document.querySelector('#open-admin').addEventListener('click', () => {
  publicView.hidden = true;
  document.querySelector('.site-header').hidden = true;
  document.querySelector('.announcement').hidden = true;
  document.querySelector('footer').hidden = true;
  adminView.hidden = false;
  renderAdmin('overview');
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

function lessonTable() {
  return `<table class="admin-table"><thead><tr><th>Termín</th><th>Lekce</th><th>Lektor</th><th>Obsazeno</th><th>Stav</th></tr></thead><tbody>${lessons.map((lesson) => `<tr><td><b>${lesson.date}</b><br>${lesson.time}</td><td>${lesson.title}</td><td>${lesson.teacher}</td><td>${lesson.booked}/${lesson.capacity}</td><td><span class="status-pill">Otevřeno</span></td></tr>`).join('')}</tbody></table>`;
}

function overviewPanel() {
  return `<div class="stats"><div class="stat-card"><span>REZERVACE TENTO MĚSÍC</span><strong>${36 + savedBookings.length}</strong><small>↑ 8 oproti září</small></div><div class="stat-card"><span>NEJBLIŽŠÍ LEKCE</span><strong>7 / 20</strong><small>Út 20. 10. v 8:00</small></div><div class="stat-card"><span>LEKCE TENTO MĚSÍC</span><strong>12</strong><small>2 lektoři</small></div><div class="stat-card"><span>K POZDĚJŠÍ PLATBĚ</span><strong>7</strong><small>QR se odešle po lekci</small></div></div><div class="admin-grid"><div class="admin-card"><h2>Nejbližší lekce</h2>${lessonTable()}</div><div class="admin-card"><h2>Obsazenost</h2>${lessons.slice(0, 3).map((lesson) => `<div class="progress-item"><div class="progress-label"><span>${lesson.date} · ${lesson.time}</span><b>${lesson.booked}/${lesson.capacity}</b></div><div class="progress-bar"><i style="width:${lesson.booked / lesson.capacity * 100}%"></i></div></div>`).join('')}</div></div>`;
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
  const panel = document.querySelector('#admin-panel');
  const titles = { overview: 'Dobrý den, Petře', lessons: 'Lekce', teachers: 'Lektoři', people: 'Rezervace', content: 'Obsah webu', settings: 'Nastavení' };
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
}

document.querySelectorAll('.admin-nav').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.admin-nav').forEach((item) => item.classList.remove('active'));
  button.classList.add('active');
  renderAdmin(button.dataset.adminTab);
}));

document.querySelector('#add-lesson').addEventListener('click', () => showToast('Formulář nové lekce bude napojený na Supabase.'));
renderLessons();
renderNextClass();
loadLessons();
const cancellationToken = new URLSearchParams(location.search).get('cancel');
if (cancellationToken) openCancellation(cancellationToken);
