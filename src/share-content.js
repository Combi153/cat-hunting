export const PUBLIC_GAME_URL = 'https://cat-hunting.vercel.app/';

// Only a stage and outcome leave the device. No history, seed or culprit data.
export function shareContent(result) {
  if (!result) return {
    title: '냥이잡기 · 45초 시험 감독',
    text: '45초 안에 부정행위를 찾아라! 너는 몇 단계까지 가능해?',
    url: PUBLIC_GAME_URL,
    image: 'art/exam-keyart.jpg',
  };
  const stage = Math.max(1, Math.min(5, Math.trunc(Number(result.stage)) || 1));
  const win = result.reason === 'win';
  const complete = win && stage === 5;
  return {
    title: complete ? '다섯 단계 모두 통과! · 냥이잡기' : `${stage}단계 ${win ? '통과!' : '도전 중!'} · 냥이잡기`,
    text: complete ? '냥이잡기 5단계까지 모두 잡았다! 너도 전부 찾아낼 수 있어?'
      : win ? `나는 냥이잡기 ${stage}단계 통과! 너는 어디까지 갈 수 있어?`
      : `나는 냥이잡기 ${stage}단계에서 막혔어. 너는 부정행위자를 모두 잡을 수 있어?`,
    url: `${PUBLIC_GAME_URL}share/${complete ? 'complete' : `stage-${stage}-${win ? 'win' : 'missed'}`}/`,
    image: `share-images/${complete ? 'complete' : `stage-${stage}-${win ? 'win' : 'missed'}`}.jpg`,
  };
}
export const SHARE_RESULTS = Array.from({length: 5}, (_, i) => [
  { stage: i + 1, reason: 'missed' }, { stage: i + 1, reason: 'win' },
]).flat();
