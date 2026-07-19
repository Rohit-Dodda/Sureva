// Mock data matching the exact shape of real BLE data — no shortcuts.
// When the hardware is ready, only the data source changes; everything
// downstream consumes these same shapes.
//
// Protection percentages in the readings are computed by the real
// depletion engine, never faked, so the mock data is algorithmically
// accurate and stays correct if constants change.

import {
  calculateCombinedMultiplier,
  classifyWaterEvent,
  applyWaterEventCut,
} from '../js/depletionEngine.js';

// ─── User profile ─────────────────────────────────────────────
export const mockUserProfile = {
  fitzpatrickType: 2,
  ageGroup: 'adult',
  skinType: 'oily',
  medicationFlag: false,
  skinConditionFlag: false,
  devicePlacement: 'shoulder_strap',
  spf: 50,
  waterResistanceRating: 80,
  personalFactor: 1.08,
  sessionCount: 7,
};

// ─── Current snapshot ─────────────────────────────────────────
export const mockCurrentSnapshot = {
  uvIndex: 7.2,
  temperature: 31,
  humidity: 72,
  activityLevel: 'moderate',
  waterEventActive: false,
  waterEventDuration: 0,
  sessionActive: true,
  alertActive: false,
  lastApplicationTime: Date.now() - 45 * 60 * 1000,
};

// ─── Readings generator ───────────────────────────────────────
// 60-minute session sampled every 30 seconds (121 entries, minute 0–60).
// Deterministic so the JS engine and the firmware C version can be
// validated against identical inputs.

const SESSION_MINUTES = 60;
const TICKS_PER_MINUTE = 2;

const SPLASH_MINUTE = 22;
const SPLASH_DURATION_S = 8;
const IMMERSION_MINUTE = 41;
const IMMERSION_DURATION_S = 45;
const ALERT_FIRED_MINUTE = 35;
const ALERT_CONFIRMED_MINUTE = 37;
const REST_PERIODS = [
  { startMinute: 18, endMinute: 20 },
  { startMinute: 47, endMinute: 50 },
];

function uvAtMinute(m, tick) {
  // Rises from ~5.5 to a ~8.5 peak at minute 25, then gradually falls.
  const base = m <= 25 ? 5.5 + 3.0 * (m / 25) : 8.5 - 2.2 * ((m - 25) / 35);
  const wiggle = 0.15 * Math.sin(tick * 0.7);
  return Math.round((base + wiggle) * 10) / 10;
}

function temperatureAtMinute(m, tick) {
  // Rises slowly across the session.
  const base = 29 + 3.0 * (m / SESSION_MINUTES);
  const wiggle = 0.3 * Math.sin(tick * 0.4);
  return Math.round((base + wiggle) * 10) / 10;
}

function humidityAtMinute(tick) {
  // Stays between 68 and 78.
  return Math.round(73 + 4 * Math.sin(tick * 0.35));
}

function activityAtMinute(m) {
  const resting = REST_PERIODS.some((r) => m >= r.startMinute && m < r.endMinute);
  if (resting) return 'sedentary';
  // Alternates between moderate and high in ~7-minute blocks.
  return Math.floor(m / 7) % 2 === 0 ? 'moderate' : 'high';
}

function waterEventAtMinute(m) {
  if (m === SPLASH_MINUTE) return { type: 'splash', durationSeconds: SPLASH_DURATION_S };
  if (m === IMMERSION_MINUTE) return { type: 'immersion', durationSeconds: IMMERSION_DURATION_S };
  return null;
}

export function generateMockReadings(profile = mockUserProfile, sessionStartTime = Date.now() - SESSION_MINUTES * 60 * 1000) {
  const readings = [];
  let protection = 100;

  const totalTicks = SESSION_MINUTES * TICKS_PER_MINUTE;
  for (let tick = 0; tick <= totalTicks; tick++) {
    const minute = tick / TICKS_PER_MINUTE;
    const uvIndex = uvAtMinute(minute, tick);
    const temperature = temperatureAtMinute(minute, tick);
    const humidity = humidityAtMinute(tick);
    const activityLevel = activityAtMinute(minute);
    const waterEvent = waterEventAtMinute(minute);

    if (tick > 0) {
      // Protection is the actual engine output applied to the previous state.
      const prev = readings[tick - 1];
      const { depletionRatePerInterval } = calculateCombinedMultiplier(
        {
          uvIndex: prev.uvIndex,
          temperature: prev.temperature,
          humidity: prev.humidity,
          activityLevel: prev.activityLevel,
        },
        profile
      );
      protection = Math.max(0, protection - depletionRatePerInterval);

      if (waterEvent) {
        const eventType = classifyWaterEvent(waterEvent.durationSeconds);
        const { newProtection } = applyWaterEventCut(
          protection,
          eventType,
          profile.waterResistanceRating,
          prev.activityLevel
        );
        protection = newProtection;
      }
      protection = Math.round(protection * 100) / 100;
    }

    readings.push({
      timestamp: sessionStartTime + tick * 30000,
      uvIndex,
      temperature,
      humidity,
      activityLevel,
      protectionPercentage: protection,
      waterEventOccurred: waterEvent !== null,
      waterEventType: waterEvent ? waterEvent.type : null,
      alertFired: minute === ALERT_FIRED_MINUTE,
      alertConfirmed: minute === ALERT_CONFIRMED_MINUTE,
    });
  }

  return readings;
}

export const mockReadings = generateMockReadings();

// ─── Completed sessions ───────────────────────────────────────
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const now = Date.now();

export const mockCompletedSessions = [
  {
    sessionId: 'session-001',
    startTime: now - 2 * DAY - 3 * HOUR,
    endTime: now - 2 * DAY - 1 * HOUR,
    duration: 120,
    peakUvIndex: 8.4,
    averageUvIndex: 6.7,
    averageTemperature: 31,
    averageHumidity: 72,
    dominantActivity: 'moderate',
    waterEvents: [
      { minute: 38, type: 'immersion', durationSeconds: 52, protectionCut: 22 },
      { minute: 74, type: 'splash', durationSeconds: 7, protectionCut: 5 },
    ],
    alertsFired: 2,
    alertsConfirmed: 2,
    sessionScore: 92,
    factorBreakdown: { uv: 34, heatHumidity: 19, activity: 9, skinType: 6, waterEvents: 32 },
    effectiveSpf: 31,
    medDose: 1.6,
    skinStressScore: 41,
    sweatLoadEstimate: 290,
    longestUnprotectedWindow: 0,
    fastestDepletionMinute: { timestamp: now - 2 * DAY - 2.4 * HOUR, percentageLost: 2.8 },
    counterfactual: { simulatedMEDDose: 2.1 },
    claudeSummary: null,
  },
  {
    sessionId: 'session-002',
    startTime: now - 5 * DAY - 4 * HOUR,
    endTime: now - 5 * DAY - 2.5 * HOUR,
    duration: 92,
    peakUvIndex: 5.1,
    averageUvIndex: 3.9,
    averageTemperature: 26,
    averageHumidity: 58,
    dominantActivity: 'high',
    waterEvents: [],
    alertsFired: 1,
    alertsConfirmed: 1,
    sessionScore: 85,
    factorBreakdown: { uv: 27, heatHumidity: 24, activity: 41, skinType: 8, waterEvents: 0 },
    effectiveSpf: 24,
    medDose: 0.7,
    skinStressScore: 22,
    sweatLoadEstimate: 410,
    longestUnprotectedWindow: 0,
    fastestDepletionMinute: { timestamp: now - 5 * DAY - 3.2 * HOUR, percentageLost: 1.4 },
    counterfactual: { simulatedMEDDose: 0.9 },
    claudeSummary: null,
  },
  {
    sessionId: 'session-003',
    startTime: now - 9 * DAY - 6 * HOUR,
    endTime: now - 9 * DAY - 3 * HOUR,
    duration: 185,
    peakUvIndex: 9.2,
    averageUvIndex: 7.4,
    averageTemperature: 34,
    averageHumidity: 81,
    dominantActivity: 'moderate',
    waterEvents: [
      { minute: 109, type: 'immersion', durationSeconds: 61, protectionCut: 22 },
      { minute: 151, type: 'splash', durationSeconds: 6, protectionCut: 5 },
    ],
    alertsFired: 3,
    alertsConfirmed: 2,
    sessionScore: 78,
    factorBreakdown: { uv: 46, heatHumidity: 26, activity: 6, skinType: 4, waterEvents: 18 },
    effectiveSpf: 26,
    medDose: 2.1,
    skinStressScore: 68,
    sweatLoadEstimate: 380,
    longestUnprotectedWindow: 22,
    fastestDepletionMinute: { timestamp: now - 9 * DAY - 4.1 * HOUR, percentageLost: 3.1 },
    counterfactual: { simulatedMEDDose: 2.9 },
    claudeSummary: null,
  },
  {
    sessionId: 'session-004',
    startTime: now - 14 * DAY - 5 * HOUR,
    endTime: now - 14 * DAY - 4 * HOUR,
    duration: 64,
    peakUvIndex: 3.8,
    averageUvIndex: 2.9,
    averageTemperature: 22,
    averageHumidity: 54,
    dominantActivity: 'sedentary',
    waterEvents: [],
    alertsFired: 0,
    alertsConfirmed: 0,
    sessionScore: 96,
    factorBreakdown: { uv: 58, heatHumidity: 0, activity: 12, skinType: 30, waterEvents: 0 },
    effectiveSpf: 47,
    medDose: 0.3,
    skinStressScore: 9,
    sweatLoadEstimate: 80,
    longestUnprotectedWindow: 0,
    fastestDepletionMinute: { timestamp: now - 14 * DAY - 4.5 * HOUR, percentageLost: 0.6 },
    counterfactual: { simulatedMEDDose: 0.4 },
    claudeSummary: null,
  },
  {
    sessionId: 'session-005',
    startTime: now - 20 * DAY - 7 * HOUR,
    endTime: now - 20 * DAY - 4.5 * HOUR,
    duration: 148,
    peakUvIndex: 10.1,
    averageUvIndex: 8.2,
    averageTemperature: 33,
    averageHumidity: 64,
    dominantActivity: 'high',
    waterEvents: [
      { minute: 51, type: 'immersion', durationSeconds: 95, protectionCut: 22 },
      { minute: 63, type: 'immersion', durationSeconds: 48, protectionCut: 22 },
      { minute: 102, type: 'splash', durationSeconds: 9, protectionCut: 5 },
    ],
    alertsFired: 4,
    alertsConfirmed: 1,
    sessionScore: 61,
    factorBreakdown: { uv: 33, heatHumidity: 14, activity: 13, skinType: 5, waterEvents: 35 },
    effectiveSpf: 19,
    medDose: 2.8,
    skinStressScore: 84,
    sweatLoadEstimate: 520,
    longestUnprotectedWindow: 44,
    fastestDepletionMinute: { timestamp: now - 20 * DAY - 5.8 * HOUR, percentageLost: 3.6 },
    counterfactual: { simulatedMEDDose: 3.6 },
    claudeSummary: null,
  },
];
