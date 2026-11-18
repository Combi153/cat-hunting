import test from 'node:test';
import assert from 'node:assert/strict';
import { Exam, EXAM_DURATION, MAX_HEALTH } from '../src/session.js';

test('90-second exams seed three culprits and two innocent requests reproducibly', () => {
  assert.equal(EXAM_DURATION, 90);
  assert.equal(MAX_HEALTH, 3);
  for (let seed = 0; seed < 250; seed++) {
    const exam = new Exam(seed);
    assert.equal(exam.seats.length, 8);
    assert.equal(exam.seats.filter((seat) => seat.guilty).length, 3);
    assert.equal(new Set(exam.seats.filter((seat) => seat.guilty).map((seat) => seat.kind)).size, 3);
    assert.ok(exam.requests.every((request) => !exam.seat(request.id).guilty));
    assert.deepEqual(new Exam(seed).seats, exam.seats);
    assert.deepEqual(new Exam(seed).requests, exam.requests);
  }
});

test('normal students mostly write, never display a cheating prop, and each culprit offers multiple clues', () => {
  for (let seed = 0; seed < 80; seed++) {
    const exam = new Exam(seed);
    // Service time is excluded from normal body-language sampling.
    exam.requests.forEach((request) => { request.done = true; });
    for (const seat of exam.seats) {
      let writing = 0, proofs = 0, firstProof = Infinity, lastProof = 0;
      for (let time = 0; time < 90; time += 0.5) {
        exam.time = time;
        const behavior = exam.behavior(seat);
        writing += behavior.pose === 'write' ? 1 : 0;
        if (behavior.pose.startsWith('proof-')) {
          assert.ok(seat.guilty);
          proofs++;
          firstProof = Math.min(firstProof, time);
          lastProof = time;
        }
      }
      if (!seat.guilty) assert.ok(writing / 180 >= 0.8);
      else {
        assert.ok(proofs >= 24);
        assert.ok(firstProof <= 55 && lastProof >= 89);
      }
    }
  }
});

test('reporting needs no notes, evidence selector or same-frame timing, and ignores repeated submissions', () => {
  const exam = new Exam(42);
  const culprit = exam.seats.find((seat) => seat.guilty);
  exam.time = 0;
  assert.equal(exam.behavior(culprit).pose, 'write');
  assert.equal(exam.report(culprit.id).correct, true);
  assert.equal(exam.report(culprit.id), null);
  assert.equal(exam.caught, 1);
  assert.equal(exam.health, 3);
});

test('three mistaken reports exhaust health immediately and block further gameplay', () => {
  const exam = new Exam(42);
  const normal = exam.seats.filter((seat) => !seat.guilty);
  assert.equal(exam.report(normal[0].id).correct, false);
  assert.equal(exam.health, 2);
  assert.equal(exam.report(normal[0].id), null);
  exam.report(normal[1].id);
  exam.report(normal[2].id);
  assert.equal(exam.health, 0);
  assert.equal(exam.reason, 'health');
  assert.equal(exam.over, true);
  assert.equal(exam.time, 0);
  const before = exam.result();
  exam.step(95);
  assert.equal(exam.report(exam.seats.find((seat) => seat.guilty).id), null);
  assert.equal(exam.serve(exam.requests[0].id), false);
  assert.deepEqual({ ...exam.result(), date: before.date }, before);
});

test('each delayed request costs one life, can still be served, and cannot be served before it starts', () => {
  const exam = new Exam(42);
  const [paper, curtain] = exam.requests;
  assert.equal(exam.serve(paper.id), false);
  exam.step(paper.deadline);
  assert.equal(exam.health, 2);
  exam.step(2);
  assert.equal(exam.health, 2);
  assert.ok(exam.serve(paper.id));
  assert.equal(exam.serve(paper.id), false);
  exam.step(curtain.start - exam.time);
  assert.ok(exam.serve(curtain.id));
  assert.ok(exam.curtain);
  exam.step(90);
  assert.equal(exam.health, 2);
  assert.equal(exam.result().served, 2);
});

test('survival requires both lasting 90 seconds and catching everyone', () => {
  const idle = new Exam(23);
  idle.step(90);
  assert.equal(idle.reason, 'missed');
  assert.equal(idle.health, 1);
  assert.equal(idle.result().missed.length, 3);
  assert.equal('score' in idle.result(), false);

  const success = new Exam(23);
  success.seats.filter((seat) => seat.guilty).forEach((seat) => success.report(seat.id));
  assert.equal(success.over, false);
  success.step(28);
  success.serve(success.requests[0].id);
  success.step(40);
  success.serve(success.requests[1].id);
  success.step(21.99);
  assert.equal(success.over, false);
  success.step(0.01);
  assert.equal(success.reason, 'win');
  assert.equal(success.health, 3);

  const exhausted = new Exam(23);
  exhausted.seats.filter((seat) => seat.guilty).forEach((seat) => exhausted.report(seat.id));
  exhausted.seats.filter((seat) => !seat.guilty).slice(0, 3).forEach((seat) => exhausted.report(seat.id));
  assert.equal(exhausted.reason, 'health');
});
