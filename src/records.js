// Personal records and achievements kept in this browser only. Pure functions: main.js loads and saves.
import { STAGES, stageNumber } from './stages.js';

export const RECORDS_KEY = 'nyangijapgi.records.v1';
export const KINDS = ['glasses', 'ear', 'camera', 'note', 'watch', 'pen'];
export const KIND_LABELS = { glasses: 'AI 안경', ear: '이어폰', camera: '카메라', note: '쪽지', watch: '시계', pen: '카메라 펜' };

// Badge copy names the goal only. It never explains how to tell a cheating prop from its innocent twin.
export const ACHIEVEMENTS = [
  { id: 'flawless', icon: '💚', name: '무결점', desc: '3단계 이상, 생명 3개로 통과' },
  { id: 'lightning', icon: '⚡', name: '번개 감독', desc: '3단계 이상, 20초 안에 전원 적발' },
  { id: 'close-call', icon: '😅', name: '아슬아슬', desc: '4단계 이상, 생명 1개로 통과' },
  { id: 'kind-teacher', icon: '🙋', name: '친절한 선생님', desc: '3단계 이상, 요청 모두 제때' },
  { id: 'buzzer', icon: '⏰', name: '종소리 직전', desc: '마지막 3초에 잡고 통과' },
  { id: 'streak-5', icon: '🔥', name: '5연속 통과', desc: '다섯 번 연달아 통과', goal: 5 },
  { id: 'all-tools', icon: '🧰', name: '도구 박사', desc: '여섯 도구 모두 적발', goal: KINDS.length },
  { id: 'veteran', icon: '🎖️', name: '백전노장', desc: '누적 100명 적발', goal: 100 },
  { id: 'graduate', icon: '🎓', name: '졸업 감독관', desc: '5단계 통과' },
  { id: 'tears', icon: '😭', name: '눈물바다', desc: '오인 신고 세 번으로 실패', hidden: true },
];
const IDS = new Set(ACHIEVEMENTS.map((a) => a.id));

export function emptyRecords() {
  return {
    version: 1,
    exams: 0,
    wins: 0,
    streak: 0,
    bestStreak: 0,
    caught: 0,
    falseCalls: 0,
    complaints: 0,
    fastest: null,
    stages: STAGES.map(() => ({ played: 0, wins: 0, fastest: null })),
    kinds: Object.fromEntries(KINDS.map((kind) => [kind, 0])),
    unlocked: {},
    unseen: [],
  };
}

const count = (value) => (Number.isFinite(value) && value > 0 ? Math.floor(value) : 0);
const seconds = (value) => (Number.isFinite(value) && value >= 0 ? value : null);

export function normalizeRecords(raw) {
  const records = emptyRecords();
  if (!raw || typeof raw !== 'object' || raw.version !== 1) return records;
  for (const key of ['exams', 'wins', 'streak', 'bestStreak', 'caught', 'falseCalls', 'complaints'])
    records[key] = count(raw[key]);
  records.fastest = seconds(raw.fastest);
  records.stages = records.stages.map((empty, i) => {
    const stage = Array.isArray(raw.stages) ? raw.stages[i] : null;
    return stage && typeof stage === 'object'
      ? { played: count(stage.played), wins: count(stage.wins), fastest: seconds(stage.fastest) }
      : empty;
  });
  for (const kind of KINDS) records.kinds[kind] = count(raw.kinds?.[kind]);
  for (const [id, at] of Object.entries(raw.unlocked ?? {})) if (IDS.has(id) && Number.isFinite(at)) records.unlocked[id] = at;
  records.unseen = Array.isArray(raw.unseen) ? raw.unseen.filter((id) => id in records.unlocked) : [];
  return records;
}

export function progress(records, id) {
  if (id === 'streak-5') return records.streak;
  if (id === 'all-tools') return KINDS.filter((kind) => records.kinds[kind] > 0).length;
  if (id === 'veteran') return records.caught;
  return null;
}

// The time the last culprit left, only when every culprit was caught and the exam was passed.
function clearTime(result) {
  const catches = Array.isArray(result.catches) ? result.catches : [];
  if (result.reason !== 'win' || !catches.length || catches.length < result.caught) return null;
  return Math.max(...catches.map((c) => c.time));
}

function earned(records, result) {
  const win = result.reason === 'win',
    stage = stageNumber(result.stage),
    done = clearTime(result),
    duration = Number.isFinite(result.duration) ? result.duration : 45;
  return {
    flawless: win && stage >= 3 && result.health === 3,
    lightning: win && stage >= 3 && done !== null && done <= 20,
    'close-call': win && stage >= 4 && result.health === 1,
    'kind-teacher': win && stage >= 3 && result.requests > 0 && result.helpedOnTime === result.requests,
    buzzer: win && done !== null && done >= duration - 3,
    'streak-5': records.streak >= 5,
    'all-tools': progress(records, 'all-tools') === KINDS.length,
    veteran: records.caught >= 100,
    graduate: win && stage === 5,
    tears: result.reason === 'health' && result.falseCalls >= 3,
  };
}

export function applyResult(previous, result, now = Date.now()) {
  const records = structuredClone(previous),
    win = result.reason === 'win',
    stage = records.stages[stageNumber(result.stage) - 1],
    done = clearTime(result);
  records.exams++;
  stage.played++;
  records.streak = win ? records.streak + 1 : 0;
  records.bestStreak = Math.max(records.bestStreak, records.streak);
  if (win) {
    records.wins++;
    stage.wins++;
  }
  if (done !== null) {
    stage.fastest = stage.fastest === null ? done : Math.min(stage.fastest, done);
    records.fastest = records.fastest === null ? done : Math.min(records.fastest, done);
  }
  records.caught += count(result.caught);
  records.falseCalls += count(result.falseCalls);
  records.complaints += count(result.complaints);
  for (const { kind } of Array.isArray(result.catches) ? result.catches : []) if (kind in records.kinds) records.kinds[kind]++;
  const flags = earned(records, result);
  const unlocked = ACHIEVEMENTS.filter((a) => flags[a.id] && !records.unlocked[a.id]).map((a) => a.id);
  for (const id of unlocked) records.unlocked[id] = now;
  records.unseen.push(...unlocked);
  return { records, unlocked };
}

// History is newest first. Older rounds have no catch times or devices, so those start empty.
export function seedRecords(history, now = Date.now()) {
  let records = emptyRecords();
  for (const result of [...history].reverse()) records = applyResult(records, result, now).records;
  records.unseen = [];
  return records;
}
