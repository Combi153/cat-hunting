// The measurement ID is public. Development stays offline unless explicitly enabled.
export function createAnalytics({ measurementId = '', enabled = false, debug = false,
  target = globalThis.window, document = globalThis.document } = {}) {
  if (!enabled || !/^G-[A-Z0-9]+$/.test(measurementId) || !target || !document) return () => {};
  try {
    target.dataLayer ||= [];
    target.gtag ||= function () { target.dataLayer.push(arguments); };
    target.gtag('js', new Date());
    target.gtag('config', measurementId, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      ...(debug ? { debug_mode: true } : {}),
    });
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.append(script);
  } catch {
    return () => {};
  }
  return (name, parameters = {}) => {
    try {
      target.gtag('event', name, { ...parameters, send_to: measurementId });
    } catch {
      // Analytics must never interrupt play, including when blocked by the browser.
    }
  };
}

// One tracker per page; retries are counted separately from people in GA reports.
export function createGameAnalytics(send, makeId = () =>
  globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`) {
  let active = null;
  const attempts = new Map();
  function snapshot(exam) {
    return {
      level_name: `exam_${exam.stage}`,
      level_number: exam.stage,
      ruleset: exam.result().ruleset,
      attempt_id: active.id,
      attempt_number: active.number,
      start_source: active.source,
      elapsed_seconds: Math.round(exam.time * 10) / 10,
      health_remaining: exam.health,
      caught_count: exam.caught,
      missed_count: exam.rules.culprits - exam.caught,
      false_report_count: exam.falseCalls,
      help_late_count: exam.complaints.filter((item) => item.reason !== 'observation').length,
      overobserve_count: exam.complaints.filter((item) => item.reason === 'observation').length,
      served_count: exam.requests.filter((item) => item.done).length,
      inspection_count: active.inspections,
    };
  }
  function emit(name, exam, extra = {}) {
    if (active?.exam !== exam) return;
    send(name, { ...snapshot(exam), ...extra });
  }
  return {
    start(exam, source) {
      const number = (attempts.get(exam.stage) || 0) + 1;
      attempts.set(exam.stage, number);
      active = { exam, id: makeId(), number, source, inspections: 0, checkpoint: 0 };
      emit('level_start', exam);
    },
    inspect(exam) {
      if (active?.exam !== exam) return;
      active.inspections++;
      if (active.inspections === 1) emit('first_inspection', exam);
    },
    event: emit,
    progress(exam) {
      if (active?.exam !== exam || exam.over) return;
      const checkpoint = Math.floor(exam.time / 15) * 15;
      if (checkpoint > active.checkpoint) {
        active.checkpoint = checkpoint;
        emit('level_progress', exam, { checkpoint_seconds: checkpoint });
      }
    },
    end(exam) {
      emit('level_end', exam, { success: exam.reason === 'win', end_reason: exam.reason });
      active = null;
    },
    leave(exam) {
      emit('level_exit', exam, { end_reason: 'quit' });
      active = null;
    },
  };
}
