const kinds = ['glasses', 'ear', 'camera', 'note', 'watch', 'pen'];
// The lobby shows the time limit. Culprit counts and clue settings stay hidden.
export const STAGES = [
  {
    rows: 3,
    duration: Infinity,
    culprits: 1,
    tutorial: true,
    kinds,
    deadline: Infinity,
  },
  {
    rows: 3,
    duration: 60,
    culprits: 3,
    kinds,
    cue: 0.9,
    proof: 3.7,
    cycle: 8.8,
    jitter: 1.8,
    hide: 0.35,
    sensitive: 1,
    patience: 7.5,
    requests: [19],
    deadline: 16.5,
  },
  {
    rows: 4,
    duration: 45,
    culprits: 3,
    kinds,
    cue: 0.85,
    proof: 3.1,
    cycle: 8.2,
    jitter: 1.6,
    hide: 0.5,
    sensitive: 2,
    patience: 7,
    requests: [16, 30],
    deadline: 14.5,
  },
  {
    rows: 4,
    duration: 45,
    culprits: 4,
    kinds,
    cue: 0.8,
    proof: 2.5,
    cycle: 7.6,
    jitter: 1.4,
    hide: 0.65,
    sensitive: 3,
    patience: 6.5,
    requests: [13, 27],
    deadline: 12.5,
  },
  {
    rows: 4,
    duration: 45,
    culprits: 4,
    kinds,
    cue: 0.75,
    proof: 1.9,
    cycle: 7,
    jitter: 1.2,
    hide: 0.8,
    sensitive: 4,
    patience: 6,
    requests: [10, 24],
    deadline: 10.5,
  },
];
export const TUTORIAL_TASKS = [
  { id: 1, action: 'catch' },
  { id: 2, action: 'mistake' },
  { id: 3, action: 'serve' },
];
export function stageNumber(value) {
  return Number.isInteger(Number(value)) ? Math.max(1, Math.min(STAGES.length, Number(value))) : 1;
}
export function unlockStage(current, result) {
  return result.reason === 'win'
    ? Math.max(stageNumber(current), Math.min(5, stageNumber(result.stage) + 1))
    : stageNumber(current);
}
