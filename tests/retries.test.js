import test from 'node:test';
import assert from 'node:assert/strict';
import { createRetryAllowance, RETRY_STORAGE_KEY, retryDay } from '../src/retries.js';

function fixture() {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  let now = Date.parse('2026-11-18T14:59:00Z');
  return { values, storage, now: () => now, advance: ms => { now += ms; } };
}

test('three daily failures exhaust the allowance; reload preserves it separately from progress', () => {
  const f = fixture();
  f.storage.setItem('nyangijapgi.v2', 'existing progress');
  const retries = createRetryAllowance(f.storage, f.now);
  assert.equal(retries.current().remaining, 3);
  assert.equal(retries.fail().remaining, 2);
  assert.equal(retries.fail().remaining, 1);
  assert.equal(retries.fail().remaining, 0);
  assert.equal(retries.fail().remaining, 0);
  assert.equal(createRetryAllowance(f.storage, f.now).current().remaining, 0);
  assert.equal(f.storage.getItem('nyangijapgi.v2'), 'existing progress');
});

test('each share adds three with no daily reward cap; sequential tabs read the latest balance', () => {
  const f = fixture();
  const one = createRetryAllowance(f.storage, f.now), two = createRetryAllowance(f.storage, f.now);
  assert.equal(one.reward().remaining, 6);
  assert.equal(two.reward().remaining, 9);
  assert.equal(one.fail().remaining, 8);
  assert.equal(two.reward().remaining, 11);
});

test('Korean midnight resets the total to three, including unspent share bonuses', () => {
  const f = fixture();
  const retries = createRetryAllowance(f.storage, f.now);
  retries.reward();
  f.advance(59999);
  assert.equal(retries.current().remaining, 6);
  f.advance(1);
  assert.equal(retryDay(f.now()), '2026-11-19');
  assert.equal(retries.current().remaining, 3);
  assert.equal(retries.reward().remaining, 6);
});

test('missing, corrupt, negative and non-integer saves safely start at three', () => {
  for (const raw of ['{', 'null', '{"day":"2026-11-18","remaining":-1}', '{"day":"2026-11-18","remaining":1.5}']) {
    const f = fixture();
    f.storage.setItem(RETRY_STORAGE_KEY, raw);
    const retries = createRetryAllowance(f.storage, f.now);
    assert.equal(retries.current().remaining, 3);
    retries.fail();
    assert.equal(createRetryAllowance(f.storage, f.now).current().remaining, 2);
  }
});

test('blocked reads and quota-exceeded writes retain a functional in-memory allowance', () => {
  for (const blocked of ['read', 'write']) {
    const f = fixture();
    f.storage[blocked === 'read' ? 'getItem' : 'setItem'] = () => { throw new Error('Storage unavailable'); };
    const retries = createRetryAllowance(f.storage, f.now);
    retries.fail();
    assert.equal(retries.current().remaining, 2);
    assert.equal(retries.reward().remaining, 5);
    f.advance(60000);
    assert.equal(retries.current().remaining, 3);
  }
});
