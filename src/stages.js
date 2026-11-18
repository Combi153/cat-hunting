const kinds = ['glasses', 'ear', 'camera', 'note', 'watch', 'pen'];
// Internal balance data. Stage-specific rules and evidence are never previewed in the UI.
// Difficulty 1–5 was anchored on the previous first exam at stage 2. Continuous pressures
// advance in equal steps; all stages now have slightly longer evidence and grace windows.
export const STAGES = [
  {
    culprits: 2,
    kinds,
    cue: 0.95,
    proof: 4.3,
    cycle: 9.4,
    jitter: 2,
    hide: 0.2,
    sensitive: 0,
    patience: 8,
    requests: [22],
    deadline: 18.5,
  },
  {
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
export function stageNumber(value) {
  return Number.isInteger(Number(value)) ? Math.max(1, Math.min(STAGES.length, Number(value))) : 1;
}
export function unlockStage(current, result) {
  return result.reason === 'win'
    ? Math.max(stageNumber(current), Math.min(5, stageNumber(result.stage) + 1))
    : stageNumber(current);
}
