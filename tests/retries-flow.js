import { revealResult } from './helpers/result-ui.js';
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
    if (!localStorage.getItem('nyangijapgi.v2')) localStorage.setItem('nyangijapgi.v2', JSON.stringify({ muted: true, unlocked: 2 }));
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
  const tap = async action => { await revealResult(page); return page.locator(`[data-action="${action}"]`).filter({ visible: true }).first().tap(); };
  const balance = async n => {
    if (await page.locator('#share-dialog').evaluate(el => el.open)) {
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('nyangijapgi.retries.v1')).remaining), n);
      return;
    }
    await revealResult(page); assert.match(await page.locator('.retry-status').filter({visible:true}).innerText(),new RegExp(`재도전 ${n}회`)); };
  const raw = () => page.evaluate(()=>localStorage.getItem('nyangijapgi.retries.v1'));
  const events = name => page.evaluate(name=>window.events.filter(e=>e.name===name),name);
  const start = async()=>{
    await revealResult(page);
    if (await page.locator('#result-dialog[open] .review-open .retry-status').count()) await tap('review');
    await tap('start');await page.locator('#play:not([hidden])').waitFor();await page.locator('#ending').waitFor({state:'hidden'});await page.clock.runFor(100);
  };
  const finish = async reason=>{
    if(reason!=='missed')await page.evaluate(reason=>{for(const seat of window.testExam.seats.filter(s=>reason==='win'?s.guilty:!s.guilty).slice(0,reason==='win'?12:3))window.testExam.report(seat.id)},reason);
    await page.clock.fastForward((await page.evaluate(() => window.testExam.duration) + 1) * 1000);await revealResult(page);
  };
  await balance(3);await start();await finish('win');await balance(3);
  for(const [reason,n]of [['missed',2],['health',1],['missed',0]]){await start();await finish(reason);await balance(n)}
  assert.equal((await events('retry_exhausted')).length,1);
  const attempt=await page.evaluate(()=>window.testExam.seed);
  await tap('review');await balance(0);
  assert.equal(await page.locator('.review-panel [data-action=start]').isEnabled(),true);
  await tap('start');assert.match(await page.locator('#share-title').innerText(),/기회가 없어요/);
  assert.equal(await page.evaluate(()=>window.testExam.seed),attempt);assert.equal(await page.evaluate(()=>window.shareCalls),0);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#share-dialog').evaluate(el => el.open),false);
  assert.equal(await page.locator('.review-panel').isVisible(), true);
  await page.clock.runFor(1000);await tap('review-next');await balance(0);
  for(const [width,height]of [[320,568],[568,320],[1167,813]]){
    await page.setViewportSize({width,height});await tap('start');await page.screenshot({path:`test-results/retry-gate-${width}.png`});
    await page.locator('[data-share=close]').tap();
  }
  await tap('start');await page.locator('[data-share=send]').tap();await page.clock.runFor(4900);await balance(0);
  await page.clock.runFor(200);await balance(3);
  await start();await tap('pause');await tap('leave');await tap('home');await balance(3);
  await page.reload();await balance(3);
  // Repeatable rewards remain possible; the first click is just an invitation.
  await tap('share');const before=await raw();await page.clock.runFor(6000);assert.equal(await raw(),before);
  await page.locator('[data-share=send]').tap();await page.clock.runFor(5100);await balance(6);
  assert.equal((await events('retry_reward')).length,1); // analytics collector resets on reload
  await page.clock.setSystemTime(new Date('2026-11-18T15:00:01Z'));await page.clock.runFor(1100);await balance(3);
  await start();await finish('missed');await balance(2);
  await page.clock.setSystemTime(new Date('2026-11-19T15:00:01Z'));await page.clock.runFor(1100);await balance(3);
  await start();await page.clock.setSystemTime(new Date('2026-11-20T15:00:01Z'));await finish('health');await balance(2);
  assert.equal(JSON.parse(await raw()).day,'2026-11-21');await page.reload();await balance(2);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('nyangijapgi.v2')).unlocked),3);
  assert.deepEqual(errors,[]);
  console.log('Retries passed: win preserved, three failures, zero-chance invitation, review without quota, delayed reward then retry, reload, repeated reward, quit and Korean midnight.');
}finally{await browser.close();}
