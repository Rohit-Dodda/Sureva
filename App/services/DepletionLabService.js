// Pure logic for the Depletion Lab: a standalone hypothetical simulator
// that needs no past session. Builds a synthetic readings array from
// user-chosen constant conditions, replays it through the real engine via
// SimulationService.simulateSession (never a reimplementation), and
// solves for the ideal reapplication schedule that keeps protection above
// the alert threshold the whole session — the "perfect plan".
//
// No UI, no React Native imports — testable standalone in node.

import { simulateSession } from './SimulationService.js';
import {
  calculateCombinedMultiplier,
  calculateSessionScore,
  calculateSkinStressScore,
  calculateFactorBreakdown,
  findCriticalMoments,
} from '../../Algorithm/js/depletionEngine.js';
import { INTERVAL_MS } from '../../Algorithm/constants/algorithmConstants.js';

const INTERVAL_MINUTES = INTERVAL_MS / 60000;

// Seconds underwater per lab water-break type. classifyWaterEvent turns
// ≤30s into a splash cut and >30s into a full-immersion cut, so two
// intensities cover the engine's real behavior space.
export const WATER_BREAK_DURATIONS = { splash: 15, swim: 180 };

// The perfect-plan solver can't converge if conditions are so extreme
// that even reapplying every tick can't hold the threshold; guard well
// above the worst physically reachable schedule (~24 reapps over 8h).
const MAX_PERFECT_REAPPS = 60;

// ─── Synthetic session ────────────────────────────────────────

// Constant-conditions readings array in the exact shape simulateSession
// expects from a real stored session, one reading per 30-second tick.
export function buildSyntheticReadings(config, startTime) {
  const { durationMinutes, uvIndex, temperature, humidity, activityLevel, waterBreaks = [] } = config;
  const count = Math.round(durationMinutes / INTERVAL_MINUTES) + 1;
  const readings = [];
  for (let i = 0; i < count; i++) {
    readings.push({
      timestamp: startTime + i * INTERVAL_MS,
      uvIndex,
      temperature,
      humidity,
      activityLevel,
      waterEventActive: false,
      waterEventDuration: 0,
    });
  }
  for (const wb of waterBreaks) {
    const idx = Math.min(count - 1, Math.max(0, Math.round(wb.minute / INTERVAL_MINUTES)));
    readings[idx] = {
      ...readings[idx],
      waterEventActive: true,
      waterEventDuration: WATER_BREAK_DURATIONS[wb.type] ?? WATER_BREAK_DURATIONS.splash,
    };
  }
  return readings;
}

// ─── Perfect plan ─────────────────────────────────────────────

// Iteratively finds the reapplication schedule that never lets an alert
// fire: run the sim, reapply exactly at the minute the first alert would
// have fired (the reset is processed before that tick's depletion and
// alert evaluation, so the alert never actually fires), repeat until the
// whole session stays protected. Because no alert ever fires and every
// reapplication precedes any alert, this is precisely what
// calculateSessionScore rewards with 100.
export function computePerfectPlan(readings, baseOverrides, userProfile) {
  const reapplicationMinutes = [];
  for (let i = 0; i < MAX_PERFECT_REAPPS; i++) {
    const result = simulateSession({
      readings,
      overrides: { ...baseOverrides, reapplicationMinutes: [...reapplicationMinutes] },
      userProfile,
    });
    // No alert, or the only remaining alert is at the session's final
    // tick (a reapplication as you're walking inside teaches nothing).
    if (result.firstAlertMinute == null || result.firstAlertMinute >= result.durationMinutes) {
      return { result, reapplicationMinutes };
    }
    reapplicationMinutes.push(result.firstAlertMinute);
  }
  const result = simulateSession({
    readings,
    overrides: { ...baseOverrides, reapplicationMinutes: [...reapplicationMinutes] },
    userProfile,
  });
  return { result, reapplicationMinutes };
}

// ─── Scoring ──────────────────────────────────────────────────

// Scores a simulated run through the real calculateSessionScore. In a
// hypothetical there is no "tapped the alert" event, so an alert counts
// as confirmed when the plan reapplies at or after it fired.
export function scoreForResult(result) {
  const alertTimes = result.scoreReadings.filter((r) => r.alertFired).map((r) => r.timestamp);
  const confirmed = alertTimes.filter((t) =>
    result.reapplicationLog.some((rep) => rep.timestamp >= t)
  ).length;
  return calculateSessionScore({
    alertsFired: result.alertsFired,
    alertsConfirmed: confirmed,
    readings: result.scoreReadings,
    reapplicationLog: result.reapplicationLog,
    unprotectedMinutes: result.unprotectedMinutes,
  });
}

// ─── Full lab run ─────────────────────────────────────────────

export function runLab(config, userProfile, startTime = Date.now()) {
  const readings = buildSyntheticReadings(config, startTime);
  const baseOverrides = {
    spf: config.spf,
    waterResistanceRating: config.waterResistanceRating,
    applicationDelayMinutes: 0, // the Lab always assumes sunscreen on at t=0
    activityLevel: config.activityLevel,
  };

  const yourResult = simulateSession({
    readings,
    overrides: { ...baseOverrides, reapplicationMinutes: [...(config.reapplicationMinutes ?? [])] },
    userProfile,
  });
  const { result: perfectResult, reapplicationMinutes: perfectReapps } = computePerfectPlan(
    readings,
    baseOverrides,
    userProfile
  );

  // Conditions are constant, so one engine multiplier call describes
  // every tick — enrich the your-plan curve with it so the engine's own
  // analytics (factor breakdown, critical moments) run on real fields.
  const mult = calculateCombinedMultiplier(
    {
      uvIndex: config.uvIndex,
      temperature: config.temperature,
      humidity: config.humidity,
      activityLevel: config.activityLevel,
    },
    userProfile
  );
  const enriched = yourResult.points.map((p, i) => ({
    timestamp: startTime + i * INTERVAL_MS,
    protectionPercentage: p.pct,
    combinedMultiplier: mult.combinedMultiplier,
    uvMultiplier: mult.uvMultiplier,
    heatHumidityMultiplier: mult.heatHumidityMultiplier,
    activityMultiplier: mult.activityMultiplier,
    skinTypeMultiplier: mult.skinTypeMultiplier,
    depletionRatePerInterval: mult.depletionRatePerInterval,
    waterEvent: null,
  }));
  for (const w of yourResult.waterEvents) {
    const idx = Math.round(w.m / INTERVAL_MINUTES);
    if (enriched[idx]) enriched[idx] = { ...enriched[idx], waterEvent: { cutApplied: w.cutApplied } };
  }

  return {
    startTime,
    config,
    yourResult,
    perfectResult,
    perfectReapps,
    yourScore: scoreForResult(yourResult),
    perfectScore: scoreForResult(perfectResult),
    multiplier: mult,
    factorBreakdown: calculateFactorBreakdown(enriched),
    criticalMoments: findCriticalMoments(enriched),
    skinStress: calculateSkinStressScore(
      yourResult.medDose,
      yourResult.unprotectedMinutes,
      config.temperature
    ),
  };
}

// ─── Display helpers ──────────────────────────────────────────

export function clockAtMinute(startTime, minute) {
  const d = new Date(startTime + minute * 60000);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

export function formatLabDuration(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// Auto-name for saved scenarios: "UV 9 · 32°C · 4h · SPF 50".
export function scenarioName(config) {
  return `UV ${config.uvIndex} · ${config.temperature}°C · ${formatLabDuration(config.durationMinutes)} · SPF ${config.spf}`;
}
