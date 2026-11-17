import test from 'node:test';
import assert from 'node:assert/strict';
import { Exam, TYPES } from '../src/session.js';
const still = { x: 0, z: 5 };
test('one guest exam produces 12 seats, 1–3 cases and independently serviceable requests', () => {
  for (let i = 0; i < 40; i++) {
    const e = new Exam();
    assert.equal(e.seats.length, 12);
    assert.ok(e.result().total >= 1 && e.result().total <= 3);
    assert.ok(e.requests.every((r) => !e.seat(r.id).guilty));
  }
});
test('a clue requires the right angle; valid note pins a single observation and justifies one removal', () => {
  const e = new Exam(() => 0.2),
    s = e.seats.find((s) => s.guilty);
  e.time = 6 - s.offset;
  assert.equal(e.view(s, false).key, 'cue');
  const clue = e.view(s, true);
  assert.equal(clue.key, 'proof');
  assert.ok(e.record(s, clue));
  assert.equal(e.record(s, clue), false);
  assert.equal(e.accuse(s, s.kind, 'proof'), true);
  assert.equal(e.accuse(s, s.kind, 'proof'), null);
  assert.equal(e.result().score, 100);
});
test('an incorrect accusation costs once per identical submitted evidence combination', () => {
  const e = new Exam(() => 0.2),
    s = e.seats.find((s) => !s.guilty);
  e.record(s, { key: 'cue', text: TYPES.glasses.cue });
  assert.equal(e.accuse(s, 'glasses', 'cue'), false);
  assert.equal(e.accuse(s, 'glasses', 'cue'), null);
  assert.equal(e.result().score, 65);
  assert.equal(s.caught, false);
});
test('paper and curtain require an acknowledged request and correct sequence', () => {
  const e = new Exam();
  e.time = 80;
  const [p, c] = e.requests;
  assert.equal(e.takePaper(), false);
  assert.equal(e.serve(p), false);
  e.acknowledge(p);
  assert.equal(e.serve(p), false);
  e.takePaper();
  assert.ok(e.serve(p));
  assert.equal(e.carrying, false);
  assert.equal(e.serve(p), false);
  e.acknowledge(c);
  assert.ok(e.serve(c));
  assert.ok(e.curtain);
});
test('delay and repeated noise are charged once per episode; quiet walking reduces disturbance', () => {
  const e = new Exam(() => 0.2),
    s = e.seats[0],
    r = e.requests[0];
  for (let i = 0; i < 112; i++) e.step(0.5, s, 0.6, true);
  assert.ok(!e.complaints.some((c) => c.kind === 'noise'));
  assert.ok(e.complaints.some((c) => c.kind === 'delay'));
  for (let i = 0; i < 14; i++) e.step(0.1, s, 0.6, false);
  assert.equal(e.complaints.filter((c) => c.kind === 'noise' && c.id === s.id).length, 1);
  e.acknowledge(r);
  e.takePaper();
  e.serve(r);
  for (let i = 0; i < 27; i++) e.step(1, still, 0, false);
  assert.ok(e.complaints.filter((c) => c.id === s.id && c.kind === 'noise').every((c) => c.resolved));
  assert.ok(e.complaints.find((c) => c.kind === 'delay').resolved);
});
test('the bell ends a session and blocks additional observations', () => {
  const e = new Exam(() => 0.2);
  e.step(119, still, 0, false);
  assert.equal(e.over, false);
  e.step(1, still, 0, false);
  assert.ok(e.over);
  assert.equal(e.time, 120);
  assert.equal(e.record(e.seats[0], { key: 'cue', text: '관찰' }), false);
});
test('handover desks show the same cue, opposite details, and stay observable during requests', () => {
  for (let seed = 0; seed < 350; seed++) {
    const exam = new Exam(seed);
    const desks = exam.pair.map((id) => exam.seat(id));
    assert.equal(desks[0].kind, desks[1].kind);
    assert.notEqual(desks[0].guilty, desks[1].guilty);
    assert.ok(exam.requests.every((r) => !exam.pair.includes(r.id)));
    assert.equal(exam.pairCount(), 0);
    for (const desk of desks) {
      exam.time = 18 - desk.offset;
      assert.equal(exam.view(desk, false).key, 'cue');
      exam.record(desk, exam.view(desk, true));
    }
    assert.equal(exam.pairCount(), 2);
    const retry = new Exam(exam.result().seed);
    assert.deepEqual(retry.pair, exam.pair);
    assert.deepEqual(retry.seats.map((s) => [s.guilty, s.kind, s.offset]), exam.seats.map((s) => [s.guilty, s.kind, s.offset]));
    assert.deepEqual(retry.requests, exam.requests);
    assert.equal(retry.pairCount(), 0);
  }
});
