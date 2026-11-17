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
  // The title (UV top) is farther from the seated reader and the answer grid is on their right.
  const readableSheets = await page.evaluate(async () => {
    const { createClassroom } = await import('/src/art/classroom.js');
    const { Exam } = await import('/src/session.js');
    const seats = new Exam().seats;
    const print = createClassroom(seats).getObjectByName('Room surface · paperPrint');
    const { position, uv } = print.geometry.attributes;
    return seats.filter((seat) => {
      let corners = 0;
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i) - (seat.x - 0.01);
        const z = position.getZ(i) - (seat.z + 0.515);
        if (Math.abs(x) > 0.36 || Math.abs(z) > 0.22) continue;
        if (uv.getX(i) > 0.5 !== x < 0 || uv.getY(i) > 0.5 !== z > 0) return false;
        corners++;
      }
      return corners === 6 && print.material.map.flipY;
    }).length;
  });
  assert.equal(readableSheets, 12);
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
    const box = await page.locator('#room').boundingBox();
    const x = box.x + box.width / 2;
    const y = box.y + box.height * 0.55;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx, y);
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
  await key('e');
  await click('#touch-action');
  await page.locator('#kind').selectOption('glasses');
  await click('[data-action=accuse]');
  assert.match(await page.locator('#notice').innerText(), /퇴실 조치/);
  await advance(1800);
  await turn(210);
  for (let i = 0; i < 70 && !(await page.locator('#tasks').innerText()).includes('손을 든 학생'); i++)
    await advance(300);
  await click('#touch-action');
  assert.match(await page.locator('#tasks').innerText(), /교탁/);
  await turn(-122);
  await walk('s', 6);
  await walk('d', 5);
  await key('e');
  assert.match(await page.locator('#tasks').innerText(), /건네세요/);
  await walk('a', 5);
  await walk('w', 6);
  await turn(120);
  await click('#touch-action');
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
  await page.clock.fastForward(120500);
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
  assert.equal(await page.locator('#time').innerText(), '02:00');
  await key('Tab');
  await page.clock.fastForward(61000);
  assert.equal(await page.locator('#time').innerText(), '00:59');
  await key('Escape');
  console.log('Checking the full exam curtain request');
  await walk('w', 14);
  await turn(-155);
  assert.equal(await page.locator('#touch-action').getAttribute('aria-label'), '05번 학생 · 요청 듣기');
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
  await page.clock.fastForward(120000);
  await page.waitForSelector('.score');
  assert.match(await page.locator('.stats').innerText(), /1\/2/);
  assert.match(await page.locator('.modal').textContent(), /발소리로 시험에 집중하기 어렵습니다/);
  assert.match(await page.locator('.modal').textContent(), /학생 요청 처리가 지연되었습니다/);
  console.log(
    'Full exam: curtain delivery, delayed request, repeated-footstep complaint and timed report verified.',
  );
  assert.deepEqual(errors, []);
  await page.close();

  const mobile = await browser.newPage({
    viewport: { width: 393, height: 852 },
    isMobile: true,
    hasTouch: true,
  });
  mobile.setDefaultTimeout(10000);
  await mobile.clock.install({ time: new Date('2026-01-02T12:00:00Z') });
  mobile.on('pageerror', (e) => errors.push(e.message));
  await mobile.goto(origin);
  await mobile.clock.pauseAt(new Date('2026-01-02T12:01:00Z'));
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.equal(await mobile.title(), '냥이잡기');
  await mobile.locator('.start-btn').tap();
  await mobile.waitForSelector('#time');
  assert.ok(await mobile.locator('#stick').isVisible());
  const pad = await mobile.locator('#stick').boundingBox(),
    x = pad.x + pad.width / 2,
    y = pad.y + pad.height / 2;
  const touch = await mobile.context().newCDPSession(mobile);
  // Chromium can coalesce real touch moves while the game's animation clock is paused.
  const waitForGait = async (expected) => {
    for (let i = 0; i < 30; i++) {
      await mobile.clock.fastForward(125);
      if (await mobile.locator('#gait').textContent() === expected) return;
      await new Promise((resolve) => setTimeout(resolve, 35));
    }
    assert.equal(await mobile.locator('#gait').textContent(), expected);
  };
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x, y: y - pad.width * 0.16 }],
  });
  await waitForGait('살금살금');
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x, y: y - pad.width * 0.37 }],
  });
  await waitForGait('보통 걸음');
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await waitForGait('이동');
  const aButton = mobile.locator('#touch-action');
  const buttonBefore = await aButton.boundingBox();
  await aButton.tap();
  await mobile.waitForSelector('.focus-card', { timeout: 5000 });
  const buttonAfter = await aButton.boundingBox();
  assert.equal(buttonBefore.x + buttonBefore.width, buttonAfter.x + buttonAfter.width);
  assert.equal(buttonBefore.y, buttonAfter.y);
  assert.equal(await mobile.locator('#action-verb').textContent(), '행동 기록');
  await aButton.tap();
  assert.equal(await mobile.locator('#action-verb').textContent(), '일지 열기');
  await aButton.tap();
  await mobile.locator('#kind').selectOption('glasses');
  assert.ok(await mobile.locator('[data-action=accuse]').isEnabled());
  await mobile.locator('.close-x').tap();
  await mobile.getByRole('button', { name: '관찰 끝내기' }).tap();
  await mobile.setViewportSize({ width: 844, height: 390 });
  const bounds = async (sel) => mobile.locator(sel).boundingBox();
  const landscapeRoom = await bounds('#room');
  assert.ok((await bounds('#stick')).x >= landscapeRoom.x + landscapeRoom.width);
  await mobile.setViewportSize({ width: 320, height: 568 });
  const smallRoom = await bounds('#room');
  assert.ok((await bounds('#stick')).y >= smallRoom.y + smallRoom.height);
  const smallAction = await bounds('#touch-action');
  assert.ok(smallAction.y + smallAction.height <= 568);
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.clock.resume();
  await mobile.goto(origin);
  await mobile.locator('.start-btn').tap();
  await mobile.waitForSelector('#time');
  const scene = await bounds('#room');
  // The left-hand student in the middle row, beyond the initial observation radius.
  await mobile.touchscreen.tap(scene.x + scene.width * 0.29, scene.y + scene.height * 0.36);
  await mobile.getByRole('button', { name: '05번 학생 · 관찰하기' }).waitFor({ timeout: 15000 });
  assert.equal(await mobile.locator('.focus-card').count(), 0);
  await aButton.tap();
  await mobile.waitForSelector('.focus-card', { timeout: 12000 });
  assert.match(await mobile.locator('.focus-title').innerText(), /05번 좌석/);
  const card = await bounds('.focus-card');
  const focusRoom = await bounds('#room');
  assert.ok(card.y >= focusRoom.y + focusRoom.height);
  assert.deepEqual(errors, []);
  console.log(
    'Mobile: touch-to-approach, joystick, quiet walk, evidence and separate portrait/landscape controls verified.',
  );
} finally {
  if (browser) await browser.close();
}
