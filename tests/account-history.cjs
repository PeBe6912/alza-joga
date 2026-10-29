const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/petr.bena/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const source = fs.readFileSync('app.js', 'utf8').replaceAll('\r\n', '\n');
function extract(name) {
  const start = source.search(new RegExp(`(?:async )?function ${name}\\(`));
  assert.ok(start >= 0, name);
  return source.slice(start, source.indexOf('\n}', start) + 2);
}
const reservation = (id, status, days) => ({
  id, title: id, status, startsAt: new Date(Date.now() + days * 86400000).toISOString(),
  teacher: 'Daniela Šťastná', location: 'HALL', paymentMode: 'paid', priceCzk: 150,
  cancelBefore: new Date(Date.now() + 86400000).toISOString(),
});
const data = {
  email: 'student@example.invalid', profile: { fullName: 'Testovací účet', relation: 'employee' },
  journey: { attendedCount: 1 },
  reservations: [reservation('Proběhlá účast', 'attended', -3), reservation('Čeká na docházku', 'confirmed', -2),
    reservation('Nedorazil', 'no_show', -1), reservation('Zrušená minulá', 'cancelled', -4),
    reservation('Zrušená budoucí', 'cancelled', 2), reservation('Naplánovaná lekce', 'confirmed', 3)],
};
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  try {
    for (const width of [375, 768, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      await page.setContent('<html lang="cs"><body><main class="account-content" id="account-panel"></main></body></html>');
      await page.addStyleTag({ content: fs.readFileSync('styles.css', 'utf8') });
      const code = ['escapeHtml', 'instructorDisplayName', 'instructorRole', 'accountLessonCard', 'renderAccountDashboard'].map(extract).join('\n');
      await page.addScriptTag({ content: `let fixture=${JSON.stringify(data)};const accountPanel=document.querySelector('#account-panel');let activeAccountTab='lessons';let accountRecoveryMode=false;const dialog={open:false};async function loadAccountData(){return fixture;}function journeyPanel(){return '';}function journeyMilestone(){return {count:0};}function bindAccountDashboard(){}function calendarControls(){return '';}\n${code}\n` });
      await page.evaluate(() => renderAccountDashboard());
      assert.deepEqual(await page.locator('.account-history .account-lesson-details h3').allTextContents(), ['Nedorazil', 'Čeká na docházku', 'Proběhlá účast']);
      assert.deepEqual(await page.locator('.account-reservations .account-lesson-details h3').allTextContents(), ['Naplánovaná lekce']);
      assert.equal(await page.locator('.is-cancelled').count(), 0);
      assert.equal(await page.evaluate(() => fixture.reservations.length), 6);
      await page.evaluate(async () => { fixture.reservations = fixture.reservations.filter(item => item.status === 'cancelled'); await renderAccountDashboard(); });
      assert.equal(await page.locator('.account-history .account-empty').innerText(), 'Historie je zatím prázdná.');
      assert.equal(await page.locator('.account-lesson-card').count(), 0);
      await page.close();
      console.log(`PASS hidden past/future cancellations, retained valid history, upcoming and empty state at ${width}px`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
