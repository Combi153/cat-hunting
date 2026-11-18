import { STAGES } from './stages.js';
import { TYPES, seatNo, MAX_HEALTH } from './session.js';
import { ACHIEVEMENTS, KINDS, KIND_LABELS, progress } from './records.js';
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
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4m8-4h3a3 3 0 0 1-3 4M12 13v4m-4 3h8m-6-3h4"/>',
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
// Direct sponsor link; placement identifies the originating screen in UTM reports.
function sponsorBanner(placement) {
  return `<aside class="sponsor-banner" aria-label="생각하는 공간 홍보">
    <p class="sponsor-banner-label">홍보</p>
    <a class="sponsor-banner-link" href="https://thinkplace.co.kr/?utm_source=cat_hunting&amp;utm_medium=banner&amp;utm_campaign=thinkplace&amp;utm_content=${placement}" target="_blank" rel="noopener noreferrer sponsored" aria-label="생각하는 공간 홈페이지 — 수업 알아보기 (새 탭)">
      <picture>
        <source srcset="/thinkplace/thinkplace-banner.webp" type="image/webp">
        <img src="/thinkplace/thinkplace-banner.png" width="2172" height="724" alt="생각하는 공간. 다음은 당신 차례. 교대역 · 고등 국어 · 공부법. 수업 알아보기. thinkplace.co.kr" loading="lazy" decoding="async">
      </picture>
    </a>
  </aside>`;
}
export function lobby(saved, selected = 1, records = null) {
  const fresh = records?.unseen.length > 0;
  return `<div class="lobby-wrap">
    <header class="topline"><span class="brand"><img src="/cat.svg" alt="">45초 시험 감독</span>
    <span class="top-actions"><button class="icon-btn records-btn" data-action="records" aria-label="기록실${fresh ? ', 새 업적 있음' : ''}">${icon('trophy')}${fresh ? '<i class="new-dot" aria-hidden="true"></i>' : ''}</button>
    <button class="icon-btn" data-action="sound" aria-label="${saved.muted ? '소리 켜기' : '소리 끄기'}">${icon(saved.muted ? 'mute' : 'sound')}</button></span></header>
    <div class="cover-art" role="img" aria-label="점토 교실에서 안경을 고쳐 쓰는 학생"></div>
    <section class="cover-copy"><h1>냥이잡기</h1>
    <p class="lead">종이 울리기 전에 부정행위를 모두 찾아내세요.</p>
    <div class="rules"><span>${icon('clock')} 45초</span><span>${hearts(3)} 생명 3개</span></div>
    <p class="how">학생을 눌러 가까이에서 살펴보세요.<br>부정행위를 발견하면 신고하고,<br>손을 든 학생의 요청도 들어주세요.</p>
    <nav class="stage-picker" aria-label="시험 단계">${STAGES.map((item, i) => `<button data-level="${i + 1}" aria-label="${i + 1}단계${i + 1 > saved.unlocked ? ', 이전 단계 통과 후 열림' : ''}" aria-pressed="${selected === i + 1}" ${i + 1 > saved.unlocked ? 'disabled' : ''}><b>${String(i + 1).padStart(2, '0')}</b>${i + 1 > saved.unlocked ? '<span aria-hidden="true">잠김</span>' : ''}</button>`).join('')}</nav>
    ${saved.completed ? '<p class="campaign-clear">모든 단계 통과!</p>' : ''}
    <button class="primary start-btn" data-action="start">${selected}단계 감독 시작 ${icon('arrow')}</button>
    ${sponsorBanner('lobby')}
    </section>
    <footer class="creator-credit">
      <p>만든 사람 <strong>후추</strong></p>
      <a href="mailto:hodooo153@gmail.com">hodooo153@gmail.com</a>
    </footer></div>`;
}
export function hud(stage = 1) {
  return `<header class="hud-top"><div id="health">${hearts(3)}</div><strong id="time">00:45</strong>
    <button class="icon-btn" data-action="pause" aria-label="일시정지">${icon('pause')}</button></header>
    <div class="round-status"><span>${stage} / 5 단계</span></div>`;
}
export function inspection(exam, id, busy = '') {
  if (busy === 'returning')
    return '<div class="overview-copy"><h2>교탁으로 돌아가고 있어요</h2><p>다른 학생을 눌러 바로 이동</p></div>';
  const seat = exam.seat(id);
  if (!seat)
    return '<div class="overview-copy"><h2>학생을 눌러 관찰하세요.</h2></div>';
  if (busy)
    return `<div class="inspection-heading"><button class="back" data-action="overview" ${busy === 'helping' ? 'disabled' : ''}>‹ 교실</button><h2>${seatNo(id)}번 학생</h2><span>${busy === 'helping' ? '돕는 중' : '이동 중'}</span></div><p class="clue" aria-live="polite"></p>`;
  const request = exam.requestFor(id);

  return `<div class="inspection-heading"><button class="back" data-action="overview" aria-label="교실로 돌아가기">‹ 교실</button><h2>${seatNo(id)}번 학생</h2></div>
    <p class="clue" aria-live="polite"></p>
    <div class="decision">
    <button class="secondary" data-action="next">다음 학생 ›</button>
    ${
      request
        ? `<button class="primary" data-action="serve">${request.type === 'paper' ? '새 답안지 건네기' : '커튼 닫아주기'}</button>`
        : `<button class="${seat.cleared ? 'secondary' : 'report'}" data-action="report" ${seat.caught || seat.cleared ? 'disabled' : ''}>${seat.caught ? '퇴실 조치 완료' : seat.cleared ? '확인 완료' : '신고하기'}</button>`
    }
    </div>${request ? '' : '<p class="decision-hint">화면을 누르면 교실로 돌아가요.</p>'}`;
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
    ? ''
    : result.reason === 'health'
      ? '오인과 민원으로 생명이 모두 소진됐어요.'
      : '놓친 부정행위자가 있어요.';
  return `<div class="ending-title"><p class="eyebrow">${result.stage} / 5 단계</p><h1>${title}</h1></div>
    <div class="ending-bottom"><p class="ending-line">${villain ? seatNo(villain.id) + '번 “' + TYPES[villain.kind].taunt + '”' : win ? '“모두 수고했어요!”' : '“다음 시험은 꼭 지켜낼 거예요.”'}</p>
    ${explanation ? `<p>${explanation}</p>` : ''}
    <div class="end-stats"><span>적발 <b>${result.caught}/${result.caught + result.missed.length}</b></span><span>오인 <b>${result.falseCalls}</b></span><span>민원 <b>${result.complaints}</b></span></div>
    ${newBadge(result.achievements)}
    ${!win ? '<button class="secondary review-open" data-action="review">부정행위 다시 보기</button>' : ''}
    ${win && !finalStage ? `<button class="primary" data-action="advance">${result.stage + 1}단계 도전 ${icon('arrow')}</button><button class="text-btn" data-action="start">이 단계 다시 하기</button>` : finalStage ? '<button class="primary" data-action="home">다른 단계 다시 하기</button><button class="text-btn" data-action="start">마지막 시험 다시 하기</button>' : `<button class="primary" data-action="start">${result.stage}단계 다시 도전 ${icon('arrow')}</button>`}
    <button class="secondary share-open" data-action="share">친구에게 공유하기</button>
    <button class="text-btn" data-action="home">처음으로</button>${sponsorBanner('result')}</div>
    ${win ? '<div class="confetti" aria-hidden="true">' + Array.from({ length: 24 }, (_, i) => '<i style="--i:' + i + '"></i>').join('') + '</div>' : ''}`;
}

export function review({ seat, index, total }) {
  return `<section class="review-panel" aria-label="부정행위 다시 보기">
    <p class="eyebrow">부정행위 다시 보기 · ${index + 1} / ${total}</p>
    <h2 aria-live="polite">${seatNo(seat.id)}번 · ${TYPES[seat.kind].name}</h2>
    <nav class="review-nav" aria-label="다시 볼 학생">
      <button class="secondary" data-action="review-prev" ${total < 2 ? 'disabled' : ''}>‹ 이전</button>
      <button class="secondary" data-action="review-next" ${total < 2 ? 'disabled' : ''}>다음 ›</button>
    </nav>
    <button class="text-btn" data-action="review-close">결과로 돌아가기</button>
  </section>`;
}

const byId = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
const secs = (value) => (value === null ? '—' : value.toFixed(1) + '초');

// A single passive line under the result stats; the next-stage button keeps its place.
function newBadge(ids = []) {
  if (!ids?.length) return '';
  const first = byId[ids[0]];
  return `<p class="new-badge"><span class="badge-icon" aria-hidden="true">${first.icon}</span><b><em>새 업적</em> ${first.name}</b><span>${ids.length > 1 ? '외 ' + (ids.length - 1) + '개' : first.desc}</span></p>`;
}

function statsTab(records, saved) {
  const rate = records.exams ? ' · ' + Math.round((records.wins / records.exams) * 100) + '%' : '';
  const stages = records.stages
    .map((stage, i) => {
      const locked = i + 1 > saved.unlocked && !stage.played;
      const tries = stage.wins ? `통과 ${stage.wins}번` : stage.played ? `도전 ${stage.played}번` : locked ? '잠김' : '아직 도전 전';
      const best = stage.fastest !== null ? `<b>${secs(stage.fastest)}</b>` : `<span>${stage.played && !stage.wins ? '아직 통과 전' : '—'}</span>`;
      return `<li class="${stage.wins ? '' : 'dim'}"><span class="lv">${i + 1}단계</span><span>${tries}</span>${best}</li>`;
    })
    .join('');
  const recent = saved.history.filter((round) => Number.isInteger(round.stage)).slice(0, 10);
  return `<div class="stat-grid">
      <p><span>감독한 시험</span><b>${records.exams}번</b></p>
      <p><span>통과</span><b>${records.wins}번${rate}</b></p>
      <p><span>최고 연속 통과</span><b>${records.bestStreak}번</b></p>
      <p><span>가장 빠른 전원 적발</span><b>${secs(records.fastest)}</b></p>
    </div>
    <h2>단계별</h2><ul class="record-card stage-list">${stages}</ul>
    <h2>최근 ${recent.length || 10}번 <small>숫자는 단계, 왼쪽이 최근</small></h2>
    <div class="record-card">${
      recent.length
        ? `<ol class="recent-dots" aria-label="최근 시험 결과">${recent.map((round) => `<li class="${round.reason === 'win' ? 'pass' : 'fail'}" aria-label="${round.stage}단계 ${round.reason === 'win' ? '통과' : '실패'}">${round.stage}</li>`).join('')}</ol>`
        : '<p class="empty">아직 기록이 없어요.</p>'
    }</div>
    <h2>잡아낸 도구</h2>
    <ul class="record-card tool-grid">${KINDS.map((kind) => `<li><b>${records.kinds[kind]}</b><span>${KIND_LABELS[kind]}</span></li>`).join('')}</ul>
    <h2>감독 습관</h2>
    <ul class="record-card habit-list"><li><span>누적 적발</span><b>${records.caught}명</b></li><li><span>오인 신고</span><b>${records.falseCalls}번</b></li><li><span>민원</span><b>${records.complaints}번</b></li></ul>`;
}

function badgesTab(records) {
  const shown = ACHIEVEMENTS.filter((a) => !a.hidden || records.unlocked[a.id]);
  const secret = ACHIEVEMENTS.some((a) => a.hidden && !records.unlocked[a.id]);
  return `<ul class="badge-grid">${shown
    .map((a) => {
      const got = Boolean(records.unlocked[a.id]),
        isNew = records.unseen.includes(a.id),
        value = progress(records, a.id);
      const detail =
        !got && a.id === 'streak-5'
          ? `지금 ${value}번`
          : !got && a.goal
            ? `${a.desc} ${Math.min(value, a.goal)}/${a.goal}`
            : a.desc;
      const bar = !got && a.goal ? `<i class="badge-bar"><i style="width:${Math.min(100, (value / a.goal) * 100)}%"></i></i>` : '';
      return `<li class="${got ? 'got' : 'locked'}${isNew ? ' fresh' : ''}" aria-label="${a.name}${got ? ', 획득' : ', 아직'}${isNew ? ', 새 업적' : ''}"><span class="badge-icon" aria-hidden="true">${a.icon}</span><b>${a.name}</b><small>${detail}</small>${bar}</li>`;
    })
    .join('')}</ul>${secret ? '<p class="secret-note">❓ 숨은 업적이 하나 더 있어요</p>' : ''}`;
}

export function recordsScreen(records, saved, tab = 'stats') {
  const got = Object.keys(records.unlocked).length;
  return `<div class="records-wrap">
    <header class="records-head"><button class="text-btn" data-action="home">‹ 처음으로</button><h1>기록실</h1><span></span></header>
    <div class="records-tabs" role="tablist" aria-label="기록실">
      <button role="tab" data-action="records" aria-selected="${tab === 'stats'}">기록</button>
      <button role="tab" data-action="records-badges" aria-selected="${tab === 'badges'}">업적 ${got}/${ACHIEVEMENTS.length}</button>
    </div>
    <section role="tabpanel" class="records-panel">${tab === 'badges' ? badgesTab(records) : statsTab(records, saved)}</section>
  </div>`;
}
