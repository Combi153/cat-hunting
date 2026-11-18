import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import {shareContent,SHARE_RESULTS,PUBLIC_GAME_URL} from '../src/share-content.js';
const origin=process.env.TEST_BASE_URL||'http://127.0.0.1:5212';
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome'});
try{
 const context=await browser.newContext({viewport:{width:360,height:606},hasTouch:true,isMobile:true});
 await context.route(/googletagmanager\.com|google-analytics\.com/,r=>r.abort());
 for(const result of SHARE_RESULTS){
  const card=shareContent(result);const path=new URL(card.url).pathname;
  const res=await context.request.get(origin+path,{headers:{'User-Agent':'kakaoscrap/1.0'}});
  assert.equal(res.status(),200);
  const html=await res.text();
  for(const value of [card.title,card.text,card.url,PUBLIC_GAME_URL+card.image])assert.ok(html.includes(value),`${path}: ${value}`);
  assert.ok(html.includes('content="1200"')&&html.includes('content="630"'));
  const img=await context.request.get(origin+'/'+card.image);assert.equal(img.status(),200);assert.match(img.headers()['content-type'],/image\/jpeg/);
 }
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const path of ['/share/stage-3-missed/','/share/complete/']){
  await page.goto(origin+path);await page.locator('#lobby [data-action=start]').waitFor();
  assert.match(await page.locator('#lobby [data-action=start]').innerText(),/1단계/);
  assert.equal(await page.locator('[data-level="5"]').isDisabled(),true,'a shared win must not unlock recipient progress');
 }
 await page.locator('#lobby [data-action=start]').tap();await page.locator('#play:not([hidden])').waitFor();
 assert.deepEqual(errors,[]);
 console.log('Ten crawler-readable share pages and JPEGs passed; deep links open a playable lobby without granting progress. GA blocked.');
}finally{await browser.close()}
