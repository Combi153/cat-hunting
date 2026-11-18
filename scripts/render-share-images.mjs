import { chromium } from 'playwright';
import { SHARE_RESULTS, shareContent } from '../src/share-content.js';
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome'});
try {
 const page=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
 for(const result of SHARE_RESULTS){
  await page.goto((process.env.TEST_BASE_URL||'http://127.0.0.1:5173')+'/scripts/share-card.html');
  await page.waitForFunction(()=>typeof window.renderCard==='function');
  await page.evaluate(({stage,reason})=>window.renderCard(stage,reason==='win'),result);
  await page.screenshot({path:'public/'+shareContent(result).image,type:'jpeg',quality:90});
 }
}finally{await browser.close()}
