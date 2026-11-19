import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { shareContent } from '../src/share-content.js';
import { revealResult } from './helpers/result-ui.js';
const origin=process.env.TEST_BASE_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||undefined});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const page=await context.newPage();page.setDefaultTimeout(10000);const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route(/\/src\/session\.js(?:\?t=\d+)?$/,r=>r.fulfill({contentType:'application/javascript',body:"export * from '/src/session.js?fixture'; import {Exam as Base} from '/src/session.js?fixture'; export class Exam extends Base {constructor(seed=42,stage=1){super(seed,stage);window.testExam=this}}"}));
 await page.addInitScript(()=>{
  localStorage.setItem('nyangijapgi.v2',JSON.stringify({muted:true,unlocked:5}));
  window.shared=[];window.shareMode='success';window.realClipboard=navigator.clipboard;
  Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});
  Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{
   window.shared.push({data,activated:navigator.userActivation.isActive});
   if(window.shareMode==='pending')return new Promise(resolve=>window.resolveShare=resolve);
   if(window.shareMode!=='success')throw new DOMException('Test',window.shareMode);
  }});window.nativeShare=navigator.share;
 });
 await context.grantPermissions(['clipboard-read','clipboard-write'],{origin});
 await page.clock.install({time:new Date('2026-11-18T10:00:00Z')});await page.clock.pauseAt(new Date('2026-11-18T10:01:00Z'));
 await page.goto(origin+'/?private=yes#debug');
 const tap=async action=>{await revealResult(page);await page.locator(`[data-action=${action}]`).filter({visible:true}).first().tap()};
 const balance=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('nyangijapgi.retries.v1'))?.remaining??3);
 const offer=()=>tap('share');
 const send=()=>page.locator('[data-share=send]').tap();
 const close=()=>page.locator('[data-share=close]').tap();
 const waitReward=async before=>{
  assert.doesNotMatch(await page.locator('#share-dialog').innerText(),/\d+\s*초|카운트다운/);
  await page.clock.runFor(4900);assert.equal(await balance(),before,'no early reward');
  await page.clock.runFor(200);assert.equal(await balance(),before+3);
  assert.equal(await page.locator('#share-dialog').evaluate(el=>el.open),false);
 };
 for(const result of [{stage:1,reason:'missed'},{stage:2,reason:'health'},{stage:3,reason:'missed'},{stage:3,reason:'win'},{stage:5,reason:'win'}]){
  if(await page.locator('#lobby').isHidden())await tap('home');
  await page.locator(`[data-level="${result.stage}"]`).tap();await tap('start');await page.locator('#play:not([hidden])').waitFor();await page.clock.runFor(100);
  if(result.reason!=='missed')await page.evaluate(reason=>{for(const s of window.testExam.seats.filter(s=>reason==='win'?s.guilty:!s.guilty).slice(0,reason==='win'?12:3))window.testExam.report(s.id)},result.reason);
  await page.clock.fastForward((await page.evaluate(() => window.testExam.duration) + 1) * 1000);await revealResult(page);
  const before=await balance(), calls=await page.evaluate(()=>window.shared.length);
  await offer();assert.doesNotMatch(await page.locator('#share-dialog').innerText(),/5\s*초|카운트다운/);assert.equal(await balance(),before);assert.equal(await page.evaluate(()=>window.shared.length),calls,'offer does not invoke OS sharing');
  await send();assert.equal(await balance(),before,'native response does not grant immediately');
  const last=await page.evaluate(()=>window.shared.at(-1));const {url}=shareContent(result);
  assert.deepEqual(last.data,{url},'one URL prevents share targets concatenating prose into the address');assert.equal(last.activated,true);
  assert.ok(!last.data.url.includes('private'));
  assert.equal(await page.locator('dialog[open]').count(),1,'only one modal is open');
  assert.doesNotMatch(await page.locator('#share-dialog').innerText(),/\d+\s*초|카운트다운/);
  await waitReward(before);
 }
 const completeUrl=shareContent({stage:5,reason:'win'}).url;
 const before=await balance();
 await page.evaluate(()=>window.shareMode='AbortError');await offer();await send();await page.clock.runFor(6000);
 assert.equal(await balance(),before);assert.match(await page.locator('#share-status').textContent(),/취소/);await close();
 // Error and unsupported API both copy the result-specific URL, then wait.
 for(const mode of ['NotAllowedError','unsupported']){
  await page.evaluate(mode=>{window.shareMode=mode;Object.defineProperty(navigator,'share',{configurable:true,value:mode==='unsupported'?undefined:window.nativeShare})},mode);
  const n=await balance();await offer();await send();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),completeUrl);await waitReward(n);
 }
 // Manual selection isn't a reward; a successful copy retry starts the delay.
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('Denied')}}}));
 let n=await balance();await offer();await send();assert.equal(await page.locator('#share-url').inputValue(),completeUrl);
 await page.clock.runFor(6000);assert.equal(await balance(),n);
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:window.realClipboard}));
 await page.locator('[data-share=copy]').tap();await waitReward(n);
 // Closing either a pending handoff or the countdown invalidates the reward.
 await page.evaluate(()=>{window.shareMode='pending';Object.defineProperty(navigator,'share',{configurable:true,value:window.nativeShare})});
 n=await balance();await offer();const calls=await page.evaluate(()=>window.shared.length);await send();
 await page.locator('[data-share=send]').evaluate(el=>el.click());assert.equal(await page.evaluate(()=>window.shared.length),calls+1);
 await close();await page.evaluate(()=>window.resolveShare());await page.clock.runFor(6000);assert.equal(await balance(),n);
 await page.evaluate(()=>window.shareMode='success');await offer();await send();await page.clock.runFor(2000);await close();await page.clock.runFor(6000);assert.equal(await balance(),n);
 // Returning from a hidden external app still requires visible waiting time.
 await offer();await send();
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))});
 await page.clock.runFor(10000);assert.equal(await balance(),n);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'))});
 await waitReward(n);
 for(const [width,height]of [[320,568],[360,606],[568,320],[1167,813]]){
  await page.setViewportSize({width,height});await offer();
  for(const selector of ['[data-share=send]','[data-share=close]']){
   await page.locator(selector).scrollIntoViewIfNeeded();const box=await page.locator(selector).boundingBox();assert.ok(box.height>=44&&box.y>=0&&box.y+box.height<=height+1);
  }
  await page.locator('#share-dialog').evaluate(el=>el.scrollTop=0);await page.screenshot({path:`test-results/share-offer-${width}.png`});await close();
 }
 assert.deepEqual(errors,[]);
 console.log('Sharing passed: stage URLs, offer before OS action, 5-second visible wait, no reward for cancellation/manual selection, clipboard retry, duplicate/stale suppression, hidden return and four layouts.');
}finally{await browser.close()}
