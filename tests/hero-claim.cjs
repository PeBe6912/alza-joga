const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/petr.bena/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const html = fs.readFileSync('index.html', 'utf8');
const source = fs.readFileSync('app.js', 'utf8');
const claimsSource = source.match(/const HERO_CLAIMS = \[[\s\S]*?\n\];/)[0];
const layoutsSource = source.match(/const HERO_CLAIM_LAYOUTS = \[[\s\S]*?\n\];/)[0];
const layouts = new Function(`${layoutsSource}; return HERO_CLAIM_LAYOUTS;`)();
const initializeSource = source.match(/function initializeHeroClaim\(\) \{[\s\S]*?\n\}/)[0];
const claims = new Function(`${claimsSource}; return HERO_CLAIMS;`)();
assert.equal(claims.length, 13);
assert.equal(layouts.length, claims.length);
layouts.forEach((layout, index) => {
  for (const parts of [layout.desktop, layout.mobile || layout.desktop]) {
    assert.deepEqual(parts.map(lines => lines.join(' ')), claims[index]);
  }
});
const normalize = text => text.replace(/\s+/g, ' ').trim();
const hero = html.match(/<section class="hero"[\s\S]*?<\/section>/)[0].replace('<div class="next-class" id="next-class-card"></div>', '<div class="next-class" id="next-class-card"><div class="date">NEJBLIŽŠÍ LEKCE</div><h3>Strong slow flow</h3><p>7:45–8:45 · Petr Bena</p><div class="spots">Přihlášeno 7 / 16</div></div>');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  try {
    for (const width of [320, 375, 390, 430, 600, 601, 768, 900, 1024, 1280, 1440, 1920]) {
      const page = await browser.newPage({ viewport: { width, height: 1100 } });
      await page.route('**/hero-claim-test', route => route.fulfill({ contentType: 'text/html', body: '<html></html>' }));
      await page.goto('http://127.0.0.1:4173/hero-claim-test');
      await page.setContent(`<html lang="cs"><head><base href="http://127.0.0.1:4173/"><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap" rel="stylesheet"></head><body><main id="public-view">${hero}</main></body></html>`);
      await page.addStyleTag({ content: fs.readFileSync('styles.css', 'utf8') });
      await page.evaluate(() => document.fonts.ready);
      await page.addScriptTag({ content: `${claimsSource}\n${layoutsSource}\n${initializeSource}\nlocalStorage.setItem('jogaHeroClaimNextV1', '0');` });
      for (let index = 0; index < claims.length; index++) {
      await page.evaluate(() => initializeHeroClaim());
      assert.equal(normalize(await page.locator('h1').innerText()), claims[index].join(' '));
      const visibleVariant = page.locator(width <= 600 ? '.hero-claim-mobile' : '.hero-claim-desktop');
      const expectedParts = width <= 600 ? layouts[index].mobile || layouts[index].desktop : layouts[index].desktop;
      assert.deepEqual(await visibleVariant.locator('.hero-claim-line').allTextContents(), expectedParts.flat());
      assert.equal(await visibleVariant.locator('i').count(), claims[index].length - 1);
      const overflow = await visibleVariant.locator('.hero-claim-line').evaluateAll(lines => lines.some(line => {
        const range = document.createRange();
        range.selectNodeContents(line);
        return range.getBoundingClientRect().width > line.getBoundingClientRect().width + 1;
      }));
      assert.equal(overflow, false, `Claim ${index + 1} line overflow at ${width}px`);
      const title = await page.locator('h1').boundingBox();
      const section = await page.locator('.hero').boundingBox();
      assert.ok(title.y >= section.y && title.y + title.height <= section.y + section.height, `Claim ${index + 1} clipped at ${width}px`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      if ([0, 7, 10, 11].includes(index)) await page.screenshot({ path: `outputs/claim-${index + 1}-${width}.png`, fullPage: true });
      }
      assert.equal(await page.evaluate(() => localStorage.getItem('jogaHeroClaimNextV1')), '0');
      for (const invalid of ['', '-1', '13', 'NaN', '1.5']) {
        await page.evaluate(value => { localStorage.setItem('jogaHeroClaimNextV1', value); initializeHeroClaim(); }, invalid);
        assert.ok(claims.map(claim => claim.join(' ')).includes(normalize(await page.locator('h1').innerText())));
      }
      await page.evaluate(() => {
        Storage.prototype.getItem = () => { throw new Error('Storage blocked'); };
        initializeHeroClaim();
      });
      assert.ok(claims.map(claim => claim.join(' ')).includes(normalize(await page.locator('h1').innerText())));
      console.log(`PASS all 13 claims at ${width}px, cycle, invalid/blocked storage`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
