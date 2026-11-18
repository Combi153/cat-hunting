import { STAGES } from './stages.js';
import { TYPES, seatNo, MAX_HEALTH } from './session.js';
const lines = {
  book: '<path d="M4 4h14a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V4Zm4 0v16m3-11h6m-6 4h5"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  play: '<path d="m7 4 13 8-13 8z" fill="currentColor" stroke="none"/>',
  sound: '<path d="m11 5-5 4H3v6h3l5 4zM15 9a4 4 0 0 1 0 6m2-9a8 8 0 0 1 0 12"/>',
  mute: '<path d="m11 5-5 4H3v6h3l5 4zM16 9l5 6m0-6-5 6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.6 2.6 0 1 1 3.4 2.4c-.8.4-.9.8-.9 2M12 16h.01"/>',
  clock: '<circle cx="12" cy="13" r="8.5"/><path d="M12 8v5l3 2M9 2h6"/>',
  seat: '<path d="M7 4h10v8H7zM5 14h14v3H5zM7 18v3m10-3v3"/>',
  school: '<path d="m3 10 9-7 9 7M5 10v10h14V10m-9 10v-6h4v6"/>',
  keys: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M8 15h8"/>',
  mouse: '<rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 6v4"/>',
  check: '<path d="m4 12 5 5 11-12"/>',
  pause: '<path d="M8 5v14m8-14v14" stroke-width="3"/>',
  x: '<path d="m6 6 12 12m0-12L6 18"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="2.7"/>',
  paper: '<path d="M5 3h11l3 3v15H5zM9 10h6m-6 4h6"/>',
  foot: '<ellipse cx="9" cy="8" rx="3" ry="5" transform="rotate(-18 9 8)"/><circle cx="11" cy="16" r="1.6"/><ellipse cx="17" cy="13" rx="2.4" ry="4" transform="rotate(15 17 13)"/>',
  hand: '<path d="M6 12V7a1.5 1.5 0 0 1 3 0v4-6a1.5 1.5 0 0 1 3 0v6-7a1.5 1.5 0 0 1 3 0v7-5a1.5 1.5 0 0 1 3 0v8c0 5-3 7-6 7-2 0-4-1-5-3l-4-5c-1-2 1-3 2-2l3 2"/>',
  flag: '<path d="M5 21V3m0 1c5-4 9 4 15 0v9c-6 4-10-4-15 0"/>',
  pencil: '<path d="m4 16 11-11 4 4L8 20l-5 1zM13 7l4 4"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
};
export const icon = (name, size = 19) =>
  '<svg aria-hidden="true" width="' +
  size +
  '" height="' +
  size +
  '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
  lines[name] +
  '</svg>';

export function hearts(health) {
  return (
    '<span class="hearts" role="img" aria-label="생명 ' +
    health +
    '개">' +
    Array.from(
      { length: MAX_HEALTH },
      (_, i) => '<span class="' + (i < health ? 'alive' : 'lost') + '" aria-hidden="true">♥</span>',
    ).join('') +
    '</span>'
  );
}
export function lobby(saved, selected = 1) {
  const stage = STAGES[selected - 1];
  const wins = saved.history.filter((round) => round.reason === 'win').length;
  return `<div class="lobby-wrap">
    <header class="topline"><span class="brand"><img src="/cat.svg" alt="">90초 시험 감독</span>
    <button class="icon-btn" data-action="sound" aria-label="${saved.muted ? '소리 켜기' : '소리 끄기'}">${icon(saved.muted ? 'mute' : 'sound')}</button></header>
    <div class="cover-art" role="img" aria-label="점토 교실에서 안경을 고쳐 쓰는 학생"></div>
    <section class="cover-copy"><p class="eyebrow">다섯 번의 시험, 깊어지는 의심</p><h1>냥이잡기</h1>
    <p class="lead">평범한 손짓일까, 몰래 보는 정답일까?</p>
    <div class="rules"><span>${icon('clock')} 1분 30초</span><span>${hearts(3)} 생명 3개</span></div>
    <p class="how">학생을 탭하면 감독관이 다가가요. 잘 살펴본 뒤 신고해 주세요.<br>손을 든 학생도 도와주며, 종이 울릴 때까지 교실을 지켜요.</p>
    <nav class="stage-picker" aria-label="시험 단계">${STAGES.map((item, i) => `<button data-level="${i + 1}" aria-label="${i + 1}단계 ${item.title}${i + 1 > saved.unlocked ? ', 이전 단계 통과 후 열림' : ''}" aria-pressed="${selected === i + 1}" ${i + 1 > saved.unlocked ? 'disabled' : ''}><small>시험</small><b>${String(i + 1).padStart(2, '0')}</b>${i + 1 > saved.unlocked ? '<span aria-hidden="true">잠김</span>' : '<span aria-hidden="true">도전</span>'}</button>`).join('')}</nav>
    <div class="stage-brief"><p class="eyebrow">${selected} / 5 단계 · ${stage.title}</p><h2>${stage.summary}</h2><p>${stage.detail}</p></div>
    ${saved.completed ? '<p class="campaign-clear">다섯 번의 시험을 모두 지켜냈어요. 원하는 단계를 다시 즐겨보세요.</p>' : ''}
    <button class="primary start-btn" data-action="start">${selected}단계 감독 시작 ${icon('arrow')}</button>
    ${saved.history.length ? `<p class="last-round">최근 ${saved.history.length}판 중 ${wins}번 성공 · 이번엔 새로운 배치예요.</p>` : ''}
    </section></div>`;
}
export function hud(stage = 1) {
  return `<header class="hud-top"><div id="health">${hearts(3)}</div><strong id="time">01:30</strong>
    <button class="icon-btn" data-action="pause" aria-label="일시정지">${icon('pause')}</button></header>
    <div class="round-status"><span>${stage} / 5 단계 · ${STAGES[stage - 1].title}</span><span>종이 울릴 때까지</span></div>`;
}
export function inspection(exam, id, busy = '') {
  if (busy === 'returning')
    return '<div class="overview-copy"><h2>교탁으로 돌아가고 있어요</h2><p>자리로 돌아온 뒤 다시 학생을 살펴볼 수 있어요.</p></div>';
  const seat = exam.seat(id);
  if (!seat)
    return `<div class="overview-copy"><h2>누가 몰래 답을 보고 있을까요?</h2><p>학생을 탭해 다가가세요. 손을 든 학생도 살펴주세요.</p></div>`;
  if (busy)
    return `<div class="inspection-heading"><button class="back" data-action="overview" ${busy === 'helping' ? 'disabled' : ''}>‹ 교실</button><h2>${seatNo(id)}번 학생</h2><span>${busy === 'helping' ? '돕는 중' : '이동 중'}</span></div><p class="clue" aria-live="polite"></p><p class="decision-hint">${busy === 'helping' ? '잠시만 기다려 주세요.' : '학생 곁에 도착하면 자세히 살펴볼 수 있어요.'}</p>`;
  const request = exam.requestFor(id);

  return `<div class="inspection-heading"><button class="back" data-action="overview" aria-label="교실로 돌아가기">‹ 교실</button><h2>${seatNo(id)}번 학생</h2><span>${seat.caught ? '적발 완료' : seat.cleared ? '오해였어요' : '관찰 중'}</span></div>
    <p class="clue" aria-live="polite"></p>
    <div class="decision">
    <button class="secondary" data-action="next">다음 학생 ›</button>
    ${
      request
        ? `<button class="primary" data-action="serve">${request.type === 'paper' ? '새 답안지 건네기' : '커튼 닫아주기'}</button>`
        : `<button class="${seat.cleared ? 'secondary' : 'report'}" data-action="report" ${seat.caught || seat.cleared ? 'disabled' : ''}>${seat.caught ? '퇴실 조치 완료' : seat.cleared ? '확인 완료' : '신고하기'}</button>`
    }
    </div><p class="decision-hint">${request ? '도움이 필요한 학생이에요.' : '학생 화면을 탭하면 교실로 돌아가요.'}</p>`;
}
export function ending(result) {
  const win = result.reason === 'win';
  const villain = result.missed[0];
  const finalStage = win && result.stage === 5;
  const title = finalStage
    ? '다섯 번의 시험, 모두 통과!'
    : win
      ? result.stage + '단계 통과!'
      : result.reason === 'health'
        ? '감독 실패!'
        : '들키지 않았지!';
  const explanation = win
    ? '부정행위를 모두 찾아냈어요. 시험이 무사히 끝났어요.'
    : result.reason === 'health'
      ? '거듭된 오해와 기다림에 교실의 신뢰를 잃었어요.'
      : '종이 울렸어요. 부정행위자가 끝까지 남아 있었어요.';
  return `<div class="ending-title"><p class="eyebrow">${result.stage} / 5 단계 · ${win ? '감독 성공' : '감독 실패'}</p><h1>${title}</h1></div>
    <div class="ending-bottom"><p class="ending-line">${villain ? seatNo(villain.id) + '번 “' + TYPES[villain.kind].taunt + '”' : win ? '“모두 수고했어요!”' : '“다음 시험은 꼭 지켜낼 거예요.”'}</p>
    <p>${explanation}</p>
    <div class="end-stats"><span>적발 <b>${result.caught}/${result.caught + result.missed.length}</b></span><span>오인 <b>${result.falseCalls}</b></span><span>민원 <b>${result.complaints}</b></span></div>
    ${villain ? `<details><summary>놓친 단서 보기</summary>${result.missed.map((seat) => `<p><b>${seatNo(seat.id)}번</b> ${TYPES[seat.kind].proof}</p>`).join('')}</details>` : ''}
    ${win && !finalStage ? `<div class="next-brief"><b>다음 시험 · ${STAGES[result.stage].title}</b><p>${STAGES[result.stage].detail}</p></div><button class="primary" data-action="advance">${result.stage + 1}단계 도전 ${icon('arrow')}</button><button class="text-btn" data-action="start">이 단계 다시 하기</button>` : finalStage ? '<button class="primary" data-action="home">다섯 시험 돌아보기</button><button class="text-btn" data-action="start">마지막 시험 다시 하기</button>' : `<button class="primary" data-action="start">${result.stage}단계 다시 도전 ${icon('arrow')}</button>`}
    <button class="text-btn" data-action="home">처음으로</button></div>
    ${win ? '<div class="confetti" aria-hidden="true">' + Array.from({ length: 24 }, (_, i) => '<i style="--i:' + i + '"></i>').join('') + '</div>' : ''}`;
}
