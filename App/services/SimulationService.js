// Pure counterfactual simulation logic for the "What If?" replay. No UI.
//
// Runs the real depletion engine (Algorithm/js/depletionEngine.js) over a
// stored session's raw 30-second readings, substituting the user's
// overridden choices where they differ from what actually happened.
// Environmental readings (UV, temperature, humidity) always come from the
// original session — the user can change their own choices, not the weather.
//
// Overrides shape:
//   {
//     spf: number,
//     waterResistanceRating: number,      // 0 (none), 40 or 80
//     applicationDelayMinutes: number,    // minutes into the session before sunscreen was on
//     reapplicationMinutes: number[],     // minutes into the session
//     activityLevel: string | null,       // null = use each reading's recorded level
//   }

import {
  calculateCombinedMultiplier,
  calculateAlertThreshold,
  updateProtectionState,
  classifyWaterEvent,
  applyWaterEventCut,
  evaluateAlertState,
} from '../../Algorithm/js/depletionEngine.js';
import {
  INTERVAL_MS,
  MED_CALCULATION,
  UNPROTECTED_THRESHOLD_PCT,
} from '../../Algorithm/constants/algorithmConstants.js';

const INTERVAL_MINUTES = INTERVAL_MS / 60000;
const INTERVAL_SECONDS = INTERVAL_MS / 1000;

// Same transmission model the engine's counterfactual uses (it is
// module-private there): protected skin transmits 1/SPF of the ambient
// dose; the unprotected fraction transmits all of it.
function transmittedFraction(protectionPercentage, spf) {
  const protectedShare = Math.max(0, Math.min(1, protectionPercentage / 100));
  return protectedShare / spf + (1 - protectedShare);
}

function freshAlertState(lastApplicationTime) {
  return {
    isActive: false,
    level: 0,
    firstAlertTime: null,
    lastApplicationTime,
    confirmed: false,
  };
}

// Replays one session tick-by-tick through the engine and returns a
// protection-over-time series plus every marker the charts need. The
// "actual" line is produced by calling this with the session's real
// configuration, which guarantees actual and simulated lines are computed
// identically (Reset to actual → the two lines overlap exactly).
export function simulateSession({ readings, overrides, userProfile }) {
  const {
    spf,
    waterResistanceRating,
    applicationDelayMinutes = 0,
    reapplicationMinutes = [],
    activityLevel = null,
  } = overrides;

  const alertThreshold = calculateAlertThreshold(userProfile);
  const startTs = readings.length ? readings[0].timestamp : 0;
  const applicationTs = startTs + applicationDelayMinutes * 60000;
  const medJoules =
    MED_CALCULATION.medJoulesPerM2ByFitzpatrick[userProfile.fitzpatrickType] ??
    MED_CALCULATION.medJoulesPerM2ByFitzpatrick[3];

  // The opening delay window is modeled as unprotected: protection only
  // starts (at 100%) once the sunscreen is on. Alerts — including the
  // 2-hour safety floor, which counts from the application moment — are
  // only evaluated after application.
  let applied = applicationDelayMinutes === 0;
  let protection = applied ? 100 : 0;
  let alertState = freshAlertState(applicationTs);
  const reapps = [...reapplicationMinutes].sort((a, b) => a - b);
  let nextReapp = 0;

  const points = [];
  const waterEvents = [];
  const reapplications = [];
  const scoreReadings = [];
  let alertsFired = 0;
  let firstAlertMinute = null;
  let unprotectedIntervals = 0;
  let medJoulesTotal = 0;

  for (let i = 0; i < readings.length; i++) {
    const r = readings[i];
    const minute = i * INTERVAL_MINUTES;
    let alertFiredThisTick = false;

    if (!applied && minute >= applicationDelayMinutes) {
      applied = true;
      protection = 100;
    }

    if (applied) {
      while (nextReapp < reapps.length && minute >= reapps[nextReapp]) {
        protection = 100;
        reapplications.push({ m: reapps[nextReapp] });
        alertState = freshAlertState(startTs + reapps[nextReapp] * 60000);
        nextReapp++;
      }

      const snapshot = { ...r, activityLevel: activityLevel ?? r.activityLevel };
      const { depletionRatePerInterval } = calculateCombinedMultiplier(snapshot, userProfile);
      protection = updateProtectionState(protection, depletionRatePerInterval);

      // Water event hard cuts recalculate against the overridden water
      // resistance rating, not the one used in the real session.
      const waterDuration =
        r.waterEvent?.durationSeconds ?? (r.waterEventActive ? r.waterEventDuration : null);
      if (waterDuration != null) {
        const eventType = classifyWaterEvent(waterDuration);
        if (eventType !== 'ignored') {
          const { newProtection, cutApplied } = applyWaterEventCut(
            protection,
            eventType,
            waterResistanceRating,
            snapshot.activityLevel
          );
          protection = newProtection;
          waterEvents.push({ m: minute, eventType, cutApplied });
        }
      }

      const evaluated = evaluateAlertState(protection, alertThreshold, alertState, r.timestamp);
      alertState = evaluated.alertState;
      // Count first-level fires only — escalations of an unanswered alert
      // are the same "you need to reapply" event, not a new one.
      if (evaluated.newAlertShouldFire && alertState.level === 1) {
        alertsFired++;
        alertFiredThisTick = true;
        if (firstAlertMinute == null) firstAlertMinute = minute;
      }
    }

    if (protection < UNPROTECTED_THRESHOLD_PCT) unprotectedIntervals++;

    // Minimal reading shape for calculateSessionScore: it only reads
    // timestamp, protectionPercentage and alertFired. alertFired marks
    // first-level fires only, matching the alertsFired count above —
    // escalations of an unanswered alert are the same "reapply" event.
    scoreReadings.push({
      timestamp: r.timestamp,
      protectionPercentage: protection,
      alertFired: alertFiredThisTick,
    });

    const ambientJoules = (r.uvIndex / MED_CALCULATION.uvIndexIrradianceDivisor) * INTERVAL_SECONDS;
    medJoulesTotal += ambientJoules * transmittedFraction(applied ? protection : 0, spf);

    points.push({ m: minute, pct: Math.round(protection * 100) / 100 });
  }

  const durationMinutes = Math.max(0, (readings.length - 1) * INTERVAL_MINUTES);

  return {
    points,
    waterEvents,
    reapplications,
    scoreReadings,
    reapplicationLog: reapplications.map((rep) => ({ timestamp: startTs + rep.m * 60000 })),
    applicationMinute: applicationDelayMinutes,
    alertThreshold,
    firstAlertMinute,
    alertsFired,
    protectedUntilMinute: firstAlertMinute ?? durationMinutes,
    stayedProtected: firstAlertMinute == null,
    unprotectedMinutes: Math.round(unprotectedIntervals * INTERVAL_MINUTES),
    medDose: Math.round((medJoulesTotal / medJoules) * 100) / 100,
    durationMinutes,
  };
}

// Turns the session's real configuration into the overrides shape, so the
// controls can initialize to "actual" and Reset can snap back to it.
export function overridesFromActuals(actuals) {
  return {
    spf: actuals.spf,
    waterResistanceRating: actuals.waterResistanceRating,
    applicationDelayMinutes: actuals.applicationDelayMinutes ?? 0,
    reapplicationMinutes: [...(actuals.reapplicationMinutes ?? [])],
    activityLevel: actuals.activityLevel ?? null,
  };
}

// Plain-difference summary for the live result strip and the share card.
export function compareResults(actual, simulated) {
  return {
    deltaProtectedMinutes: Math.round(simulated.protectedUntilMinute - actual.protectedUntilMinute),
    deltaReapplicationsNeeded: actual.alertsFired - simulated.alertsFired,
    actualMedDose: actual.medDose,
    simulatedMedDose: simulated.medDose,
    stayedProtected: simulated.stayedProtected,
  };
}
