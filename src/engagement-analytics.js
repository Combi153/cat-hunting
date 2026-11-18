// Result interactions retain their finished attempt; they never resume gameplay.
export function createEngagementAnalytics(send, now = () => performance.now()) {
  let result = null;
  let review = null;
  let visible = true;
  const seconds = ms => Math.round(ms / 100) / 10;
  function emit(name, extra = {}) {
    if (result) send(name, { ...result.context, ...extra });
  }
  function accrue() {
    if (review && visible) review.ms += Math.max(0, now() - review.since);
    if (review) review.since = now();
  }
  function flushReview(reason) {
    if (!review) return;
    accrue();
    emit('review_view', { prop_type: review.kind, interaction_status: review.caught ? 'caught' : 'missed',
      interaction_action: reason, review_seconds: seconds(review.ms) });
    review = null;
  }
  return {
    finish(exam, context) {
      if (!context) return;
      result = { context, stage: exam.stage, reviewed: false };
      for (const kind of new Set(exam.seats.map(seat => seat.kind))) {
        const seats = exam.seats.filter(seat => seat.kind === kind);
        emit('prop_result', {
          prop_type: kind,
          culprit_count: seats.filter(seat => seat.guilty).length,
          normal_count: seats.filter(seat => !seat.guilty).length,
          caught_count: seats.filter(seat => seat.guilty && seat.caught).length,
          missed_count: seats.filter(seat => seat.guilty && !seat.caught).length,
          false_report_count: seats.filter(seat => !seat.guilty && seat.cleared).length,
        });
      }
    },
    action(action) { emit('result_action', { interaction_action: action, previous_review: result?.reviewed ? 'yes' : 'no' }); },
    review(selection, action) {
      if (!result || !selection) return;
      flushReview('navigate');
      if (action === 'open') emit('review_open');
      result.reviewed = true;
      review = { kind: selection.seat.kind, caught: selection.seat.caught, ms: 0, since: now() };
    },
    closeReview() { flushReview('close'); },
    visibility(isVisible) {
      // Flush on hiding so a closed tab can still contribute its visible segment.
      if (!isVisible && visible && review) {
        const current = review;
        flushReview('background');
        review = { ...current, ms: 0, since: now() };
      } else accrue();
      visible = isVisible;
    },
    shareContext() { return result ? { ...result.context } : {}; },
    nextAttempt(stage) {
      flushReview('leave');
      const previous_review = result?.stage === stage ? (result.reviewed ? 'yes' : 'no') : 'not_applicable';
      result = null;
      return { previous_review };
    },
    home() { flushReview('leave'); },
    banner(placement) {
      send('banner_click', { ...(placement === 'result' ? result?.context : {}),
        banner_placement: placement, banner_id: 'thinkplace', interaction_action: 'open_website' });
    },
  };
}
