// Drive the normal Vite entry point with fixed seat assignments in this test browser only.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const origin = process.env.TEST_BASE_URL || 'http://127.0.0.1:5173';
let browser;
try {
  browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 820, height: 570 } });
  page.setDefaultTimeout(7000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route(/\/src\/session\.js(?:\?t=\d+)?$/, (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: "export * from '/src/session.js?fixture'; import {Exam as Base} from '/src/session.js?fixture'; export class Exam extends Base {constructor(){let roll=0;super(()=>location.search==='?oneCase' && roll++===26?0:0.999);}}",
    }),
  );
  await page.clock.install({ time: new Date('2026-01-01T12:00:00Z') });
  await page.goto(origin + '/?oneCase');
  await page.clock.pauseAt(new Date('2026-01-01T12:01:00Z'));
  const click = (selector) => page.locator(selector).first().click({ force: true });
  const key = (name) => page.keyboard.press(name);
  const advance = async (ms) => {
    while (ms > 0) {
      const chunk = Math.min(1500, ms);
      await page.clock.fastForward(chunk);
      ms -= chunk;
    }
  };
  const walk = async (k, ticks) => {
    await page.keyboard.down(k);
    for (let i = 0; i < ticks; i++) await advance(100);
    await page.keyboard.up(k);
  };
  const turn = async (dx) => {
    await page.mouse.move(340, 160);
    await page.mouse.down();
    await page.mouse.move(340 + dx, 160);
    await page.mouse.up();
    await advance(160);
  };
  const focus = async (label) => {
    await key('e');
    assert.match(await page.locator('#context').innerText(), new RegExp(label + '번 좌석 · 관찰 중'));
  };
  await click('[data-action=help]');
  await click('[data-action=close]');
  assert.equal(await page.title(), '냥이잡기');
  assert.equal(await page.locator('[data-mode]').count(), 0);
  await click('[data-action=start]');
  await page.waitForSelector('#time');
  await advance(150);
  await walk('w', 5);
  await turn(-88);
  await focus('01');
  for (let i = 0; i < 25 && !(await page.locator('#context').innerText()).includes('문항 번호가 바뀌는'); i++)
    await advance(600);
  assert.match(await page.locator('#context').innerText(), /문항 번호가 바뀌는/);
  await key('f');
  await click('[data-action=journal]');
  await page.locator('#kind').selectOption('glasses');
  await click('[data-action=accuse]');
  assert.match(await page.locator('#notice').innerText(), /퇴실 조치/);
  await advance(1800);
  await turn(210);
  for (let i = 0; i < 70 && !(await page.locator('#tasks').innerText()).includes('손을 든 학생'); i++)
    await advance(300);
  await click('#context [data-action=action]');
  assert.match(await page.locator('#tasks').innerText(), /교탁/);
  await turn(-122);
  await walk('s', 6);
  await walk('d', 5);
  await key('e');
  assert.match(await page.locator('#tasks').innerText(), /건네세요/);
  await walk('a', 5);
  await walk('w', 6);
  await turn(120);
  await click('#context [data-action=action]');
  assert.equal(await page.locator('#tasks').innerText(), '');
  await focus('02');
  await key('f');
  await click('[data-action=journal]');
  await page.locator('#kind').selectOption('camera');
  await click('[data-action=accuse]');
  await key('Escape');
  const time = await page.locator('#time').innerText();
  await advance(4000);
  assert.equal(await page.locator('#time').innerText(), time);
  await click('[data-action=resume]');
  await key('Tab');
  await advance(180500);
  await page.waitForSelector('.score');
  assert.match(await page.locator('.score').innerText(), /72점/);
  await page.locator('.review-list summary').first().click({ force: true });
  await click('[data-replay="1"]');
  await advance(180);
  await click('[data-action=replay-switch]');
  assert.match(await page.locator('#context').innerText(), /문항 번호/);
  await click('[data-action=report]');
  await click('[data-action=home]');
  await page.reload();
  await click('[data-action=history]');
  await click('[data-history="0"]');
  assert.match(await page.locator('.score').innerText(), /72점/);
  console.log(
    'Single-round flow: walk, evidence, removal, paper delivery, false call, pause, replay and persistent score verified.',
  );

  await click('[data-action=home]');
  await page.goto(origin);
  await click('[data-action=start]');
  await page.waitForSelector('#time');
  assert.equal(await page.locator('#time').innerText(), '03:00');
  await key('Tab');
  await advance(77000);
  await key('Escape');
  console.log('Checking the full exam curtain request');
  await walk('w', 14);
  await turn(-155);
  assert.match(await page.locator('#context').innerText(), /05번 요청 듣기/);
  await key('e');
  await turn(155);
  await walk('a', 10);
  await key('e');
  assert.match(await page.locator('#notice').innerText(), /커튼을 닫았습니다/);
  // Repeated noisy passes beside a single row eventually cause a separate complaint.
  for (let i = 0; i < 7; i++) {
    await walk('d', 10);
    await walk('a', 10);
  }
  await key('Tab');
  await advance(180000);
  await page.waitForSelector('.score');
  assert.match(await page.locator('.stats').innerText(), /1\/2/);
  assert.match(await page.locator('.modal').textContent(), /발소리로 시험에 집중하기 어렵습니다/);
  assert.match(await page.locator('.modal').textContent(), /학생 요청 처리가 지연되었습니다/);
  console.log(
    'Full exam: curtain delivery, delayed request, repeated-footstep complaint and timed report verified.',
  );
  assert.deepEqual(errors, []);

  const mobile = await browser.newPage({
    viewport: { width: 393, height: 852 },
    isMobile: true,
    hasTouch: true,
  });
  mobile.on('pageerror', (e) => errors.push(e.message));
  await mobile.goto(origin);
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.equal(await mobile.title(), '냥이잡기');
  await mobile.locator('.start-btn').tap();
  await mobile.waitForSelector('#time');
  assert.ok(await mobile.locator('#stick').isVisible());
  await mobile.locator('[data-action=quiet]').tap();
  assert.equal(await mobile.locator('[data-action=quiet]').getAttribute('aria-pressed'), 'true');
  const pad = await mobile.locator('#stick').boundingBox(),
    x = pad.x + pad.width / 2,
    y = pad.y + pad.height / 2;
  const touch = await mobile.context().newCDPSession(mobile);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - 35 }] });
  await mobile.waitForTimeout(1400);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await mobile.locator('#touch [data-action=action]').tap();
  await mobile.waitForSelector('.focus-card', { timeout: 5000 });
  assert.ok(await mobile.locator('[data-action=record]').isVisible());
  assert.equal(await mobile.locator('#touch').isVisible(), false);
  await mobile.getByRole('button', { name: '행동 기록', exact: true }).tap();
  await mobile.getByRole('button', { name: '지목하기', exact: true }).tap();
  await mobile.locator('#kind').selectOption('glasses');
  assert.ok(await mobile.locator('[data-action=accuse]').isEnabled());
  await mobile.locator('.close-x').tap();
  await mobile.getByRole('button', { name: '관찰 끝내기' }).tap();
  assert.equal(await mobile.locator('[data-action=quiet]').getAttribute('aria-pressed'), 'true');
  await mobile.setViewportSize({ width: 844, height: 390 });
  assert.ok(await mobile.locator('#touch-action').isVisible());
  assert.deepEqual(errors, []);
  console.log('Mobile: viewport, touch joystick, quiet walk and observation controls verified.');
} finally {
  if (browser) await browser.close();
}
