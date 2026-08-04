// Looks for a REPEATED skin-sensitivity signal across a user's recent
// post-session check-ins — not a one-off — and derives a persistent,
// conservative alert-threshold nudge from it. This is the survey-driven
// counterpart to updatePersonalFactor's BLE-gated depletion-rate
// learning (Algorithm/js/depletionEngine.js) — that one is separately
// dormant until real sensor data supplies an independent "actual" signal
// (see that function's own comment); this one needs no hardware at all,
// since it's driven entirely by the Q2 post-session survey answer
// (PostSessionService.buildSkinFeelBeforeCorrections) already being
// asked today.
//
// Additive only: only ever tightens (raises) the alert threshold, never
// loosens it — matches CLAUDE.md's "when in doubt, be conservative" rule
// directly. Bounded by maxOffset so a run of flagged sessions can't
// compound into an ever-tightening threshold, and a genuinely one-off
// bad day (a single flagged check-in) never moves anything — only a
// pattern across several sessions does.
export const CALIBRATION_RULES = {
  lookbackSessions: 10, // how many recent check-ins to consider
  minFlaggedSessions: 3, // how many flagged check-ins before nudging
  offsetPerTrigger: 3, // percentage points added to the alert threshold per trigger
  maxOffset: 10, // hard ceiling on the total offset
};

// checkIns: [{ barrier_modifier, created_at }], newest first — see
// SupabaseService.getRecentCheckIns. barrier_modifier is
// PostSessionService's alertThresholdTightenPct (0/5/10/15) stored per
// check-in; a nonzero value means that session's Q2 answer flagged some
// skin sensitivity ("dry/tight," "recently exfoliated," "recovering from
// a burn," or a flare-up).
export function computeCalibrationOffset(checkIns) {
  const recent = (checkIns ?? []).slice(0, CALIBRATION_RULES.lookbackSessions);
  const flaggedCount = recent.filter((c) => (c.barrier_modifier ?? 0) > 0).length;

  if (flaggedCount < CALIBRATION_RULES.minFlaggedSessions) {
    return { offset: 0, triggered: false, flaggedCount, consideredSessions: recent.length };
  }

  // Every full multiple of minFlaggedSessions adds one more increment,
  // capped at maxOffset — e.g. 3 flagged sessions = one trigger, 6 = two,
  // but the total never exceeds the ceiling regardless of how many pile up.
  const triggers = Math.floor(flaggedCount / CALIBRATION_RULES.minFlaggedSessions);
  const offset = Math.min(CALIBRATION_RULES.maxOffset, triggers * CALIBRATION_RULES.offsetPerTrigger);

  return { offset, triggered: true, flaggedCount, consideredSessions: recent.length };
}

// Deterministic template off the real number — same style as
// SkinAgeService's leverForFactor, never free-form prose. Returns null
// when there's nothing to say (offset 0), so the caller can skip
// rendering the card entirely rather than showing an empty state.
export function calibrationSummaryLine(offset) {
  if (!offset) return null;
  return `Sureva noticed your skin was flagged as sensitive across several recent sessions and nudged your reapply alerts to fire ${offset}% earlier.`;
}
