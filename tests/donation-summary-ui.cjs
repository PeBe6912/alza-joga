const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { chromium } = require('C:/Users/petr.bena/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const source = fs.readFileSync('app.js', 'utf8').replaceAll('\r\n', '\n');
const backend = fs.readFileSync('supabase/functions/manage-lesson/index.ts', 'utf8').replaceAll('\r\n', '\n');
function extract(text, name) {
  const start = text.search(new RegExp(`(?:async )?function ${name}\\(`));
  assert.ok(start >= 0, name);
  return text.slice(start, text.indexOf('\n}', start) + 2);
}
const formatter = extract(source, 'donationSummaryText');
assert.equal(extract(backend, 'donationSummaryText').replace('summary: { amount_czk?: unknown; as_of?: unknown } | null | undefined', 'summary'), formatter);
const format = vm.runInNewContext(`(${formatter})`, { Intl, Date, Number, Math });
assert.equal(format({ amount_czk: 11075, as_of: '2026-10-26' }).replaceAll('\u00a0', ' '), 'K 26. říjnu 2026 jsme společně přispěli Dobrému andělovi částkou 11 075 Kč.');
assert.match(format({ amount_czk: 0, as_of: '2024-02-29' }), /K 29. únoru 2024/);
for (const bad of [null, {}, { amount_czk: null, as_of: null }, { amount_czk: '1', as_of: '2026-10-26' }, { amount_czk: -1, as_of: '2026-10-26' }, { amount_czk: 1.234, as_of: '2026-10-26' }, { amount_czk: 1, as_of: '2026-02-30' }, { amount_czk: 1, as_of: '<script>' }]) assert.equal(format(bad), '');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  try {
    for (const width of [375, 768, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      await page.setContent('<html lang="cs"><body><main class="admin-content" id="fixture"></main><section class="section"><div class="news-grid" id="news-grid"></div></section></body></html>');
      await page.addStyleTag({ content: fs.readFileSync('styles.css', 'utf8') });
      const code = `let adminSettings={};let publicSettings={};let calls=[];let newsItems=[{id:'charity',title:'Cvičením pomáháme',summary:'Pomáháme společně.',background_tone:'sand'},{id:'other',title:'Novinka',summary:'Další zpráva.'}];function openNewsDetail(){}function showToast(){}async function manageLesson(body){calls.push(body);return {summary:{amount_czk:body.amountCzk,as_of:body.asOf}};}${extract(source,'escapeHtml')}\n${formatter}\n${extract(source,'applyPublicSettings')}\n${extract(source,'donationSummarySettingsPanel')}\n${extract(source,'saveDonationSummary')}\n${extract(source,'renderPublicNews')}\ndocument.querySelector('#fixture').innerHTML=donationSummarySettingsPanel();document.querySelector('form').addEventListener('submit',saveDonationSummary);renderPublicNews();`;
      await page.addScriptTag({ content: code });
      assert.equal(await page.locator('[data-donation-summary]').isVisible(), false);
      await page.getByLabel('Celkem vybráno v Kč').fill('11075');
      await page.getByLabel('Stav k datu').fill('2026-10-26');
      await page.getByRole('button', { name: 'Uložit souhrn příspěvků' }).click();
      assert.equal(await page.locator('[data-donation-summary]').isVisible(), true);
      assert.match(await page.locator('[data-donation-summary]').innerText(), /K 26. říjnu 2026/);
      assert.equal(await page.locator('[data-news-detail="other"] [data-donation-summary]').count(), 0);
      assert.equal(await page.locator('.charity-logo').count(), 1);
      assert.deepEqual(await page.evaluate(() => calls), [{ action: 'update-donation-summary', amountCzk: 11075, asOf: '2026-10-26' }]);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.evaluate(() => renderPublicNews());
      assert.equal(await page.locator('[data-donation-summary]').isVisible(), true);
      await page.evaluate(() => { newsItems[0].title='Jógou pomáháme';renderPublicNews(); });
      assert.equal(await page.locator('.charity-logo').count(), 1);
      assert.equal(await page.locator('[data-donation-summary]').isVisible(), true);
      await page.evaluate(() => { newsItems[0].id='e7c10ab2-3bba-419b-8c73-6139de7ed7ee';newsItems[0].title='Nový název benefičního článku';renderPublicNews(); });
      assert.equal(await page.locator('.charity-logo').count(), 1);
      assert.equal(await page.locator('[data-donation-summary]').isVisible(), true);
      await page.screenshot({ path: `outputs/dobry-andel-souhrn-${width}.png`, fullPage: true });
      await page.evaluate(() => { publicSettings={};applyPublicSettings(publicSettings); });
      assert.equal(await page.locator('[data-donation-summary]').isVisible(), false);
      await page.close();
      console.log(`PASS donation summary ${width}px: separate save, homepage, rerender, unset hidden, no overflow`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
