import test from 'node:test';
import assert from 'node:assert/strict';
import { createEngagementAnalytics } from '../src/engagement-analytics.js';
import { createGameAnalytics } from '../src/analytics.js';
import { Exam } from '../src/session.js';

function fixture() {
  const events = [];
  let time = 0;
  const send = (name, data) => events.push({ name, ...data });
  const tracker = createGameAnalytics(send, () => 'round-1');
  const engagement = createEngagementAnalytics(send, () => time);
  const exam = new Exam(42, 2);
  tracker.start(exam, 'lobby');
  return { events, tracker, engagement, exam, tick: ms => time += ms };
}

test('prop totals reconcile to the completed round, including normal denominators', () => {
  const { events, tracker, engagement, exam } = fixture();
  exam.report(exam.seats.find(s => s.guilty).id);
  exam.report(exam.seats.find(s => !s.guilty).id);
  exam.step(exam.duration);
  engagement.finish(exam, tracker.end(exam));
  engagement.finish(exam, tracker.end(exam));
  const props = events.filter(e => e.name === 'prop_result');
  const sum = key => props.reduce((n, e) => n + e[key], 0);
  assert.equal(props.length, new Set(exam.seats.map(s => s.kind)).size);
  assert.equal(sum('culprit_count'), 3);
  assert.equal(sum('normal_count'), 6);
  assert.equal(sum('caught_count'), 1);
  assert.equal(sum('missed_count'), 2);
  assert.equal(sum('false_report_count'), 1);
  assert(props.every(e => e.attempt_id === 'round-1' && !('seed' in e) && !('id' in e)));
});

test('review duration excludes hidden time, preserves attempt and annotates the next same-stage attempt', () => {
  const { events, tracker, engagement, exam, tick } = fixture();
  exam.step(exam.duration);
  engagement.finish(exam, tracker.end(exam));
  const seat = exam.seats.find(s => s.guilty);
  engagement.action('review');
  engagement.review({ seat }, 'open');
  tick(1200);
  engagement.visibility(false);
  tick(60000);
  engagement.visibility(true);
  tick(800);
  engagement.closeReview();
  engagement.closeReview();
  const views = events.filter(e => e.name === 'review_view');
  assert.equal(views.reduce((s, e) => s + e.review_seconds, 0), 2);
  assert(views.every(e => e.prop_type === seat.kind && e.attempt_id === 'round-1'));
  engagement.action('retry');
  assert.equal(events.at(-1).previous_review, 'yes');
  engagement.home();
  const next = new Exam(43, 2);
  tracker.start(next, 'lobby', engagement.nextAttempt(2));
  assert.equal(events.at(-1).previous_review, 'yes');
  assert.deepEqual(engagement.shareContext(), {});
  assert.deepEqual(engagement.nextAttempt(3), { previous_review: 'not_applicable' });
});

test('banner clicks distinguish placement without attaching a stale result to the lobby', () => {
  const { events, tracker, engagement, exam } = fixture();
  exam.step(exam.duration);
  engagement.finish(exam, tracker.end(exam));
  engagement.banner('result');
  assert.equal(events.at(-1).attempt_id, 'round-1');
  engagement.banner('lobby');
  assert.equal(events.at(-1).banner_placement, 'lobby');
  assert.equal(events.at(-1).attempt_id, undefined);
  assert.deepEqual(engagement.nextAttempt(3), { previous_review: 'not_applicable' });
});
