const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/petr.bena/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const source = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const dataSource = source.match(/const YOGA_REFLECTIONS = \[[\s\S]*?\n\];/)[0];
const initializer = source.match(/function initializeYogaReflection\(\) \{[\s\S]*?\n\}/)[0];
const reflections = new Function(`${dataSource}; return YOGA_REFLECTIONS;`)();
assert.equal(reflections.length, 16);
assert.equal(new Set(reflections.map(item => item[0])).size, 16);
const section = html.match(/<section class="quote-break"[\s\S]*?<\/section>/)[0];

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  try {
    for (const width of [320, 375, 390, 600, 768, 1024, 1440, 1920]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.route('**/reflection-test', route => route.fulfill({ contentType: 'text/html', body: '<html></html>' }));
      await page.goto('http://127.0.0.1:4173/reflection-test');
      await page.setContent(`<html lang="cs"><head><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap" rel="stylesheet"></head><body>${section}</body></html>`);
      await page.addStyleTag({ content: fs.readFileSync('styles.css', 'utf8') });
      await page.evaluate(() => document.fonts.ready);
      await page.addScriptTag({ content: `${dataSource}\n${initializer}` });
      await page.evaluate(() => {
        localStorage.setItem('jogaReflectionNextV1', '0');
        localStorage.setItem('jogaHeroClaimNextV1', '5');
      });
      for (let index = 0; index < reflections.length; index++) {
        await page.evaluate(() => initializeYogaReflection());
        assert.equal(await page.locator('[data-yoga-reflection]').innerText(), reflections[index][0]);
        assert.equal(await page.locator('.quote-source').innerText(), `Volně inspirováno Jógasútrami ${reflections[index][1]}`);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        const box = await page.locator('.quote-break').boundingBox();
        const credit = await page.locator('.quote-source').boundingBox();
        assert.ok(credit.y + credit.height <= box.y + box.height);
        if (index === 8 || index === 14) await page.screenshot({ path: `outputs/reflection-${index + 1}-${width}.png`, fullPage: true });
      }
      assert.equal(await page.evaluate(() => localStorage.getItem('jogaReflectionNextV1')), '0');
      assert.equal(await page.evaluate(() => localStorage.getItem('jogaHeroClaimNextV1')), '5');
      for (const value of ['', '-1', '16', '1.5', 'NaN']) {
        await page.evaluate(saved => { localStorage.setItem('jogaReflectionNextV1', saved); initializeYogaReflection(); }, value);
        assert.ok(reflections.map(item => item[0]).includes(await page.locator('[data-yoga-reflection]').innerText()));
      }
      await page.evaluate(() => {
        Storage.prototype.getItem = () => { throw new Error('Storage blocked'); };
        initializeYogaReflection();
      });
      assert.ok(reflections.map(item => item[0]).includes(await page.locator('[data-yoga-reflection]').innerText()));
      console.log(`PASS 16 reflections, sources, independent cycle and layout at ${width}px`);
      await page.close();
    }
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:4173/#top');
    await page.evaluate(() => localStorage.setItem('jogaReflectionNextV1', '0'));
    await page.reload();
    assert.equal(await page.locator('[data-yoga-reflection]').innerText(), reflections[0][0]);
    await page.reload();
    assert.equal(await page.locator('[data-yoga-reflection]').innerText(), reflections[1][0]);
    assert.deepEqual(errors, []);
    console.log('PASS full page refresh and no JavaScript errors');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
