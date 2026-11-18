const kinds = ['glasses', 'ear', 'camera', 'note', 'watch', 'pen'];
// Internal balance data. Stage-specific rules and evidence are never previewed in the UI.
export const STAGES = [
  {
    culprits: 3,
    kinds,
    cue: 0.9,
    proof: 3.4,
    cycle: 8.8,
    jitter: 1.8,
    hide: 0.35,
    sensitive: 1,
    patience: 7,
    requests: [19],
    deadline: 16,
  },
  {
    culprits: 3,
    kinds,
    cue: 0.85,
    proof: 2.9,
    cycle: 8.2,
    jitter: 1.6,
    hide: 0.45,
    sensitive: 2,
    patience: 6.5,
    requests: [15, 29],
    deadline: 14,
  },
  {
    culprits: 4,
    kinds,
    cue: 0.8,
    proof: 2.5,
    cycle: 7.6,
    jitter: 1.4,
    hide: 0.55,
    sensitive: 3,
    patience: 6,
    requests: [12, 28],
    deadline: 13,
  },
  {
    culprits: 4,
    kinds,
    cue: 0.75,
    proof: 2.0,
    cycle: 7.0,
    jitter: 1.2,
    hide: 0.65,
    sensitive: 4,
    patience: 5.5,
    requests: [11, 26],
    deadline: 12,
  },
  {
    culprits: 4,
    kinds,
    cue: 0.7,
    proof: 1.6,
    cycle: 6.4,
    jitter: 1.0,
    hide: 0.75,
    sensitive: 5,
    patience: 5,
    requests: [9, 24],
    deadline: 11.5,
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
