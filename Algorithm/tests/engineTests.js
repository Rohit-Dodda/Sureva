// Self-contained test suite for the depletion engine.
// No testing framework — run with `node tests/engineTests.js` or import
// runAllTests() and inspect the returned { passed, failed, results }.

import {
  calculateUVMultiplier,
  calculateWBGTApprox,
  calculateHeatHumidityMultiplier,
  calculateActivityMultiplier,
  calculateSkinTypeMultiplier,
  calculatePlacementCorrection,
  calculateCombinedMultiplier,
  calculateAlertThreshold,
  classifyWaterEvent,
  applyWaterEventCut,
  updateProtectionState,
  evaluateAlertState,
  initializeSession,
  runSessionInterval,
  confirmReapplication,
  calculateSessionScore,
  calculateFactorBreakdown,
  calculateEffectiveSpf,
  calculateMEDDose,
  calculateSweatLoad,
  calculateSkinStressScore,
  findCriticalMoments,
  buildWaterEventLog,
  buildAlertComplianceLog,
  calculateCounterfactual,
  updatePersonalFactor,
  calculatePersonalComparison,
  calculateWeeklyCumulativeDose,
  calculateComplianceTrend,
  calculateLifetimeStats,
  calculateInsightsRankings,
} from '../js/depletionEngine.js';
import { UV_MULTIPLIERS, HEAT_ACTIVITY_MULTIPLIERS } from '../constants/algorithmConstants.js';

// ─── Tiny test harness ────────────────────────────────────────

const deepEqual = (a, b) => {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => deepEqual(a[k], b[k]));
};

const approxEqual = (a, b, epsilon = 1e-9) =>
  typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= epsilon;

// ─── Shared fixtures ──────────────────────────────────────────

const baseProfile = {
  fitzpatrickType: 2,
  ageGroup: 'adult',
  skinType: 'oily',
  medicationFlag: false,
  devicePlacement: 'shoulder_strap',
  spf: 50,
  waterResistanceRating: 80,
  personalFactor: 1.0,
  sessionCount: 7,
};

const baseConfig = { spf: 50, waterResistanceRating: 80, placement: 'shoulder_strap' };

function snapshot(overrides = {}) {
  return {
    timestamp: overrides.timestamp ?? Date.now(),
    uvIndex: 6,
    temperature: 25,
    humidity: 50,
    activityLevel: 'sedentary',
    waterEventActive: false,
    waterEventDuration: 0,
    ...overrides,
  };
}

// Runs a deterministic session through the engine and returns its state.
function buildSimulatedSession({ uvIndex = 7, intervals = 60, reapplyAt = null, waterAt = [] } = {}) {
  let state = initializeSession(baseProfile, baseConfig);
  const t0 = state.startTime;
  for (let i = 1; i <= intervals; i++) {
    if (reapplyAt !== null && i === reapplyAt) {
      state = confirmReapplication(state, t0 + i * 30000);
    }
    state = runSessionInterval(
      state,
      snapshot({
        timestamp: t0 + i * 30000,
        uvIndex,
        temperature: 31,
        humidity: 72,
        activityLevel: 'high',
        waterEventActive: waterAt.includes(i),
        waterEventDuration: waterAt.includes(i) ? 45 : 0,
      }),
      baseProfile
    );
  }
  return state;
}

// ─── Test cases ───────────────────────────────────────────────

function buildTestCases() {
  const cases = [];
  const add = (name, input, expected, run, compare = deepEqual) =>
    cases.push({ name, input, expected, run, compare });

  // UV multiplier: every entry in the table.
  for (const [uv, expected] of Object.entries(UV_MULTIPLIERS)) {
    add(
      `UV multiplier table: UV ${uv} → ${expected}x`,
      Number(uv),
      expected,
      () => calculateUVMultiplier(Number(uv))
    );
  }
  add('UV multiplier caps at 2.3 above 11', 13.7, 2.3, () => calculateUVMultiplier(13.7));
  add('UV multiplier floors fractional values (7.9 → 1.3)', 7.9, 1.3, () =>
    calculateUVMultiplier(7.9)
  );

  // WBGT approximation (Australian BOM formula).
  add('WBGT approx matches hand-computed value at 31°C/72%', { t: 31, h: 72 }, 34.19, () =>
    Math.round(calculateWBGTApprox(31, 72) * 100) / 100
  );

  // Heat + humidity — now a single WBGT-derived band, not an AND-gated
  // temp/humidity tier. Humidity alone (high RH, mild temp) or
  // temperature alone (high temp, low RH) can each still push WBGT up
  // since it's a fused index, not a two-threshold gate.
  add('HH "none" band at mild temp+humidity → 1.0', { t: 25, h: 50 }, 1.0, () =>
    calculateHeatHumidityMultiplier(25, 50)
  );
  add('HH "mild" band → 1.0 (sedentary baseline)', { t: 27, h: 60 }, 1.0, () =>
    calculateHeatHumidityMultiplier(27, 60)
  );
  add('HH "veryHigh" band → 1.25', { t: 30, h: 65 }, 1.25, () =>
    calculateHeatHumidityMultiplier(30, 65)
  );
  add('HH "extreme" band → 1.35', { t: 33, h: 78 }, 1.35, () =>
    calculateHeatHumidityMultiplier(33, 78)
  );

  // Activity — now derived from the joint WBGT-band × activity table,
  // so the same activity level costs more as heat rises.
  add('Activity sedentary always → 1.0 (no premium over the HH baseline)', null, 1.0, () =>
    calculateActivityMultiplier(25, 50, 'sedentary')
  );
  add('Activity high in "none" heat band → small premium (1.05)', null, 1.05, () =>
    calculateActivityMultiplier(25, 50, 'high')
  );
  add(
    'Activity high in "extreme" heat band → larger premium than in "none" band',
    null,
    true,
    () => {
      const mildHeatPremium = calculateActivityMultiplier(25, 50, 'high');
      const extremeHeatPremium = calculateActivityMultiplier(33, 78, 'high');
      return extremeHeatPremium > mildHeatPremium;
    }
  );
  add('Activity unrecognized → 1.0, no crash', 'flying', 1.0, () =>
    calculateActivityMultiplier(25, 50, 'flying')
  );

  // Skin type + placement.
  add('Skin type oily → 1.20', 'oily', 1.2, () => calculateSkinTypeMultiplier('oily'));
  add('Skin type unrecognized → 1.0', 'scaly', 1.0, () => calculateSkinTypeMultiplier('scaly'));
  add('Placement wrist → 1.15', 'wrist', 1.15, () => calculatePlacementCorrection('wrist'));

  // Combined multiplier. heatHumidityMultiplier × activityMultiplier
  // must reproduce the true joint HEAT_ACTIVITY_MULTIPLIERS cell
  // (extreme.moderate here) even though they're reported as two
  // separate numbers for factor-breakdown attribution.
  add(
    'Combined multiplier = uv × joint heat-activity cell × skinType × personal',
    { uvIndex: 7.2, temperature: 31, humidity: 72, activityLevel: 'moderate' },
    1.3 * HEAT_ACTIVITY_MULTIPLIERS.extreme.moderate * 1.2 * 1.08,
    () =>
      calculateCombinedMultiplier(
        { uvIndex: 7.2, temperature: 31, humidity: 72, activityLevel: 'moderate' },
        { ...baseProfile, personalFactor: 1.08 }
      ).combinedMultiplier,
    approxEqual
  );
  add(
    'heatHumidityMultiplier × activityMultiplier reproduces the joint table cell',
    null,
    true,
    () => {
      const { heatHumidityMultiplier, activityMultiplier } = calculateCombinedMultiplier(
        { uvIndex: 7.2, temperature: 31, humidity: 72, activityLevel: 'moderate' },
        baseProfile
      );
      return approxEqual(
        heatHumidityMultiplier * activityMultiplier,
        HEAT_ACTIVITY_MULTIPLIERS.extreme.moderate
      );
    }
  );

  // Water classification.
  add('Water 3s → ignored', 3, 'ignored', () => classifyWaterEvent(3));
  add('Water 15s → splash', 15, 'splash', () => classifyWaterEvent(15));
  add('Water 45s → immersion', 45, 'immersion', () => classifyWaterEvent(45));

  // Water cuts.
  add('Immersion @80min rating removes 22%', { protection: 70 }, { newProtection: 48, cutApplied: 22 }, () =>
    applyWaterEventCut(70, 'immersion', 80)
  );
  add('Immersion @80min floors at 0 when protection low', { protection: 10 }, { newProtection: 0, cutApplied: 22 }, () =>
    applyWaterEventCut(10, 'immersion', 80)
  );
  add('Splash @40min rating removes 8%', { protection: 60 }, { newProtection: 52, cutApplied: 8 }, () =>
    applyWaterEventCut(60, 'splash', 40)
  );
  add(
    'Immersion cut scales up with high activity (Bodekaer/Beyer combined effect)',
    { protection: 70, activity: 'high' },
    { newProtection: 41.4, cutApplied: 28.6 },
    () => applyWaterEventCut(70, 'immersion', 80, 'high')
  );
  add(
    'Immersion cut unchanged when activity level is omitted',
    { protection: 70 },
    { newProtection: 48, cutApplied: 22 },
    () => applyWaterEventCut(70, 'immersion', 80)
  );

  // Protection update.
  add('updateProtectionState subtracts and floors at 0', { protection: 0.1, rate: 0.5 }, 0, () =>
    updateProtectionState(0.1, 0.5)
  );

  // Alert thresholds.
  add('Threshold fitz 1 / adult / no meds → 30', null, 30, () =>
    calculateAlertThreshold({ fitzpatrickType: 1, ageGroup: 'adult', medicationFlag: false })
  );
  add('Threshold fitz 2 / elderly / no meds → 30', null, 30, () =>
    calculateAlertThreshold({ fitzpatrickType: 2, ageGroup: 'elderly', medicationFlag: false })
  );
  add('Threshold fitz 3 / adult / meds → 25', null, 25, () =>
    calculateAlertThreshold({ fitzpatrickType: 3, ageGroup: 'adult', medicationFlag: true })
  );
  add('Threshold fitz 1 / child / meds → 40', null, 40, () =>
    calculateAlertThreshold({ fitzpatrickType: 1, ageGroup: 'child', medicationFlag: true })
  );
  add('Threshold fitz 3 / adult / skin condition → 25', null, 25, () =>
    calculateAlertThreshold({ fitzpatrickType: 3, ageGroup: 'adult', skinConditionFlag: true })
  );
  add('Threshold fitz 1 / child / meds + skin condition (stacks additively) → 45', null, 45, () =>
    calculateAlertThreshold({ fitzpatrickType: 1, ageGroup: 'child', medicationFlag: true, skinConditionFlag: true })
  );

  // Alert state machine.
  const t0 = 1_000_000_000;
  const freshAlert = () => ({
    isActive: false,
    level: 0,
    firstAlertTime: null,
    lastApplicationTime: t0,
    confirmed: false,
  });
  add('Alert fires when protection drops below threshold', { protection: 24, threshold: 25 }, true, () =>
    evaluateAlertState(24, 25, freshAlert(), t0 + 60000).newAlertShouldFire
  );
  add('Alert does not fire above threshold', { protection: 60, threshold: 25 }, false, () =>
    evaluateAlertState(60, 25, freshAlert(), t0 + 60000).newAlertShouldFire
  );
  add('Alert escalates to level 2 at 15 minutes', null, { fired: true, level: 2 }, () => {
    const first = evaluateAlertState(24, 25, freshAlert(), t0 + 60000);
    const second = evaluateAlertState(
      20,
      25,
      first.alertState,
      t0 + 60000 + 15 * 60000
    );
    return { fired: second.newAlertShouldFire, level: second.alertState.level };
  });
  add('Alert escalates to level 3 at 30 minutes', null, { fired: true, level: 3 }, () => {
    const first = evaluateAlertState(24, 25, freshAlert(), t0 + 60000);
    const third = evaluateAlertState(15, 25, first.alertState, t0 + 60000 + 30 * 60000);
    return { fired: third.newAlertShouldFire, level: third.alertState.level };
  });
  add('2-hour safety floor fires regardless of protection', { protection: 95 }, true, () =>
    evaluateAlertState(95, 25, freshAlert(), t0 + 2 * 3600000).newAlertShouldFire
  );

  // Reapplication.
  add(
    'confirmReapplication resets to 100 and clears alert state',
    null,
    { protection: 100, alertActive: false, logEntries: 1 },
    () => {
      let state = buildSimulatedSession({ intervals: 10 });
      state = { ...state, alertState: { ...state.alertState, isActive: true, level: 2 } };
      const after = confirmReapplication(state, state.startTime + 11 * 30000);
      return {
        protection: after.protectionPercentage,
        alertActive: after.alertState.isActive,
        logEntries: after.reapplicationLog.length,
      };
    }
  );

  // Personal factor.
  add('Personal factor unchanged below 3 sessions', { sessions: 2 }, 1.0, () =>
    updatePersonalFactor(0.5, 0.9, 1.0, 2)
  );
  add('Personal factor nudges up when actual > predicted', null, true, () =>
    updatePersonalFactor(0.5, 0.51, 1.0, 5) > 1.0
  );
  add('Personal factor adjustment capped at 0.03', null, 1.03, () =>
    updatePersonalFactor(0.5, 1.5, 1.0, 5)
  );
  add('Personal factor never exceeds 1.5', null, 1.5, () =>
    updatePersonalFactor(0.5, 1.5, 1.49, 5)
  );
  add('Personal factor never drops below 0.7', null, 0.7, () =>
    updatePersonalFactor(0.5, 0.1, 0.71, 5)
  );

  // Session score.
  add(
    'Session score 100 for perfect session',
    { alertsFired: 2, alertsConfirmed: 2 },
    100,
    () =>
      calculateSessionScore({
        alertsFired: 2,
        alertsConfirmed: 2,
        unprotectedMinutes: 0,
        readings: [],
        reapplicationLog: [{ timestamp: 1 }],
      })
  );
  add('Session score penalizes ignored alerts', null, true, () => {
    const ignored = calculateSessionScore({
      alertsFired: 3,
      alertsConfirmed: 1,
      unprotectedMinutes: 20,
      readings: [],
      reapplicationLog: [],
    });
    const clean = calculateSessionScore({
      alertsFired: 3,
      alertsConfirmed: 3,
      unprotectedMinutes: 0,
      readings: [],
      reapplicationLog: [],
    });
    return ignored < clean && ignored < 60;
  });

  // Factor breakdown.
  add('Factor breakdown sums to exactly 100', null, 100, () => {
    const session = buildSimulatedSession({ intervals: 60, waterAt: [20, 40] });
    const breakdown = calculateFactorBreakdown(session.readings);
    return breakdown.uv + breakdown.heatHumidity + breakdown.activity + breakdown.skinType + breakdown.waterEvents;
  });

  // Effective SPF.
  add('Effective SPF reduced proportionally by water cuts', null, 34, () =>
    calculateEffectiveSpf(50, [{ cutApplied: 22 }, { cutApplied: 12 }], [])
  );

  // MED dose.
  add('MED dose higher for higher-UV session', null, true, () => {
    const low = buildSimulatedSession({ uvIndex: 3, intervals: 60 });
    const high = buildSimulatedSession({ uvIndex: 9, intervals: 60 });
    return calculateMEDDose(high.readings, 2) > calculateMEDDose(low.readings, 2);
  });

  // Sweat load.
  add('Sweat load positive and scales with activity', null, true, () => {
    const lazy = buildSimulatedSession({ intervals: 60 });
    const lazyReadings = lazy.readings.map((r) => ({ ...r, activityLevel: 'sedentary' }));
    const activeMl = calculateSweatLoad(lazy.readings); // high activity
    const lazyMl = calculateSweatLoad(lazyReadings);
    return activeMl > lazyMl && lazyMl > 0;
  });

  // Skin stress.
  add('Skin stress saturates at 100', { medDose: 10, unprotected: 200, peakTemp: 50 }, 100, () =>
    calculateSkinStressScore(10, 200, 50)
  );

  // Critical moments.
  add('Critical moments finds fastest depletion at water event', null, true, () => {
    const session = buildSimulatedSession({ intervals: 60, waterAt: [30] });
    const moments = findCriticalMoments(session.readings);
    const waterTs = session.waterEventLog[0].timestamp;
    return Math.abs(moments.fastestDepletionMinute.timestamp - waterTs) <= 30000;
  });

  // Logs.
  add('Water event log extracts all events', null, 2, () => {
    const session = buildSimulatedSession({ intervals: 60, waterAt: [20, 40] });
    return buildWaterEventLog(session.readings).length;
  });
  add('Alert compliance log matches confirmations', null, true, () => {
    const session = buildSimulatedSession({ intervals: 120, waterAt: [30, 60] });
    const fired = session.readings.filter((r) => r.alertFired);
    if (fired.length === 0) return false;
    const reapplicationLog = [{ timestamp: fired[0].timestamp + 5 * 60000 }];
    const log = buildAlertComplianceLog(session.readings, reapplicationLog);
    return log.length === fired.length && log[0].responseTimeMinutes === 5;
  });

  // Counterfactual.
  add('Counterfactual simulated dose exceeds actual after reapplication', null, true, () => {
    const session = buildSimulatedSession({ uvIndex: 9, intervals: 120, reapplyAt: 60, waterAt: [30] });
    const cf = calculateCounterfactual(session, baseProfile);
    return cf.simulatedMEDDose > cf.actualMEDDose;
  });

  // Weekly dose.
  add('Weekly dose only counts current calendar week', null, { weeklyTotal: 1.5, recommendedLimit: 3 }, () => {
    const now = new Date('2026-06-11T12:00:00').getTime(); // Thursday
    const monday = new Date('2026-06-08T10:00:00').getTime();
    const lastMonth = new Date('2026-05-11T10:00:00').getTime();
    const sessions = [
      { startTime: monday, medDose: 1.5 },
      { startTime: lastMonth, medDose: 4.0 },
    ];
    return calculateWeeklyCumulativeDose(sessions, 2, now);
  });

  // Trend, lifetime, insights, comparison.
  add('Compliance trend detects improvement', null, 'improving', () => {
    const sessions = [
      ...Array.from({ length: 5 }, (_, i) => ({ startTime: i, alertsFired: 2, alertsConfirmed: 1 })),
      ...Array.from({ length: 3 }, (_, i) => ({ startTime: 5 + i, alertsFired: 2, alertsConfirmed: 2 })),
    ];
    return calculateComplianceTrend(sessions).trend;
  });
  add('Lifetime stats aggregates correctly', null, { totalSessions: 2, lifetimeMEDDose: 3 }, () => {
    const stats = calculateLifetimeStats([
      { duration: 60, medDose: 1, sessionScore: 90, alertsFired: 1, alertsConfirmed: 1, waterEvents: [] },
      { duration: 60, medDose: 2, sessionScore: 80, alertsFired: 1, alertsConfirmed: 0, waterEvents: [{}] },
    ]);
    return { totalSessions: stats.totalSessions, lifetimeMEDDose: stats.lifetimeMEDDose };
  });
  add('Insights rankings null below 5 sessions', null, null, () =>
    calculateInsightsRankings([{}, {}, {}, {}])
  );
  add('Personal comparison null below 3 prior sessions', null, null, () =>
    calculatePersonalComparison({ averageDepletionRate: 0.4 }, [
      { averageDepletionRate: 0.3 },
      { averageDepletionRate: 0.35 },
    ])
  );

  return cases;
}

// ─── Runner ───────────────────────────────────────────────────

export function runAllTests() {
  const results = [];
  let passed = 0;
  let failed = 0;

  for (const testCase of buildTestCases()) {
    let actual;
    let error = null;
    try {
      actual = testCase.run();
    } catch (e) {
      error = e;
    }

    const pass = !error && testCase.compare(actual, testCase.expected);
    if (pass) passed++;
    else failed++;

    results.push({
      name: testCase.name,
      input: testCase.input,
      expected: testCase.expected,
      actual: error ? `threw: ${error.message}` : actual,
      pass,
    });
  }

  return { passed, failed, results };
}

// Allow `node tests/engineTests.js` to print a report directly.
if (import.meta.url === `file://${process.argv[1]}`) {
  const { passed, failed, results } = runAllTests();
  for (const r of results) {
    if (r.pass) {
      console.log(`PASS  ${r.name}`);
    } else {
      console.log(`FAIL  ${r.name}`);
      console.log(`      expected: ${JSON.stringify(r.expected)}`);
      console.log(`      actual:   ${JSON.stringify(r.actual)}`);
    }
  }
  console.log(`\n${passed} passed, ${failed} failed, ${passed + failed} total`);
  process.exitCode = failed > 0 ? 1 : 0;
}
