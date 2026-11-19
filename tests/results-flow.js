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
    await page.clock.fastForward((await page.evaluate(() => window.testExam.duration) + 1) * 1000);
    await page.locator('#ending:not([hidden])').waitFor();
    assert.equal(await page.locator('#result-dialog').evaluate(el=>el.open), false);
    await page.clock.runFor(1500);
    assert.equal(await page.locator('#result-dialog').evaluate(el=>el.open), false, 'reaction is visible for at least 1.5 seconds');
    await page.clock.runFor(400);
    assert.equal(await page.locator('#result-dialog').evaluate(el=>el.open), true, 'result opens automatically by 1.9 seconds');
    const saved = await page.evaluate(() => [localStorage.getItem('nyangijapgi.v2'),localStorage.getItem('nyangijapgi.retries.v1')]);
    for (const [width,height] of layouts) {
      await tap('result-close');
      await page.setViewportSize({width,height});
      await page.clock.runFor(100);
      const geometry = await page.evaluate(() => {
        const room = window.testRoom;
        room.draw(0, window.testExam.time);
        const canvas = document.querySelector('#room').getBoundingClientRect();
        const sheet = document.querySelector('.ending-reaction').getBoundingClientRect();
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
          head:{left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))}};
      });

      await page.screenshot({path:`test-results/modal-intro-${reason}-${stage}-${width}.png`});
      assert.ok(geometry.head.top >= geometry.canvas.top && geometry.head.bottom <= geometry.canvas.bottom, `head fits ${reason}/${stage}/${width}: ${JSON.stringify(geometry)}`);
      assert.ok(geometry.head.left >= geometry.canvas.left && geometry.head.right <= geometry.canvas.right);
      assert.ok(geometry.title.bottom <= geometry.head.top);
      if(width===568||width===844) assert.ok(geometry.canvas.right <= geometry.sheet.left+1);
      else assert.ok(geometry.canvas.bottom <= geometry.sheet.top+1);
      await tap('result-open');
      const dialog=await page.locator('#result-dialog').boundingBox();
      assert.ok(dialog.x>=0&&dialog.y>=0&&dialog.x+dialog.width<=width+1&&dialog.y+dialog.height<=height+1);
      assert.equal(await page.locator('.ending-scroll').count(),0);
      assert.equal(await page.locator('#result-actions [data-action=home]').count(),1);
      if(reason!=='win'){
        assert.equal(await page.locator('#result-actions .primary').getAttribute('data-action'),'review');
        const learn=await page.locator('[data-action=review]').boundingBox();
        assert.ok(learn.y+learn.height <=height);
      }
      for(const target of await page.locator('#result-actions button, #result-actions a').all()){
        await target.scrollIntoViewIfNeeded();const box=await target.boundingBox();
        assert.ok(box.height>=44&&box.y>=0&&box.y+box.height<=height+1);
      }
      await page.locator('#result-dialog').evaluate(el=>el.scrollTop=0);
      await page.screenshot({path:`test-results/modal-result-${reason}-${stage}-${width}.png`});
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#result-dialog').evaluate(el=>el.open),false);
      assert.equal(await page.evaluate(()=>document.activeElement.dataset.action),'result-open');
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#result-dialog').evaluate(el=>el.open),true);
    }
    if(reason!=='win'){
      await tap('review'); await page.clock.runFor(1000); await tap('review-close');
      assert.equal(await page.locator('#result-dialog').evaluate(el=>el.open),true);
      assert.equal(await page.evaluate(()=>document.activeElement.dataset.action),'review');
    }
    assert.deepEqual(await page.evaluate(()=>[localStorage.getItem('nyangijapgi.v2'),localStorage.getItem('nyangijapgi.retries.v1')]),saved);
    console.log(`Result ${reason}/${stage}: timed reveal, six layouts, visible review, native modal keyboard, return and unchanged saves passed.`);
  }
  assert.deepEqual(errors,[]);
}finally{await browser.close();}
