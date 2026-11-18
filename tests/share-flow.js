import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const origin = process.env.TEST_BASE_URL || 'http://127.0.0.1:5173';
const publicUrl = 'https://cat-hunting.vercel.app/';
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route(/\/src\/session\.js(?:\?t=\d+)?$/, route => route.fulfill({
    contentType: 'application/javascript',
    body: "export * from '/src/session.js?fixture'; import {Exam as Base} from '/src/session.js?fixture'; export class Exam extends Base {constructor(seed=42,stage=1){super(seed,stage);window.testExam=this}}",
  }));
  await page.addInitScript(() => {
    localStorage.setItem('nyangijapgi.v2', JSON.stringify({ muted: true, unlocked: 5 }));
    window.shared = [];
    window.shareMode = 'success';
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', { configurable: true, value: async data => {
      window.shared.push({ data, activated: navigator.userActivation.isActive, dialogOpen: document.querySelector('#share-dialog').open });
      if (window.shareMode === 'pending') return new Promise((resolve, reject) => { window.finishShare = resolve; window.failShare = reject; });
      if (window.shareMode !== 'success') throw new DOMException('Test outcome', window.shareMode);
    } });
    window.nativeShare = navigator.share;
  });
  await page.clock.install({ time: new Date('2026-11-18T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-11-18T00:01:00Z'));
  await page.goto(`${origin}/?preview=private#debug`);
  const tap = action => page.locator(`[data-action="${action}"]`).filter({ visible: true }).first().tap();
  // Exercise the same result button with native sharing unavailable.
  const copyTap = async () => {
    await page.evaluate(() => {
      window.beforeCopyShare = navigator.share;
      Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    });
    await tap('share');
    await page.evaluate(() => Object.defineProperty(navigator, 'share', { configurable: true, value: window.beforeCopyShare }));
  };
  const shareTap = async action => {
    await page.locator(`[data-share="${action}"]`).tap();
    if (action === 'copy') await page.waitForFunction(() => !document.querySelector('[data-share="copy"]').disabled);
  };
  const dialog = page.locator('#share-dialog');
  const status = page.locator('#share-status');
  const toast = page.locator('#share-toast');
  const copied = () => page.waitForFunction(() => document.querySelector('#share-toast').textContent === '링크를 복사했어요');
  async function finish(stage, reason) {
    if (await page.locator('#lobby').isHidden()) await tap('home');
    await page.locator(`[data-level="${stage}"]`).tap();
    await tap('start');
    await page.locator('#play:not([hidden])').waitFor();
    await page.clock.runFor(100);
    // Rule API prepares outcomes; the real loop renders/saves the result.
    if (reason !== 'missed') await page.evaluate(reason => {
      const exam = window.testExam;
      const seats = exam.seats.filter(s => reason === 'win' ? s.guilty : !s.guilty).slice(0, reason === 'win' ? 12 : 3);
      for (const seat of seats) exam.report(seat.id);
    }, reason);
    await page.clock.fastForward(46000);
    await page.locator('#ending:not([hidden])').waitFor();
  }

  for (const [stage, reason, expected] of [[1, 'missed', /1단계 감독 실패/], [2, 'health', /2단계 감독 실패/], [3, 'win', /3단계 통과/], [5, 'win', /다섯 시험 모두 통과/]]) {
    await finish(stage, reason);
    assert.equal(await page.locator('[data-action="share-copy"]').count(), 0);
    const saved = await page.evaluate(() => localStorage.getItem('nyangijapgi.v2'));
    await tap('share');
    await dialog.waitFor({ state: 'hidden' });
    const last = await page.evaluate(() => window.shared.at(-1));
    assert.equal(last.activated, true);
    assert.equal(last.dialogOpen, false, 'the result button must open the native share sheet without a web dialog');
    assert.equal(last.data.url, publicUrl);
    assert.match(last.data.text, expected);
    assert.deepEqual(Object.keys(last.data).sort(), ['text', 'title', 'url']);
    assert.equal(await page.evaluate(() => localStorage.getItem('nyangijapgi.v2')), saved);
    assert.equal(await page.evaluate(() => document.activeElement.dataset.action), 'share');
  }

  // Cancellation does nothing; unsupported/failed sharing copies without a modal.
  await page.evaluate(() => {
    window.copyCalls = [];
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.copyCalls.push(text); } } });
  });
  await page.evaluate(() => { window.shareMode = 'AbortError'; });
  await tap('share');
  assert.equal(await dialog.isVisible(), false);
  assert.deepEqual(await page.evaluate(() => window.copyCalls), []);
  await page.evaluate(() => { window.shareMode = 'NotAllowedError'; });
  await tap('share');
  await copied();
  assert.equal(await dialog.isVisible(), false);
  assert.deepEqual(await page.evaluate(() => window.copyCalls), [publicUrl]);
  assert.equal(await page.evaluate(() => document.activeElement.dataset.action), 'share');

  // A second press cannot launch another native request. Leaving the result
  // prevents a late rejection from opening a copy panel over a new screen.
  await page.evaluate(() => { window.shareMode = 'pending'; });
  await tap('share');
  const calls = await page.evaluate(() => window.shared.length);
  await tap('share');
  assert.equal(await page.evaluate(() => window.shared.length), calls);
  assert.equal(await dialog.isVisible(), false);
  await tap('home');
  await page.evaluate(() => window.failShare(new DOMException('Late failure', 'NotAllowedError')));
  assert.equal(await dialog.isVisible(), false);
  await finish(1, 'missed');

  // Capability detection includes canShare throwing in restrictive WebViews.
  for (const unsupported of ['canShare', 'throw', 'share']) {
    const before = await page.evaluate(() => window.copyCalls.length);
    await page.evaluate(mode => {
      Object.defineProperty(navigator, 'share', { configurable: true, value: mode === 'share' ? undefined : window.nativeShare });
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => {
        if (mode === 'throw') throw new Error('Unavailable');
        return mode === 'share';
      } });
    }, unsupported);
    await tap('share');
    await copied();
    assert.equal(await dialog.isVisible(), false);
    assert.equal(await page.evaluate(() => window.copyCalls.length), before + 1);
    assert.equal(await page.evaluate(() => document.activeElement.dataset.action), 'share');
    await page.clock.runFor(3100);
    assert.equal(await toast.innerText(), '');
  }

  // Duplicate requests and stale clipboard responses must not affect a new screen.
  for (const outcome of ['resolve', 'reject']) {
    await page.evaluate(() => {
      window.pendingCopies = 0;
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => {
        window.pendingCopies++;
        return new Promise((resolve, reject) => { window.resolveCopy = resolve; window.rejectCopy = reject; });
      } } });
    });
    await tap('share');
    await copyTap();
    assert.equal(await page.evaluate(() => window.pendingCopies), 1);
    await tap('home');
    await page.evaluate(outcome => outcome === 'resolve' ? window.resolveCopy() : window.rejectCopy(new Error('Late failure')), outcome);
    assert.equal(await dialog.isVisible(), false);
    assert.equal(await toast.innerText(), '');
    await finish(1, 'missed');
  }

  // Real browser clipboard, then denied/unavailable fallbacks with selectable URL.
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
  await page.evaluate(() => { delete navigator.clipboard; });
  await copyTap();
  await copied();
  assert.equal(await dialog.isVisible(), false);
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), publicUrl);
  await tap('home');
  assert.equal(await toast.innerText(), '');
  await finish(1, 'missed');
  for (const mode of ['denied', 'missing']) {
    await page.evaluate(mode => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: mode === 'missing' ? undefined : { writeText: async () => { throw new DOMException('Denied', 'NotAllowedError'); } } });
    }, mode);
    await copyTap();
    await page.waitForFunction(() => !document.querySelector('[data-share="copy"]').disabled);
    assert.match(await status.innerText(), /자동으로 복사할 수 없어요/);
    assert.equal(await page.locator('#share-url').inputValue(), publicUrl);
    assert.deepEqual(await page.locator('#share-url').evaluate(el => [document.activeElement === el, el.selectionStart, el.selectionEnd]), [true, 0, publicUrl.length]);
    await page.evaluate(() => { delete navigator.clipboard; });
    await shareTap('copy');
    await copied();
    assert.equal(await dialog.isVisible(), false);
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), publicUrl);
  }

  // Real result panels, touch target sizing, modal bounds and keyboard focus.
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: window.nativeShare });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    window.shareMode = 'success';
  });
  for (const reason of ['missed', 'win']) {
    await finish(1, reason);
    for (const [width, height] of [[320,568], [390,844], [568,320], [1167,813]]) {
      await page.setViewportSize({ width, height });
      await page.clock.runFor(200);
      await page.locator('[data-action="share"]').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `test-results/share-${reason}-${width}.png` });
      await tap('share');
      assert.equal(await dialog.isVisible(), false);
      await page.evaluate(() => { delete navigator.clipboard; });
      await copyTap();
      await copied();
      assert.equal(await dialog.isVisible(), false);
      await page.screenshot({ path: `test-results/share-copied-${reason}-${width}.png` });
      const toastBox = await toast.boundingBox();
      assert.ok(toastBox.x >= 0 && toastBox.y >= 0 && toastBox.x + toastBox.width <= width && toastBox.y + toastBox.height <= height);
      await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined }); });
      await copyTap();
      await page.waitForFunction(() => !document.querySelector('[data-share="copy"]').disabled);
      await page.screenshot({ path: `test-results/share-options-${width}.png` });
      const box = await dialog.boundingBox();
      assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= width && box.y + box.height <= height);
      for (const action of ['copy', 'close']) {
        await page.locator(`[data-share="${action}"]`).scrollIntoViewIfNeeded();
        const b = await page.locator(`[data-share="${action}"]`).boundingBox();
        assert.ok(b.height >= 44 && b.width >= 44 && b.y >= 0 && b.y + b.height <= height);
      }
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press('Tab');
        assert.ok(await dialog.evaluate(el => el.contains(document.activeElement) || document.activeElement === document.body));
      }
      await shareTap('copy');
      await page.screenshot({ path: `test-results/share-fallback-${width}.png` });
      await shareTap('close');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
  }
  await tap('start');
  await page.locator('#ending').waitFor({ state: 'hidden' });
  assert.equal(await dialog.isVisible(), false);
  assert.deepEqual(errors, []);
  console.log('Sharing: one-tap native handoff without intermediate UI for four outcomes, cancel, automatic copy without a modal, real clipboard, manual fallback, stale requests, toast timeout, focus and four layouts passed.');
} finally {
  await browser.close();
}
