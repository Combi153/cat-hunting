import { revealResult } from './helpers/result-ui.js';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { Exam, clock } from '../src/session.js';
import { bestPlan } from './helpers/balance-plan.js';
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route(/\/src\/session\.js(?:\?t=\d+)?$/, (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: "export * from '/src/session.js?fixture'; import {Exam as Base} from '/src/session.js?fixture'; export class Exam extends Base {constructor(seed=42,stage=1){super(seed,stage)}}",
    }),
  );
  await page.route(/\/src\/analytics\.js(?:\?t=\d+)?$/, (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: "export {createGameAnalytics} from '/src/analytics.js?fixture'; export function createAnalytics(){window.events=[];return (name,data)=>window.events.push({name,...data})}",
    }),
  );
  await page.clock.install({ time: new Date('2026-11-18T00:00:00Z') });
  await page.goto(process.env.TEST_BASE_URL || 'http://127.0.0.1:5173');
  await page.clock.pauseAt(new Date('2026-11-18T00:01:00Z'));
  const tap = async selector => { await revealResult(page); return page.locator(selector).filter({ visible: true }).tap(); };
  const advance = async (ms) => {
    while (ms > 0) {
      await page.clock.fastForward(Math.min(ms, 500));
      ms -= 500;
    }
  };
  const time = async (duration) => {
    const [m, s] = (await page.locator('#time').textContent()).split(':').map(Number);
    return duration - m * 60 - s;
  };
  const ready = async () => {
    for (let i = 0; i < 50 && (await page.locator('#seat-targets').evaluate((el) => el.inert)); i++)
      await advance(200);
    await advance(500);
  };
  const inspect = async (id) => {
    await ready();
    await tap('[data-seat="' + id + '"]');
    for (let i = 0; i < 50 && !(await page.locator('[data-action=report], [data-action=serve]').count()); i++)
      await advance(200);
  };
  assert.equal(await page.locator('.stage-picker button:disabled').count(), 4);
  await page.screenshot({ path: 'test-results/campaign-lobby.png' });
  const playTutorial = async (verify = false) => {
    await tap('[data-action=start]');
    await page.locator('.tutorial-target').waitFor();
    assert.equal(await page.locator('#time').count(), 0);
    assert.equal(await page.locator('#seat-targets button:enabled').count(), 1);
    const target = new Exam(42, 1).seats;
    if (verify) {
      await page.clock.fastForward(120000);
      assert.ok(await page.locator('#ending').isHidden());
      await inspect(target[0].id);
      await tap('[data-action=overview]');
    }
    await inspect(target[0].id);
    await tap('[data-action=report]');
    assert.match(await page.locator('#notice').innerText(), /적발/);
    await inspect(target[1].id);
    await tap('[data-action=report]');
    assert.equal(await page.locator('#health .hearts').getAttribute('aria-label'), '생명 2개');
    await inspect(target[2].id);
    await tap('[data-action=serve]');
    assert.ok(await page.locator('#ending').isHidden());
    await advance(2000);
    await revealResult(page);
    assert.match(await page.locator('#result-dialog').innerText(), /2단계 시험 시작/);
  };
  await playTutorial(true);
  const tutorialSave = await page.evaluate(() => JSON.parse(localStorage.getItem('nyangijapgi.v2')));
  assert.equal(tutorialSave.unlocked, 2);
  assert.deepEqual(tutorialSave.history, []);
  assert.deepEqual(await page.evaluate(() => window.events.map(event => event.name)), ['tutorial_start', 'tutorial_complete']);
  console.log('Tutorial passed: no timer, observation return, correct and mistaken reports, real help and saved unlock.');

  let last = null;
  const signature = (e) =>
    e.seats
      .filter((s) => s.guilty)
      .map((s) => s.id)
      .join(',');
  for (let stage = 2; stage <= 5; stage++) {
    let seed = 42;
    while (last && signature(new Exam(seed, stage)) === signature(last)) seed++;
    const fixture = new Exam(seed, stage);
    await tap('[data-action=advance]');
    await page.locator('#play:not([hidden])').waitFor();
    await page.locator('#ending').waitFor({ state: 'hidden' });
    assert.equal(await page.locator('#time').textContent(), clock(fixture.duration));
    await advance(200);
    assert.match(await page.locator('.round-status').innerText(), new RegExp(stage + ' / 5'));
    assert.equal(await page.locator('#seat-targets button').count(), fixture.seats.length);
    // Known fixtures isolate campaign progression from inference skill; real UI performs every trip/report.
    for (const visit of bestPlan(fixture).visits) {
      // Wait at home for the next observable window, then physically walk there.
      while ((await time(fixture.duration)) < visit.depart) await advance(100);
      await inspect(visit.id);
      while ((await time(fixture.duration)) < visit.report + 0.5) await advance(100);
      await tap('[data-action=report]');
    }
    // Two neglected requests are a survivable cost. Help has its own fresh-round test.
    assert.ok(await page.locator('#ending').isHidden());
    await advance((fixture.duration + 1 - await time(fixture.duration)) * 1000);
    await revealResult(page);
    assert.match(await page.locator('.ending-title').innerText(), /통과/);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('nyangijapgi.v2')));
    assert.equal(saved.history[0].stage, stage);
    assert.equal(saved.history[0].caught, fixture.rules.culprits);
    assert.equal(saved.history[0].duration, fixture.duration);
    assert.equal(saved.history[0].ruleset, 6);
    assert.equal(await page.locator('.stage-brief, .next-brief, #ending details:not(.retry-details)').count(), 0);
    assert.equal(saved.unlocked, Math.min(5, stage + 1));
    if (stage === 2) {
      await page.setViewportSize({ width: 320, height: 568 });
      await advance(500);
      await page.locator('[data-action=advance]').scrollIntoViewIfNeeded();
      const button = await page.locator('[data-action=advance]').boundingBox();
      assert.ok(button.y >= 0 && button.y + button.height <= 568);
      await page.screenshot({
        path: 'test-results/campaign-next-stage.png',
        animations: 'disabled',
        timeout: 30000,
      });
      await page.setViewportSize({ width: 390, height: 844 });
    }
    console.log('Stage ' + stage + ' victory, unlock and next-stage controls verified.');
    last = fixture;
  }
  assert.equal(await page.locator('[data-action=advance]').count(), 0);
  assert.match(await page.locator('.ending-title').innerText(), /모든 단계 통과/);
  await page.screenshot({
    path: 'test-results/campaign-complete.png',
    animations: 'disabled',
    timeout: 30000,
  });
  await page.reload();
  assert.equal(await page.locator('.stage-picker button:disabled').count(), 0);
  assert.ok(await page.locator('.campaign-clear').isVisible());
  await tap('[data-level="2"]');
  assert.match(await page.locator('#lobby .rules').innerText(), /60초/);
  await tap('[data-level="3"]');
  assert.match(await page.locator('#lobby .rules').innerText(), /45초/);
  await tap('[data-action=start]');
  await page.locator('#play:not([hidden])').waitFor();
  await page.locator('#seat-targets button').first().waitFor();
  await page.locator('#ending').waitFor({ state: 'hidden' });
  await advance(46000);
  assert.match(await page.locator('.ending-title').innerText(), /들키지 않았지/);
  assert.match(await page.locator('#ending [data-action=start]').innerText(), /3단계 다시 도전/);
  await tap('[data-action=start]');
  await page.locator('#ending').waitFor({ state: 'hidden' });
  await advance(200);
  assert.match(await page.locator('.round-status').innerText(), /3 \/ 5/);
  assert.equal(await page.locator('#blink, #caught, #tasks').count(), 0);
  // A browser with older progress can replay the tutorial even after spending all retries.
  const legacy = { version: 2, ruleset: 6, stage: 1, reason: 'win', seed: 42 };
  await page.evaluate(legacy => {
    localStorage.setItem('nyangijapgi.v2', JSON.stringify({ unlocked: 4, history: [legacy], muted: true }));
    localStorage.setItem('nyangijapgi.retries.v1', JSON.stringify({ day: '2026-11-18', remaining: 0 }));
  }, legacy);
  await page.reload();
  await tap('[data-level="1"]');
  await playTutorial();
  const replaySave = await page.evaluate(() => JSON.parse(localStorage.getItem('nyangijapgi.v2')));
  assert.equal(replaySave.unlocked, 4);
  assert.deepEqual(replaySave.history, [legacy]);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('nyangijapgi.retries.v1')).remaining), 0);
  await tap('[data-action=advance]');
  assert.match(await page.locator('#share-title').innerText(), /기회가 없어요/);
  await page.locator('[data-share=close]').tap();
  await page.clock.runFor(100);
  await page.locator('#result-dialog').waitFor();
  assert.deepEqual(errors, []);
  console.log('Completion persists; failed stages retry in place; no count spoilers or page errors.');
} finally {
  await browser.close();
}
