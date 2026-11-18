import { revealResult } from './helpers/result-ui.js';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { Exam, TYPES } from '../src/session.js';

const origin = process.env.TEST_BASE_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
const propNames = { glasses: 'glasses', ear: 'ear', camera: 'camera', watch: 'watchAnswers', pen: 'penCamera', note: 'note' };
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route(/\/src\/session\.js(?:\?t=\d+)?$/, route => route.fulfill({
    contentType: 'application/javascript',
    body: "export * from '/src/session.js?fixture'; import {Exam as Base} from '/src/session.js?fixture'; export class Exam extends Base {constructor(seed=Number(new URLSearchParams(location.search).get('seed')),stage=1){super(seed,stage);window.testExam=this}}",
  }));
  await page.route(/\/src\/world\.js(?:\?t=\d+)?$/, route => route.fulfill({
    contentType: 'application/javascript',
    body: "export * from '/src/world.js?fixture'; import {Room as Base} from '/src/world.js?fixture'; export class Room extends Base {constructor(...args){super(...args);window.testRoom=this}}",
  }));
  await page.addInitScript(() => {
    localStorage.setItem('nyangijapgi.v2', JSON.stringify({ muted: true }));
    // Each asset fixture starts a new browser-day allowance; quota is tested separately.
    localStorage.removeItem('nyangijapgi.retries.v1');
  });
  await page.clock.install({ time: new Date('2026-11-18T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-11-18T00:01:00Z'));
  const tap = async action => { await revealResult(page); return page.locator(`[data-action=${action}]`).filter({ visible: true }).tap(); };
  const covered = new Set();
  for (let seed = 1; covered.size < Object.keys(TYPES).length; seed++) {
    const fixture = new Exam(seed);
    if (fixture.seats.filter(s => s.guilty).every(s => covered.has(s.kind))) continue;
    await page.goto(`${origin}/?seed=${seed}`);
    await tap('start');
    await page.locator('#play:not([hidden])').waitFor();
    await page.clock.runFor(100);
    // Timeout through the real game loop, then inspect the ended round.
    await page.clock.fastForward(46000);
    await revealResult(page);
    await page.locator('[data-action=review]').waitFor();
    const saved = await page.evaluate(() => localStorage.getItem('nyangijapgi.v2'));
    const frozen = await page.evaluate(() => JSON.stringify(window.testExam));
    await tap('review');
    for (let i = 0; i < fixture.rules.culprits; i++) {
      const seat = await page.evaluate(() => window.testExam.seat(window.testRoom.ending.id));
      assert.equal(seat.guilty, true);
      await page.clock.runFor(2000);
      const visual = await page.evaluate(prop => {
        const room = window.testRoom, model = room.students.get(room.ending.id);
        return { visible: model.visible, scale: model.scale.x, prop: model.userData.clay.props[prop].visible,
          others: [...room.students.values()].filter(s => s.visible).length };
      }, propNames[seat.kind]);
      assert.deepEqual(visual, { visible: true, scale: 1, prop: true, others: 1 });
      await page.screenshot({ path: `test-results/review-${seat.kind}.png` });
      covered.add(seat.kind);
      // The action returns to writing and repeats, using the same model/props.
      await page.clock.runFor(4000);
      assert.equal(await page.evaluate(prop => window.testRoom.students.get(window.testRoom.ending.id).userData.clay.props[prop].visible, propNames[seat.kind]), false);
      await page.clock.runFor(3000);
      assert.equal(await page.evaluate(prop => window.testRoom.students.get(window.testRoom.ending.id).userData.clay.props[prop].visible, propNames[seat.kind]), true);
      await tap('review-next');
    }
    assert.equal(await page.evaluate(() => JSON.stringify(window.testExam)), frozen);
    assert.equal(await page.evaluate(() => localStorage.getItem('nyangijapgi.v2')), saved);
    await tap('review-close');
    assert.equal(await page.evaluate(() => window.testRoom.ending.reviewIndex), undefined);
    await tap('review');
    for (const [width, height] of [[320,568], [390,844], [568,320], [844,390], [1167,813]]) {
      await page.setViewportSize({ width, height });
      await page.clock.runFor(400);
      const canvas = await page.locator('#room').boundingBox();
      const panel = await page.locator('#ending').boundingBox();
      assert.ok(canvas.height > 240 && canvas.width > 240);
      assert.ok(canvas.y + canvas.height <= panel.y + 1 || canvas.x + canvas.width <= panel.x + 1, 'review UI must not cover the action');
      for (const action of ['review-prev', 'review-next', 'review-close']) {
        const b = await page.locator(`[data-action=${action}]`).boundingBox();
        assert.ok(b.height >= 44 && b.x >= 0 && b.y >= 0 && b.x + b.width <= width && b.y + b.height <= height);
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: `test-results/review-${width}x${height}.png` });
    }
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.review-panel').count(), 0);
    await tap('start');
    await page.locator('#ending').waitFor({ state: 'hidden' });
    assert.equal(await page.locator('#play').evaluate(el => el.classList.contains('reviewing')), false);
    assert.equal(await page.evaluate(() => window.testRoom.ending), null);
    await page.setViewportSize({ width:390, height:844 });
  }
  // All culprits caught, then three false reports: health defeat has no missed
  // seats, but still offers every actual culprit without resurrecting gameplay.
  await page.goto(`${origin}/?seed=42`);
  await tap('start');
  await page.locator('#play:not([hidden])').waitFor();
  await page.clock.runFor(100);
  await page.evaluate(() => {
    for (const seat of window.testExam.seats.filter(s => s.guilty)) window.testExam.report(seat.id);
    for (const seat of window.testExam.seats.filter(s => !s.guilty).slice(0,3)) window.testExam.report(seat.id);
  });
  await page.clock.runFor(100);
  assert.match(await page.locator('.ending-title').innerText(), /감독 실패/);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await tap('review');
  await page.clock.runFor(2000);
  assert.equal(await page.evaluate(() => window.testExam.seat(window.testRoom.ending.id).caught), true);
  assert.doesNotMatch(await page.locator('.review-panel').innerText(), /놓친 학생|적발한 학생|반복해서/);
  const caught = await page.evaluate(() => {
    const room = window.testRoom;
    return { visible: room.students.get(room.ending.id).visible, elapsed: room.ending.elapsed, missed: room.ending.missed.length };
  });
  assert.equal(caught.visible, true);
  assert.equal(caught.missed, 0);
  assert.ok(caught.elapsed > 1);
  await tap('review-close');
  await page.clock.runFor(100);
  assert.equal(await page.evaluate(() => window.testRoom.proctor.visible), true);
  assert.deepEqual(errors, []);
  console.log('All six actions replay and reset; five layouts, frozen results, retries, health defeat with all culprits caught, and reduced-motion playback verified.');
} finally {
  await browser.close();
}
