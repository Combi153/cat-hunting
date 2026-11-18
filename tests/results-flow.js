import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const origin = process.env.TEST_BASE_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  for (const [file, name] of [['session', 'Exam'], ['world', 'Room']]) {
    await page.route(new RegExp(`/src/${file}\\.js(?:\\?t=\\d+)?$`), route => route.fulfill({ contentType: 'application/javascript',
      body: `export * from '/src/${file}.js?fixture'; import {${name} as Base} from '/src/${file}.js?fixture'; export class ${name} extends Base {constructor(...args){super(...args);window.test${name}=this}}` }));
  }
  await page.addInitScript(() => {
    localStorage.setItem('nyangijapgi.v2', JSON.stringify({ muted: true, unlocked: 5 }));
    localStorage.removeItem('nyangijapgi.retries.v1');
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
  });
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
  await page.clock.install({ time: new Date('2026-11-18T09:00:00Z') });
  await page.clock.pauseAt(new Date('2026-11-18T09:01:00Z'));
  const tap = action => page.locator(`[data-action=${action}]`).filter({ visible: true }).first().tap();
  const layouts = [[390,844],[320,568],[360,606],[568,320],[844,390],[1167,813]];
  for (const [reason, stage] of [['missed',4], ['health',1], ['sad',1], ['win',1], ['win',5]]) {
    await page.goto(origin);
    await page.locator(`[data-level="${stage}"]`).tap();
    await tap('start');
    await page.locator('#play:not([hidden])').waitFor();
    await page.clock.runFor(100);
    if (reason !== 'missed') await page.evaluate(reason => {
      const exam = window.testExam;
      if (reason === 'win' || reason === 'sad') for (const s of exam.seats.filter(s => s.guilty)) exam.report(s.id);
      if (reason !== 'win') for (const s of exam.seats.filter(s => !s.guilty).slice(0,3)) exam.report(s.id);
    }, reason);
    await page.clock.fastForward(46000);
    await page.locator('#ending:not([hidden])').waitFor();
    const saved = await page.evaluate(() => [localStorage.getItem('nyangijapgi.v2'),localStorage.getItem('nyangijapgi.retries.v1')]);
    for (const [width,height] of layouts) {
      await page.setViewportSize({width,height});
      await page.locator('.ending-scroll').evaluate(el => { el.scrollTop = 0; });
      await page.clock.runFor(100);
      const geometry = await page.evaluate(() => {
        const room = window.testRoom;
        room.draw(0, window.testExam.time);
        const canvas = document.querySelector('#room').getBoundingClientRect();
        const sheet = document.querySelector('.ending-bottom').getBoundingClientRect();
        const title = document.querySelector('.ending-title').getBoundingClientRect();
        const model = room.ending.id ? room.students.get(room.ending.id) : room.proctor;
        const points=[];
        for (const elapsed of [0, 1.5, 3]) {
        room.ending.elapsed = elapsed;
        room.draw(0, window.testExam.time);
        model.updateWorldMatrix(true, true);
        model.userData.clay.head.traverse(node => {
          if (!node.isMesh || !node.visible) return;
          node.geometry.computeBoundingBox();
          const {min,max} = node.geometry.boundingBox;
          for(const x of [min.x,max.x]) for(const y of [min.y,max.y]) for(const z of [min.z,max.z]) {
            const p = room.look.clone().set(x,y,z).applyMatrix4(node.matrixWorld).project(room.camera);
            points.push({x:canvas.x+(p.x+1)*canvas.width/2,y:canvas.y+(1-p.y)*canvas.height/2});
          }
        });
        }
        return {canvas:canvas.toJSON(), sheet:sheet.toJSON(), title:title.toJSON(),
          head:{left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))},
          scroll:document.querySelector('.ending-scroll').scrollTop};
      });
      await page.screenshot({path:`test-results/results-${reason}-${stage}-${width}.png`});
      assert.ok(geometry.head.top >= geometry.canvas.top && geometry.head.bottom <= geometry.canvas.bottom, `head fits: ${reason}/${stage}/${width}: ${JSON.stringify(geometry)}`);
      assert.ok(geometry.head.left >= geometry.canvas.left && geometry.head.right <= geometry.canvas.right);
      assert.ok(geometry.title.bottom <= geometry.head.top, 'title must not cover the head');
      const landscape = width === 568 || width === 844;
      if (!landscape) {
        assert.equal(geometry.scroll, 0);
        assert.ok(geometry.canvas.bottom <= geometry.sheet.top + 1, 'collapsed card leaves the character canvas clear');
        const toggle = page.locator('.ending-toggle');
        assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
        await tap('result-toggle');
        await page.waitForFunction(() => document.querySelector('.ending-scroll').scrollTop > 24);
        await page.clock.runFor(50);
        assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
        if (reason === 'missed' && width === 390) await page.screenshot({path:'test-results/results-expanded.png'});
      } else {
        assert.equal(await page.locator('.ending-toggle').isVisible(),false);
        assert.ok(geometry.canvas.right <= geometry.sheet.left + 1, 'landscape actions must stay beside the character');
      }
      // Every action remains reachable by native scroll, including the banner.
      for (const button of await page.locator('#result-actions button:not(:disabled), #result-actions a, #result-actions summary').all()) {
        await button.scrollIntoViewIfNeeded();
        const b=await button.boundingBox();
        assert.ok(b.y>=0 && b.y+b.height<=height+1 && b.height>=44);
      }
      assert.equal(await page.locator('#result-actions [data-action=home]').count(), 1, 'one route to the lobby');
      await page.locator('.retry-details summary').tap();
      assert.equal(await page.locator('.retry-details').getAttribute('open'), '');
      await page.clock.runFor(1100);
      assert.equal(await page.locator('.retry-details').getAttribute('open'), '', 'balance refresh must preserve open rules');
      await page.locator('.retry-details summary').tap();
      await page.clock.runFor(200);
      await page.locator('.ending-scroll').evaluate(el => {
        el.scrollTop = Math.max(0, el.querySelector('.ending-spacer').clientHeight - 12);
      });
      await page.screenshot({path:`test-results/results-clean-${reason}-${stage}-${width}.png`});
      if (!landscape) {
        await tap('result-toggle');
        await page.waitForFunction(() => document.querySelector('.ending-scroll').scrollTop === 0);
      }
    }
    assert.deepEqual(await page.evaluate(() => [localStorage.getItem('nyangijapgi.v2'),localStorage.getItem('nyangijapgi.retries.v1')]), saved);
    await page.setViewportSize({width:390,height:844});
    if (reason !== 'win') {
      await tap('review');
      await page.clock.runFor(100);
      await tap('review-close');
      assert.ok(await page.locator('.ending-scroll').evaluate(el=>el.scrollTop>0), 'return from review restores the expanded card');
    }
    await tap('share');
    await page.waitForFunction(()=>document.querySelector('#share-toast').textContent.includes('3회 추가'));
    assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'https://cat-hunting.vercel.app/');
    console.log(`Result ${reason}/${stage}: animated head bounds, six layouts, expand/collapse, all actions and sharing passed.`);
  }
  // A real touch swipe moves the sheet; keyboard users can reach it with Tab.
  await page.locator('.ending-scroll').evaluate(el=>{el.scrollTop=0;});
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:195,y:730}]});
  for (const y of [680,610,530,440]) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:195,y}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForFunction(()=>document.querySelector('.ending-scroll').scrollTop>50);
  await page.locator('.ending-toggle').focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('.ending-scroll').scrollTop===0);
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.action),'home');
  assert.ok(await page.locator('.ending-scroll').evaluate(el=>el.scrollTop>0));
  assert.deepEqual(errors,[]);
  console.log('Touch swipe and keyboard access passed; no page errors.');
} finally {await browser.close();}
