const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/petr.bena/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const source=fs.readFileSync('app.js','utf8');
const helper=source.match(/function lessonConfirmationBadge\([^)]*\) \{[\s\S]*?\n\}/)[0];
const ctx=vm.createContext({});vm.runInContext(helper,ctx);
const badge=lesson=>{ctx.lesson=lesson;return vm.runInContext('lessonConfirmationBadge(lesson)',ctx);};
const future={lowAttendanceConfirmedAt:'2026-11-01',endsAt:'2099-11-02',status:'published'};
assert.match(badge(future),/✓ Lekce se koná/);
assert.equal(badge({...future,lowAttendanceConfirmedAt:null}),'');
assert.equal(badge({...future,status:'cancelled'}),'');
assert.equal(badge({...future,endsAt:'2000-01-01'}),'');
(async()=>{let server;let site=process.env.TEST_SITE_URL;if(!site){const path=require('node:path');const root=process.cwd();server=require('node:http').createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}const target=file===root?path.join(root,'index.html'):file;try{res.setHeader('Content-Type',target.endsWith('.js')?'text/javascript':target.endsWith('.css')?'text/css':target.endsWith('.html')?'text/html':'application/octet-stream');res.end(fs.readFileSync(target));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));site='http://127.0.0.1:'+server.address().port+'/';}const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
  for(const width of [320,768,1440]){
    const page=await browser.newPage({viewport:{width,height:1000}});
    await page.goto(site,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>lessons.some(l=>l.lowAttendanceConfirmedAt));
    const confirmed=await page.evaluate(()=>lessons.find(l=>l.lowAttendanceConfirmedAt));
    const row=page.locator('.class-row').filter({has:page.locator('[data-book="'+confirmed.id+'"]')});
    assert.equal(await row.locator('.lesson-confirmation-badge').textContent(),'✓ Lekce se koná');
    assert.match(await row.textContent(),new RegExp('Přihlášeno '+confirmed.booked+' / '+confirmed.capacity));
    assert.equal(await row.locator('[data-book]').isEnabled(),true);
    assert.equal(await page.locator('#next-class-card .lesson-confirmation-badge').count(),1);
    await page.evaluate(async()=>{publicCalendarStart=startOfWeek(new Date(lessons.find(l=>l.lowAttendanceConfirmedAt).iso));await loadPublicStudioBlocks();});
    const card=page.locator('#public-studio-calendar .calendar-event').filter({hasText:confirmed.title});
    assert.equal(await card.locator('.lesson-confirmation-badge').count(),1);
    assert.ok(await row.evaluate(el=>el.scrollWidth<=el.clientWidth));
    assert.ok(await card.evaluate(el=>el.scrollWidth<=el.clientWidth));
    await page.close();console.log('Confirmation badge verified:',width);
  }
}finally{await browser.close();if(server)await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1});
