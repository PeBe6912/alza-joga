const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { chromium } = require('C:/Users/petr.bena/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const source = fs.readFileSync('app.js', 'utf8');
const extract = (text, name) => text.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`))[0];
const panels = {
  overviewPanel: 'Lekce', completedLessonsPanel: 'Proběhlé lekce a platby',
  feedbackPanel: 'Zpětná vazba', teachersPanel: 'Profily lektorů',
  bookingsPanel: 'Účastníci', newsPanel: 'Novinky a jógové tipy', calendarPanel: 'Kalendář studia',
};
const context = vm.createContext({
  adminReservations: [], adminLessons: [], adminInstructors: [], adminFeedback: [], adminNews: [],
  adminLessonInstructorFilter: 'all', adminShowCancelledLessons: false, adminCalendarMonth: new Date(),
  escapeHtml: value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]),
  formatAdminDate: value => value,
  adminMonthRange: () => ({ gridStart: new Date(), gridEnd: new Date() }),
  adminCalendarEvents: () => [], calendarMonthLabel: () => 'Říjen 2026',
  adminMonthCalendar: () => '<div>Kalendář</div>', adminMonthAgenda: () => '',
});
for (const name of ['lessonTable', 'adminLessonFilter', 'adminLessonTools', 'filteredAdminLessons', ...Object.keys(panels)]) {
  vm.runInContext(extract(source, name), context);
}
const reservation = (id, email, status, lessonStatus, date, title = id) => ({
  id, attendee_name: email || id, attendee_email: email, status,
  lessons: { id: `lesson-${id}`, status: lessonStatus, starts_at: date, title },
});
context.adminReservations = [
  reservation('past', 'Test@example.invalid', 'attended', 'published', '2026-10-01', 'Proběhlá lekce'),
  reservation('future', 'test@example.invalid', 'confirmed', 'published', '2026-11-01', 'Platná budoucí lekce'),
  reservation('cancelled-lesson', 'test@example.invalid', 'confirmed', 'cancelled', '2026-12-01', 'NEZAPOČÍTAT LEKCI'),
  reservation('cancelled-booking', 'test@example.invalid', 'cancelled', 'published', '2026-12-02', 'NEZAPOČÍTAT STORNO'),
  reservation('only-cancelled', 'excluded@example.invalid', 'confirmed', 'cancelled', '2026-12-03'),
  reservation('no-show', 'absence@example.invalid', 'no_show', 'published', '2026-10-02'),
  reservation('walk-in-1', null, 'attended', 'published', '2026-10-02'),
  reservation('walk-in-2', null, 'attended', 'published', '2026-10-02'),
  { id: 'missing-lesson', attendee_name: 'Chybějící lekce', status: 'confirmed', lessons: null },
];
const peopleHtml = context.bookingsPanel();
assert.ok(peopleHtml.includes('data-label="Počet rezervací">2</td>'));
assert.ok(peopleHtml.includes('Platná budoucí lekce'));
assert.ok(!peopleHtml.includes('NEZAPOČÍTAT'));
assert.ok(!peopleHtml.includes('excluded@example.invalid'));
assert.equal((peopleHtml.match(/data-label="Počet rezervací"/g) || []).length, 4);
assert.ok(peopleHtml.includes('absence@example.invalid'));
const savedRows = context.adminReservations;
context.adminReservations = [reservation('cancelled', 'excluded@example.invalid', 'confirmed', 'cancelled', '2026-10-20')];
assert.ok(context.bookingsPanel().includes('Zatím nejsou evidováni žádní účastníci.'));
context.adminReservations = savedRows;
const previousSource = execFileSync('git', ['show', 'HEAD:app.js'], { encoding: 'utf8' });
for (const name of ['settingsPanel', 'accountsPanel', 'lessonParticipantsPanel']) {
  assert.equal(extract(source, name).replace(/\r\n/g, '\n'), extract(previousSource, name).replace(/\r\n/g, '\n'), `${name} must remain unchanged`);
}
console.log('PASS counts, latest lesson, cancellation-only people, walk-ins, unchanged settings/accounts/detail');

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  try {
    for (const width of [375, 768, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      for (const [name, title] of Object.entries(panels)) {
        const panel = context[name]();
        await page.setContent(`<html lang="cs"><body><section class="admin-content"><div class="admin-topbar"><div><p class="eyebrow">Správa studia</p><h1 id="admin-title">${title}</h1></div></div><div id="admin-panel">${panel}</div></section></body></html>`);
        await page.addStyleTag({ content: fs.readFileSync('styles.css', 'utf8') });
        assert.equal(await page.locator('h1').count(), 1);
        assert.equal(await page.locator('#admin-panel h2').count(), 0, `${name} duplicate heading`);
        if (name === 'overviewPanel') assert.equal(await page.locator('[data-calendar-export]').count(), 1);
        if (['overviewPanel', 'completedLessonsPanel', 'feedbackPanel'].includes(name)) assert.equal(await page.locator('[data-admin-lesson-instructor]').count(), 1);
        if (name === 'newsPanel') assert.equal(await page.locator('[data-add-news]').count(), 1);
        if (name === 'calendarPanel') assert.equal(await page.locator('[data-add-studio-block]').count(), 1);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${name} overflow at ${width}px`);
        if (name === 'bookingsPanel') {
          const row = page.locator('tbody tr').filter({ hasText: 'Test@example.invalid' });
          assert.equal(await row.locator('[data-label="Počet rezervací"]').innerText(), '2');
          assert.ok((await row.locator('[data-label="Poslední lekce"]').innerText()).includes('Platná budoucí lekce'));
        }
        if (['bookingsPanel', 'newsPanel'].includes(name)) await page.screenshot({ path: `outputs/${name}-${width}.png`, fullPage: true });
      }
      await page.close();
      console.log(`PASS seven admin tabs, single headings and preserved controls at ${width}px`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
