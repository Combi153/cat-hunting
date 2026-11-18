import test from 'node:test';
import assert from 'node:assert/strict';
import {shareContent,SHARE_RESULTS,PUBLIC_GAME_URL} from '../src/share-content.js';
test('result shares use ten distinct public stage/outcome URLs without private state',()=>{
 const urls=new Set();
 for(const result of SHARE_RESULTS){
  const card=shareContent({...result,seed:42,missed:[{id:2,kind:'earbud'}],attemptNumber:9});
  assert.equal(new URL(card.url).origin,new URL(PUBLIC_GAME_URL).origin);
  assert.match(card.text,new RegExp(`${result.stage}단계`));
  assert.doesNotMatch(JSON.stringify(card),/earbud|seed|attemptNumber|번째/);
  urls.add(card.url);
 }
 assert.equal(urls.size,10);
 assert.equal(shareContent({stage:5,reason:'win'}).image,'share-images/complete.jpg');
 assert.equal(shareContent({stage:3,reason:'health'}).url,shareContent({stage:3,reason:'missed'}).url);
 assert.equal(shareContent(null).url,PUBLIC_GAME_URL);
 assert.equal(shareContent({stage:'<script>',reason:'bad'}).url,PUBLIC_GAME_URL+'share/stage-1-missed/');
});
