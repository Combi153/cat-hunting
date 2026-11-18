import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const origin = process.env.TEST_BASE_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await context.route(/google-analytics\.com|googletagmanager\.com/, route => route.abort());
  await page.route(/\/src\/session\.js(?:\?t=\d+)?$/, route => route.fulfill({ contentType: 'application/javascript',
    body: "export * from '/src/session.js?fixture'; import {Exam as Base} from '/src/session.js?fixture'; export class Exam extends Base {constructor(seed=42,stage=1){super(seed,stage);window.testExam=this}}" }));
  await page.route(/\/src\/analytics\.js(?:\?t=\d+)?$/, route => route.fulfill({ contentType: 'application/javascript',
    body: "export {createGameAnalytics} from '/src/analytics.js?fixture'; export function createAnalytics(){window.events=[];return (name,data)=>window.events.push({name,...data});}" }));
  await page.addInitScript(() => {
    if (!localStorage.getItem('nyangijapgi.v2')) localStorage.setItem('nyangijapgi.v2', JSON.stringify({ muted: true }));
    window.shareMode = 'success';
    window.shareCalls = 0;
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', { configurable: true, value: async () => {
      window.shareCalls++;
      if (window.shareMode === 'pending') return new Promise(resolve => { window.resolveShare = resolve; });
      if (window.shareMode !== 'success') throw new DOMException('Test', window.shareMode);
    } });
  });
  await page.clock.install({ time: new Date('2026-11-18T14:00:00Z') });
  await page.clock.pauseAt(new Date('2026-11-18T14:01:00Z'));
  await page.goto(origin);
  const tap = action => page.locator(`[data-action="${action}"]`).filter({ visible: true }).first().tap();
  const status = () => page.locator('.retry-status').filter({ visible: true });
  const balance = async n => assert.match(await status().innerText(), new RegExp(`재도전 ${n}회`));
  const raw = () => page.evaluate(() => localStorage.getItem('nyangijapgi.retries.v1'));
  const events = name => page.evaluate(name => window.events.filter(e => e.name === name), name);
  const start = async () => {
    await tap('start');
    await page.locator('#play:not([hidden])').waitFor();
    await page.locator('#ending').waitFor({ state: 'hidden' });
    await page.clock.runFor(100);
  };
  const finish = async reason => {
    if (reason !== 'missed') await page.evaluate(reason => {
      for (const seat of window.testExam.seats.filter(s => reason === 'win' ? s.guilty : !s.guilty).slice(0, reason === 'win' ? 12 : 3)) window.testExam.report(seat.id);
    }, reason);
    await page.clock.fastForward(46000);
    await page.locator('#ending:not([hidden])').waitFor();
  };
  await balance(3);
  await start();
  await finish('win');
  await balance(3);
  assert.equal(await page.locator('[data-action=advance]').isEnabled(), true);
  for (const [reason, remaining] of [['missed', 2], ['health', 1], ['missed', 0]]) {
    await start();
    await finish(reason);
    await balance(remaining);
  }
  assert.equal((await events('retry_exhausted')).length, 1);
  assert.equal(await page.locator('#ending [data-action=start]').isDisabled(), true);
  // A stale enabled control cannot bypass the start guard.
  await page.locator('#ending [data-action=start]').evaluate(el => { el.disabled = false; el.click(); });
  assert.equal(await page.locator('#ending [data-action=start]').isDisabled(), true);
  await tap('review');
  await page.clock.runFor(1000);
  await tap('review-next');
  await tap('review-close');
  await balance(0);
  for (const [width, height] of [[320,568], [568,320], [1167,813]]) {
    await page.setViewportSize({ width, height });
    await page.clock.runFor(200);
    for (const action of ['review', 'share', 'home']) {
      const button = page.locator(`#ending [data-action=${action}]`).first();
      await button.scrollIntoViewIfNeeded();
      const b = await button.boundingBox();
      assert.ok(b.height >= 44 && b.x >= 0 && b.y >= 0 && b.x + b.width <= width && b.y + b.height <= height);
    }
    await page.locator('#ending [data-action=share]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/retries-empty-${width}.png` });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await tap('home');
  await page.reload();
  await balance(0);
  assert.equal(await page.locator('#lobby [data-action=start]').isDisabled(), true);
  await page.evaluate(() => { window.shareMode = 'AbortError'; });
  await tap('share');
  await balance(0);
  assert.equal((await events('retry_reward')).length, 0);
  await page.evaluate(() => { window.shareMode = 'success'; });
  await tap('share');
  await balance(3);
  await tap('share');
  await balance(6);
  assert.equal((await events('retry_reward')).length, 2);
  assert.ok((await events('retry_reward')).every(e => !e.attempt_id && e.share_placement === 'lobby'));
  await page.reload();
  await balance(6);
  await start();
  await tap('pause');
  await tap('leave');
  await tap('home');
  await balance(6); // Explicit quit isn't a completed defeat.

  // Duplicate clicks reward a single in-flight handoff only once.
  await page.evaluate(() => { window.shareMode = 'pending'; });
  await tap('share');
  await tap('share');
  assert.equal(await page.evaluate(() => window.shareCalls), 1);
  await page.evaluate(() => window.resolveShare());
  await balance(9);
  // Leaving a result invalidates a late success, including its reward.
  await start();
  await finish('missed');
  await balance(8);
  await tap('share');
  const before = await raw();
  await tap('home');
  await page.evaluate(() => window.resolveShare());
  assert.equal(await raw(), before);
  await balance(8);

  // Real clipboard fallback grants +3 every time; denied copy grants nothing.
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
  await page.evaluate(() => Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }));
  await tap('share');
  await page.waitForFunction(() => document.querySelector('#share-toast').textContent.includes('3회 추가'));
  await balance(11);
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'https://cat-hunting.vercel.app/');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('Denied'); } } }));
  const copiedBalance = await raw();
  await tap('share');
  await page.locator('#share-dialog').waitFor();
  assert.equal(await raw(), copiedBalance);
  await page.locator('[data-share=close]').tap();
  await balance(11);

  // Visible lobby and result refresh at Korean midnight. No reload is needed.
  await page.clock.setSystemTime(new Date('2026-11-18T15:00:01Z'));
  await page.clock.runFor(1100);
  await balance(3);
  await start();
  await finish('missed');
  await balance(2);
  await page.clock.setSystemTime(new Date('2026-11-19T15:00:01Z'));
  await page.clock.runFor(1100);
  await balance(3);
  await start();
  // An exam crossing midnight charges its failure to the day it finishes.
  await page.clock.setSystemTime(new Date('2026-11-20T15:00:01Z'));
  await finish('health');
  await balance(2);
  const state = JSON.parse(await raw());
  assert.equal(state.day, '2026-11-21');
  await page.reload();
  await balance(2);
  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('nyangijapgi.v2')));
  assert.equal(progress.unlocked, 2);
  assert.equal(progress.history.length, 7);
  assert.deepEqual(errors, []);
  console.log('Retry flow passed: wins, 3 losses, review while blocked, reload, repeated rewards, cancel/denied/stale/duplicate sharing, clipboard, quit, Korean midnight and three layouts.');
} finally { await browser.close(); }
