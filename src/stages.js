export const STAGES = [
  {
    title: '첫 감독',
    summary: '손짓보다 손에 든 물건을 살펴보세요.',
    detail: '쪽지와 작은 기기를 구별하는 첫 시험이에요. 손을 든 학생에게는 새 답안지를 건네주세요.',
    culprits: 2,
    kinds: ['note', 'camera'],
    proof: 6,
    cycle: 18,
    mimics: 0,
    hide: 0,
    sensitive: 0,
    patience: 0,
    grace: 8,
    requests: [38],
    deadline: 22,
  },
  {
    title: '닮은 손짓',
    summary: '안경을 만진다고 모두 부정행위는 아니에요.',
    detail: '안경·귀·종이를 만지는 평범한 행동이 섞여요. 물건의 쓰임까지 확인하고 판단하세요.',
    culprits: 3,
    kinds: ['glasses', 'ear', 'camera', 'note'],
    proof: 5.5,
    cycle: 17,
    mimics: 0.55,
    hide: 0,
    sensitive: 0,
    patience: 0,
    grace: 5,
    requests: [28, 64],
    deadline: 18,
  },
  {
    title: '눈치 싸움',
    summary: '다가가면 손을 멈추는 학생이 있어요.',
    detail:
      '학생이 감독관을 보고 잠깐 물건을 감춰요. 짧아진 단서는 다시 나타나니 교실의 움직임을 기억하세요.',
    culprits: 3,
    kinds: ['glasses', 'ear', 'camera', 'note'],
    proof: 4.5,
    cycle: 16,
    mimics: 1,
    hide: 1.4,
    sensitive: 0,
    patience: 0,
    grace: 0,
    requests: [24, 60],
    deadline: 18,
  },
  {
    title: '조용한 순회',
    summary: '오래 머무르면 불편해하는 학생도 있어요.',
    detail:
      '학생이 집중하기 어렵다고 말하면 잠시 물러나 주세요. 계속 지켜보면 민원이 생겨요. 관찰할 행동도 더 많아집니다.',
    culprits: 4,
    kinds: ['glasses', 'ear', 'camera', 'note'],
    proof: 4,
    cycle: 15,
    mimics: 1,
    hide: 1.4,
    sensitive: 3,
    patience: 7.5,
    grace: 0,
    requests: [20, 45, 68],
    deadline: 17,
  },
  {
    title: '마지막 시험',
    summary: '짧은 단서와 겹치는 요청 사이에서 판단하세요.',
    detail:
      '손짓은 더 비슷해지고 물건은 금세 사라져요. 학생의 불편함과 도움 요청을 살피며 관찰 순서를 정하세요.',
    culprits: 4,
    kinds: ['glasses', 'ear', 'camera', 'note'],
    proof: 3.5,
    cycle: 14,
    mimics: 1,
    hide: 1.8,
    sensitive: 4,
    patience: 6.5,
    grace: 0,
    requests: [18, 43, 66],
    deadline: 14,
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
