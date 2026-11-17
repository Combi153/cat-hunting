import {TYPES,MODES,seatNo,clock} from './session.js';
const lines={
  book:'<path d="M4 4h14a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V4Zm4 0v16m3-11h6m-6 4h5"/>',
  arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',
  play:'<path d="m7 4 13 8-13 8z" fill="currentColor" stroke="none"/>',
  sound:'<path d="m11 5-5 4H3v6h3l5 4zM15 9a4 4 0 0 1 0 6m2-9a8 8 0 0 1 0 12"/>',
  mute:'<path d="m11 5-5 4H3v6h3l5 4zM16 9l5 6m0-6-5 6"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.6 2.6 0 1 1 3.4 2.4c-.8.4-.9.8-.9 2M12 16h.01"/>',
  clock:'<circle cx="12" cy="13" r="8.5"/><path d="M12 8v5l3 2M9 2h6"/>',
  seat:'<path d="M7 4h10v8H7zM5 14h14v3H5zM7 18v3m10-3v3"/>',
  school:'<path d="m3 10 9-7 9 7M5 10v10h14V10m-9 10v-6h4v6"/>',
  keys:'<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M8 15h8"/>',
  mouse:'<rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 6v4"/>',
  check:'<path d="m4 12 5 5 11-12"/>',
  pause:'<path d="M8 5v14m8-14v14" stroke-width="3"/>',
  x:'<path d="m6 6 12 12m0-12L6 18"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="2.7"/>',
  paper:'<path d="M5 3h11l3 3v15H5zM9 10h6m-6 4h6"/>',
  foot:'<ellipse cx="9" cy="8" rx="3" ry="5" transform="rotate(-18 9 8)"/><circle cx="11" cy="16" r="1.6"/><ellipse cx="17" cy="13" rx="2.4" ry="4" transform="rotate(15 17 13)"/>',
  hand:'<path d="M6 12V7a1.5 1.5 0 0 1 3 0v4-6a1.5 1.5 0 0 1 3 0v6-7a1.5 1.5 0 0 1 3 0v7-5a1.5 1.5 0 0 1 3 0v8c0 5-3 7-6 7-2 0-4-1-5-3l-4-5c-1-2 1-3 2-2l3 2"/>',
  flag:'<path d="M5 21V3m0 1c5-4 9 4 15 0v9c-6 4-10-4-15 0"/>',
  pencil:'<path d="m4 16 11-11 4 4L8 20l-5 1zM13 7l4 4"/>',
  pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/>'
};
export const icon=(name,size=19)=>'<svg aria-hidden="true" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+lines[name]+'</svg>';
const key=k=>'<kbd>'+k+'</kbd>';
const pill=(a,label,iconName)=>'<button class="pill" data-action="'+a+'">'+icon(iconName)+label+'</button>';
export const requestName=r=>r.type==='paper'?'답안지 교체':'커튼 조정';
export function lobby(mode,history,muted) {
  const exam=MODES[mode],last=history[0];
  return `<div class="lobby-wrap">
    <header class="topline"><div class="schoolbrand"><img src="/cat.svg" width="36" height="36" alt=""><span>제3시험실</span></div><nav>${pill('sound',muted?'소리 꺼짐':'소리 켜짐',muted?'mute':'sound')}${pill('help','게임 방법','help')}</nav></header>
    <section class="cover">
      <div class="cover-art" role="img" aria-label="흰색 클레이 시험실에서 안경을 고쳐 쓰는 학생과 뒤에서 관찰하는 감독관"></div>
      <div class="cover-copy"><div class="subject"><span></span>수능 시험 감독 시뮬레이션</div>
      <h1>냥이잡기</h1><p class="lead">조용한 시험실, 수상한 손동작.<br>오늘의 감독관은 당신입니다.</p>
      <div class="mode-tabs" role="group" aria-label="시험 선택">${['exam','practice'].map(m=>`<button data-mode="${m}" aria-pressed="${mode===m}">${MODES[m].name}<small>${m==='exam'?'3분':'1분'}</small></button>`).join('')}</div>
      <button class="primary start-btn" data-action="start">${icon('play',16)} 감독 시작 ${icon('arrow',19)}</button>
      </div><div class="cover-tag">${icon('pin',14)} 제3시험실</div>
    </section>
    <div class="room-strip"><span class="subject-name"><i></i>1교시 · 국어 영역</span><span>${icon('clock',16)} ${exam.duration/60}분</span><span>${icon('seat',16)} ${exam.count}석</span><span class="single">싱글플레이</span></div>
    <section class="lobby-bottom"><div class="guide"><h2>${icon('keys')}기본 조작</h2><div class="guide-keys"><span>${key('WASD')} 이동</span><span>${icon('mouse',18)} 드래그로 둘러보기</span><span>${key('E')} 관찰</span><span>${key('Tab')} 일지</span></div><div class="guide-touch">왼쪽 엄지로 이동 · 오른쪽 드래그로 시선 회전</div></div>
    <button class="record-link" data-action="history"><div><h2>${icon('book')}감독 일지</h2><small>${last?'최근 '+MODES[last.mode].name+' · '+last.score+'점':'시험을 마치면 기록이 쌓입니다.'}</small></div>${icon('arrow')}</button></section>
    </div>`;
}
export function hudTop(mode,muted) {
  return `<header class="hud-top"><div class="hud-id"><img src="/cat.svg" alt=""><div><b>제3시험실</b><small>1교시 · 국어 · ${MODES[mode].name}</small></div></div>
  <div class="hud-tools"><div class="timer">${icon('clock')}<strong id="time">${clock(MODES[mode].duration)}</strong></div><button data-action="journal" title="감독 일지 (Tab)" aria-label="감독 일지">${icon('book')}</button><button data-action="pause" title="일시정지 (Esc)" aria-label="일시정지">${icon('pause')}</button></div></header>
  <div id="tasks"></div><div id="feedback"></div><div id="context"></div><div id="hints"></div>`;
}
export function help() {
  return `<div class="modal-icon">${icon('keys',23)}</div><h2>감독관 수첩</h2><p class="intro">학생의 손을 살피고, 직접 본 장면을 근거로 판단하세요.</p>
  <div class="help-lines"><p><b>걷기와 둘러보기</b><span>WASD·방향키로 이동하고 화면을 드래그해 시선을 돌립니다. Q / R로도 좌우를 볼 수 있습니다. Shift를 누르면 조용히 걷습니다.</span></p>
  <p><b>관찰하고 기록하기</b><span>학생 곁에서 바라보고 E를 누르세요. 책상 옆으로 비켜서면 손에 든 물건이 보입니다. F로 본 행동을 기록하고 Tab으로 일지를 열어 지목하세요.</span></p>
  <p><b>요청과 민원</b><span>손을 든 학생을 관찰해 요청을 확인하세요. 답안지는 앞쪽 교탁에서, 커튼은 창가 가운데에서 처리합니다. 같은 자리를 자꾸 왕복하면 학생의 집중이 흐트러집니다.</span></p>
  <p><b>터치 기기</b><span>왼쪽 조이스틱으로 걷고 교실 화면을 드래그하세요. 가까운 학생을 탭하거나 행동 버튼으로 관찰합니다.</span></p></div>
  <button class="primary wide" data-action="close">확인</button>`;
}
export function journal(e,id,type,note) {
  const s=e.seat(id), notes=s?.notes??[];
  const selected=notes.find(n=>n.key===note);
  const repeat=s?.attempts.includes(type+'/'+note);
  return `<div class="eyebrow">제3시험실 · 현장 기록</div><h2>감독 일지</h2>
  <div class="seat-grid">${e.seats.map(v=>`<button data-seat="${v.id}" class="${id===v.id?'selected':''} ${v.notes.length?'inked':''}" title="${v.id}번 좌석">${seatNo(v.id)}${v.caught?' ✓':''}</button>`).join('')}</div>
  <h3>${seatNo(id)}번 좌석 <small>${s.caught?'퇴실':'관찰 '+notes.length+'건'}</small></h3>
  ${notes.length?`<label>지목 근거<select id="evidence">${notes.map(n=>`<option value="${n.key}" ${n.key===note?'selected':''}>${clock(n.t)} · ${n.text}</option>`).join('')}</select></label>`:'<div class="empty">이 좌석에서 기록한 행동이 없습니다. 학생 옆에서 관찰한 뒤 F를 눌러 기록하세요.</div>'}
  ${!s.caught&&notes.length?`<label>의심 유형<select id="kind"><option value="">유형 선택</option>${Object.entries(TYPES).map(([k,v])=>`<option value="${k}" ${type===k?'selected':''}>${v.name}</option>`).join('')}</select></label>
  <button class="primary wide" data-action="accuse" ${!selected||!type||repeat?'disabled':''}>${repeat?'이미 제출한 지목':'근거를 제출하고 지목'}</button><small class="fine">오인 지목은 20점 감점됩니다.</small>`:''}
  ${s.lastAction?`<div class="outcome">${s.lastAction.text}</div>`:''}
  ${e.complaints.length?`<details><summary>접수 민원 ${e.complaints.length}건</summary>${e.complaints.map(c=>`<p>${seatNo(c.id)}번 · ${c.text} ${c.resolved?'(조치 완료)':''}</p>`).join('')}</details>`:''}`;
}
export function result(r,best,canReplay) {
  return `<div class="eyebrow">1교시 국어 · ${MODES[r.mode].name} 종료</div><h2>시험 종료 보고서</h2>
    <div class="score"><strong>${r.score}<small>점</small></strong><span>나의 최고 기록 <b>${best}점</b></span></div>
    <div class="stats">${[['적발',r.caught+'/'+r.total],['오인',r.falseCalls+'건'],['접수 민원',r.complaints.length+'건'],['처리 요청',r.served+'/'+r.requests]].map(([k,v])=>`<div><small>${k}</small><b>${v}</b></div>`).join('')}</div>
    <h3>좌석별 복기</h3><div class="review-list">${r.seats.map(s=>`<details><summary><span>${seatNo(s.id)}번 좌석</span><b>${s.caught?'적발':s.guilty?'미적발':'정상'}</b></summary><p>${TYPES[s.kind].cue}<br>${TYPES[s.kind][s.guilty?'proof':'clear']}</p><p class="fine">${s.lastAction?clock(s.lastAction.t)+' · '+s.lastAction.text:'지목 기록 없음'} · 관찰 기록 ${s.notes.length}건</p>${canReplay?`<button class="pill" data-replay="${s.id}">${icon('eye',15)} 행동 다시 보기</button>`:''}</details>`).join('')}</div>
    ${r.complaints.length?`<details><summary>민원 ${r.complaints.length}건</summary>${r.complaints.map(c=>`<p>${seatNo(c.id)}번 · ${c.text} ${c.resolved?'(조치 완료)':'(미조치)'}</p>`).join('')}</details>`:''}
    ${r.log.length?`<details><summary>시간순 감독 일지</summary>${r.log.map(l=>`<p>${clock(l.t)} · ${l.text}</p>`).join('')}</details>`:''}
    <div class="modal-actions"><button class="secondary" data-action="home">처음으로</button><button class="primary" data-action="again">다시 감독하기 ${icon('arrow',16)}</button></div>`;
}
