const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/petr.bena/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const source = fs.readFileSync('app.js', 'utf8').replaceAll('\r\n', '\n');
function extract(text, name) {
  const start = text.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  return text.slice(start, text.indexOf('\n}', start) + 2);
}
const helper = extract(source, 'instructorDisplayName');
const displayName = new Function(`${helper}; return instructorDisplayName;`)();
const names = [['Daniela Šťastná', 'Danča'], ['Daniela', 'Danča'], ['Danča', 'Danča'], ['Petr Bena', 'Petr'], ['Petr', 'Petr'], ['  DANIELA   ŠŤASTNÁ ', 'Danča'], ['Petr Novák', 'Petr Novák'], ['Jiná Lektorka', 'Jiná Lektorka'], [null, '']];
const id = '11111111-1111-4111-8111-111111111111';
(async () => {
  const backend = await import('../supabase/functions/_shared/http.ts');
  for (const [name, expected] of names) {
    assert.equal(displayName(name), expected);
    assert.equal(backend.instructorDisplayName(name), expected);
  }
  assert.equal(backend.czechSalutation('Danča'), 'Ahoj Dančo');
  const shareSource = fs.readFileSync('functions/lekce/[lesson].js', 'utf8').replaceAll('\r\n', '\n');
  assert.equal(extract(shareSource, 'instructorDisplayName'), helper);
  const pageSource = fs.readFileSync('platba.html', 'utf8').replaceAll('\r\n', '\n');
  const paymentHelper = pageSource.match(/    function instructorDisplayName\(value\) \{[\s\S]*?\n    \}/)[0].split('\n').map(line => line.slice(4)).join('\n');
  assert.equal(paymentHelper, helper);
  const shareDescription = new Function(`${helper}\n${extract(shareSource, 'lessonMetadata')}; return lessonMetadata;`)();
  assert.ok(shareDescription({ title: 'Ranní flow', teacher: 'Daniela Šťastná', starts_at: '2026-10-29T07:45:00Z', payment_mode: 'paid', price_czk: 150 }).description.includes('Danča'));
  // The canonical private-lesson payload and legal operator name must remain intact.
  const html = fs.readFileSync('index.html', 'utf8');
  assert.ok(html.includes('data-private-instructor="Daniela Šťastná"'));
  assert.ok(html.includes('Mám zájem o lekci s Dančou'));
  assert.ok(fs.readFileSync('ochrana-osobnich-udaju.html', 'utf8').includes('Petr Bena, fyzická osoba'));

  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  try {
    for (const width of [375, 768, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1100 } });
      await page.setContent('<html lang="cs"><body><div id="calendar"></div><div id="teachers-grid"></div><div id="booking-content"></div></body></html>');
      await page.addStyleTag({ content: fs.readFileSync('styles.css', 'utf8') });
      const code = `${helper}\n${extract(source, 'escapeHtml')}\n${extract(source, 'instructorCalendarClass')}\n${extract(source, 'calendarEventCard')}\n${extract(source, 'renderPublicTeachers')}\n${extract(source, 'openTeacherEditor')}`;
      await page.addScriptTag({ content: `let teachers=[{name:'Daniela Šťastná',photo:'',styles:'Hatha',bio:'Medailonek'},{name:'Petr Bena',photo:'',styles:'Vinyasa',bio:'Medailonek'}];let adminInstructors=[{id:'teacher',name:'Daniela Šťastná',email:'teacher@example.invalid',styles:['Hatha'],bio:'Medailonek',payment_mode:'paid',price_czk:150}];let calls=[];const dialog={showModal(){}};function shortTime(){return '7:45'}function applyPublicSettings(){}const publicSettings={};function closeDialog(){}function showToast(){}function renderAdmin(){}async function loadAdminInstructors(){}async function loadPublicContent(){}async function manageLesson(body){calls.push(body);} ${code}\nrenderPublicTeachers();document.querySelector('#calendar').innerHTML=teachers.map(teacher=>calendarEventCard({id:'lesson',kind:'public',title:'Ranní flow',teacher:teacher.name,startsAt:'2026-10-29T07:45:00Z',endsAt:'2026-10-29T08:45:00Z'},{admin:true})).join('');` });
      assert.deepEqual(await page.locator('#teachers-grid h3').allTextContents(), ['Danča', 'Petr']);
      await page.addScriptTag({ content: `const classList=document.createElement('div');classList.className='class-list';document.body.append(classList);const LESSON_PAGE_SIZE=6;let lessonDisplayLimit=6;let lessons=teachers.map((teacher,index)=>({id:String(index),title:'Ranní flow',teacher:teacher.name,type:'paid',day:'Po',date:'2. 11.',time:'7:45–8:45',price:'150 Kč',capacity:16,booked:1}));function spotsLeft(){return 15}function attendanceLabel(){return 'Přihlášeno 1 / 16'}function lessonShareUrl(){return '#lekce'}function bindLessonShareButtons(){}function openBooking(){}${extract(source, 'renderLessons')}\nrenderLessons();` });
      assert.deepEqual(await page.locator('.class-teacher small').allTextContents(), ['Lektor: Danča', 'Lektor: Petr']);
      assert.deepEqual(await page.locator('.calendar-event-teacher').allTextContents(), ['Lektor: Danča', 'Lektor: Petr']);
      assert.equal(await page.locator('.calendar-instructor-daniela').count(), 1);
      assert.equal(await page.locator('.calendar-instructor-petr').count(), 1);
      for (const event of await page.locator('.calendar-event').all()) {
        const title = await event.locator('strong').boundingBox();
        const teacher = await event.locator('.calendar-event-teacher').boundingBox();
        assert.ok(teacher.y >= title.y + title.height);
      }
      await page.evaluate(() => openTeacherEditor('teacher'));
      assert.equal(await page.locator('#teacher-name').inputValue(), 'Danča');
      await page.getByRole('button', { name: 'Uložit profil' }).click();
      assert.equal(await page.evaluate(() => calls[0].name), 'Daniela Šťastná');
      assert.equal(await page.evaluate(() => calls[0].instructorId), 'teacher');
      await page.screenshot({ path: `outputs/instructor-names-${width}.png`, fullPage: true });
      await page.close();
      console.log(`PASS public profiles, calendar labels/colors and canonical profile save at ${width}px`);
    }
    for (const [name, expected] of names.slice(0, 5)) {
      const page = await browser.newPage();
      await page.route('**/platba?*', route => route.fulfill({ contentType: 'text/html', body: pageSource }));
      await page.route('**/rest/v1/lessons?*', route => route.fulfill({ json: [{ id, title: 'Ranní flow', starts_at: '2026-10-29T07:45:00Z', ends_at: '2026-10-29T08:45:00Z', payment_mode: 'paid', price_czk: 150, instructors: { name, paid_qr_url: 'assets/qr-daniela-150.jpg' } }] }));
      await page.goto(`http://127.0.0.1:4173/platba?lekce=${id}`);
      await page.waitForFunction(() => document.querySelector('#lesson-time').textContent.includes('Lektor:'));
      assert.ok((await page.locator('#lesson-time').innerText()).includes(`Lektor: ${expected}`));
      assert.equal(await page.locator('#qr').getAttribute('alt'), `QR kód pro platbu lekce – ${expected}`);
      await page.close();
    }
    console.log('PASS backend/frontend mapping, payment page, unchanged contact payload and legal identity');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
