// Exercise a random exam through the same controls available on the built site.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { TYPES } from '../src/session.js';

const origin = process.env.TEST_BASE_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const click = (selector) => page.locator(selector).click({ force: true });
  const tap = (selector) => page.locator(selector).tap({ force: true });
  const advanceUntil = async (check, seconds) => {
    for (let i = 0; i <= seconds * 2; i++) {
      if (await check()) return;
      await page.clock.fastForward(500);
    }
    assert.fail('Expected game state within ' + seconds + ' exam seconds. HUD: ' + await page.locator('#play').innerText());
  };
  const waitForVerb = (label) => advanceUntil(async () => await page.locator('#action-verb').textContent() === label, 13);
  await page.clock.install({ time: new Date('2026-01-01T12:00:00Z') });
  await page.goto(origin);
  await page.clock.pauseAt(new Date('2026-01-01T12:01:00Z'));
  await tap('[data-action=sound]');
  await tap('.start-btn');
  await page.locator('#handover button').first().waitFor();
  const desks = await page.locator('#handover button').evaluateAll((buttons) => buttons.map((b) => b.dataset.walk));

  // Interrupt the longer route and restart it using the advertised keyboard shortcut.
  await page.keyboard.press('2');
  if (await page.locator('#action-verb').textContent() === '이동 멈추기') {
    await tap('#touch-action');
    assert.notEqual(await page.locator('#action-verb').textContent(), '이동 멈추기');
  }
  let suspect, kind;
  for (const [index, id] of desks.entries()) {
    await page.keyboard.press(String(index + 1));
    await waitForVerb('관찰하기');
    assert.match(await page.locator('#action-target').innerText(), new RegExp(id + '번'));
    await tap('#touch-action');
    await advanceUntil(async () => await page.locator('.phase-label').textContent() === '후속 행동', 16);
    const text = await page.locator('.focus-card p').innerText();
    const device = Object.entries(TYPES).find(([, clues]) => clues.proof === text);
    if (device) [suspect, kind] = [id, device[0]];
    if (index === 0) {
      // Hold across the gesture boundary: the note belongs to the moment of pressing A.
      const action = await page.locator('#touch-action').boundingBox();
      await page.mouse.move(action.x + action.width / 2, action.y + action.height / 2);
      await page.mouse.down();
      await page.clock.fastForward(5600);
      assert.notEqual(await page.locator('.focus-card p').innerText(), text);
      await page.mouse.up();
    } else {
      await tap('#touch-action');
    }
    assert.ok((await page.locator('#notice').innerText()).includes(text));
    await tap('#leave-seat');
  }
  assert.ok(suspect);
  assert.match(await page.locator('#handover').innerText(), /대조 완료 · 2\/2/);
  await click('[data-action=journal]');
  assert.equal(await page.locator('.pair-notes dd').count(), 2);
  await click('[data-seat="' + suspect + '"]');
  await page.locator('#kind').selectOption(kind);
  await click('[data-action=accuse]');
  assert.match(await page.locator('#notice').innerText(), /퇴실 조치/);

  for (const verb of ['요청 듣기', '답안지 챙기기', '답안지 건네기', '요청 듣기', '커튼 닫기']) {
    await advanceUntil(async () => await page.locator('#tasks button').count() > 0, 61);
    await tap('#tasks button:first-child');
    await waitForVerb(verb);
    await tap('#touch-action');
  }
  assert.equal(await page.locator('#tasks button').count(), 0);
  await page.clock.fastForward(120000);
  const score = await page.locator('.score strong').textContent();
  assert.match(await page.locator('.pair-review').innerText(), /대조 완료/);
  assert.match(await page.locator('.stats').innerText(), /2\/2/);
  await page.reload();
  await click('[data-action=history]');
  await click('[data-history="0"]');
  assert.equal(await page.locator('.score strong').textContent(), score);
  await click('[data-action=retry]');
  await page.locator('#overlay').waitFor({ state: 'hidden' });
  await page.locator('#handover button').first().waitFor();
  assert.deepEqual(await page.locator('#handover button').evaluateAll((b) => b.map((v) => v.dataset.walk)), desks);
  assert.match(await page.locator('#handover').innerText(), /0\/2/);
  await page.setViewportSize({ width: 568, height: 320 });
  const action = await page.locator('#touch-action').boundingBox();
  assert.ok(action.y + action.height <= 320);
  await page.clock.fastForward(55000);
  assert.match(await page.locator('#tasks button').innerText(), /지연/);
  for (const verb of ['요청 듣기', '답안지 챙기기', '답안지 건네기']) {
    await tap('#tasks button:first-child');
    await waitForVerb(verb);
    await tap('#touch-action');
  }
  await page.keyboard.press('Tab');
  await page.clock.fastForward(120000);
  assert.match(await page.locator('.comparison').innerText(), new RegExp(score + ' →'));
  assert.match(await page.locator('.modal').textContent(), /학생 요청 처리가 지연되었습니다. \(조치 완료\)/);
  const second = await page.locator('.score strong').textContent();
  assert.ok(parseInt(second) < parseInt(score));
  await click('[data-action=again]');
  await page.locator('#overlay').waitFor({ state: 'hidden' });
  assert.equal(await page.locator('#time').textContent(), '02:00');
  assert.deepEqual(errors, []);
  console.log('Paired observation, accurate accusation, both touch deliveries, saved rematch and fresh exam verified (' + score + ' → ' + second + ').');
} finally {
  await browser.close();
}
