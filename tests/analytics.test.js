import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnalytics, createGameAnalytics } from '../src/analytics.js';
import { Exam } from '../src/session.js';

function fixture() {
  const target = {};
  const scripts = [];
  const document = { createElement: () => ({}), head: { append: (script) => scripts.push(script) } };
  return { target, document, scripts, measurementId: 'G-TEST123', enabled: true };
}

test('missing ID and development never load GA or queue events', () => {
  for (const options of [{ enabled: false }, { measurementId: '' }, { measurementId: 'invalid' }]) {
    const config = { ...fixture(), ...options };
    createAnalytics(config)('level_start');
    assert.equal(config.scripts.length, 0);
    assert.equal(config.target.dataLayer, undefined);
  }
});

test('GA loads asynchronously, queues config before events and tolerates blocking', () => {
  const config = fixture();
  const send = createAnalytics({ ...config, debug: true });
  send('level_start', { level_name: 'exam_1' });
  assert.equal(config.scripts[0].async, true);
  assert.equal(config.scripts[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-TEST123');
  const queue = config.target.dataLayer.map((entry) => [...entry]);
  assert.equal(queue[1][0], 'config');
  assert.equal(queue[1][2].debug_mode, true);
  assert.equal(queue[1][2].allow_google_signals, false);
  assert.deepEqual(queue[2], ['event', 'level_start', { level_name: 'exam_1', send_to: 'G-TEST123' }]);
  config.target.gtag = () => { throw new Error('blocked'); };
  assert.doesNotThrow(() => send('level_end'));
  assert.doesNotThrow(() => createAnalytics(config)('level_start'));
});

test('failed attempts, retries and quitting remain distinct, with no duplicate endings', () => {
  const events = [];
  let serial = 0;
  const tracker = createGameAnalytics((name, data) => events.push({ name, ...data }), () => `attempt-${++serial}`);
  const exam = new Exam(42, 3);
  tracker.start(exam, 'lobby');
  tracker.inspect(exam);
  tracker.inspect(exam);
  exam.report(exam.seats.find((seat) => !seat.guilty).id);
  exam.complaints.push({ reason: 'observation' }, { time: 10 });
  exam.time = 16;
  tracker.progress(exam);
  tracker.progress(exam);
  tracker.event('level_background', exam);
  exam.reason = 'health';
  exam.over = true;
  tracker.end(exam);
  tracker.end(exam);
  tracker.leave(exam);
  assert.equal(events.filter((event) => event.name === 'level_end').length, 1);
  assert.equal(events.filter((event) => event.name === 'level_exit').length, 0);
  assert.equal(events.filter((event) => event.name === 'first_inspection').length, 1);
  assert.equal(events.filter((event) => event.name === 'level_progress').length, 1);
  assert.equal(events.at(-1).success, false);
  assert.equal(events.at(-1).false_report_count, 1);
  assert.equal(events.at(-1).overobserve_count, 1);
  assert.equal(events.at(-1).help_late_count, 1);
  assert.equal(events.at(-1).inspection_count, 2);
  const retry = new Exam(43, 3);
  tracker.start(retry, 'retry');
  assert.equal(events.at(-1).attempt_number, 2);
  assert.equal(events.at(-1).attempt_id, 'attempt-2');
  tracker.leave(retry);
  tracker.leave(retry);
  assert.equal(events.filter((event) => event.name === 'level_exit').length, 1);
  assert.equal(events.at(-1).end_reason, 'quit');
});

test('successful finish reports the stage and has no further progress', () => {
  const events = [];
  const tracker = createGameAnalytics((name, data) => events.push({ name, ...data }), () => 'win');
  const exam = new Exam(42);
  tracker.start(exam, 'advance');
  for (const seat of exam.seats.filter((seat) => seat.guilty)) exam.report(seat.id);
  exam.step(45);
  tracker.end(exam);
  tracker.progress(exam);
  assert.equal(events.at(-1).name, 'level_end');
  assert.equal(events.at(-1).success, true);
  assert.equal(events.at(-1).missed_count, 0);
});
