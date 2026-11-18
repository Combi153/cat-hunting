import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { Exam } from '../src/session.js';

// Capture scheduled behaviors through the real touch UI; no forced poses or production debug hooks.
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
const output = 'test-results/assets';
await mkdir(output, { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/\/src\/session\.js(?:\?t=\d+)?$/, route => route.fulfill({
    contentType: 'application/javascript',
    body: "export * from '/src/session.js?fixture'; import {Exam as Base} from '/src/session.js?fixture'; export class Exam extends Base {constructor(){super(Number(new URLSearchParams(location.search).get('seed')),1);window.reviewExam=this}}",
  }));
  await page.clock.install({ time: new Date('2026-11-18T00:00:00Z') });
  const advance = async ms => { while (ms > 0) { await page.clock.fastForward(Math.min(ms, 100)); ms -= 100; } };
  for (const pose of ['proof-watch', 'clear-watch', 'proof-pen', 'clear-pen', 'sleeve-adjust', 'wrist-rest', 'neck-stretch', 'reread']) {
    let chosen;
    for (let seed = 0; seed < 200 && !chosen; seed++) {
      const exam = new Exam(seed);
      for (const seat of exam.seats.filter(s => s.id <= 3 && !s.sensitive && !exam.requests.some(r => r.id === s.id))) {
        for (let t = 4; t < 17; t += 0.25) {
          exam.time = t;
          if (exam.behavior(seat).pose === pose) { chosen = { seed, id: seat.id }; break; }
        }
        if (chosen) break;
      }
    }
    assert.ok(chosen, pose);
    await page.goto((process.env.TEST_BASE_URL || 'http://127.0.0.1:5173') + '?seed=' + chosen.seed);
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
    await page.locator('[data-action=start]').tap();
    await page.locator('#play:not([hidden])').waitFor();
    await advance(200);
    await page.locator(`[data-seat="${chosen.id}"]`).tap();
    let found = false;
    for (let i = 0; i < 180; i++) {
      await advance(100);
      const active = await page.evaluate(({id,pose}) => window.reviewExam.behavior(window.reviewExam.seat(id)).pose === pose, {...chosen,pose});
      if (active && await page.locator('[data-action=report]').isVisible()) {
        await advance(250);
        if (await page.evaluate(({id,pose}) => window.reviewExam.behavior(window.reviewExam.seat(id)).pose === pose, {...chosen,pose})) {found=true;break;}
      }
    }
    assert.ok(found, pose + ' must occur during normal play');
    await page.screenshot({ path: output + '/' + pose + '.png' });
    if (pose === 'proof-watch' || pose === 'proof-pen') {
      await page.setViewportSize({width:320,height:568});
      await advance(600);
      await page.screenshot({ path: output + '/' + pose + '-320.png' });
      await page.setViewportSize({width:390,height:844});
      await page.locator('[data-action=report]').tap();
      assert.match(await page.locator('#notice').innerText(), /적발/);
    }
    console.log('Captured natural in-game ' + pose + ', seed ' + chosen.seed + ', seat ' + chosen.id);
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
