import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { Exam, EXAM_DURATION } from '../src/session.js';
import { bestPlan } from './helpers/balance-plan.js';

// A known stage-4 layout: every culprit is reported, both requests are left to expire (two lives),
// so the pass ends on one life and earns the 'close call' badge through the real UI.
let seed = 42;
while (bestPlan(new Exam(seed, 4)).finish > 38) seed++;
const fixture = new Exam(seed, 4);
mkdirSync('test-results', { recursive: true });

const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route(/\/src\/session\.js(?:\?t=\d+)?$/, (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `export * from '/src/session.js?fixture'; import {Exam as Base} from '/src/session.js?fixture'; export class Exam extends Base {constructor(s=${seed},stage=1){super(${seed},stage)}}`,
    }),
  );
  // An existing player who has opened stage 4 but has no records yet.
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.clear();
    localStorage.setItem('nyangijapgi.v2', JSON.stringify({ history: [], unlocked: 4, completed: false, muted: true }));
  });
  await page.clock.install({ time: new Date('2026-11-18T00:00:00Z') });
  await page.goto(process.env.TEST_BASE_URL || 'http://127.0.0.1:5173');
  await page.clock.pauseAt(new Date('2026-11-18T00:01:00Z'));
  const tap = (selector) => page.locator(selector).filter({ visible: true }).tap();
  const advance = async (ms) => {
    while (ms > 0) {
      await page.clock.fastForward(Math.min(ms, 500));
      ms -= 500;
    }
  };
  const time = async () => {
    const [m, s] = (await page.locator('#time').textContent()).split(':').map(Number);
    return EXAM_DURATION - m * 60 - s;
  };

  // Fresh records: the trophy is there, without a new-badge dot, and the lobby copy is unchanged.
  assert.equal(await page.locator('[data-action=records]').getAttribute('aria-label'), '기록실');
  assert.equal(await page.locator('.new-dot').count(), 0);
  await tap('[data-action=records]');
  assert.match(await page.locator('.records-panel').innerText(), /감독한 시험\s*0번/);
  await tap('[data-action=records-badges]');
  assert.equal(await page.locator('.badge-grid li').count(), 9);
  assert.equal(await page.locator('.badge-grid .got').count(), 0);
  assert.ok(await page.locator('.secret-note').isVisible());
  await page.keyboard.press('Escape');
  await page.locator('.stage-picker').waitFor();

  await tap('[data-level="4"]');
  await tap('[data-action=start]');
  await page.locator('#play:not([hidden])').waitFor();
  await advance(200);
  for (const visit of bestPlan(fixture).visits) {
    while ((await time()) < visit.depart) await advance(100);
    for (let i = 0; i < 50 && (await page.locator('#seat-targets').evaluate((el) => el.inert)); i++) await advance(200);
    await advance(500);
    await tap('[data-seat="' + visit.id + '"]');
    for (let i = 0; i < 50 && !(await page.locator('[data-action=report], [data-action=serve]').count()); i++)
      await advance(200);
    while ((await time()) < visit.report + 0.5) await advance(100);
    await tap('[data-action=report]');
  }
  await advance(46000 - (await time()) * 1000);
  assert.match(await page.locator('.ending-title').innerText(), /4단계 통과/);
  const badge = await page.locator('.new-badge').innerText();
  assert.match(badge, /새 업적/);
  assert.match(badge, /아슬아슬/);
  await page.screenshot({ path: 'test-results/records-result-390.png', animations: 'disabled', timeout: 30000 });
  // The new line must not push the next-stage button off a small phone.
  await page.setViewportSize({ width: 320, height: 568 });
  await advance(500);
  const next = await page.locator('[data-action=advance]').boundingBox();
  assert.ok(next.y >= 0 && next.y + next.height <= 568, 'next stage button stays on screen');
  await page.screenshot({ path: 'test-results/records-result-320.png', animations: 'disabled', timeout: 30000 });
  await page.setViewportSize({ width: 390, height: 844 });

  const records = await page.evaluate(() => JSON.parse(localStorage.getItem('nyangijapgi.records.v1')));
  assert.equal(records.exams, 1);
  assert.equal(records.wins, 1);
  assert.equal(records.stages[3].wins, 1);
  assert.ok(records.stages[3].fastest > 0);
  assert.equal(records.caught, fixture.rules.culprits);
  assert.deepEqual(records.unseen, ['close-call']);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('nyangijapgi.v2')));
  assert.equal(saved.history[0].stage, 4);
  assert.equal(saved.history[0].achievements, undefined, 'history keeps its shape');

  // Back home: a dot invites a look; the badge tab shows NEW once, then the dot clears.
  await tap('#ending [data-action=home]');
  assert.equal(await page.locator('.new-dot').count(), 1);
  await page.screenshot({ path: 'test-results/records-lobby-390.png', animations: 'disabled' });
  await tap('[data-action=records]');
  assert.match(await page.locator('.records-panel').innerText(), /통과\s*1번 · 100%/);
  await page.screenshot({ path: 'test-results/records-stats-390.png', animations: 'disabled', fullPage: true });
  await tap('[data-action=records-badges]');
  assert.match(await page.locator('.badge-grid .fresh').innerText(), /아슬아슬/);
  assert.match(await page.locator('[data-action=records-badges]').innerText(), /업적 1\/10/);
  await page.screenshot({ path: 'test-results/records-badges-390.png', animations: 'disabled' });
  for (const [width, height] of [[320, 568], [568, 320], [1167, 813]]) {
    await page.setViewportSize({ width, height });
    await advance(200);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.ok(overflow <= 0, 'no sideways scroll at ' + width);
    await page.screenshot({ path: `test-results/records-badges-${width}.png`, animations: 'disabled' });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await tap('.records-head [data-action=home]');
  assert.equal(await page.locator('.new-dot').count(), 0);
  await page.reload();
  assert.equal(await page.locator('.new-dot').count(), 0);
  await tap('[data-action=records]');
  await tap('[data-action=records-badges]');
  assert.equal(await page.locator('.badge-grid .fresh').count(), 0);
  assert.equal(await page.locator('.badge-grid .got').count(), 1);
  assert.deepEqual(errors, []);
  console.log('Records: stage-4 close call earned in play, shown once, persisted, and laid out on four screen sizes.');
} finally {
  await browser.close();
}
