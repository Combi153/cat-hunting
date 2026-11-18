import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { Exam } from '../src/session.js';

const origin = process.env.TEST_BASE_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
});
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route(/\/src\/session\.js(?:\?t=\d+)?$/, (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: "export * from '/src/session.js?fixture'; import {Exam as Base} from '/src/session.js?fixture'; export class Exam extends Base {constructor(seed=42,stage=1){super(seed,stage);window.testExam=this}}",
    }),
  );
  await page.route(/\/src\/world\.js(?:\?t=\d+)?$/, (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: "export * from '/src/world.js?fixture'; import {Room as Base} from '/src/world.js?fixture'; export class Room extends Base {constructor(...args){super(...args);window.testRoom=this}}",
    }),
  );
  await page.addInitScript(() => {
    window.playedTones = [];
    const NativeAudioContext = window.AudioContext;
    window.AudioContext = class extends NativeAudioContext {
      createOscillator() {
        const oscillator = super.createOscillator();
        const start = oscillator.start.bind(oscillator);
        oscillator.start = (at) => {
          window.playedTones.push(oscillator.frequency.value);
          return start(at);
        };
        return oscillator;
      }
    };
    // Stage 3 is the first with both help types. Preserve pre-upgrade saves, too.
    localStorage.setItem('nyangijapgi.v2', JSON.stringify({ unlocked: 3 }));
    localStorage.setItem('nyangijapgi.v1', JSON.stringify({ history: [{ score: 85 }], muted: true }));
  });
  await page.clock.install({ time: new Date('2026-11-18T00:00:00Z') });
  await page.goto(origin);
  await page.clock.pauseAt(new Date('2026-11-18T00:01:00Z'));
  const tap = (selector) => page.locator(selector).filter({ visible: true }).tap();
  const advance = async (ms) => {
    while (ms > 0) {
      await page.clock.fastForward(Math.min(ms, 500));
      ms -= 500;
    }
  };
  const start = async () => {
    await tap('[data-action=start]');
    await page.locator('#play:not([hidden])').waitFor();
    await page.locator('#ending').waitFor({ state: 'hidden' });
    await advance(150);
  };
  const inspect = async (id) => {
    if (await page.locator('[data-action=overview]').count()) await tap('[data-action=overview]');
    await advance(1100);
    for (let i = 0; i < 40 && (await page.locator('#seat-targets').evaluate((el) => el.inert)); i++)
      await advance(250);
    await tap('#seat-targets [data-seat="' + id + '"]');
    for (let i = 0; i < 30 && !(await page.locator('[data-action=report], [data-action=serve]').count()); i++)
      await advance(250);
    await advance(700);
    assert.match(
      await page.locator('.inspection-heading h2').innerText(),
      new RegExp(String(id).padStart(2, '0')),
    );
  };
  const fresh = async () => {
    if (await page.locator('#ending').isVisible()) await tap('#ending [data-action=home]');
    else if (await page.locator('#play').isVisible()) {
      await tap('[data-action=pause]');
      await tap('[data-action=leave]');
      await tap('#overlay [data-action=home]');
    }
    await start();
    return new Exam(await page.evaluate(() => window.testExam.seed), 3);
  };
  const health = () => page.locator('#health [role=img]').getAttribute('aria-label');

  await start();
  assert.equal(await page.locator('#time').textContent(), '00:45');
  assert.equal(await page.locator('#seat-targets button').count(), 12);
  assert.equal(await page.locator('select, #stick, [data-action=journal]').count(), 0);
  assert.equal(await page.locator('#caught, #tasks, .stage-brief, .next-brief').count(), 0);
  assert.equal(await page.locator('#seat-targets').innerText(), '');
  const fixture = new Exam(42, 3);
  const normal = fixture.seats.filter((seat) => !seat.guilty);
  await inspect(normal[0].id);
  const selectedBeforeSwipe = await page.locator('.inspection-heading h2').innerText();
  const canvas = await page.locator('#room').boundingBox();
  const touch = await page.context().newCDPSession(page);
  const y = canvas.y + canvas.height * 0.6;
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: canvas.x + canvas.width * 0.7, y }],
  });
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: canvas.x + canvas.width * 0.25, y }],
  });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForFunction(
    (previous) => document.querySelector('.inspection-heading h2').textContent !== previous,
    selectedBeforeSwipe,
  );
  await inspect(normal[0].id);
  await page.locator('#room').tap({ position: { x: 100, y: 100 } });
  assert.equal(await page.locator('[data-action=report]').count(), 0);
  await inspect(normal[0].id);
  const before = await page.locator('#time').textContent();
  await tap('[data-action=pause]');
  await advance(12000);
  assert.equal(await page.locator('#time').textContent(), before);
  await tap('[data-action=resume]');
  await fresh();
  await inspect(10);
  await tap('[data-action=overview]');
  await advance(200);
  assert.equal(await page.evaluate(() => window.testRoom.returning), true);
  assert.equal(await page.locator('#seat-targets').evaluate((el) => el.inert), false);
  const redirectPosition = await page.evaluate(() => window.testRoom.proctor.position.toArray());
  await tap('[data-seat="11"]');
  assert.deepEqual(await page.evaluate(() => ({
    returning: window.testRoom.returning,
    focus: window.testRoom.focus,
    position: window.testRoom.proctor.position.toArray(),
  })), { returning: false, focus: 11, position: redirectPosition });
  // A second choice while already walking replaces the route again.
  await tap('[data-seat="12"]');
  assert.equal(await page.evaluate(() => window.testRoom.focus), 12);
  assert.equal(await page.locator('[data-action=report]').count(), 0);
  await advance(200);
  await page.screenshot({ path: 'test-results/redirect-in-motion.png', animations: 'disabled' });
  for (let i = 0; i < 30 && !(await page.locator('[data-action=report]').count()); i++)
    await advance(200);
  assert.match(await page.locator('.inspection-heading h2').innerText(), /12번/);
  console.log('Returning and walking can both be redirected by touch without teleporting or visiting home.');
  await fresh();
  const wrongRound = new Exam(await page.evaluate(() => window.testExam.seed), 3);
  const innocents = wrongRound.seats.filter(s => !s.guilty);
  await inspect(innocents[0].id);
  await tap('[data-action=report]');
  assert.equal(await health(), '생명 2개');
  assert.match(await page.locator('#notice').innerText(), /잘못 짚었어요/);
  assert.match(await page.locator('#controls').innerText(), /교탁으로 돌아가고/);
  assert.equal(await page.locator('#blink').count(), 0);
  for (const student of innocents.slice(1, 3)) {
    await inspect(student.id);
    await tap('[data-action=report]');
  }
  await advance(1000);
  assert.match(await page.locator('.ending-title').innerText(), /감독 실패/);
  assert.match(await page.locator('.ending-line').innerText(), /히히/);
  assert.equal(await page.locator('.score').count(), 0);
  await page.screenshot({
    timeout: 30000,
    animations: 'disabled',
    path: 'test-results/mobile-health-defeat.png',
  });
  assert.deepEqual(await page.evaluate(() => window.playedTones), []);
  const history = await page.evaluate(() => JSON.parse(localStorage.getItem('nyangijapgi.v2')).history);
  assert.equal(history[0].health, 0);
  assert.equal(history[0].reason, 'health');
  await tap('[data-action=review]');
  await advance(1000);
  assert.doesNotMatch(await page.locator('.review-panel').innerText(), /놓친 학생|적발한 학생|반복해서/);
  assert.equal(await page.evaluate(() => window.testRoom.ending.id), history[0].missed[0].id);
  await tap('[data-action=review-next]');
  assert.equal(await page.evaluate(() => window.testRoom.ending.id), history[0].missed[1].id);
  await tap('[data-action=review-prev]');
  await tap('[data-action=review-close]');
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('nyangijapgi.v2')).history), history);
  assert.ok(
    await page.evaluate(() => JSON.parse(localStorage.getItem('nyangijapgi.v1')).history[0].score === 85),
  );
  console.log(
    'Touch-only inspection, direct reporting, pause, wrong-call health loss and instant defeat verified.',
  );

  await start();
  await advance(46000);
  await advance(1000);
  assert.match(await page.locator('.ending-title').innerText(), /들키지 않았지/);
  const missed = await page.evaluate(() => JSON.parse(localStorage.getItem('nyangijapgi.v2')).history[0]);
  assert.equal(missed.reason, 'missed');
  assert.equal(missed.health, 1);
  assert.equal(missed.complaints, 2);
  assert.notEqual(missed.seed, wrongRound.seed);
  await page.setViewportSize({ width: 320, height: 568 });
  await advance(1000);
  await page.screenshot({
    timeout: 30000,
    animations: 'disabled',
    path: 'test-results/mobile-missed-defeat.png',
  });

  await start();
  const success = new Exam(await page.evaluate(() => window.testExam.seed), 3);
  await tap('[data-action=pause]');
  await tap('#overlay [data-action=sound]');
  await tap('[data-action=resume]');
  for (const culprit of success.seats.filter((seat) => seat.guilty).sort((a, b) => a.first - b.first)) {
    await inspect(culprit.id);
    // Known fixture checks report/return; visual judgments are reviewed separately.
    await tap('[data-action=report]');
    assert.match(await page.locator('#notice').innerText(), /적발/);
  }
  // All culprits are caught, but the proctor must survive until the final bell.
  assert.ok(await page.locator('#ending').isHidden());
  await advance(46000);
  await advance(1000);
  assert.match(await page.locator('.ending-title').innerText(), /통과/);
  assert.equal(await page.locator('.confetti i').count(), 24);
  await page.screenshot({ timeout: 30000, animations: 'disabled', path: 'test-results/mobile-victory.png' });
  const win = await page.evaluate(() => JSON.parse(localStorage.getItem('nyangijapgi.v2')).history[0]);
  assert.equal(win.reason, 'win');
  assert.equal(win.caught, 3);
  assert.equal(win.duration, 45);
  assert.equal(await page.locator('[data-action=review]').count(), 0);
  assert.ok(await page.evaluate(() => window.playedTones.includes(1047)));
  // The same one-tap restart is available after victory.
  console.log(
    'Timeout defeat, missed-cheater reveal, survival victory and fresh culprit layout verified.',
  );

  // A separate round keeps help/curtain coverage within the new 45-second budget.
  const helpRound = await fresh();
  for (const request of helpRound.requests) {
    while ((await page.evaluate(() => window.testExam.time)) < request.start) await advance(250);
    await inspect(request.id);
    await tap('[data-action=serve]');
    for (let i = 0; i < 60 && !(await page.locator('#notice').innerText()).includes('고맙습니다'); i++)
      await advance(200);
    assert.match(await page.locator('#notice').innerText(), /고맙습니다/);
  }
  assert.equal(await page.evaluate(() => window.testExam.requests.filter(r => r.done).length), 2);
  assert.equal(await page.evaluate(() => window.testExam.curtain), true);

  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [568, 320],
    [844, 390],
    [1280, 800],
    [1167, 813],
    [1366, 768],
    [1440, 900],
  ]) {
    const layout = await fresh();
    await page.setViewportSize({ width, height });
    await advance(1000);
    await inspect(layout.seats.find((seat) => !seat.guilty).id);
    const bounds = await page.locator('[data-action=report]').boundingBox();
    assert.ok(
      bounds.x >= 0 &&
        bounds.y >= 0 &&
        bounds.x + bounds.width <= width &&
        bounds.y + bounds.height <= height,
    );
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await tap('[data-action=overview]');
    for (let i = 0; i < 40 && (await page.locator('#seat-targets').evaluate((el) => el.inert)); i++)
      await advance(250);
    for (let i = 0; i < 16; i++) await page.clock.fastForward(70);
    const buttons = await page.locator('#seat-targets button').evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      }),
    );
    for (const button of buttons) {
      assert.ok(button.width >= 43.99 && button.height >= 43.99, JSON.stringify({ width, height, button }));
      assert.ok(
        button.x >= 0 &&
          button.y >= 0 &&
          button.x + button.width <= width &&
          button.y + button.height <= height,
      );
    }
    for (let a = 0; a < buttons.length; a++)
      for (let b = a + 1; b < buttons.length; b++) {
        const first = buttons[a],
          second = buttons[b];
        const overlapX =
          Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x);
        const overlapY =
          Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y);
        assert.ok(overlapX <= 0 || overlapY <= 0, 'Seat touch targets overlap at ' + width + '×' + height);
      }
    if (width === 1167 || width === 1366 || width === 1440 || width === 568)
      await page.screenshot({ path: `test-results/overview-${width}x${height}.png`, animations: 'disabled' });
  }
  assert.deepEqual(errors, []);
  console.log('Portrait, short landscape and desktop controls stay on screen; no page errors.');
} finally {
  await browser.close();
}
