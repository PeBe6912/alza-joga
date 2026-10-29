import test from 'node:test';
import assert from 'node:assert/strict';

test('admin email history is read-only; resending is single-recipient and attendance-safe', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-27T08:16:49Z').getTime() });
  const id = '22222222-2222-4222-8222-222222222222';
  const env = { SUPABASE_URL: 'https://supabase.example.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fake-secret', BREVO_API_KEY: 'fake-brevo', BREVO_SENDER_EMAIL: 'studio@example.invalid' };
  const html = '<html><body>Původní zpráva z roku 2020 <a href="https://joganahallu.cz">web</a></body></html>';
  let handler;
  let options = {};
  let calls = [];
  const previousFetch = globalThis.fetch;
  const previousDeno = globalThis.Deno;
  globalThis.Deno = { env: { get: key => env[key] }, serve: fn => { handler = fn; } };
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    const method = init.method || 'GET';
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ url, method, body });
    if (url.origin === env.SUPABASE_URL) {
      if (url.pathname === '/auth/v1/user') return Response.json({ id, app_metadata: { role: options.nonAdmin ? 'participant' : 'admin' } });
      if (url.pathname === '/rest/v1/reservations' && method === 'GET') return Response.json([{
        id, attendee_name: 'Petr Bena', attendee_email: 'new-address@example.invalid', status: options.cancelled ? 'cancelled' : 'attended', payment_waived_at: options.waived ? '2020-01-01' : null,
        payment_email_sent_at: options.sentAt || '2020-01-01T23:59:59Z', payment_email_recipient: 'original@example.invalid', payment_email_message_id: options.unsent ? null : '<original-message>', payment_email_last_resent_at: null,
        lessons: { title: 'Lekce', ends_at: options.future ? '2100-01-01T10:00:00Z' : '2020-01-01T10:00:00Z', status: 'published', instructors: { name: 'Daniela Šťastná' } },
      }]);
      if (url.pathname === '/rest/v1/rpc/claim_payment_email_resend') return Response.json(!options.throttled);
      if (url.pathname === '/rest/v1/reservations' && method === 'PATCH') return options.recordFail ? Response.json({}, { status: 500 }) : Response.json([{ id }]);
      throw new Error('Unexpected database mutation');
    }
    assert.equal(url.origin, 'https://api.brevo.com');
    if (url.pathname === '/v3/smtp/emails') {
      assert.equal(method, 'GET');
      assert.equal(url.searchParams.get('messageId'), '<original-message>');
      const sent = new Date(options.sentAt || '2020-01-01T23:59:59Z');
      assert.equal(url.searchParams.get('startDate'), new Date(sent.getTime() - 86400000).toISOString().slice(0, 10));
      assert.equal(url.searchParams.get('endDate'), new Date(Math.min(sent.getTime() + 86400000, Date.now())).toISOString().slice(0, 10));
      if (url.searchParams.get('endDate') > new Date().toISOString().slice(0, 10)) return Response.json({ code: 'invalid_parameter', message: 'Start/End date should not be greater than current date' }, { status: 400 });
      if (options.providerError) return Response.json({ code: 'invalid_parameter', message: 'Invalid request for private@example.invalid <private-message-id>' }, { status: 400 });
      return Response.json({ transactionalEmails: options.missing ? [] : [{ uuid: 'provider-uuid', messageId: '<original-message>', email: options.wrongRecipient ? 'other@example.invalid' : 'original@example.invalid' }] });
    }
    if (url.pathname === '/v3/smtp/emails/provider-uuid') return Response.json({ email: options.wrongContent ? 'other@example.invalid' : 'original@example.invalid', subject: 'Původní předmět', body: html });
    if (url.pathname === '/v3/smtp/email') {
      if (options.uncertain) throw new Error('network timeout');
      return options.sendFail ? Response.json({}, { status: 503 }) : Response.json({ messageId: '<resent-message>' }, { status: 201 });
    }
    throw new Error('Unexpected provider endpoint');
  };
  try {
    await import('../supabase/functions/manage-lesson/index.ts');
    async function run(action, config = {}, body = {}) {
      options = config; calls = [];
      const res = await handler(new Request('https://supabase.example.invalid', { method: 'POST', headers: { Origin: 'https://joganahallu.cz', 'Content-Type': 'application/json', ...(config.anonymous ? {} : { Authorization: 'Bearer fake' }) }, body: JSON.stringify({ action, reservationId: id, confirmed: true, ...body }) }));
      return { res, data: await res.json(), calls: [...calls] };
    }
    const preview = await run('payment-email-content');
    assert.equal(preview.res.status, 200);
    assert.equal(preview.res.headers.get('Cache-Control'), 'no-store');
    assert.equal(preview.data.html, html);
    assert.equal(preview.data.recipient, 'original@example.invalid');
    assert.ok(preview.calls.every(c => c.method === 'GET'));
    for (const sentAt of ['2026-10-27T08:16:49Z', '2026-10-27T00:00:01Z', '2026-10-26T23:59:59Z']) {
      const current = await run('payment-email-content', { sentAt });
      assert.equal(current.res.status, 200, sentAt);
      assert.equal(current.data.html, html);
      assert.ok(current.calls.every(c => c.method === 'GET'));
      assert.equal(current.calls.find(c => c.url.pathname === '/v3/smtp/emails').url.searchParams.get('endDate'), '2026-10-27');
    }
    for (const [now, sentAt] of [
      ['2026-10-27T00:00:02Z', '2026-10-26T23:59:59Z'],
      ['2026-11-01T00:00:02Z', '2026-10-31T23:59:59Z'],
      ['2026-03-01T00:00:02Z', '2026-02-28T23:59:59Z'],
    ]) {
      t.mock.timers.setTime(new Date(now).getTime());
      const boundary = await run('payment-email-content', { sentAt });
      assert.equal(boundary.res.status, 200, now);
      assert.equal(boundary.calls.find(c => c.url.pathname === '/v3/smtp/emails').url.searchParams.get('endDate'), now.slice(0, 10));
    }
    t.mock.timers.setTime(new Date('2026-10-27T08:16:49Z').getTime());
    const previousConsoleError = console.error;
    const diagnostics = [];
    try {
      console.error = (...args) => diagnostics.push(args.join(' '));
      const failed = await run('payment-email-content', { providerError: true });
      assert.equal(failed.res.status, 502);
      assert.ok(failed.calls.every(c => c.method === 'GET'));
    } finally { console.error = previousConsoleError; }
    const diagnostic = diagnostics.find(line => line.startsWith('email_archive_provider_error '));
    assert.match(diagnostic, /"stage":"list","status":400,"code":"invalid_parameter"/);
    assert.doesNotMatch(diagnostic, /private@example|private-message-id|fake-brevo|fake-secret/);
    const resend = await run('payment-email-resend', {}, { email: 'attacker@example.invalid', html: 'replacement', subject: 'replacement' });
    assert.equal(resend.res.status, 200);
    assert.equal(resend.data.recorded, true);
    const smtp = resend.calls.filter(c => c.url.pathname === '/v3/smtp/email');
    assert.equal(smtp.length, 1);
    assert.equal(smtp[0].body.sender.name, 'Danča · Jóga na HALLU');
    assert.deepEqual(smtp[0].body.to, [{ email: 'original@example.invalid', name: 'Petr Bena' }]);
    assert.equal(smtp[0].body.htmlContent, html);
    assert.equal(smtp[0].body.subject, 'Původní předmět');
    const patch = resend.calls.find(c => c.method === 'PATCH');
    assert.deepEqual(Object.keys(patch.body), ['payment_email_last_resent_at']);
    assert.ok(resend.calls.filter(c => c.url.pathname.includes('/rpc/')).every(c => c.url.pathname.endsWith('claim_payment_email_resend')));
    for (const [config, status] of [[{ anonymous: true }, 401], [{ nonAdmin: true }, 403], [{ throttled: true }, 429], [{ future: true }, 409], [{ cancelled: true }, 409], [{ waived: true }, 409], [{ unsent: true }, 409], [{ missing: true }, 404], [{ wrongRecipient: true }, 404], [{ wrongContent: true }, 404]]) {
      const r = await run('payment-email-resend', config);
      assert.equal(r.res.status, status, JSON.stringify(config));
      assert.equal(r.calls.filter(c => c.url.pathname === '/v3/smtp/email').length, 0);
    }
    const noConfirm = await run('payment-email-resend', {}, { confirmed: false });
    assert.equal(noConfirm.res.status, 400);
    assert.equal(noConfirm.calls.length, 1); // Only the admin identity check, no archive or SMTP.
    for (const option of [{ sendFail: true }, { uncertain: true }]) {
      const r = await run('payment-email-resend', option);
      assert.equal(r.res.status, 502);
      assert.equal(r.calls.filter(c => c.url.pathname === '/v3/smtp/email').length, 1);
      assert.equal(r.calls.filter(c => c.method === 'PATCH').length, 0);
    }
    const noAudit = await run('payment-email-resend', { recordFail: true });
    assert.equal(noAudit.res.status, 200);
    assert.equal(noAudit.data.recorded, false);
    assert.equal(noAudit.calls.filter(c => c.url.pathname === '/v3/smtp/email').length, 1);
    console.log('Preview, original recipient/content, confirmation, throttle, auth, failure/uncertainty and unchanged attendance verified. No real email sent.');
  } finally { globalThis.fetch = previousFetch; globalThis.Deno = previousDeno; t.mock.timers.reset(); }
});
