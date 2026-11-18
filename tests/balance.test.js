import test from 'node:test';
import assert from 'node:assert/strict';
import { Exam, EXAM_DURATION } from '../src/session.js';
import { bestPlan } from './helpers/balance-plan.js';

test('45 seconds permits evidence-aligned trips and returns across 1,000 generated exams', () => {
  // Deliberately assumes knowledge of all culprits. This checks physical feasibility,
  // not human difficulty. Ignoring up to two help requests leaves one heart.
  for (let stage = 1; stage <= 5; stage++) {
    for (let seed = 0; seed < 200; seed++) {
      const exam = new Exam(Math.imul(seed, 2654435761) >>> 0, stage), plan = bestPlan(exam);
      assert.ok(plan.finish < EXAM_DURATION - 0.5, `stage ${stage}, seed ${seed}`);
      for (const visit of plan.visits) {
        exam.time = visit.report;
        assert.match(exam.behavior(exam.seat(visit.id)).pose, /^proof-/);
      }
    }
  }
});
