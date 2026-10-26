const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/petr.bena/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const html = fs.readFileSync('index.html', 'utf8');
const hero = html.match(/<section class="hero"[\s\S]*?<\/section>/)[0].replace('<div class="next-class" id="next-class-card"></div>', '<div class="next-class" id="next-class-card"><div class="date">NEJBLIŽŠÍ LEKCE</div><h3>Strong slow flow</h3><p>7:45–8:45 · Petr Bena</p><div class="spots">Přihlášeno 7 / 16</div></div>');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  try {
    for (const width of [375, 768, 1024, 1440, 1920]) {
      const page = await browser.newPage({ viewport: { width, height: 1100 } });
      await page.setContent(`<html lang="cs"><head><base href="http://127.0.0.1:4173/"><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap" rel="stylesheet"></head><body>${hero}</body></html>`);
      await page.addStyleTag({ content: fs.readFileSync('styles.css', 'utf8') });
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator('h1').innerText(), 'Jóga není o tom, jak jsi flexibilní.\nAle o tom, že chceš.');
      assert.equal(await page.locator('h1 i').innerText(), 'Ale o tom, že chceš.');
      const title = await page.locator('h1').boundingBox();
      const section = await page.locator('.hero').boundingBox();
      assert.ok(title.y >= section.y && title.y + title.height <= section.y + section.height, `Claim clipped at ${width}px`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      console.log(`PASS claim ${width}px; heading height ${Math.round(title.height)}px`);
      await page.screenshot({ path: `outputs/claim-${width}.png`, fullPage: true });
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
