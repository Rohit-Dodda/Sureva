// Sureva sunscreen depletion engine — the core of the entire system.
//
// Every function is exported individually so it can be imported and
// tested independently. All numeric values come from
// constants/algorithmConstants.js; nothing is hardcoded here.
//
// This file and the firmware C version must always produce identical
// outputs for identical inputs. When in doubt, be conservative —
// deplete faster rather than slower.

import {
  BASE_DEPLETION_RATE,
  INTERVAL_MS,
  UV_MULTIPLIERS,
  UV_MULTIPLIER_CAP,
  WBGT_APPROX,
  HEAT_BANDS,
  HEAT_ACTIVITY_MULTIPLIERS,
  SKIN_TYPE_MULTIPLIERS,
  FITZPATRICK_ALERT_THRESHOLDS,
  AGE_THRESHOLD_ADJUSTMENTS,
  MEDICATION_THRESHOLD_ADJUSTMENT,
  SKIN_CONDITION_THRESHOLD_ADJUSTMENT,
  PLACEMENT_CORRECTION_FACTORS,
  WATER_EVENT_CUTS,
  WATER_EVENT_DURATIONS,
  WATER_EVENT_ACTIVITY_SCALARS,
  PERSONAL_FACTOR,
  ALERT_ESCALATION,
  SESSION_SCORE_WEIGHTS,
  UNPROTECTED_THRESHOLD_PCT,
  BEST_WINDOW_THRESHOLD_PCT,
  AGGRESSIVE_MULTIPLIER_THRESHOLD,
  SCORE_PENALTY_PER_UNPROTECTED_MINUTE,
  COMPLIANCE_TREND_STABILITY_PCT,
  MED_CALCULATION,
  WEEKLY_MED_LIMITS,
  SWEAT_RATES_L_PER_HOUR,
  SWEAT_REFERENCE_TEMP_C,
  SKIN_STRESS_WEIGHTS,
  SKIN_STRESS_NORMALIZERS,
} from '../constants/algorithmConstants.js';

const INTERVAL_MINUTES = INTERVAL_MS / 60000;

// ─── Individual multipliers ───────────────────────────────────

export function calculateUVMultiplier(uvIndex) {
  if (uvIndex > 11) return UV_MULTIPLIER_CAP;
  const key = Math.max(0, Math.floor(uvIndex));
  const multiplier = UV_MULTIPLIERS[key] ?? UV_MULTIPLIER_CAP;
  return Math.max(multiplier, UV_MULTIPLIERS[0]);
}

// WBGT approximation (Australian Bureau of Meteorology formula) from
// air temperature + humidity, used in place of the full outdoor WBGT
// since there's no black-globe/solar sensor. See algorithmConstants.js
// for the derivation and citations.
export function calculateWBGTApprox(temperature, humidity) {
  const c = WBGT_APPROX;
  const vaporPressure =
    (humidity / 100) *
    c.vaporPressureBase *
    Math.exp((c.vaporPressureExpCoefficient * temperature) / (c.vaporPressureExpOffset + temperature));
  return c.tempCoefficient * temperature + c.vaporPressureCoefficient * vaporPressure + c.constant;
}

function heatBandFor(wbgt) {
  // HEAT_BANDS is ordered highest-first; the first match wins.
  for (const band of HEAT_BANDS) {
    if (wbgt >= band.minWbgtC) return band.key;
  }
  return HEAT_BANDS[HEAT_BANDS.length - 1].key;
}

// Returns the "pure heat" component of the joint heat×activity table
// (its sedentary column) — heat's effect held at baseline exertion.
// Combined with calculateActivityMultiplier below, their product
// always reproduces the true joint table value; see
// calculateCombinedMultiplier and algorithmConstants.js for why they
// aren't computed as independent factors.
export function calculateHeatHumidityMultiplier(temperature, humidity) {
  const wbgt = calculateWBGTApprox(temperature, humidity);
  const band = heatBandFor(wbgt);
  return HEAT_ACTIVITY_MULTIPLIERS[band].sedentary;
}

// Returns how much activity adds on TOP of the current heat baseline
// (jointTableValue / sedentaryTableValue) — this ratio grows with
// heat because the underlying table is a joint lookup, not a flat
// per-activity constant, so "high activity" costs more in a heat wave
// than it does on a mild day.
export function calculateActivityMultiplier(temperature, humidity, activityLevel) {
  const wbgt = calculateWBGTApprox(temperature, humidity);
  const band = heatBandFor(wbgt);
  const row = HEAT_ACTIVITY_MULTIPLIERS[band];
  const jointValue = row[activityLevel];
  if (jointValue === undefined) {
    console.warn(`Unrecognized activity level "${activityLevel}" — defaulting to 1.0x on top of heat`);
    return 1.0;
  }
  return jointValue / row.sedentary;
}

export function calculateSkinTypeMultiplier(skinType) {
  return SKIN_TYPE_MULTIPLIERS[skinType] ?? 1.0;
}

export function calculatePlacementCorrection(placement) {
  return PLACEMENT_CORRECTION_FACTORS[placement] ?? 1.0;
}

// ─── Combined multiplier ──────────────────────────────────────

export function calculateCombinedMultiplier(sensorSnapshot, userProfile) {
  const placementCorrection = calculatePlacementCorrection(userProfile.devicePlacement);
  const correctedUvIndex = sensorSnapshot.uvIndex * placementCorrection;

  const uvMultiplier = calculateUVMultiplier(correctedUvIndex);
  const wbgt = calculateWBGTApprox(sensorSnapshot.temperature, sensorSnapshot.humidity);
  const heatHumidityMultiplier = calculateHeatHumidityMultiplier(
    sensorSnapshot.temperature,
    sensorSnapshot.humidity
  );
  const activityMultiplier = calculateActivityMultiplier(
    sensorSnapshot.temperature,
    sensorSnapshot.humidity,
    sensorSnapshot.activityLevel
  );
  const skinTypeMultiplier = calculateSkinTypeMultiplier(userProfile.skinType);
  const personalFactor = userProfile.personalFactor ?? PERSONAL_FACTOR.initial;

  const combinedMultiplier =
    uvMultiplier * heatHumidityMultiplier * activityMultiplier * skinTypeMultiplier * personalFactor;

  return {
    combinedMultiplier,
    uvMultiplier,
    heatHumidityMultiplier,
    activityMultiplier,
    skinTypeMultiplier,
    personalFactor,
    correctedUvIndex,
    wbgt,
    depletionRatePerInterval: BASE_DEPLETION_RATE * combinedMultiplier,
  };
}

// ─── Alert threshold ──────────────────────────────────────────
// Called once at session start and stored — never recalculated mid-session.

export function calculateAlertThreshold(userProfile) {
  const base = FITZPATRICK_ALERT_THRESHOLDS[userProfile.fitzpatrickType] ?? FITZPATRICK_ALERT_THRESHOLDS[3];
  const ageAdjustment = AGE_THRESHOLD_ADJUSTMENTS[userProfile.ageGroup] ?? 0;
  const medicationAdjustment = userProfile.medicationFlag ? MEDICATION_THRESHOLD_ADJUSTMENT : 0;
  const skinConditionAdjustment = userProfile.skinConditionFlag ? SKIN_CONDITION_THRESHOLD_ADJUSTMENT : 0;
  return base + ageAdjustment + medicationAdjustment + skinConditionAdjustment;
}

// ─── Water events ─────────────────────────────────────────────

export function classifyWaterEvent(durationSeconds) {
  if (durationSeconds < WATER_EVENT_DURATIONS.ignoreUnderSeconds) return 'ignored';
  if (durationSeconds <= WATER_EVENT_DURATIONS.splashMaxSeconds) return 'splash';
  return 'immersion';
}

export function applyWaterEventCut(currentProtection, eventType, waterResistanceRating, activityLevel) {
  const cuts = WATER_EVENT_CUTS[waterResistanceRating] ?? WATER_EVENT_CUTS[40];
  let baseCut = 0;
  if (eventType === 'splash') baseCut = cuts.splash;
  else if (eventType === 'briefImmersion') baseCut = cuts.briefImmersion;
  else if (eventType === 'immersion') baseCut = cuts.fullImmersion;
  // Activity level is optional — omitting it (unknown activity at the
  // moment of the event) leaves the base cut unchanged.
  const activityScalar = WATER_EVENT_ACTIVITY_SCALARS[activityLevel] ?? 1.0;
  const cutApplied = Math.round(baseCut * activityScalar * 100) / 100;
  const newProtection = Math.max(0, currentProtection - cutApplied);
  return { newProtection, cutApplied };
}

// ─── Protection state ─────────────────────────────────────────

export function updateProtectionState(currentProtection, depletionRatePerInterval) {
  return Math.max(0, currentProtection - depletionRatePerInterval);
}

// ─── Alert state machine ──────────────────────────────────────
// alertState: { isActive, level, firstAlertTime, lastApplicationTime, confirmed }
// `now` is injectable for deterministic testing.

export function evaluateAlertState(protectionPercentage, alertThreshold, alertState, now = Date.now()) {
  const next = { ...alertState };
  let newAlertShouldFire = false;

  if (!next.isActive) {
    const belowThreshold = protectionPercentage < alertThreshold;
    const safetyFloorHit =
      next.lastApplicationTime != null &&
      now - next.lastApplicationTime >= ALERT_ESCALATION.safetyFloorMs;

    // The 2-hour safety floor fires regardless of protection percentage.
    if (belowThreshold || safetyFloorHit) {
      next.isActive = true;
      next.level = 1;
      next.firstAlertTime = now;
      next.confirmed = false;
      newAlertShouldFire = true;
    }
  } else if (!next.confirmed) {
    const sinceFirst = now - next.firstAlertTime;
    if (next.level < 3 && sinceFirst >= ALERT_ESCALATION.thirdAlertDelayMs) {
      next.level = 3;
      newAlertShouldFire = true;
    } else if (next.level < 2 && sinceFirst >= ALERT_ESCALATION.secondAlertDelayMs) {
      next.level = 2;
      newAlertShouldFire = true;
    }
  }

  return { alertState: next, newAlertShouldFire };
}

// ─── Session lifecycle ────────────────────────────────────────

function generateUuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  // RFC 4122 v4 fallback for environments without Web Crypto.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function initializeSession(userProfile, sessionConfig) {
  const startTime = Date.now();
  return {
    sessionId: generateUuid(),
    startTime,
    protectionPercentage: 100,
    alertThreshold: calculateAlertThreshold(userProfile),
    alertState: {
      isActive: false,
      level: 0,
      firstAlertTime: null,
      lastApplicationTime: startTime,
      confirmed: false,
    },
    readings: [],
    reapplicationLog: [],
    waterEventLog: [],
    spf: sessionConfig.spf,
    waterResistanceRating: sessionConfig.waterResistanceRating,
    placement: sessionConfig.placement,
  };
}

export function runSessionInterval(sessionState, sensorSnapshot, userProfile) {
  const timestamp = sensorSnapshot.timestamp ?? Date.now();
  const multipliers = calculateCombinedMultiplier(sensorSnapshot, userProfile);

  let protection = updateProtectionState(
    sessionState.protectionPercentage,
    multipliers.depletionRatePerInterval
  );

  // Water events apply a hard cut on top of the interval depletion.
  let waterEvent = null;
  if (sensorSnapshot.waterEventActive) {
    const eventType = classifyWaterEvent(sensorSnapshot.waterEventDuration);
    if (eventType !== 'ignored') {
      const protectionBefore = protection;
      const { newProtection, cutApplied } = applyWaterEventCut(
        protection,
        eventType,
        sessionState.waterResistanceRating,
        sensorSnapshot.activityLevel
      );
      protection = newProtection;
      waterEvent = {
        timestamp,
        eventType,
        durationSeconds: sensorSnapshot.waterEventDuration,
        protectionBefore,
        cutApplied,
        protectionAfter: newProtection,
      };
    }
  }

  const { alertState, newAlertShouldFire } = evaluateAlertState(
    protection,
    sessionState.alertThreshold,
    sessionState.alertState,
    timestamp
  );

  const reading = {
    timestamp,
    uvIndex: sensorSnapshot.uvIndex,
    temperature: sensorSnapshot.temperature,
    humidity: sensorSnapshot.humidity,
    activityLevel: sensorSnapshot.activityLevel,
    correctedUvIndex: multipliers.correctedUvIndex,
    uvMultiplier: multipliers.uvMultiplier,
    heatHumidityMultiplier: multipliers.heatHumidityMultiplier,
    activityMultiplier: multipliers.activityMultiplier,
    skinTypeMultiplier: multipliers.skinTypeMultiplier,
    personalFactor: multipliers.personalFactor,
    combinedMultiplier: multipliers.combinedMultiplier,
    depletionRatePerInterval: multipliers.depletionRatePerInterval,
    protectionPercentage: protection,
    waterEvent,
    alertFired: newAlertShouldFire,
    alertLevel: alertState.isActive ? alertState.level : 0,
  };

  return {
    ...sessionState,
    protectionPercentage: protection,
    alertState,
    readings: [...sessionState.readings, reading],
    waterEventLog: waterEvent
      ? [...sessionState.waterEventLog, waterEvent]
      : sessionState.waterEventLog,
  };
}

export function confirmReapplication(sessionState, timestamp = Date.now()) {
  return {
    ...sessionState,
    protectionPercentage: 100,
    reapplicationLog: [...sessionState.reapplicationLog, { timestamp }],
    alertState: {
      isActive: false,
      level: 0,
      firstAlertTime: null,
      lastApplicationTime: timestamp,
      confirmed: false,
    },
  };
}

// ─── Session scoring ──────────────────────────────────────────

export function calculateSessionScore(sessionData) {
  const fired = sessionData.alertsFired ?? 0;
  const confirmed = sessionData.alertsConfirmed ?? 0;
  const complianceRate = fired > 0 ? confirmed / fired : 1;

  // Unprotected time: minutes spent below the unprotected threshold.
  const readings = sessionData.readings ?? [];
  const unprotectedMinutes =
    sessionData.unprotectedMinutes ??
    readings.filter((r) => r.protectionPercentage < UNPROTECTED_THRESHOLD_PCT).length *
      INTERVAL_MINUTES;
  const unprotectedScore = Math.max(
    0,
    100 - unprotectedMinutes * SCORE_PENALTY_PER_UNPROTECTED_MINUTE
  );

  // Depletion management rewards reapplying before the alert fired.
  // Proactive reapplication earns full marks; otherwise the score is
  // the fraction of fired alerts that were answered.
  const reapplications = sessionData.reapplicationLog ?? [];
  const alertTimes = readings.filter((r) => r.alertFired).map((r) => r.timestamp);
  const proactive = reapplications.filter(
    (rep) => !alertTimes.some((t) => t <= rep.timestamp)
  ).length;
  let depletionScore;
  if (proactive > 0) {
    depletionScore = 100;
  } else if (fired > 0) {
    depletionScore = complianceRate * 100;
  } else {
    depletionScore = 100;
  }

  const score =
    complianceRate * 100 * SESSION_SCORE_WEIGHTS.complianceRate +
    unprotectedScore * SESSION_SCORE_WEIGHTS.unprotectedTimePenalty +
    depletionScore * SESSION_SCORE_WEIGHTS.depletionManagement;

  return Math.round(Math.min(100, Math.max(0, score)));
}

// ─── Factor breakdown ─────────────────────────────────────────
// Attributes each interval's depletion to the factors pushing it above
// baseline, proportionally to each factor's excess over 1.0x. Water
// event hard cuts are attributed entirely to waterEvents. The five
// values always sum to exactly 100.

export function calculateFactorBreakdown(readingsArray) {
  const totals = { uv: 0, heatHumidity: 0, activity: 0, skinType: 0, waterEvents: 0 };

  for (const r of readingsArray) {
    const interval = r.depletionRatePerInterval ?? 0;
    const excess = {
      uv: Math.max(0, (r.uvMultiplier ?? 1) - 1),
      heatHumidity: Math.max(0, (r.heatHumidityMultiplier ?? 1) - 1),
      activity: Math.max(0, (r.activityMultiplier ?? 1) - 1),
      skinType: Math.max(0, (r.skinTypeMultiplier ?? 1) - 1),
    };
    const excessSum = excess.uv + excess.heatHumidity + excess.activity + excess.skinType;
    if (excessSum > 0) {
      totals.uv += interval * (excess.uv / excessSum);
      totals.heatHumidity += interval * (excess.heatHumidity / excessSum);
      totals.activity += interval * (excess.activity / excessSum);
      totals.skinType += interval * (excess.skinType / excessSum);
    } else {
      // Nothing above baseline: UV is the driver of the base rate.
      totals.uv += interval;
    }
    if (r.waterEvent) totals.waterEvents += r.waterEvent.cutApplied;
  }

  const grandTotal =
    totals.uv + totals.heatHumidity + totals.activity + totals.skinType + totals.waterEvents;
  if (grandTotal === 0) {
    return { uv: 100, heatHumidity: 0, activity: 0, skinType: 0, waterEvents: 0 };
  }

  const keys = ['uv', 'heatHumidity', 'activity', 'skinType', 'waterEvents'];
  const result = {};
  let allocated = 0;
  for (const key of keys) {
    result[key] = Math.round((totals[key] / grandTotal) * 100);
    allocated += result[key];
  }
  // Rounding can leave the sum off by a point or two — absorb the
  // remainder into the largest contributor so the sum is exactly 100.
  const largest = keys.reduce((a, b) => (result[a] >= result[b] ? a : b));
  result[largest] += 100 - allocated;
  return result;
}

// ─── Effective SPF ────────────────────────────────────────────
// Water event cuts proportionally reduce the effective SPF; gaps
// between application and reapplication are already reflected in the
// natural depletion curve, so they need no extra handling here.

export function calculateEffectiveSpf(startingSpf, waterEvents = [], reapplicationGaps = []) {
  let effective = startingSpf;
  for (const event of waterEvents) {
    const cut = event.cutApplied ?? event.protectionCut ?? 0;
    effective *= 1 - cut / 100;
  }
  return Math.max(1, Math.round(effective));
}

// ─── MED dose ─────────────────────────────────────────────────
// UV index / divisor → erythemally weighted irradiance in W/m².
// Dose per interval = irradiance × interval seconds (J/m²).
// 1 SED = 100 J/m²; the MED threshold in J/m² depends on Fitzpatrick type.

export function calculateMEDDose(readingsArray, fitzpatrickType) {
  const intervalSeconds = INTERVAL_MS / 1000;
  const medJoules =
    MED_CALCULATION.medJoulesPerM2ByFitzpatrick[fitzpatrickType] ??
    MED_CALCULATION.medJoulesPerM2ByFitzpatrick[3];

  let totalJoules = 0;
  for (const r of readingsArray) {
    const irradiance = r.uvIndex / MED_CALCULATION.uvIndexIrradianceDivisor;
    totalJoules += irradiance * intervalSeconds;
  }
  return Math.round((totalJoules / medJoules) * 100) / 100;
}

// ─── Sweat load ───────────────────────────────────────────────
// Litres/hour by activity, scaled to the interval and adjusted
// proportionally by temperature relative to the reference temperature.

export function calculateSweatLoad(readingsArray) {
  const intervalHours = INTERVAL_MS / 3600000;
  let totalLitres = 0;
  for (const r of readingsArray) {
    const ratePerHour = SWEAT_RATES_L_PER_HOUR[r.activityLevel] ?? SWEAT_RATES_L_PER_HOUR.sedentary;
    const tempScale = r.temperature / SWEAT_REFERENCE_TEMP_C;
    totalLitres += ratePerHour * tempScale * intervalHours;
  }
  return Math.round(totalLitres * 1000); // millilitres
}

// ─── Skin stress ──────────────────────────────────────────────

export function calculateSkinStressScore(medDose, unprotectedMinutes, peakTemperature) {
  const n = SKIN_STRESS_NORMALIZERS;
  const medComponent = Math.min(1, medDose / n.maxMedDose);
  const unprotectedComponent = Math.min(1, unprotectedMinutes / n.maxUnprotectedMinutes);
  const tempComponent = Math.min(
    1,
    Math.max(0, (peakTemperature - n.tempBaseC) / (n.tempMaxC - n.tempBaseC))
  );

  const score =
    (medComponent * SKIN_STRESS_WEIGHTS.medDose +
      unprotectedComponent * SKIN_STRESS_WEIGHTS.unprotectedMinutes +
      tempComponent * SKIN_STRESS_WEIGHTS.peakTemperature) *
    100;

  return Math.round(score);
}

// ─── Critical moments ─────────────────────────────────────────

export function findCriticalMoments(readingsArray) {
  // Fastest 60-second window: two consecutive intervals with the
  // highest total protection loss (interval depletion + water cuts).
  let fastestDepletionMinute = null;
  for (let i = 1; i < readingsArray.length - 1; i++) {
    const lost =
      readingsArray[i - 1].protectionPercentage - readingsArray[i + 1].protectionPercentage;
    if (lost > 0 && (!fastestDepletionMinute || lost > fastestDepletionMinute.percentageLost)) {
      fastestDepletionMinute = {
        timestamp: readingsArray[i].timestamp,
        percentageLost: Math.round(lost * 100) / 100,
      };
    }
  }

  const findLongestStretch = (predicate) => {
    let best = null;
    let runStart = null;
    for (let i = 0; i <= readingsArray.length; i++) {
      const inRun = i < readingsArray.length && predicate(readingsArray[i]);
      if (inRun && runStart === null) runStart = i;
      if (!inRun && runStart !== null) {
        const startTime = readingsArray[runStart].timestamp;
        const endTime = readingsArray[i - 1].timestamp;
        const durationMinutes = (i - runStart) * INTERVAL_MINUTES;
        if (!best || durationMinutes > best.durationMinutes) {
          best = { startTime, endTime, durationMinutes };
        }
        runStart = null;
      }
    }
    return best;
  };

  const bestProtectedWindow = findLongestStretch(
    (r) => r.protectionPercentage > BEST_WINDOW_THRESHOLD_PCT
  );
  const longestUnprotectedWindow = findLongestStretch(
    (r) => r.protectionPercentage < UNPROTECTED_THRESHOLD_PCT
  );

  // First time the combined multiplier exceeded the aggressive
  // threshold and stayed there for at least 2 consecutive readings.
  let conditionsTurnedAggressiveAt = null;
  for (let i = 0; i < readingsArray.length - 1; i++) {
    if (
      (readingsArray[i].combinedMultiplier ?? 0) > AGGRESSIVE_MULTIPLIER_THRESHOLD &&
      (readingsArray[i + 1].combinedMultiplier ?? 0) > AGGRESSIVE_MULTIPLIER_THRESHOLD
    ) {
      conditionsTurnedAggressiveAt = readingsArray[i].timestamp;
      break;
    }
  }

  return {
    fastestDepletionMinute,
    bestProtectedWindow,
    longestUnprotectedWindow,
    conditionsTurnedAggressiveAt,
  };
}

// ─── Logs ─────────────────────────────────────────────────────

export function buildWaterEventLog(readingsArray) {
  return readingsArray
    .filter((r) => r.waterEvent)
    .map((r) => ({
      timestamp: r.waterEvent.timestamp ?? r.timestamp,
      eventType: r.waterEvent.eventType,
      protectionBefore: r.waterEvent.protectionBefore,
      cutApplied: r.waterEvent.cutApplied,
      protectionAfter: r.waterEvent.protectionAfter,
    }));
}

export function buildAlertComplianceLog(readingsArray, reapplicationLog = []) {
  const lastTimestamp = readingsArray.length
    ? readingsArray[readingsArray.length - 1].timestamp
    : null;

  return readingsArray
    .filter((r) => r.alertFired)
    .map((r) => {
      const confirmation = reapplicationLog.find((rep) => rep.timestamp >= r.timestamp);
      const confirmedAt = confirmation ? confirmation.timestamp : null;
      const responseTimeMinutes = confirmedAt
        ? Math.round(((confirmedAt - r.timestamp) / 60000) * 10) / 10
        : null;
      const unprotectedDurationMinutes = confirmedAt
        ? responseTimeMinutes
        : lastTimestamp
        ? Math.round(((lastTimestamp - r.timestamp) / 60000) * 10) / 10
        : null;
      return {
        alertTime: r.timestamp,
        alertLevel: r.alertLevel,
        confirmedAt,
        responseTimeMinutes,
        unprotectedDurationMinutes,
      };
    });
}

// ─── Counterfactual ───────────────────────────────────────────
// Replays the session from its readings with all reapplication resets
// stripped out — protection depletes continuously from 100%. Skin UV
// dose uses a transmission model: protected skin transmits 1/SPF of
// ambient dose; the unprotected fraction transmits all of it.

function transmittedFraction(protectionPercentage, spf) {
  const protectedShare = Math.max(0, Math.min(1, protectionPercentage / 100));
  return protectedShare / spf + (1 - protectedShare);
}

export function calculateCounterfactual(sessionData, userProfile) {
  const readings = sessionData.readings ?? [];
  const spf = sessionData.spf ?? userProfile.spf;
  const intervalSeconds = INTERVAL_MS / 1000;
  const medJoules =
    MED_CALCULATION.medJoulesPerM2ByFitzpatrick[userProfile.fitzpatrickType] ??
    MED_CALCULATION.medJoulesPerM2ByFitzpatrick[3];

  let simulatedProtection = 100;
  let simulatedUnprotectedIntervals = 0;
  let simulatedJoules = 0;
  let actualJoules = 0;

  for (const r of readings) {
    simulatedProtection = Math.max(0, simulatedProtection - (r.depletionRatePerInterval ?? 0));
    if (r.waterEvent) {
      simulatedProtection = Math.max(0, simulatedProtection - r.waterEvent.cutApplied);
    }
    if (simulatedProtection < UNPROTECTED_THRESHOLD_PCT) simulatedUnprotectedIntervals++;

    const ambientJoules =
      (r.uvIndex / MED_CALCULATION.uvIndexIrradianceDivisor) * intervalSeconds;
    simulatedJoules += ambientJoules * transmittedFraction(simulatedProtection, spf);
    actualJoules += ambientJoules * transmittedFraction(r.protectionPercentage, spf);
  }

  return {
    simulatedProtectionAtEnd: Math.round(simulatedProtection * 100) / 100,
    simulatedUnprotectedMinutes: simulatedUnprotectedIntervals * INTERVAL_MINUTES,
    simulatedMEDDose: Math.round((simulatedJoules / medJoules) * 100) / 100,
    actualMEDDose: Math.round((actualJoules / medJoules) * 100) / 100,
  };
}

// ─── Personal factor learning ─────────────────────────────────

export function updatePersonalFactor(
  predictedAverageDepletionRate,
  actualAverageDepletionRate,
  currentPersonalFactor,
  sessionCount
) {
  if (sessionCount < PERSONAL_FACTOR.minSessionsBeforeAdjusting) return currentPersonalFactor;
  if (!predictedAverageDepletionRate) return currentPersonalFactor;

  const ratio = actualAverageDepletionRate / predictedAverageDepletionRate;
  const rawAdjustment = currentPersonalFactor * (ratio - 1);
  const adjustment = Math.max(
    -PERSONAL_FACTOR.maxAdjustmentPerSession,
    Math.min(PERSONAL_FACTOR.maxAdjustmentPerSession, rawAdjustment)
  );

  const next = Math.max(
    PERSONAL_FACTOR.min,
    Math.min(PERSONAL_FACTOR.max, currentPersonalFactor + adjustment)
  );
  return Math.round(next * 10000) / 10000;
}

export function calculatePersonalComparison(currentSession, historicalSessions) {
  if (!historicalSessions || historicalSessions.length < 3) return null;

  const rates = historicalSessions
    .map((s) => s.averageDepletionRate)
    .filter((r) => r != null);
  if (rates.length < 3 || currentSession.averageDepletionRate == null) return null;

  const historicalAverageRate = rates.reduce((a, b) => a + b, 0) / rates.length;
  const currentSessionRate = currentSession.averageDepletionRate;
  const percentageDifference =
    Math.round(((currentSessionRate - historicalAverageRate) / historicalAverageRate) * 1000) / 10;

  return {
    historicalAverageRate: Math.round(historicalAverageRate * 10000) / 10000,
    currentSessionRate: Math.round(currentSessionRate * 10000) / 10000,
    percentageDifference,
    direction: percentageDifference >= 0 ? 'faster' : 'slower',
  };
}

// ─── Aggregate stats ──────────────────────────────────────────

export function calculateWeeklyCumulativeDose(allSessions, fitzpatrickType, now = Date.now()) {
  // Calendar week starting Monday 00:00 local time.
  const ref = new Date(now);
  ref.setHours(0, 0, 0, 0);
  ref.setDate(ref.getDate() - ((ref.getDay() + 6) % 7));
  const weekStart = ref.getTime();

  const weeklyTotal = allSessions
    .filter((s) => s.startTime >= weekStart)
    .reduce((sum, s) => sum + (s.medDose ?? 0), 0);

  return {
    weeklyTotal: Math.round(weeklyTotal * 100) / 100,
    recommendedLimit: WEEKLY_MED_LIMITS[fitzpatrickType] ?? WEEKLY_MED_LIMITS[3],
  };
}

export function calculateComplianceTrend(recentSessions) {
  const sessions = recentSessions.slice(-10);
  const points = sessions.map((s) => ({
    sessionDate: s.startTime,
    complianceRate:
      (s.alertsFired ?? 0) > 0
        ? Math.round((s.alertsConfirmed / s.alertsFired) * 100)
        : 100,
  }));

  let trend = 'stable';
  if (points.length >= 4) {
    const recent3 = points.slice(-3);
    const previous = points.slice(0, -3);
    const recentAvg = recent3.reduce((a, p) => a + p.complianceRate, 0) / recent3.length;
    const previousAvg = previous.reduce((a, p) => a + p.complianceRate, 0) / previous.length;
    const diffPct = ((recentAvg - previousAvg) / Math.max(1, previousAvg)) * 100;
    if (diffPct > COMPLIANCE_TREND_STABILITY_PCT) trend = 'improving';
    else if (diffPct < -COMPLIANCE_TREND_STABILITY_PCT) trend = 'declining';
  }

  return { sessions: points, trend };
}

export function calculateLifetimeStats(allSessions) {
  const totalSessions = allSessions.length;
  const totalMonitoredHours =
    Math.round((allSessions.reduce((a, s) => a + (s.duration ?? 0), 0) / 60) * 10) / 10;
  const lifetimeMEDDose =
    Math.round(allSessions.reduce((a, s) => a + (s.medDose ?? 0), 0) * 100) / 100;
  const lifetimeMEDPrevented =
    Math.round(
      allSessions.reduce((a, s) => {
        const simulated = s.simulatedMEDDose ?? s.counterfactual?.simulatedMEDDose;
        return simulated != null ? a + (simulated - (s.medDose ?? 0)) : a;
      }, 0) * 100
    ) / 100;

  const totalFired = allSessions.reduce((a, s) => a + (s.alertsFired ?? 0), 0);
  const totalConfirmed = allSessions.reduce((a, s) => a + (s.alertsConfirmed ?? 0), 0);

  return {
    totalSessions,
    totalMonitoredHours,
    lifetimeMEDDose,
    lifetimeMEDPrevented,
    averageSessionScore: totalSessions
      ? Math.round(allSessions.reduce((a, s) => a + (s.sessionScore ?? 0), 0) / totalSessions)
      : 0,
    overallComplianceRate: totalFired ? Math.round((totalConfirmed / totalFired) * 100) : 100,
    totalWaterEvents: allSessions.reduce((a, s) => a + (s.waterEvents?.length ?? 0), 0),
  };
}

export function calculateInsightsRankings(allSessions) {
  if (allSessions.length < 5) return null;

  // Average contribution of each factor across all sessions.
  const factorKeys = ['uv', 'heatHumidity', 'activity', 'skinType', 'waterEvents'];
  const sums = Object.fromEntries(factorKeys.map((k) => [k, 0]));
  for (const s of allSessions) {
    for (const k of factorKeys) sums[k] += s.factorBreakdown?.[k] ?? 0;
  }
  const vulnerabilityFactorsRanked = factorKeys
    .map((factor) => ({
      factor,
      averagePercentage: Math.round((sums[factor] / allSessions.length) * 10) / 10,
    }))
    .sort((a, b) => b.averagePercentage - a.averagePercentage);

  // Condition combinations that have preceded the most alerts.
  const comboAlerts = new Map();
  for (const s of allSessions) {
    if (!s.alertsFired) continue;
    const uvBand = s.peakUvIndex >= 7 ? 'high UV' : s.peakUvIndex >= 4 ? 'moderate UV' : 'low UV';
    const heat = s.averageTemperature >= 30 ? 'high heat' : 'moderate heat';
    const combo = `${uvBand} + ${heat} + ${s.dominantActivity} activity`;
    comboAlerts.set(combo, (comboAlerts.get(combo) ?? 0) + s.alertsFired);
  }
  const highestRiskConditions = [...comboAlerts.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([conditions, alertCount]) => ({ conditions, alertCount }));

  // Average minutes from application to the critical threshold.
  const windows = allSessions
    .map((s) => s.minutesToCriticalThreshold)
    .filter((m) => m != null);
  const personalReapplicationWindow = windows.length
    ? Math.round(windows.reduce((a, b) => a + b, 0) / windows.length)
    : null;

  return { vulnerabilityFactorsRanked, highestRiskConditions, personalReapplicationWindow };
}
