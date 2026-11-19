import { revealResult } from './helpers/result-ui.js';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const origin = process.env.TEST_BASE_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route(/google-analytics\.com|googletagmanager\.com/, route => route.abort());
  await page.context().route('https://thinkplace.co.kr/**', route => route.fulfill({ body: 'Test destination' }));
  await page.route(/\/src\/analytics\.js(?:\?t=\d+)?$/, route => route.fulfill({
    contentType: 'application/javascript',
    body: "export {createGameAnalytics} from '/src/analytics.js?fixture'; export function createAnalytics(){window.events=[];return (name,data)=>window.events.push({name,...data});}",
  }));
  await page.route(/\/src\/session\.js(?:\?t=\d+)?$/, route => route.fulfill({
    contentType: 'application/javascript',
    body: "export * from '/src/session.js?fixture'; import {Exam as Base} from '/src/session.js?fixture'; export class Exam extends Base {constructor(seed=42,stage=1){super(seed,stage);window.testExam=this}}",
  }));
  await page.addInitScript(() => {
    localStorage.setItem('nyangijapgi.v2', JSON.stringify({ muted: true, unlocked: 5 }));
    window.shareMode = 'resolved';
    Object.defineProperty(navigator, 'share', { configurable: true, value: async () => {
      if (window.shareMode === 'pending') return new Promise(resolve => { window.resolveShare = resolve; });
      if (window.shareMode !== 'resolved') throw new DOMException('Test', window.shareMode);
    } });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => window.shareMode !== 'unsupported' });
    Object.defineProperty(navigator.clipboard, 'writeText', { configurable: true, value: async () => {
      if (window.copyFails) throw new Error('Test denied');
    } });
  });
  await page.clock.install({ time: new Date('2026-11-18T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-11-18T00:01:00Z'));
  await page.goto(origin);
  const tap = async action => {
    await revealResult(page);
    await page.locator(`[data-action="${action}"]`).filter({visible:true}).first().tap();
    if(action==='share'){
      await page.locator('[data-share=send]').tap();
      await page.clock.runFor(5100);
      if(await page.evaluate(()=>window.shareMode==='AbortError'))await page.locator('[data-share=close]').tap();
    }
  };
  const events = name => page.evaluate(name => window.events.filter(e => e.name === name), name);
  async function banner(placement) {
    const popup = page.waitForEvent('popup');
    await page.locator(`#${placement === 'lobby' ? 'lobby' : 'ending'} .sponsor-banner-link`).tap();
    await (await popup).close();
    await page.bringToFront();
  }
  await banner('lobby');
  await page.locator('[data-level="1"]').tap();
  await tap('start');
  await page.locator('#play:not([hidden])').waitFor();
  await page.clock.runFor(100);
  await page.clock.fastForward(61000);
  await revealResult(page);
  await page.locator('[data-action=review]').waitFor();
  assert.equal((await events('level_end')).length, 1);
  const props = await events('prop_result');
  assert.equal(props.reduce((n, e) => n + e.culprit_count, 0), 2);
  assert.equal(props.reduce((n, e) => n + e.missed_count, 0), 2);
  assert.equal(props.reduce((n, e) => n + e.normal_count, 0), 7);
  await tap('review');
  await page.clock.runFor(2000);
  await tap('review-next');
  await page.clock.runFor(1000);
  await tap('review-close');
  assert.equal((await events('review_open')).length, 1);
  assert.equal((await events('review_view')).length, 2);
  assert.equal((await events('review_view')).reduce((n, e) => n + e.review_seconds, 0), 3);
  for (const mode of ['resolved', 'AbortError', 'NotAllowedError', 'unsupported']) {
    await page.evaluate(mode => { window.shareMode = mode; }, mode);
    await tap('share');
  }
  let shares = await events('share_result');
  for (const status of ['resolved', 'cancelled', 'error', 'unsupported', 'copied']) assert(shares.some(e => e.interaction_status === status), status);
  await page.evaluate(() => { window.copyFails = true; });
  await tap('share');
  assert((await events('share_result')).some(e => e.interaction_status === 'manual_required'));
  await page.locator('[data-share=close]').tap();
  await banner('result');
  const clicks = await events('banner_click');
  assert.deepEqual(clicks.map(e => e.banner_placement), ['lobby', 'result']);
  assert.equal(clicks[0].attempt_id, undefined);
  assert.equal(clicks[1].attempt_id, props[0].attempt_id);
  await page.evaluate(() => { window.shareMode = 'pending'; });
  await tap('share');
  const before = (await events('share_result')).length;
  await page.locator('[data-share=close]').tap();
  await tap('start');
  await page.evaluate(() => window.resolveShare());
  await page.clock.runFor(100);
  assert.equal((await events('share_result')).length, before, 'old asynchronous share result ignored');
  const starts = await events('level_start');
  assert.equal(starts.at(-1).previous_review, 'yes');
  assert.notEqual(starts[0].attempt_id, starts.at(-1).attempt_id);
  assert((await events('result_action')).some(e => e.interaction_action === 'retry' && e.previous_review === 'yes'));
  await tap('pause');
  await tap('leave');
  await tap('home');
  assert.equal((await events('level_exit')).length, 1);
  assert.deepEqual(errors, []);
  console.log('Analytics UI flow passed: review, props, native/copy outcomes, stale callbacks, banners, retry and quit. All analytics and banner destinations intercepted.');
} finally { await browser.close(); }
