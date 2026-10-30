import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/petr.bena/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const expected = ['Tempo lekce', 'Náročnost', 'Vysvětlení pozic', 'Skladba lekce', 'Dopomoci', 'Atmosféra', 'Hudba', 'Organizace'];
const token = '11111111-1111-4111-8111-111111111111';

test('feedback endpoint accepts Dopomoci and all eight topics, rejects unknown topics', async () => {
  const oldDeno = globalThis.Deno, oldFetch = globalThis.fetch;
  let handler;
  const calls = [];
  globalThis.Deno = { serve: value => { handler = value; }, env: { get: key => ({ SUPABASE_URL: 'https://mock.invalid', SUPABASE_SERVICE_ROLE_KEY: 'mock' })[key] } };
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), 'https://mock.invalid/rest/v1/rpc/submit_lesson_feedback');
    calls.push(JSON.parse(init.body));
    return Response.json({ submitted: true });
  };
  try {
    await import('../supabase/functions/lesson-feedback/index.ts');
    const submit = topics => handler(new Request('https://mock.invalid', { method: 'POST', headers: { Origin: 'https://joganahallu.cz', 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'submit', token, rating: 'great', topics, comment: '' }) }));
    assert.equal((await submit(['Dopomoci'])).status, 200);
    assert.equal((await submit(expected)).status, 200);
    assert.deepEqual(calls[1].p_topics, expected);
    assert.equal((await submit(['Dopomoci', 'Dopomoci'])).status, 200);
    assert.deepEqual(calls[2].p_topics, ['Dopomoci']);
    assert.equal((await submit([...expected, 'Neznámé téma'])).status, 400);
    assert.equal(calls.length, 3);
    const choices = ['Tempo lekce: Akorát', 'Náročnost: Vysoká', 'Vysvětlení pozic: Srozumitelné', 'Skladba lekce: Vyhovovala mi', 'Dopomoci: Raději bez nich', 'Atmosféra: Příjemná', 'Hudba: Rušila mě', 'Organizace: Bez problémů'];
    assert.equal((await submit(choices)).status, 200);
    assert.deepEqual(calls[3].p_topics, choices);
    assert.equal((await submit(['Tempo lekce: Pomalé', 'Tempo lekce: Rychlé'])).status, 400);
    assert.equal((await submit(['Tempo lekce: Nesmysl'])).status, 400);
    assert.equal((await submit(['Tempo lekce', 'Tempo lekce: Rychlé'])).status, 400);
    const original = fs.readFileSync('supabase/migrations/20261018190000_lesson_feedback.sql', 'utf8').replaceAll('\r\n', '\n');
    const migration = fs.readFileSync('supabase/migrations/20261029203325_add_feedback_dopomoci.sql', 'utf8').replaceAll('\r\n', '\n');
    const extract = sql => sql.match(/create or replace function public.submit_lesson_feedback\([\s\S]*?\n\$\$;/)[0];
    assert.equal(extract(migration), extract(original).replace("'Skladba lekce', 'Atmosféra'", "'Skladba lekce', 'Dopomoci', 'Atmosféra'").replace(')) > 7', ')) > 8'));
    assert.match(migration, /check \(cardinality\(topics\) <= 8\)/);
    const latestPath = fs.readdirSync('supabase/migrations').find(name => name.endsWith('_feedback_area_choices.sql'));
    const latest = fs.readFileSync('supabase/migrations/' + latestPath, 'utf8');
    for (const choice of choices) assert.ok(latest.includes("'" + choice + "'"));
    assert.match(latest, /security invoker/);
    assert.match(latest, /count\(distinct split_part/);
  } finally { globalThis.Deno = oldDeno; globalThis.fetch = oldFetch; }
});

test('feedback form submits concrete answers, restores them and preserves legacy answers', async () => {
  const source = fs.readFileSync('app.js', 'utf8').replaceAll('\r\n', '\n');
  const extract = name => { const start = source.search(new RegExp(`(?:async )?function ${name}\\(`)); return source.slice(start, source.indexOf('\n}', start) + 2); };
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  try {
    for (const width of [320, 375, 768, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      await page.route('**/feedback-test', route => route.fulfill({ contentType: 'text/html', body: '<html lang="cs"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><dialog id="booking-dialog"><div id="booking-content"></div></dialog></body></html>' }));
      await page.goto('http://127.0.0.1:4173/feedback-test');
      await page.addStyleTag({ content: fs.readFileSync('styles.css', 'utf8') });
      await page.addScriptTag({ content: `let submitted;let saved=[];const dialog=document.querySelector('dialog');function closeDialog(){dialog.close();}function showToast(){}function formatAdminDate(){return '29. 10. 2026 7:45';}async function feedbackRequest(body){if(body.action==='submit'){submitted=body;saved=body.topics;return {ok:true};}return {title:'Ranní flow',teacher:'Daniela Šťastná',topics:saved,rating:null};}\n${['escapeHtml', 'instructorDisplayName', 'instructorRole', 'openLessonFeedback'].map(extract).join('\n')}` });
      await page.evaluate(value => openLessonFeedback(value), token);
      assert.deepEqual(await page.locator('.feedback-rating label span').allTextContents(), ['Skvělá', 'Dobrá', 'Něco mi nesedlo']);
      assert.deepEqual(await page.locator('input[name="rating"]').evaluateAll(inputs => inputs.map(input => input.value)), ['great', 'good', 'not_right']);
      assert.deepEqual(await page.locator('.feedback-area legend').evaluateAll(items => items.map(item => item.firstChild.textContent)), expected);
      assert.equal(await page.locator('.feedback-choice').count(), 24);
      assert.equal(await page.locator('.feedback-choice[aria-pressed="true"]').count(), 0);
      await page.getByRole('button', { name: 'Odeslat zpětnou vazbu' }).click();
      assert.equal(await page.evaluate(() => submitted), undefined);
      await page.locator('.feedback-rating label').first().click();
      assert.ok(await page.evaluate(() => document.querySelector('.lesson-feedback-form').scrollWidth <= document.querySelector('dialog').clientWidth));
      if (width === 375 || width === 1440) await page.screenshot({path:`outputs/feedback-final-${width}.png`});
      await page.locator('.feedback-choice').first().click();
      await page.locator('.feedback-choice').first().click();
      assert.equal(await page.locator('.feedback-choice[aria-pressed="true"]').count(), 0);
      const choices = [];
      for (const area of await page.locator('.feedback-area').all()) {
        const buttons = area.locator('.feedback-choice');
        const sizes = await buttons.evaluateAll(items => items.map(item => ({w:item.getBoundingClientRect().width,h:item.getBoundingClientRect().height,fit:item.scrollWidth <= item.clientWidth})));
        assert.ok(sizes.every(size => Math.abs(size.w - sizes[0].w)<1 && size.h>=44 && size.fit));
        await buttons.nth(0).click();
        await buttons.nth(1).click();
        choices.push(await buttons.nth(1).getAttribute('data-value'));
      }
      assert.equal(await page.locator('.feedback-choice[aria-pressed="true"]').count(), 8);
      await page.getByRole('button', { name: 'Odeslat zpětnou vazbu' }).click();
      await page.waitForSelector('.feedback-thanks');
      assert.deepEqual(await page.evaluate(() => submitted.topics), choices);
      await page.evaluate(value => openLessonFeedback(value), token);
      assert.equal(await page.locator('.feedback-choice[aria-pressed="true"]').count(), 8);
      await page.evaluate(() => { saved=['Tempo lekce']; });
      await page.evaluate(value => openLessonFeedback(value), token);
      assert.equal(await page.locator('[data-legacy-topic]').count(), 1);
      await page.locator('.feedback-rating label').first().click();
      await page.getByRole('button', { name: 'Odeslat zpětnou vazbu' }).click();
      await page.waitForSelector('.feedback-thanks');
      assert.deepEqual(await page.evaluate(() => submitted.topics), ['Tempo lekce']);
      await page.close();
    }
  } finally { await browser.close(); }
});
