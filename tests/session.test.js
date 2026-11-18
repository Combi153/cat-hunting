import test from 'node:test';
import assert from 'node:assert/strict';
import { Exam, EXAM_DURATION } from '../src/session.js';
import { STAGES, stageNumber, unlockStage } from '../src/stages.js';

test('five reproducible stages introduce more cases, mimics, hiding and pressure', () => {
  assert.equal(EXAM_DURATION, 45);
  for (let stage = 1; stage <= 5; stage++)
    for (let seed = 0; seed < 100; seed++) {
      const exam = new Exam(seed, stage),
        rules = STAGES[stage - 1];
      assert.equal(exam.stage, stage);
      assert.equal(exam.seats.length, 12);
      assert.equal(exam.seats.filter((s) => s.guilty).length, rules.culprits);
      assert.equal(new Set(exam.seats.filter((s) => s.guilty).map((s) => s.kind)).size, rules.culprits);
      assert.equal(exam.seats.filter((s) => s.sensitive).length, rules.sensitive);
      assert.equal(exam.requests.length, rules.requests.length);
      assert.ok(exam.requests.every((r) => !exam.seat(r.id).guilty && r.deadline < 45));
      assert.deepEqual(exam.seats, new Exam(seed, stage).seats);
    }
});

test('innocent lookalikes share gestures but never show cheating evidence; every culprit repeats readable clues', () => {
  for (let stage = 1; stage <= 5; stage++)
    for (let seed = 0; seed < 40; seed++) {
      const exam = new Exam(seed, stage);
      exam.requests.forEach((r) => (r.done = true));
      for (const seat of exam.seats) {
        let proofs = 0,
          clear = 0,
          windows = 0,
          wasProof = false;
        for (let time = 0; time < 45; time += 0.25) {
          exam.time = time;
          const { pose } = exam.behavior(seat);
          const proof = pose.startsWith('proof-');
          if (proof) {
            assert.ok(seat.guilty);
            proofs++;
            if (!wasProof) windows++;
          }
          if (pose.startsWith('clear-')) clear++;
          wasProof = proof;
        }
        if (seat.guilty) {
          assert.ok(proofs >= 20);
          assert.ok(windows >= 3);
        } else assert.ok(clear >= 20);
      }
    }
});

test('later students briefly hide on arrival, then expose the same scheduled evidence again', () => {
  const exam = new Exam(42, 3),
    seat = exam.seats.find((s) => s.guilty);
  exam.time = seat.first + 2.1;
  assert.match(exam.behavior(seat).pose, /^proof-/);
  exam.observe(seat.id, 0.1);
  assert.equal(exam.behavior(seat).pose, 'write');
  exam.observe(seat.id, 1.5);
  assert.match(exam.behavior(seat).pose, /^proof-/);
  exam.observe(null, 0.1);
  assert.equal(exam.watchTime, 0);
  const normal = exam.seats.find((s) => !s.guilty);
  exam.observe(normal.id, 0.1);
  assert.match(exam.behavior(normal).text, /손을 멈추고/);
  assert.equal(exam.watchWarning(normal.id), false);
});

test('sensitive students warn before a single complaint; leaving or helping prevents pressure', () => {
  const exam = new Exam(42, 4),
    seat = exam.seats.find((s) => s.sensitive);
  exam.observe(seat.id, exam.rules.patience - 2.5);
  assert.ok(exam.watchWarning(seat.id));
  assert.equal(exam.health, 3);
  exam.observe(null, 0.1);
  exam.observe(seat.id, 1);
  assert.equal(exam.watchWarning(seat.id), false);
  exam.observe(seat.id, exam.rules.patience);
  assert.equal(exam.health, 2);
  assert.equal(exam.complaints[0].reason, 'observation');
  exam.observe(seat.id, 20);
  assert.equal(exam.health, 2);
  const request = exam.requests[0];
  exam.seat(request.id).sensitive = true;
  exam.time = request.start;
  exam.observe(request.id, 30);
  assert.equal(exam.health, 2);
});

test('reports are judgments without frame-timing requirements, duplicate accusations never double-charge', () => {
  const exam = new Exam(42, 5),
    culprit = exam.seats.find((s) => s.guilty);
  assert.equal(exam.report(culprit.id).correct, true);
  assert.equal(exam.report(culprit.id), null);
  for (const normal of exam.seats.filter((s) => !s.guilty).slice(0, 3)) {
    assert.equal(exam.report(normal.id).correct, false);
    assert.equal(exam.report(normal.id), null);
  }
  assert.equal(exam.reason, 'health');
  assert.equal(exam.health, 0);
  const time = exam.time;
  exam.step(100);
  assert.equal(exam.time, time);
});

test('request deadlines charge once, active help is protected, and all five stages can finish successfully', () => {
  for (let stage = 1; stage <= 5; stage++) {
    const exam = new Exam(42, stage);
    assert.equal(exam.serve(exam.requests[0].id), false);
    exam.seats.filter((s) => s.guilty).forEach((s) => exam.report(s.id));
    for (const [i, request] of exam.requests.entries()) {
      exam.step(request.start - exam.time);
      if (i === 0) {
        exam.step(request.deadline - exam.time);
        assert.equal(exam.health, 2);
        exam.step(0.5);
        assert.equal(exam.health, 2);
      } else request.helping = true;
      assert.ok(exam.serve(request.id));
      assert.equal(exam.serve(request.id), false);
    }
    assert.equal(exam.over, false);
    exam.step(45);
    assert.equal(exam.reason, 'win');
    assert.equal(exam.result().stage, stage);
    assert.equal(exam.result().served, exam.requests.length);
    assert.equal(exam.health, 2);
  }
});

test('timeout reveals missed cases, and progression only advances on a win and stops at five', () => {
  const exam = new Exam(42, 1);
  exam.step(45);
  assert.equal(exam.reason, 'missed');
  assert.equal(exam.result().missed.length, 2);
  assert.equal(unlockStage(1, exam.result()), 1);
  for (let stage = 1; stage <= 5; stage++)
    assert.equal(unlockStage(stage, { reason: 'win', stage }), Math.min(5, stage + 1));
  assert.equal(unlockStage(4, { reason: 'win', stage: 1 }), 4);
  assert.equal(stageNumber('bad'), 1);
  assert.equal(stageNumber(99), 5);
});

test('the first exam already mixes all six cases and shared fidgets; later windows tighten', () => {
  const kinds = new Set(), normalPoses = new Set(), guiltyPoses = new Set();
  for (let seed = 0; seed < 100; seed++) {
    const exam = new Exam(Math.imul(seed, 2654435761) >>> 0);
    exam.requests = [];
    for (const seat of exam.seats) {
      if (seat.guilty) { kinds.add(seat.kind); assert.ok(seat.first < 9); }
      for (let time = 0; time < 45; time += 0.5) {
        exam.time = time;
        (seat.guilty ? guiltyPoses : normalPoses).add(exam.behavior(seat).pose);
      }
    }
  }
  assert.equal(kinds.size, 6);
  for (const pose of ['sleeve-adjust', 'wrist-rest', 'neck-stretch', 'reread']) {
    assert.ok(normalPoses.has(pose));
    assert.ok(guiltyPoses.has(pose));
  }
  for (let i = 1; i < STAGES.length; i++) {
    assert.ok(STAGES[i].proof < STAGES[i - 1].proof);
    assert.ok(STAGES[i].cycle < STAGES[i - 1].cycle);
    assert.ok(STAGES[i].patience < STAGES[i - 1].patience);
  }
});

test('observation captions never distinguish a cheating prop from its innocent counterpart', () => {
  const exam = new Exam(42);
  exam.requests = [];
  const seat = exam.seats[0];
  seat.first = 1;
  seat.offset = seat.period - 1;
  exam.time = 1 + exam.rules.cue + 0.2;
  for (const kind of STAGES[0].kinds) {
    seat.kind = kind;
    seat.guilty = true;
    assert.equal(exam.behavior(seat).pose, 'proof-' + kind);
    const suspicious = exam.observationText(seat.id);
    seat.guilty = false;
    assert.equal(exam.behavior(seat).pose, 'clear-' + kind);
    assert.equal(exam.observationText(seat.id), suspicious);
  }
});

test('results keep catch times, device kinds and on-time help for records', () => {
  const exam = new Exam(7, 3),
    culprits = exam.seats.filter((s) => s.guilty);
  exam.time = 12.5;
  exam.report(culprits[1].id);
  exam.time = 30;
  exam.report(culprits[0].id);
  const [onTime, late] = exam.requests;
  onTime.done = true;
  late.late = true;
  const result = exam.result();
  assert.deepEqual(result.catches, [
    { kind: culprits[1].kind, time: 12.5 },
    { kind: culprits[0].kind, time: 30 },
  ]);
  assert.equal(result.requests, 2);
  assert.equal(result.helpedOnTime, 1);
  assert.equal(result.caught, 2);
  assert.equal(result.served, 1);
});
