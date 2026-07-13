// Post-session check-in logic — pure, no UI.
//
// Question 2 ("How did your skin feel going into this session?") maps to
// retroactive SESSION-LEVEL corrections. They are stored on the session
// document only — never applied globally to the user profile. A later
// process (e.g. the insights loader) may read these flags across sessions
// and decide whether a pattern warrants a permanent profile adjustment;
// that logic is deliberately out of scope here.

export const SKIN_FEEL_AFTER_OPTIONS = [
  'No reaction, skin feels normal',
  'Feels warm or flushed',
  'Feels tight or dry',
  'Feels sensitive to touch',
  'Looks red or irritated',
];

export const SKIN_FEEL_BEFORE_OPTIONS = [
  'Normal, no issues',
  'Slightly dry or tight',
  'Recently exfoliated or shaved',
  'Recovering from a previous burn or irritation',
  'Had a skin flare-up (eczema, rosacea, or similar)',
];

// Maps a Q2 answer to its session-level algorithm corrections.
//   effectiveSpfMultiplier — multiply the stored effective SPF by this
//     (0.9 = the spec's "0.1 upward multiplier", i.e. ~10% reduction)
//   alertThresholdTightenPct — percentage points added to this session's
//     stored alert threshold (fires earlier)
//   uvDebtWeight — weighting of this session's UV dose in cumulative debt
// context.previousSkinFeelAfter is the prior session's Q1 answer, used to
// detect the "went out while recovering from irritation" pattern.
export function buildSkinFeelBeforeCorrections(answer, context = {}) {
  const result = {
    modifiers: {},
    calibrationConfidenceDelta: 0,
    personalPattern: null,
  };
  if (answer == null) return result;

  switch (answer) {
    case 'Normal, no issues':
      // No session correction; reinforces the current calibration.
      result.calibrationConfidenceDelta = 1;
      break;

    case 'Slightly dry or tight':
      result.modifiers = {
        effectiveSpfMultiplier: 0.9,
        alertThresholdTightenPct: 5,
        dryBarrier: true,
      };
      break;

    case 'Recently exfoliated or shaved':
      result.modifiers = {
        effectiveSpfMultiplier: 0.8,
        alertThresholdTightenPct: 10,
        uvDebtWeight: 1.2,
        exfoliatedBarrier: true,
      };
      break;

    case 'Recovering from a previous burn or irritation':
      result.modifiers = {
        effectiveSpfMultiplier: 0.75,
        alertThresholdTightenPct: 15,
        uvDebtWeight: 1.4,
      };
      if (context.previousSkinFeelAfter === 'Looks red or irritated') {
        result.personalPattern = {
          pattern: 'User went out while recovering from irritation',
          sessionId: context.sessionId ?? null,
          date: context.sessionDate ?? null,
        };
      }
      break;

    case 'Had a skin flare-up (eczema, rosacea, or similar)':
      // Depletion rate untouched; conservative threshold only, and this
      // session is down-weighted for fingerprint calibration.
      result.modifiers = {
        alertThresholdTightenPct: 10,
        lowCalibrationConfidence: true,
        flareUp: true,
      };
      break;

    default:
      break;
  }
  return result;
}

// Assembles the full postSession record stored on the session document.
// Feedback is stored alongside the session's metadata so it is always
// readable in context.
export function buildPostSessionRecord(answers, sessionMeta, context = {}) {
  const corrections = buildSkinFeelBeforeCorrections(answers.skinFeelBefore, context);
  return {
    postSession: {
      skinFeelAfter: answers.skinFeelAfter ?? null,
      skinFeelBefore: answers.skinFeelBefore ?? null,
      userFeedback: answers.userFeedback ?? null,
      sessionContext: sessionMeta,
    },
    sessionCorrections: corrections.modifiers,
    calibrationConfidenceDelta: corrections.calibrationConfidenceDelta,
    personalPattern: corrections.personalPattern,
  };
}
