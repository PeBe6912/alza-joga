import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('all transactional email scenarios use approved copy without live services', async () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const reservationId = '22222222-2222-4222-8222-222222222222';
  const env = { SUPABASE_URL: 'https://supabase.example.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fake-key', BREVO_API_KEY: 'fake-key', BREVO_SENDER_EMAIL: 'studio@example.invalid', PUBLIC_SITE_URL: 'https://joganahallu.cz' };
  const handlers = {};
  let registerHandler;
  let scenario = {};
  let emails = [];
  let writes = [];
  const user = () => ({ id, email: 'student@example.invalid', user_metadata: { full_name: 'Petr Bena' }, app_metadata: { role: scenario.admin === false ? 'participant' : 'admin' } });
  const teacher = () => scenario.donation ? 'Petr Bena' : 'Daniela Šťastná';
  const lesson = () => ({ lesson_id: id, reservation_id: reservationId, attendee_name: 'Petr Bena', attendee_email: 'student@example.invalid', title: 'Ranní flow <test>', starts_at: scenario.delayed ? '2020-01-01T08:00:00Z' : new Date().toISOString(), ends_at: new Date(Date.now() + 3600000).toISOString(), cancel_before: new Date(Date.now() - 86400000).toISOString(), teacher: teacher(), language: 'cs', location: 'HALL, 3. patro', payment_mode: scenario.donation ? 'donation' : 'paid', price_czk: scenario.donation ? null : 150, payment_note: 'Individuální podmínka lektora', cancellation_hours: 24, available_spots: 10, already_cancelled: false, late_cancellation: scenario.late || false });
  const batch = () => ({ ...lesson(), instructor_email: 'teacher@example.invalid', payment_qr_url: scenario.donation ? 'assets/qr-dobry-andel.jpg' : 'assets/qr-daniela-150.jpg', participants: [{ reservation_id: reservationId, name: 'Petr Bena', email: 'student@example.invalid', status: scenario.absent ? 'no_show' : 'attended', feedback_token: 'feedback-test-token', payment_waived_at: scenario.waived ? '2026-01-01' : null }] });
  const change = action => ({ ...lesson(), action, old_starts_at: '2026-10-25T07:00:00Z', new_starts_at: '2026-10-26T08:00:00Z', old_title: 'Původní lekce', old_teacher: 'Petr Bena', old_payment_mode: 'paid', old_price_czk: 150, new_payment_mode: 'paid', new_price_czk: 150, participants: [{ name: 'Petr Bena', email: 'student@example.invalid' }] });
  const previousDeno = globalThis.Deno;
  const previousFetch = globalThis.fetch;
  globalThis.Deno = { env: { get: key => env[key] }, serve: handler => { registerHandler = handler; } };
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    const body = init.body ? JSON.parse(init.body) : {};
    if (url.href === 'https://api.brevo.com/v3/smtp/email') {
      emails.push(body);
      return Response.json({ messageId: 'mock-message-no-mail-sent' });
    }
    assert.equal(url.origin, env.SUPABASE_URL, `Unexpected network destination: ${url.origin}`);
    if (url.pathname === '/auth/v1/user') return Response.json(user());
    if (url.pathname === '/auth/v1/admin/generate_link') {
      if (scenario.existing && body.type === 'signup') return Response.json({ message: 'already registered' }, { status: 422 });
      return Response.json({ properties: { hashed_token: 'safe-token-test' } });
    }
    if (url.pathname === '/auth/v1/token') return Response.json({ user: user(), access_token: 'verification-token' });
    if (url.pathname.startsWith('/auth/v1/admin/users/') || url.pathname === '/auth/v1/logout') { writes.push(url.pathname); return Response.json({}); }
    if (url.pathname === '/rest/v1/instructors') return Response.json([{ id, name: teacher(), payment_mode: scenario.donation ? 'donation' : 'paid', price_czk: 150, payment_note: 'Individuální podmínka lektora' }]);
    if (url.pathname === '/rest/v1/site_settings') return scenario.summaryFailure ? Response.json({}, { status: 503 }) : Response.json(scenario.noSummary ? [] : [{ value: { amount_czk: 11075, as_of: '2026-10-26' } }]);
    if (url.pathname.startsWith('/rest/v1/rpc/')) {
      const rpc = url.pathname.split('/').at(-1);
      writes.push(rpc);
      switch (rpc) {
        case 'account_allow_auth_email': return Response.json(true);
        case 'account_dashboard': return Response.json({ profile: { fullName: 'Petr Bena', relation: 'employee' }, reservations: [] });
        case 'admin_instructor_contacts': return Response.json([{ instructor_id: id, email: 'teacher@example.invalid' }]);
        case 'reserve_lesson': return Response.json(lesson());
        case 'cancel_reservation': case 'account_cancel_reservation': case 'admin_cancel_reservation': return Response.json(lesson());
        case 'admin_payment_email_preview': case 'admin_record_attendance': return Response.json(batch());
        case 'admin_update_lesson': return Response.json(change('update'));
        case 'admin_update_donation_summary': return Response.json({ amount_czk: body.p_amount_czk, as_of: body.p_as_of });
        case 'admin_change_lesson': return Response.json(change(body.p_action));
        case 'record_reservation_email_result': case 'record_payment_email_result': case 'account_prepare_profile': case 'account_delete_participant_profile': return Response.json(null);
        default: throw new Error(`Unmocked RPC: ${rpc}`);
      }
    }
    throw new Error(`Unmocked request: ${url}`);
  };
  try {
    for (const name of ['book-lesson', 'cancel-reservation', 'manage-lesson', 'contact-instructor', 'account']) {
      await import(`../supabase/functions/${name}/index.ts`);
      handlers[name] = registerHandler;
    }
    async function run(name, body, options = {}) {
      scenario = options; emails = []; writes = [];
      const response = await handlers[name](new Request(`https://supabase.example.invalid/functions/v1/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://joganahallu.cz', ...(options.anonymous ? {} : { Authorization: 'Bearer mock-token' }) }, body: JSON.stringify(body) }));
      const result = await response.json();
      assert.ok(response.status < 300, JSON.stringify(result));
      for (const mail of emails) {
        assert.doesNotMatch(mail.htmlContent, /Dobrý den/);
        assert.doesNotMatch(mail.htmlContent, /děkujeme|posíláme|pošleme|těšíme se|budeme rádi|omlouváme|nám pomůže|Web Jóga na HALLU/i);
        assert.equal((mail.htmlContent.match(/data-email-signature/g) || []).length, 1);
        assert.doesNotMatch(mail.htmlContent, /Ranní flow <test>/);
      }
      return { result, emails: [...emails], writes: [...writes] };
    }
    for (const donation of [false, true]) {
      const r = await run('book-lesson', { lessonId: id, name: 'Petr Bena', email: 'student@example.invalid' }, { donation, anonymous: true });
      const displayName = donation ? 'Petr' : 'Danča';
      assert.match(r.emails[0].htmlContent, new RegExp(`${donation ? 'Lektor' : 'Lektorka'}: ${displayName}<br>`));
      assert.match(r.emails[0].htmlContent, new RegExp(`<span style="display:block">${displayName}</span>`));
      assert.equal(r.emails[0].sender.name, `${displayName} · Jóga na HALLU`);
      assert.equal(r.emails[0].to[0].name, 'Petr Bena');
      assert.match(r.emails[0].htmlContent, /potvrzuji tvoji rezervaci/);
      assert.match(r.emails[0].htmlContent, /Individuální podmínka lektora/);
      assert.match(r.emails[0].htmlContent, /pošlu/);
      assert.match(r.emails[0].htmlContent, /cancel=/);
    }
    await run('cancel-reservation', { token: 'x'.repeat(50) }, { anonymous: true });
    await run('account', { action: 'cancel-reservation', reservationId });
    for (const late of [false, true]) {
      const r = await run('manage-lesson', { action: 'cancel-reservation', reservationId }, { late });
      assert.match(r.emails[0].htmlContent, late ? /pozdní zrušení/ : /potvrzuji zrušení/);
    }
    for (const donation of [false, true]) for (const absent of [false, true]) for (const delayed of [false, true]) {
      const r = await run('manage-lesson', { action: 'payment-send', lessonId: id, feedbackRequested: true, attendance: [{ reservationId, outcome: absent ? 'no_show' : 'attended', email: 'student@example.invalid' }] }, { donation, absent, delayed });
      assert.equal(r.emails.length, 2);
      const html = r.emails[0].htmlContent;
      assert.match(html, new RegExp(`${donation ? 'Lektor: Petr' : 'Lektorka: Danča'}</p>`));
      assert.equal(r.emails[0].sender.name, `${donation ? 'Petr' : 'Danča'} · Jóga na HALLU`);
      assert.match(html, /\/platba\?lekce=/);
      assert.match(html, donation ? /Přispět Dobrému andělovi/ : /Zaplatit lekci/);
      assert.equal(html.includes('K 26. říjnu 2026 jsme společně přispěli Dobrému andělovi'), donation);
      if (donation) assert.match(html.replaceAll('\u00a0', ' '), /11 075 Kč\. Děkuji, že pomáháš\./);
      assert.equal(html.includes('Ohodnotit lekci'), !absent);
      assert.equal(html.includes('dnešní společnou'), !absent && !delayed);
      if (donation) assert.doesNotMatch(html, /lekce se hradí|se lekce hradí|povinn/);
      else if (absent) assert.match(html, /se lekce hradí/);
      assert.doesNotMatch(r.emails[1].htmlContent, /<span style="display:block">/);
      assert.match(r.emails[1].htmlContent, /rozesílání platebních e-mailů/);
    }
    const waived = await run('manage-lesson', { action: 'payment-send', lessonId: id, attendance: [{ reservationId, outcome: 'waived', email: 'student@example.invalid' }] }, { waived: true });
    assert.equal(waived.emails.length, 0);
    const unset = await run('manage-lesson', { action: 'payment-send', lessonId: id, attendance: [{ reservationId, outcome: 'attended', email: 'student@example.invalid' }] }, { donation: true, noSummary: true });
    assert.equal(unset.emails.length, 2);
    assert.doesNotMatch(unset.emails[0].htmlContent, /jsme společně přispěli/);
    const saved = await run('manage-lesson', { action: 'update-donation-summary', amountCzk: 11075, asOf: '2026-10-26' });
    assert.deepEqual(saved.result.summary, { amount_czk: 11075, as_of: '2026-10-26' });
    assert.deepEqual(saved.writes, ['admin_update_donation_summary']);
    assert.equal(saved.emails.length, 0);
    scenario = { donation: true, summaryFailure: true }; emails = []; writes = [];
    const unavailable = await handlers['manage-lesson'](new Request('https://supabase.example.invalid', { method: 'POST', headers: { Authorization: 'Bearer mock-token' }, body: JSON.stringify({ action: 'payment-send', lessonId: id, attendance: [{ reservationId, outcome: 'attended', email: 'student@example.invalid' }] }) }));
    assert.ok(unavailable.status >= 400);
    assert.deepEqual(emails, []);
    assert.deepEqual(writes, ['admin_payment_email_preview']);
    for (const payload of [
      { amountCzk: -1, asOf: '2026-10-26' }, { amountCzk: 1.234, asOf: '2026-10-26' },
      { amountCzk: '11075', asOf: '2026-10-26' }, { amountCzk: null, asOf: '2026-10-26' },
      { amountCzk: 1000000000, asOf: '2026-10-26' }, { amountCzk: 1, asOf: '2026-02-30' },
      { amountCzk: 1, asOf: '2099-01-01' }, { amountCzk: 1, asOf: '' },
    ]) {
      emails = []; writes = []; scenario = {};
      const invalid = await handlers['manage-lesson'](new Request('https://supabase.example.invalid', { method: 'POST', headers: { Authorization: 'Bearer mock-token' }, body: JSON.stringify({ action: 'update-donation-summary', ...payload }) }));
      assert.equal(invalid.status, 400, JSON.stringify(payload));
      assert.deepEqual(writes, []);
      assert.deepEqual(emails, []);
    }
    for (const admin of [false, true]) {
      emails = []; writes = []; scenario = { admin };
      const blocked = await handlers['manage-lesson'](new Request('https://supabase.example.invalid', { method: 'POST', headers: admin ? {} : { Authorization: 'Bearer mock-token' }, body: JSON.stringify({ action: 'update-donation-summary', amountCzk: 1, asOf: '2026-10-26' }) }));
      assert.equal(blocked.status, admin ? 401 : 403);
      assert.deepEqual(writes, []);
      assert.deepEqual(emails, []);
    }
    for (const action of ['update', 'reschedule', 'cancel']) {
      const r = await run('manage-lesson', { action, lessonId: id, instructorId: id, title: 'Ranní flow', startsAt: '2026-10-27T08:00:00Z', endsAt: '2026-10-27T09:00:00Z', capacity: 20, language: 'cs', paymentMode: 'paid', priceCzk: 150, minimumAttendance: 5 });
      assert.equal(r.emails.length, 1);
      assert.match(r.emails[0].htmlContent, action === 'cancel' ? /Omlouvám se/ : /Těším se/);
    }
    for (const existing of [false, true]) {
      const r = await run('account', { action: 'register', fullName: 'Petr Bena', email: 'student@example.invalid', password: 'test-password-long' }, { anonymous: true, existing });
      assert.match(r.emails[0].htmlContent, /token_hash=safe-token-test/);
      assert.match(r.emails[0].htmlContent, existing ? /type=magiclink/ : /type=signup/);
    }
    const recovery = await run('account', { action: 'recover', email: 'student@example.invalid' }, { anonymous: true });
    assert.match(recovery.emails[0].htmlContent, /type=recovery/);
    await run('account', { action: 'change-password', password: 'test-password-long' });
    for (const admin of [false, true]) {
      const r = await run('account', { action: 'delete-account', password: 'test-password-long' }, { admin });
      assert.match(r.emails[0].subject, admin ? /Účastnický profil/ : /Účet byl/);
      assert.equal(r.writes.includes('account_delete_participant_profile'), admin);
      assert.equal(r.writes.some(x => x.startsWith('/auth/v1/admin/users/')), !admin);
    }
    const contact = await run('contact-instructor', { instructorName: 'Daniela Šťastná', name: 'Petr Bena', email: 'student@example.invalid', phone: '', message: 'Text soukromé poptávky <script>TEST</script>', consent: true, openedAt: Date.now() - 5000 }, { anonymous: true });
    assert.match(contact.emails[0].htmlContent, /&lt;script&gt;/);
    assert.match(contact.emails[0].htmlContent, /Ahoj Dančo/);
    assert.equal(contact.emails[0].to[0].name, 'Danča');
    assert.equal(contact.emails.length, 1);
    for (const name of Object.keys(handlers)) {
      const res = await handlers[name](new Request('https://supabase.example.invalid', { method: 'GET' }));
      assert.equal(res.status, 405);
    }
    for (const name of Object.keys(handlers)) new TextDecoder('utf-8', { fatal: true }).decode(await fs.readFile(`supabase/functions/${name}/index.ts`));
    console.log('19 scenarios + feedback, delayed mail, waiver, auth links, deletion safeguards and UTF-8 verified; all network mocked.');
  } finally { globalThis.fetch = previousFetch; globalThis.Deno = previousDeno; }
});
