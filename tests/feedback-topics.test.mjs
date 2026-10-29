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
    const original = fs.readFileSync('supabase/migrations/20261018190000_lesson_feedback.sql', 'utf8').replaceAll('\r\n', '\n');
    const migration = fs.readFileSync('supabase/migrations/20261029203325_add_feedback_dopomoci.sql', 'utf8').replaceAll('\r\n', '\n');
    const extract = sql => sql.match(/create or replace function public.submit_lesson_feedback\([\s\S]*?\n\$\$;/)[0];
    assert.equal(extract(migration), extract(original).replace("'Skladba lekce', 'Atmosféra'", "'Skladba lekce', 'Dopomoci', 'Atmosféra'").replace(')) > 7', ')) > 8'));
    assert.match(migration, /check \(cardinality\(topics\) <= 8\)/);
  } finally { globalThis.Deno = oldDeno; globalThis.fetch = oldFetch; }
});

test('feedback form shows topics in approved order and submits all eight', async () => {
  const source = fs.readFileSync('app.js', 'utf8').replaceAll('\r\n', '\n');
  const extract = name => { const start = source.search(new RegExp(`(?:async )?function ${name}\\(`)); return source.slice(start, source.indexOf('\n}', start) + 2); };
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  try {
    for (const width of [375, 768, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      await page.route('**/feedback-test', route => route.fulfill({ contentType: 'text/html', body: '<html lang="cs"><body><div id="booking-content"></div></body></html>' }));
      await page.goto('http://127.0.0.1:4173/feedback-test');
      await page.addStyleTag({ content: fs.readFileSync('styles.css', 'utf8') });
      await page.addScriptTag({ content: `let submitted;let saved=[];const dialog={showModal(){}};function closeDialog(){}function showToast(){}function formatAdminDate(){return '29. 10. 2026 7:45';}async function feedbackRequest(body){if(body.action==='submit'){submitted=body;saved=body.topics;return {ok:true};}return {title:'Ranní flow',teacher:'Daniela Šťastná',topics:saved,rating:'great'};}\n${['escapeHtml', 'instructorDisplayName', 'instructorRole', 'openLessonFeedback'].map(extract).join('\n')}` });
      await page.evaluate(value => openLessonFeedback(value), token);
      assert.deepEqual(await page.locator('input[name="topics"]').evaluateAll(inputs => inputs.map(input => input.value)), expected);
      for (const topic of expected) await page.locator('.feedback-topics label').filter({ hasText: topic }).click();
      assert.equal(await page.locator('input[name="topics"]:checked').count(), 8);
      await page.getByRole('button', { name: 'Odeslat zpětnou vazbu' }).click();
      await page.waitForSelector('.feedback-thanks');
      assert.deepEqual(await page.evaluate(() => submitted.topics), expected);
      await page.evaluate(value => openLessonFeedback(value), token);
      assert.equal(await page.locator('input[name="topics"]:checked').count(), 8);
      await page.close();
    }
  } finally { await browser.close(); }
});
