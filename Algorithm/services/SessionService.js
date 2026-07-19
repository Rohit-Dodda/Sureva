// Service layer connecting the depletion algorithm to the app.
// Screens never call the algorithm directly — they always go through
// SessionService. The active session lives in a module-level variable
// so it persists across component re-renders.

import {
  initializeSession,
  runSessionInterval,
  confirmReapplication,
  classifyWaterEvent,
  applyWaterEventCut,
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
} from '../js/depletionEngine.js';
import { INTERVAL_MS, UNPROTECTED_THRESHOLD_PCT } from '../constants/algorithmConstants.js';

let activeSession = null;
let activeProfile = null;

export function startSession(userProfile, sessionConfig) {
  activeProfile = userProfile;
  activeSession = initializeSession(userProfile, sessionConfig);
  return activeSession;
}

// Called every 30 seconds during an active session, from real BLE data
// or from the simulator.
export function processInterval(sensorSnapshot) {
  if (!activeSession) return null;
  activeSession = runSessionInterval(activeSession, sensorSnapshot, activeProfile);
  return activeSession;
}

export function handleReapplication() {
  if (!activeSession) return null;
  activeSession = confirmReapplication(activeSession, Date.now());
  return activeSession;
}

export function handleWaterEvent(durationSeconds) {
  if (!activeSession) return null;

  const eventType = classifyWaterEvent(durationSeconds);
  if (eventType === 'ignored') return activeSession;

  const protectionBefore = activeSession.protectionPercentage;
  // Manually-logged event, not tied to a sensor interval — use the
  // most recently recorded activity level as the best available signal.
  const lastActivityLevel = activeSession.readings[activeSession.readings.length - 1]?.activityLevel;
  const { newProtection, cutApplied } = applyWaterEventCut(
    protectionBefore,
    eventType,
    activeSession.waterResistanceRating,
    lastActivityLevel
  );

  activeSession = {
    ...activeSession,
    protectionPercentage: newProtection,
    waterEventLog: [
      ...activeSession.waterEventLog,
      {
        timestamp: Date.now(),
        eventType,
        durationSeconds,
        protectionBefore,
        cutApplied,
        protectionAfter: newProtection,
      },
    ],
  };
  return activeSession;
}

export function endSession() {
  if (!activeSession) return null;

  const session = activeSession;
  const profile = activeProfile;
  const readings = session.readings;
  const endTime = readings.length ? readings[readings.length - 1].timestamp : Date.now();
  // Snapshots may carry their own timestamps (simulator playback of a
  // historical session), so anchor duration to whichever is earlier:
  // the wall-clock start or the first reading.
  const effectiveStart = readings.length
    ? Math.min(session.startTime, readings[0].timestamp)
    : session.startTime;
  const durationMinutes = Math.round((endTime - effectiveStart) / 60000);

  const alertsFired = readings.filter((r) => r.alertFired).length;
  const alertsConfirmed = session.reapplicationLog.filter((rep) =>
    readings.some((r) => r.alertFired && r.timestamp <= rep.timestamp)
  ).length;
  const unprotectedMinutes =
    readings.filter((r) => r.protectionPercentage < UNPROTECTED_THRESHOLD_PCT).length *
    (INTERVAL_MS / 60000);

  // The session's own log captures both interval-detected water events
  // and ones injected via handleWaterEvent (which never appear in a
  // reading); fall back to rebuilding from readings if it's empty.
  const waterEventLog = session.waterEventLog.length
    ? session.waterEventLog
    : buildWaterEventLog(readings);
  const factorBreakdown = calculateFactorBreakdown(readings);
  const medDose = calculateMEDDose(readings, profile.fitzpatrickType);
  const criticalMoments = findCriticalMoments(readings);
  const counterfactual = calculateCounterfactual(session, profile);
  const peakTemperature = readings.length
    ? Math.max(...readings.map((r) => r.temperature))
    : 0;

  const completedSession = {
    sessionId: session.sessionId,
    startTime: session.startTime,
    endTime,
    duration: durationMinutes,
    spf: session.spf,
    waterResistanceRating: session.waterResistanceRating,
    placement: session.placement,
    peakUvIndex: readings.length ? Math.max(...readings.map((r) => r.uvIndex)) : 0,
    averageUvIndex: readings.length
      ? Math.round((readings.reduce((a, r) => a + r.uvIndex, 0) / readings.length) * 10) / 10
      : 0,
    averageTemperature: readings.length
      ? Math.round(readings.reduce((a, r) => a + r.temperature, 0) / readings.length)
      : 0,
    averageHumidity: readings.length
      ? Math.round(readings.reduce((a, r) => a + r.humidity, 0) / readings.length)
      : 0,
    averageDepletionRate: readings.length
      ? readings.reduce((a, r) => a + r.depletionRatePerInterval, 0) / readings.length
      : 0,
    alertsFired,
    alertsConfirmed,
    unprotectedMinutes,
    sessionScore: calculateSessionScore({
      alertsFired,
      alertsConfirmed,
      unprotectedMinutes,
      readings,
      reapplicationLog: session.reapplicationLog,
    }),
    factorBreakdown,
    effectiveSpf: calculateEffectiveSpf(session.spf, waterEventLog, session.reapplicationLog),
    medDose,
    sweatLoadEstimate: calculateSweatLoad(readings),
    skinStressScore: calculateSkinStressScore(medDose, unprotectedMinutes, peakTemperature),
    criticalMoments,
    waterEvents: waterEventLog,
    alertComplianceLog: buildAlertComplianceLog(readings, session.reapplicationLog),
    counterfactual,
    reapplicationLog: session.reapplicationLog,
    readings,
    claudeSummary: null,
  };

  activeSession = null;
  activeProfile = null;
  return completedSession;
}

export function getActiveSessionState() {
  return activeSession;
}
