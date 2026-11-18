import test from 'node:test';
import assert from 'node:assert/strict';
import { ACHIEVEMENTS, KINDS, emptyRecords, normalizeRecords, applyResult, seedRecords, progress } from '../src/records.js';

const round = (overrides = {}) => ({
  version: 2,
  duration: 45,
  stage: 3,
  reason: 'win',
  health: 2,
  caught: 3,
  falseCalls: 0,
  complaints: 1,
  requests: 2,
  helpedOnTime: 1,
  catches: [
    { kind: 'glasses', time: 10 },
    { kind: 'ear', time: 21 },
    { kind: 'pen', time: 30 },
  ],
  missed: [],
  ...overrides,
});
const unlockedBy = (result, records = emptyRecords()) => applyResult(records, result).unlocked;

test('ten achievements, one hidden, no beginner badges', () => {
  assert.equal(ACHIEVEMENTS.length, 10);
  assert.deepEqual(
    ACHIEVEMENTS.filter((a) => a.hidden).map((a) => a.id),
    ['tears'],
  );
  for (const id of ['first-exam', 'first-catch', 'first-pass']) assert.ok(!ACHIEVEMENTS.some((a) => a.id === id));
  assert.equal(KINDS.length, 6);
});

test('an ordinary stage-3 pass with a lost life unlocks nothing', () => {
  assert.deepEqual(unlockedBy(round()), []);
});

test('skill badges need stage 3 or higher (close call needs 4)', () => {
  assert.deepEqual(unlockedBy(round({ stage: 2, health: 3 })), []);
  assert.deepEqual(unlockedBy(round({ health: 3 })), ['flawless']);
  assert.deepEqual(unlockedBy(round({ health: 1 })), []);
  assert.deepEqual(unlockedBy(round({ stage: 4, health: 1 })), ['close-call']);
  assert.deepEqual(unlockedBy(round({ helpedOnTime: 2 })), ['kind-teacher']);
  assert.deepEqual(unlockedBy(round({ stage: 2, requests: 1, helpedOnTime: 1 })), []);
});

test('lightning counts the last catch within 20 seconds; buzzer needs the last catch in the final 3', () => {
  const fast = round({ catches: [{ kind: 'note', time: 5 }, { kind: 'ear', time: 12 }, { kind: 'watch', time: 20 }] });
  assert.deepEqual(unlockedBy(fast), ['lightning']);
  assert.deepEqual(unlockedBy({ ...fast, stage: 2 }), []);
  const late = round({ catches: [{ kind: 'note', time: 5 }, { kind: 'ear', time: 12 }, { kind: 'watch', time: 42 }] });
  assert.deepEqual(unlockedBy(late), ['buzzer']);
  assert.deepEqual(unlockedBy({ ...late, catches: late.catches.with(2, { kind: 'watch', time: 41.9 }) }), []);
  assert.deepEqual(unlockedBy({ ...late, reason: 'missed', missed: [{ id: 2, kind: 'cam' }] }), []);
});

test('graduate on a stage-5 pass; hidden tears on three false calls that end the exam', () => {
  assert.ok(unlockedBy(round({ stage: 5 })).includes('graduate'));
  assert.deepEqual(unlockedBy(round({ reason: 'health', health: 0, falseCalls: 3 })), ['tears']);
  assert.deepEqual(unlockedBy(round({ reason: 'health', health: 0, falseCalls: 2, complaints: 1 })), []);
});

test('a streak of five passes unlocks once; a failure resets the streak but keeps the best', () => {
  let records = emptyRecords();
  const unlocked = [];
  for (let i = 0; i < 4; i++) ({ records } = applyResult(records, round({ stage: 1 })));
  assert.equal(progress(records, 'streak-5'), 4);
  ({ records } = applyResult(records, round({ stage: 1, reason: 'missed', missed: [{ id: 1, kind: 'pen' }] })));
  assert.equal(records.streak, 0);
  assert.equal(records.bestStreak, 4);
  for (let i = 0; i < 6; i++) {
    const out = applyResult(records, round({ stage: 1 }));
    records = out.records;
    unlocked.push(...out.unlocked);
  }
  assert.deepEqual(unlocked, ['streak-5']);
  assert.equal(records.bestStreak, 6);
});

test('records count exams, passes, stages, devices and the fastest full catch', () => {
  let { records } = applyResult(emptyRecords(), round());
  ({ records } = applyResult(records, round({ stage: 1, catches: [{ kind: 'glasses', time: 8 }, { kind: 'note', time: 15.25 }], caught: 2 })));
  ({ records } = applyResult(records, round({ stage: 2, reason: 'missed', caught: 1, catches: [{ kind: 'camera', time: 3 }], missed: [{ id: 4, kind: 'pen' }] })));
  assert.equal(records.exams, 3);
  assert.equal(records.wins, 2);
  assert.equal(records.caught, 6);
  assert.equal(records.fastest, 15.25);
  assert.deepEqual(records.stages[0], { played: 1, wins: 1, fastest: 15.25 });
  assert.deepEqual(records.stages[1], { played: 1, wins: 0, fastest: null });
  assert.deepEqual(records.stages[2], { played: 1, wins: 1, fastest: 30 });
  assert.equal(records.kinds.glasses, 2);
  assert.equal(progress(records, 'all-tools'), 5);
  assert.equal(progress(records, 'veteran'), 6);
});

test('device and total-catch badges unlock from cumulative records', () => {
  let records = emptyRecords();
  records.kinds = { glasses: 1, ear: 1, camera: 1, note: 1, watch: 1, pen: 0 };
  records.caught = 98;
  const { unlocked } = applyResult(records, round({ stage: 1, caught: 2, catches: [{ kind: 'pen', time: 9 }, { kind: 'ear', time: 30 }] }));
  assert.deepEqual(unlocked, ['all-tools', 'veteran']);
});

test('new badges stay unseen until viewed and are never awarded twice', () => {
  const first = applyResult(emptyRecords(), round({ health: 3 }));
  assert.deepEqual(first.records.unseen, ['flawless']);
  assert.equal(typeof first.records.unlocked.flawless, 'number');
  assert.deepEqual(applyResult(first.records, round({ health: 3 })).unlocked, []);
});

test('applyResult does not mutate the stored records', () => {
  const records = emptyRecords();
  applyResult(records, round({ health: 3 }));
  assert.deepEqual(records, emptyRecords());
});

test('existing history seeds counts and badges silently; totals, times and devices start empty', () => {
  const history = [
    round({ stage: 5, catches: undefined, requests: undefined, helpedOnTime: undefined }),
    round({ stage: 4, reason: 'missed', missed: [{ id: 3, kind: 'ear' }], catches: undefined }),
    round({ stage: 3, health: 3, catches: undefined }),
  ];
  const records = seedRecords(history);
  assert.equal(records.exams, 3);
  assert.equal(records.wins, 2);
  assert.equal(records.streak, 1);
  assert.equal(records.caught, 0);
  assert.equal(records.falseCalls, 0);
  assert.deepEqual(records.stages[3], { played: 1, wins: 0, fastest: null });
  assert.equal(records.fastest, null);
  assert.equal(records.kinds.glasses, 0);
  assert.ok(records.unlocked.graduate && records.unlocked.flawless);
  assert.deepEqual(records.unseen, []);
});

test('malformed catch entries are skipped instead of throwing', () => {
  const { records } = applyResult(emptyRecords(), round({ catches: [null, { kind: 'toString', time: 3 }, { kind: 'pen', time: 9 }] }));
  assert.equal(records.kinds.pen, 1);
  assert.equal(Object.keys(records.kinds).length, 6);
  assert.doesNotThrow(() => seedRecords([null, round({ catches: [null] })]));
});

test('broken or foreign storage falls back to clean records', () => {
  assert.deepEqual(normalizeRecords(null), emptyRecords());
  assert.deepEqual(normalizeRecords('oops'), emptyRecords());
  const fixed = normalizeRecords({ version: 1, exams: -4, wins: 'x', kinds: { glasses: 3, bogus: 9 }, stages: [{ played: 2, wins: 1, fastest: 'fast' }], unlocked: { flawless: 5, nope: 1 }, unseen: ['flawless', 'nope'] });
  assert.equal(fixed.exams, 0);
  assert.equal(fixed.wins, 0);
  assert.equal(fixed.kinds.glasses, 3);
  assert.ok(!('bogus' in fixed.kinds));
  assert.deepEqual(fixed.stages[0], { played: 2, wins: 1, fastest: null });
  assert.equal(fixed.stages.length, 5);
  assert.deepEqual(Object.keys(fixed.unlocked), ['flawless']);
  assert.deepEqual(fixed.unseen, ['flawless']);
});
