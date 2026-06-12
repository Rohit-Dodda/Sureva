// Development-only session simulator.
// Plays mock readings through the real depletion engine at an
// accelerated rate so the UI can be built against live-updating
// session state. This file will be deleted when real BLE data is
// connected — nothing in here contains algorithm logic.

import {
  initializeSession,
  runSessionInterval,
} from '../js/depletionEngine.js';
import { INTERVAL_MS, WATER_EVENT_DURATIONS } from '../constants/algorithmConstants.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock readings store the water event as a type string; the engine
// expects a duration in seconds. Use a representative duration for
// each classification derived from the constants boundaries.
function waterEventDurationForType(waterEventType) {
  if (waterEventType === 'splash') {
    return Math.round(
      (WATER_EVENT_DURATIONS.ignoreUnderSeconds + WATER_EVENT_DURATIONS.splashMaxSeconds) / 2
    );
  }
  if (waterEventType === 'immersion') {
    return WATER_EVENT_DURATIONS.splashMaxSeconds + 15;
  }
  return 0;
}

function readingToSensorSnapshot(reading) {
  return {
    timestamp: reading.timestamp,
    uvIndex: reading.uvIndex,
    temperature: reading.temperature,
    humidity: reading.humidity,
    activityLevel: reading.activityLevel,
    waterEventActive: reading.waterEventOccurred === true,
    waterEventDuration: reading.waterEventOccurred
      ? waterEventDurationForType(reading.waterEventType)
      : 0,
  };
}

/**
 * Plays back a mock readings array through the full session manager at
 * an accelerated rate. A speedMultiplier of 30 makes a 60-minute
 * session play back in 2 minutes.
 *
 * onInterval(sessionState, reading, index) fires after every processed
 * interval so the UI can re-render in real time.
 *
 * Resolves with the completed session state once all readings have
 * been processed.
 */
export async function simulateSession(
  userProfile,
  sessionConfig,
  mockReadings,
  speedMultiplier = 30,
  onInterval = null
) {
  let sessionState = initializeSession(userProfile, sessionConfig);
  const scaledIntervalMs = INTERVAL_MS / Math.max(1, speedMultiplier);

  for (let i = 0; i < mockReadings.length; i++) {
    const snapshot = readingToSensorSnapshot(mockReadings[i]);
    sessionState = runSessionInterval(sessionState, snapshot, userProfile);

    if (onInterval) {
      onInterval(sessionState, sessionState.readings[sessionState.readings.length - 1], i);
    }

    if (i < mockReadings.length - 1) {
      await sleep(scaledIntervalMs);
    }
  }

  return sessionState;
}

/**
 * Returns a slightly randomized copy of a base reading so simulated
 * sessions feel a little different on every run instead of playing
 * back identical data.
 *
 * varianceConfig (all optional):
 *   uvVariance          max ± applied to uvIndex          (default 0.3)
 *   temperatureVariance max ± applied to temperature      (default 0.5)
 *   humidityVariance    max ± applied to humidity         (default 2)
 *   activityFlipChance  probability of nudging activity   (default 0.05)
 */
export function generateMockSensorSnapshot(baseReading, varianceConfig = {}) {
  const {
    uvVariance = 0.3,
    temperatureVariance = 0.5,
    humidityVariance = 2,
    activityFlipChance = 0.05,
  } = varianceConfig;

  const jitter = (max) => (Math.random() * 2 - 1) * max;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  let activityLevel = baseReading.activityLevel;
  if (Math.random() < activityFlipChance) {
    const ladder = ['sedentary', 'moderate', 'high'];
    const index = ladder.indexOf(activityLevel);
    if (index !== -1) {
      const step = Math.random() < 0.5 ? -1 : 1;
      activityLevel = ladder[clamp(index + step, 0, ladder.length - 1)];
    }
  }

  return {
    ...baseReading,
    uvIndex: Math.round(clamp(baseReading.uvIndex + jitter(uvVariance), 0, 14) * 10) / 10,
    temperature:
      Math.round(clamp(baseReading.temperature + jitter(temperatureVariance), -10, 50) * 10) / 10,
    humidity: Math.round(clamp(baseReading.humidity + jitter(humidityVariance), 0, 100)),
    activityLevel,
  };
}
