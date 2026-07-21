// Translates real persisted session data (Supabase `sessions` rows, joined
// with `session_readings`/`session_events`/`post_session_checkins`) into the
// two shapes the rest of the app expects: the lightweight "hero" fields
// every session card renders, and SessionDetailScreen's full `detail`
// breakdown. All narrative copy here is a small deterministic template off
// real numbers — same style as SkinAgeService's leverForFactor/
// monthAssessment — never free-form prose. `aiTake` is always null: that
// field is genuinely LLM-generated content (see CLAUDE.md's "if the Claude
// API fails, show the session summary without the AI insight card" rule),
// so SessionDetailScreen skips rendering SurevaTakeCard when it's null
// rather than faking it here.
import {
  calculateCombinedMultiplier,
  calculateFactorBreakdown,
  findCriticalMoments,
  calculateEffectiveSpf,
  calculateMEDDose,
  calculateSweatLoad,
  calculateSkinStressScore,
  calculateCounterfactual,
  calculatePersonalComparison,
  calculateWeeklyCumulativeDose,
} from '../../Algorithm/js/depletionEngine.js';
import {
  MED_CALCULATION,
  AGGRESSIVE_MULTIPLIER_THRESHOLD,
  INTERVAL_MS,
} from '../../Algorithm/constants/algorithmConstants.js';

const INTERVAL_MINUTES = INTERVAL_MS / 60000;

const DEFAULT_FITZPATRICK = 3;

// ─── Formatting helpers ─────────────────────────────────────────────
// Exported — Passport's mapper (passportUtils.js) reuses these too, so
// date/time/duration display is identical everywhere a session renders.
export function formatDateLabel(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatClock(iso) {
  const d = new Date(iso);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

export function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

// Estimates a session's total MED dose from its stored average_uv +
// duration — used for rows that only carry hero-level columns (no
// session_readings joined), e.g. historical sessions fed to the Pattern
// card's weekly-dose comparison. Sessions with full readings should use
// calculateMEDDose on the real per-reading uvIndex instead (see buildSkin).
function estimateMedDoseFromHero(row, fitzpatrickType) {
  const avgUv = row.average_uv ?? 0;
  const durationSeconds = (row.duration_minutes ?? 0) * 60;
  const joules = (avgUv / MED_CALCULATION.uvIndexIrradianceDivisor) * durationSeconds;
  const medJoules = MED_CALCULATION.medJoulesPerM2ByFitzpatrick[fitzpatrickType]
    ?? MED_CALCULATION.medJoulesPerM2ByFitzpatrick[DEFAULT_FITZPATRICK];
  return Math.round((joules / medJoules) * 100) / 100;
}

// Same estimate, but in raw SED (Standard Erythemal Dose) rather than
// normalized to a Fitzpatrick-specific MED threshold — the unit
// SkinAgeService.calculateSkinAge's agg.totalUVUnits expects.
export function estimateSedFromHero(row) {
  const avgUv = row.average_uv ?? 0;
  const durationSeconds = (row.duration_minutes ?? 0) * 60;
  const joules = (avgUv / MED_CALCULATION.uvIndexIrradianceDivisor) * durationSeconds;
  return Math.round((joules / MED_CALCULATION.sedJoulesPerM2) * 100) / 100;
}

// ─── Hero fields — used by every screen that renders a session card ──
export function buildSessionHero(row, fitzpatrickType = DEFAULT_FITZPATRICK) {
  const start = new Date(row.start_time);
  const end = row.end_time ? new Date(row.end_time) : null;
  const durationMinutes = row.duration_minutes != null
    ? Math.round(row.duration_minutes)
    : (end ? Math.round((end - start) / 60000) : 0);

  const location = row.location_name
    || [row.city, row.region].filter(Boolean).join(', ')
    || row.environment
    || 'Session';

  // estimateMedDoseFromHero already returns dose as a fraction of one MED
  // (1.0 = the skin type's burn threshold), so no further division is needed.
  const medDose = estimateMedDoseFromHero(row, fitzpatrickType);
  const uvDosePercent = Math.round(Math.min(1, medDose) * 100);

  return {
    id: row.id,
    location,
    environment: row.environment ?? 'Outdoors',
    date: formatDateLabel(row.start_time),
    dateISO: start.toISOString().slice(0, 10),
    startTime: formatClock(row.start_time),
    endTime: end ? formatClock(row.end_time) : '—',
    duration: formatDuration(durationMinutes),
    durationMinutes,
    score: row.protection_score ?? 0,
    spf: row.spf,
    waterResistance: row.water_resistance_mins,
    // Rounded to one decimal — the stored value is a raw float from the
    // synthetic UV drift math (e.g. 9.000011) until real sensor data lands.
    peakUV: Math.round((row.peak_uv ?? 0) * 10) / 10,
    uvDosePercent,
  };
}

// ─── Reconstruct engine-shaped readings from stored columns ──────────
// Multiplier sub-fields aren't stored (schema keeps just the raw
// uv/temp/humidity/activity + protection_percentage/depletion_rate) —
// recomputing them from the same inputs + the user's profile is
// deterministic and reproducible, and keeps the schema lean.
export function reconstructReadings(readingRows, profile) {
  return [...readingRows]
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .map((r) => {
      const snapshot = {
        uvIndex: r.uv_index ?? 0,
        temperature: r.temperature ?? 20,
        humidity: r.humidity ?? 0,
        activityLevel: r.activity_level ?? 'sedentary',
      };
      const m = calculateCombinedMultiplier(snapshot, profile);
      return {
        timestamp: new Date(r.timestamp).getTime(),
        uvIndex: snapshot.uvIndex,
        temperature: snapshot.temperature,
        humidity: snapshot.humidity,
        activityLevel: snapshot.activityLevel,
        protectionPercentage: r.protection_percentage ?? 100,
        depletionRatePerInterval: r.depletion_rate ?? m.depletionRatePerInterval,
        uvMultiplier: m.uvMultiplier,
        heatHumidityMultiplier: m.heatHumidityMultiplier,
        activityMultiplier: m.activityMultiplier,
        skinTypeMultiplier: m.skinTypeMultiplier,
        combinedMultiplier: m.combinedMultiplier,
        // No cut-magnitude column exists (no real water event has ever
        // fired without a device) — leave undefined rather than guessing.
        waterEvent: r.water_event ? { eventType: r.water_event_type, cutApplied: 0 } : null,
      };
    });
}

const FACTOR_LABELS = {
  uv: 'UV intensity',
  heatHumidity: 'Heat & humidity',
  activity: 'Activity',
  skinType: 'Skin type',
  waterEvents: 'Water events',
};

function buildDrivers(readings) {
  const breakdown = calculateFactorBreakdown(readings);
  const factors = Object.keys(FACTOR_LABELS)
    .map((key) => ({ label: FACTOR_LABELS[key], pct: breakdown[key] }))
    .sort((a, b) => b.pct - a.pct);
  const top = factors[0];
  const culprit = top.pct > 0
    ? `${top.label} was responsible for ${top.pct}% of your depletion today.`
    : 'Conditions stayed mild — no single factor dominated your depletion today.';

  const peak = readings.reduce((a, b) => (b.combinedMultiplier > a.combinedMultiplier ? b : a), readings[0]);
  const activeAtPeak = [];
  if (peak.uvMultiplier > 1) {
    activeAtPeak.push({ sensor: 'UV index', reading: peak.uvIndex.toFixed(1), mult: `${peak.uvMultiplier.toFixed(1)}x` });
  }
  if (peak.heatHumidityMultiplier > 1) {
    activeAtPeak.push({ sensor: `Temp ${Math.round(peak.temperature)}°C + humidity ${Math.round(peak.humidity)}%`, reading: '', mult: `${peak.heatHumidityMultiplier.toFixed(1)}x` });
  }
  if (peak.activityMultiplier > 1) {
    activeAtPeak.push({ sensor: `${peak.activityLevel} activity`, reading: '', mult: `${peak.activityMultiplier.toFixed(1)}x` });
  }

  const aggressiveReading = readings.find((r) => r.combinedMultiplier > AGGRESSIVE_MULTIPLIER_THRESHOLD);
  const aggressiveAt = aggressiveReading
    ? {
      time: formatClock(new Date(aggressiveReading.timestamp).toISOString()),
      note: 'Conditions crossed into aggressive depletion territory here — your rate jumped noticeably.',
    }
    : {
      time: formatClock(new Date(readings[0].timestamp).toISOString()),
      note: 'Depletion stayed at a steady, moderate rate the entire session.',
    };

  return {
    culprit,
    factors,
    peakMultiplier: { value: Math.round(peak.combinedMultiplier * 10) / 10, time: formatClock(new Date(peak.timestamp).toISOString()) },
    activeAtPeak,
    aggressiveAt,
  };
}

const STRESS_LEVELS = ['Low', 'Moderate', 'High', 'Severe'];

function buildSkin(readings, sessionRow, fitzpatrickType) {
  const effectiveSpf = calculateEffectiveSpf(sessionRow.spf, [], []); // no water-event cut data exists yet
  const effectiveSpfLine = effectiveSpf < sessionRow.spf
    ? `Your SPF ${sessionRow.spf} performed like SPF ${effectiveSpf} today after water exposure reduced its coverage.`
    : `Your SPF ${sessionRow.spf} held its full labeled coverage all session — no water events reduced it.`;

  const sweatLoadMl = calculateSweatLoad(readings);
  const sweat = `An estimated ${sweatLoadMl}ml of sweat was produced across your session's active periods.`;
  const sebum = 'No dedicated sebum sensor yet — this factor isn\'t tracked without the wearable device.';

  const medDose = calculateMEDDose(readings, fitzpatrickType);
  const peakTemperature = sessionRow.peak_temperature ?? Math.max(...readings.map((r) => r.temperature));
  const unprotectedMinutes = sessionRow.unprotected_minutes ?? 0;
  const stressScore = calculateSkinStressScore(medDose, unprotectedMinutes, peakTemperature);
  const levelIndex = Math.min(STRESS_LEVELS.length - 1, Math.floor(stressScore / 25));
  const level = STRESS_LEVELS[levelIndex];
  const stressNote = `for your Fitzpatrick Type ${fitzpatrickType} skin, driven mostly by ${unprotectedMinutes > 10 ? 'unprotected time' : 'accumulated UV dose'}.`;

  // calculateMEDDose already expresses dose in units of MEDs (1.0 = this
  // skin type's minimal erythemal dose, by definition), so the threshold
  // is always exactly 1.0 — no separate lookup needed.
  const medThreshold = 1;
  const medLine = medDose >= 1
    ? `You accumulated ${medDose} MEDs today — past the minimal erythemal dose for your skin type.`
    : `You accumulated ${medDose} MEDs today, under the 1.0 MED minimal erythemal dose for your skin type.`;

  return {
    effectiveSpf: { labeled: sessionRow.spf, line: effectiveSpfLine },
    sebum,
    sweat,
    stress: { level, note: stressNote },
    med: { accumulated: medDose, threshold: medThreshold, line: medLine },
  };
}

function buildMoments(readings, eventRows) {
  const critical = findCriticalMoments(readings);

  const fastestDrop = critical.fastestDepletionMinute
    ? {
      time: formatClock(new Date(critical.fastestDepletionMinute.timestamp).toISOString()),
      text: `You lost ${critical.fastestDepletionMinute.percentageLost}% protection in about a minute here.`,
    }
    : { time: formatClock(new Date(readings[0].timestamp).toISOString()), text: 'Depletion stayed gradual all session — no sudden drops.' };

  const bestWindow = critical.bestProtectedWindow
    ? {
      duration: formatDuration(critical.bestProtectedWindow.durationMinutes),
      text: 'Your longest stretch staying well-protected this session.',
    }
    : { duration: '0m', text: 'No extended high-protection window this session.' };

  const longestUnprotected = critical.longestUnprotectedWindow
    ? {
      duration: formatDuration(critical.longestUnprotectedWindow.durationMinutes),
      text: 'Your longest stretch below the safe protection threshold this session.',
    }
    : null;

  const waterEvents = (eventRows ?? [])
    .filter((e) => e.event_type === 'water_event')
    .map((e) => ({
      time: formatClock(e.timestamp),
      type: e.notes === 'immersion' ? 'Immersion' : 'Splash',
      cut: Math.round(e.protection_at_event ?? 0),
    }));

  return { fastestDrop, bestWindow, longestUnprotected, waterEvents };
}

function buildAlerts(eventRows) {
  const fired = (eventRows ?? []).filter((e) => e.event_type === 'alert_fired').sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const confirmations = (eventRows ?? []).filter((e) => e.event_type === 'alert_confirmed' || e.event_type === 'reapplication');

  const log = fired.map((f, i) => {
    const confirmedEvent = confirmations.find((c) => new Date(c.timestamp) >= new Date(f.timestamp));
    if (!confirmedEvent) {
      return { id: i + 1, confirmed: false, detail: 'Never confirmed this session' };
    }
    const minutes = Math.round(((new Date(confirmedEvent.timestamp) - new Date(f.timestamp)) / 60000) * 10) / 10;
    return { id: i + 1, confirmed: true, detail: `Confirmed in ${minutes} minutes` };
  });

  const confirmedCount = log.filter((a) => a.confirmed).length;
  const rating = fired.length === 0
    ? 'No alerts fired this session — your protection stayed above the alert threshold throughout.'
    : confirmedCount === fired.length
      ? `You responded to all ${fired.length} alert${fired.length === 1 ? '' : 's'} this session.`
      : `You responded to ${confirmedCount} of ${fired.length} alerts; the rest left you unprotected for a stretch.`;

  return { fired: fired.length, log, rating };
}

function buildPrevented(readings, sessionRow, fitzpatrickType) {
  const counterfactual = calculateCounterfactual({ readings, spf: sessionRow.spf }, { fitzpatrickType, spf: sessionRow.spf });
  const withSureva = counterfactual.actualMEDDose;
  const without = counterfactual.simulatedMEDDose;
  const simulated = without > withSureva
    ? `Without your reapplications, this session's dose would have reached ${without} MEDs instead of ${withSureva} MEDs.`
    : 'Your reapplication timing this session closely matched what a perfectly-timed session would have achieved.';
  const weeklyTotal = `Sureva has prevented an estimated ${Math.max(0, Math.round((without - withSureva) * 100) / 100)} MEDs of excess UV exposure this session.`;

  return { simulated, doseComparison: { withSureva, without }, weeklyTotal };
}

// weeklyDose never needs history (calculateWeeklyCumulativeDose is happy
// with zero prior sessions), so it's always populated — only comparison/
// tippingPoint need ≥3 historical sessions with a real averageDepletionRate,
// and fall back to null (PatternCard already skips rendering a null row)
// rather than making the whole card disappear for a new user's first
// few sessions. HomeScreen's WeeklySnapshotCard depends on
// pattern.weeklyDose independent of whether comparison data exists, which
// is why this must never return null outright.
function buildPattern(sessionRow, historicalRows, fitzpatrickType) {
  const comparisonResult = calculatePersonalComparison(
    { averageDepletionRate: sessionRow.average_depletion_rate },
    historicalRows.map((r) => ({ averageDepletionRate: r.average_depletion_rate }))
  );
  const comparisonLine = comparisonResult
    ? `Today you depleted ${Math.abs(comparisonResult.percentageDifference)}% ${comparisonResult.direction} than your historical average.`
    : null;
  const tippingPoint = comparisonResult
    ? 'When your combined depletion multiplier crosses 2x, protection depletes noticeably faster — watch for that combination of conditions.'
    : null;

  const weekly = calculateWeeklyCumulativeDose(
    [...historicalRows, sessionRow].map((r) => ({
      startTime: new Date(r.start_time).getTime(),
      medDose: estimateMedDoseFromHero(r, fitzpatrickType),
    })),
    fitzpatrickType
  );

  return {
    comparison: comparisonLine,
    tippingPoint,
    factorUpdate: null,
    seasonalDrift: null,
    weeklyDose: {
      meds: weekly.weeklyTotal,
      limit: weekly.recommendedLimit,
      line: `${weekly.weeklyTotal} MEDs this week: dermatologists recommend under ${weekly.recommendedLimit} MEDs weekly for your skin type.`,
    },
  };
}

function buildVerdict(score, alerts) {
  if (score >= 90) return `Excellent session: your protection held strong all ${alerts.fired > 0 ? 'while answering every alert' : 'session'}.`;
  if (score >= 75) return 'Solid session: mostly well-protected, with a little room to tighten reapply timing.';
  if (score >= 50) return 'Decent session, but some gaps in protection brought your score down.';
  return 'Rough session: significant unprotected time. Faster alert responses would help a lot next time.';
}

function buildTimeline(readings, sessionRow) {
  const startMs = new Date(sessionRow.start_time).getTime();
  return readings.map((r) => ({
    m: Math.round((r.timestamp - startMs) / 60000),
    pct: Math.round(r.protectionPercentage),
    factor: FACTOR_LABELS[Object.entries({
      uv: r.uvMultiplier, heatHumidity: r.heatHumidityMultiplier, activity: r.activityMultiplier, skinType: r.skinTypeMultiplier,
    }).reduce((a, b) => (b[1] > a[1] ? b : a))[0]],
  }));
}

// ─── Write side: Algorithm/services/SessionService's completedSession → DB rows ──
// Mirrors the read side above: alert confirmation is inferred from a
// reapplication row landing after an alert_fired row (see buildAlerts), so
// no separate alert_confirmed row is written — one row per real event only.

export function buildSessionUpdateFields(completedSession) {
  const { readings, alertComplianceLog } = completedSession;
  const responseTimes = alertComplianceLog.map((a) => a.responseTimeMinutes).filter((m) => m != null);
  const peakTemperature = readings.length ? Math.max(...readings.map((r) => r.temperature)) : null;

  return {
    end_time: new Date(completedSession.endTime).toISOString(),
    duration_minutes: completedSession.duration,
    peak_uv: completedSession.peakUvIndex,
    average_uv: completedSession.averageUvIndex,
    peak_temperature: peakTemperature,
    average_humidity: completedSession.averageHumidity,
    protection_score: completedSession.sessionScore,
    average_depletion_rate: completedSession.averageDepletionRate,
    water_events: completedSession.waterEvents.length,
    alert_count: completedSession.alertsFired,
    alert_response_time_avg: responseTimes.length
      ? Math.round((responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) * 10) / 10
      : null,
    reapplication_count: completedSession.reapplicationLog.length,
    unprotected_minutes: completedSession.unprotectedMinutes,
  };
}

export function buildSessionReadingRows(completedSession) {
  return completedSession.readings.map((r) => ({
    timestamp: new Date(r.timestamp).toISOString(),
    uv_index: r.uvIndex,
    temperature: r.temperature,
    humidity: r.humidity,
    activity_level: r.activityLevel,
    protection_percentage: r.protectionPercentage,
    depletion_rate: r.depletionRatePerInterval,
    water_event: !!r.waterEvent,
    water_event_type: r.waterEvent?.eventType ?? null,
  }));
}

export function buildSessionEventRows(completedSession) {
  const alertRows = completedSession.alertComplianceLog.map((a) => ({
    event_type: 'alert_fired',
    timestamp: new Date(a.alertTime).toISOString(),
    notes: `level ${a.alertLevel}`,
  }));
  const reapplyRows = completedSession.reapplicationLog.map((r) => ({
    event_type: 'reapplication',
    timestamp: new Date(r.timestamp).toISOString(),
  }));
  const waterRows = completedSession.waterEvents.map((w) => ({
    event_type: 'water_event',
    timestamp: new Date(w.timestamp).toISOString(),
    protection_at_event: w.cutApplied,
    notes: w.eventType,
  }));
  return [...alertRows, ...reapplyRows, ...waterRows];
}

// ─── Full detail breakdown ────────────────────────────────────────────
// sessionRow is the result of SupabaseService.getSessionById (with
// session_readings/session_events/post_session_checkins joined).
// historicalRows are the user's other past sessions (hero-level columns
// are enough — no readings needed) for the Pattern card's comparison.
export function buildSessionDetail(sessionRow, userProfile, historicalRows = []) {
  const readingRows = sessionRow.session_readings ?? [];
  if (!readingRows.length) return null;

  const fitzpatrickType = userProfile?.fitzpatrickType ?? DEFAULT_FITZPATRICK;
  const profile = {
    devicePlacement: userProfile?.devicePlacement ?? 'shoulder_strap',
    skinType: userProfile?.skinType ?? 'normal',
    personalFactor: userProfile?.personalFactor ?? 1,
  };
  const readings = reconstructReadings(readingRows, profile);
  const events = sessionRow.session_events ?? [];

  return {
    verdict: buildVerdict(sessionRow.protection_score ?? 0, buildAlerts(events)),
    timeline: buildTimeline(readings, sessionRow),
    drivers: buildDrivers(readings),
    skin: buildSkin(readings, sessionRow, fitzpatrickType),
    moments: buildMoments(readings, events),
    alerts: buildAlerts(events),
    pattern: buildPattern(sessionRow, historicalRows, fitzpatrickType),
    prevented: buildPrevented(readings, sessionRow, fitzpatrickType),
    aiTake: null,
  };
}

// ─── Insights: whole-history math needs completedSession-shaped rows ──────
// InsightsScreen's real numbers (InsightsService.buildComputedInsights) run
// on Algorithm/services/SessionService's `completedSession` shape, but a
// persisted `sessions` row only carries hero-level columns — no
// factorBreakdown, medDose, or counterfactual. This reconstructs just the
// fields the lifetime/compliance/ranking functions actually read, off the
// same joined session_readings buildSessionDetail already uses. Returns null
// when a row has no readings joined (mirroring buildSessionDetail's guard) —
// nothing here is computable without per-reading data, so callers filter
// those out rather than fabricate zeros that would skew the averages.
export function buildCompletedSessionLike(sessionRow, userProfile) {
  const readingRows = sessionRow.session_readings ?? [];
  if (!readingRows.length) return null;

  const fitzpatrickType = userProfile?.fitzpatrickType ?? DEFAULT_FITZPATRICK;
  const profile = {
    devicePlacement: userProfile?.devicePlacement ?? 'shoulder_strap',
    skinType: userProfile?.skinType ?? 'normal',
    personalFactor: userProfile?.personalFactor ?? 1,
  };
  const readings = reconstructReadings(readingRows, profile);
  const events = sessionRow.session_events ?? [];

  // alertsFired/alertsConfirmed come from the same event-log inference the
  // detail card uses (a reapplication landing after an alert_fired = a
  // confirmed alert), not the raw alert_count column — keeps lifetime
  // compliance consistent with what each session's detail already shows.
  const alertsInfo = buildAlerts(events);
  const alertsConfirmed = alertsInfo.log.filter((a) => a.confirmed).length;

  const counterfactual = calculateCounterfactual(
    { readings, spf: sessionRow.spf },
    { fitzpatrickType, spf: sessionRow.spf }
  );

  // averageTemperature isn't a stored column (only peak_temperature is), so
  // recompute it from the reconstructed readings — it only feeds the ranking
  // card's heat-band bucket, and this stays exact rather than estimated.
  const averageTemperature = Math.round(
    readings.reduce((a, r) => a + r.temperature, 0) / readings.length
  );

  return {
    startTime: new Date(sessionRow.start_time).getTime(),
    duration: sessionRow.duration_minutes ?? 0,
    sessionScore: sessionRow.protection_score ?? 0,
    peakUvIndex: sessionRow.peak_uv ?? 0,
    averageTemperature,
    alertsFired: alertsInfo.fired,
    alertsConfirmed,
    medDose: calculateMEDDose(readings, fitzpatrickType),
    counterfactual,
    factorBreakdown: calculateFactorBreakdown(readings),
    // Only .length is read (the lifetime water-event tally), so the raw
    // event rows are enough — no need to reshape them into cut magnitudes.
    waterEvents: events.filter((e) => e.event_type === 'water_event'),
  };
}

// ─── What If simulator: real sessions → SimulationService's input shape ──
// Mirrors constants/mockSessionReadings.js's per-session shape ({ readings,
// userProfile, actuals }), built off the same joined session_readings/
// session_events buildSessionDetail already uses. applicationDelayMinutes
// has no column yet (no real session has ever recorded when sunscreen
// actually went on relative to start) so it defaults to 0 — the same
// fallback SimulationService.overridesFromActuals itself uses. Real water
// events likewise carry no duration column yet (see reconstructReadings'
// waterEvent comment above), so the simulator just won't apply a water cut
// to the "actual" replay for these sessions until BLE data lands — honest,
// not faked. Returns null when there are no readings to replay, same guard
// buildSessionDetail/buildCompletedSessionLike use.
export function buildWhatIfSimData(sessionRow, userProfile) {
  const readingRows = sessionRow.session_readings ?? [];
  if (!readingRows.length) return null;

  const profile = {
    fitzpatrickType: userProfile?.fitzpatrickType ?? DEFAULT_FITZPATRICK,
    devicePlacement: userProfile?.devicePlacement ?? 'shoulder_strap',
    skinType: userProfile?.skinType ?? 'normal',
    personalFactor: userProfile?.personalFactor ?? 1,
  };
  const readings = reconstructReadings(readingRows, profile);
  const startMs = readings[0].timestamp;
  // SimulationService.simulateSession only ever loops over the readings
  // array (its own durationMinutes is (readings.length - 1) *
  // INTERVAL_MINUTES) — a reapplication's own event timestamp isn't
  // guaranteed to fall inside that span (readings and events are separate
  // logs during a real session), so clamp rather than let a marker end up
  // representing a minute the simulation can never actually reach.
  const maxMinute = Math.max(0, (readings.length - 1) * INTERVAL_MINUTES);

  const reapplicationMinutes = (sessionRow.session_events ?? [])
    .filter((e) => e.event_type === 'reapplication')
    .map((e) => {
      const raw = Math.round((new Date(e.timestamp).getTime() - startMs) / 60000);
      return Math.min(Math.max(raw, 0), maxMinute);
    })
    .sort((a, b) => a - b);

  return {
    userProfile: profile,
    actuals: {
      spf: sessionRow.spf,
      waterResistanceRating: sessionRow.water_resistance_mins,
      applicationDelayMinutes: 0,
      reapplicationMinutes,
      activityLevel: null,
      dominantActivity: sessionRow.activity_level ?? 'moderate',
    },
    readings,
  };
}
