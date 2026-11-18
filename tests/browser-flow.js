import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { Exam } from '../src/session.js';

const origin = process.env.TEST_BASE_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
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
      body: "export * from '/src/session.js?fixture'; import {Exam as Base} from '/src/session.js?fixture'; export class Exam extends Base {constructor(seed=42){super(seed)}}",
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
    // Preserve a pre-upgrade browser's saved exam, but its score is not the new game's UI.
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
    await tap('#seat-targets [data-seat="' + id + '"]');
    for (let i = 0; i < 30 && !(await page.locator('[data-action=report], [data-action=serve]').count()); i++)
      await advance(250);
    await advance(700);
    assert.match(
      await page.locator('.inspection-heading h2').innerText(),
      new RegExp(String(id).padStart(2, '0')),
    );
  };
  const health = () => page.locator('#health [role=img]').getAttribute('aria-label');

  await start();
  assert.equal(await page.locator('#time').textContent(), '01:30');
  assert.equal(await page.locator('#seat-targets button').count(), 12);
  assert.equal(await page.locator('select, #stick, [data-action=journal]').count(), 0);
  assert.equal(await page.locator('#caught, #tasks').count(), 0);
  assert.equal(await page.locator('#seat-targets').innerText(), '');
  const fixture = new Exam(42);
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
  await tap('[data-action=report]');
  assert.equal(await health(), '생명 2개');
  assert.match(await page.locator('#notice').innerText(), /잘못 짚었어요/);
  assert.ok(await page.locator('[data-action=report]').isDisabled());
  for (const student of normal.slice(1, 3)) {
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
  assert.ok(
    await page.evaluate(() => JSON.parse(localStorage.getItem('nyangijapgi.v1')).history[0].score === 85),
  );
  console.log(
    'Touch-only inspection, direct reporting, pause, wrong-call health loss and instant defeat verified.',
  );

  await start();
  await advance(91000);
  await advance(1000);
  assert.match(await page.locator('.ending-title').innerText(), /들키지 않았지/);
  const missed = await page.evaluate(() => JSON.parse(localStorage.getItem('nyangijapgi.v2')).history[0]);
  assert.equal(missed.reason, 'missed');
  assert.equal(missed.health, 1);
  assert.equal(missed.complaints, 2);
  assert.notEqual(missed.seed, 42);
  await page.setViewportSize({ width: 320, height: 568 });
  await advance(1000);
  await page.screenshot({
    timeout: 30000,
    animations: 'disabled',
    path: 'test-results/mobile-missed-defeat.png',
  });

  await start();
  // New rounds start at the fixture seed; the production entry point excludes the last layout.
  let nextSeed = 42;
  const signature = (e) =>
    e.seats
      .filter((s) => s.guilty)
      .map((s) => s.id)
      .join(',');
  while (signature(new Exam(nextSeed)) === signature(new Exam(missed.seed))) nextSeed++;
  const success = new Exam(nextSeed);
  await tap('[data-action=pause]');
  await tap('#overlay [data-action=sound]');
  await tap('[data-action=resume]');
  for (const culprit of success.seats.filter((seat) => seat.guilty).sort((a, b) => a.first - b.first)) {
    await inspect(culprit.id);
    for (let i = 0; i < 60; i++) {
      if (
        (await page.locator('.clue').innerText()).includes('화면') ||
        (await page.locator('.clue').innerText()).includes('이어폰') ||
        (await page.locator('.clue').innerText()).includes('옮겼다')
      )
        break;
      await advance(500);
    }
    assert.match(await page.locator('.clue').innerText(), /화면|이어폰|옮겼다/);
    // The player can still report after the device has been put away.
    await advance(6500);
    await tap('[data-action=report]');
    assert.match(await page.locator('#notice').innerText(), /적발/);
  }
  // All culprits are caught, but the proctor must survive until the final bell.
  assert.ok(await page.locator('#ending').isHidden());
  for (const request of success.requests) {
    for (let i = 0; i < 180; i++) {
      const [minutes, seconds] = (await page.locator('#time').textContent()).split(':').map(Number);
      if (90 - minutes * 60 - seconds >= request.start + 1) break;
      assert.ok(await page.locator('#ending').isHidden(), 'Exam ended before the requested help');
      await advance(500);
    }
    await inspect(request.id);
    await tap('[data-action=serve]');
    for (let i = 0; i < 40 && !(await page.locator('#notice').innerText()).includes('고맙습니다'); i++)
      await advance(250);
    assert.match(await page.locator('#notice').innerText(), /고맙습니다/);
  }
  await advance(91000);
  await advance(1000);
  assert.match(await page.locator('.ending-title').innerText(), /감독 성공/);
  assert.equal(await page.locator('.confetti i').count(), 24);
  await page.screenshot({ timeout: 30000, animations: 'disabled', path: 'test-results/mobile-victory.png' });
  const win = await page.evaluate(() => JSON.parse(localStorage.getItem('nyangijapgi.v2')).history[0]);
  assert.equal(win.reason, 'win');
  assert.equal(win.caught, 3);
  assert.equal(win.served, 2);
  assert.ok(await page.evaluate(() => window.playedTones.includes(1047)));
  // The same one-tap restart is available after victory.
  console.log(
    'Timeout defeat, missed-cheater reveal, late help, survival victory and fresh culprit layout verified.',
  );

  await start();
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [568, 320],
    [844, 390],
    [1280, 800],
  ]) {
    await page.setViewportSize({ width, height });
    await advance(1000);
    await inspect(new Exam(42).seats.find((seat) => !seat.guilty).id);
    const bounds = await page.locator('[data-action=report]').boundingBox();
    assert.ok(
      bounds.x >= 0 &&
        bounds.y >= 0 &&
        bounds.x + bounds.width <= width &&
        bounds.y + bounds.height <= height,
    );
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await tap('[data-action=overview]');
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
  }
  assert.deepEqual(errors, []);
  console.log('Portrait, short landscape and desktop controls stay on screen; no page errors.');
} finally {
  await browser.close();
}
