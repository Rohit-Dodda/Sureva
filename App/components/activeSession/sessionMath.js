import colors from '../../constants/colors';
import mockData from '../../constants/mockData';
import { PERSONAL_FACTOR } from '../../../Algorithm/constants/algorithmConstants.js';
import { mockUserProfile as engineMockProfile } from '../../../Algorithm/mock/mockData.js';

// ─── Depletion model ──────────────────────────────────────────
// The live protection %, curve, dose, and vitamin D shown on
// ActiveSessionScreen all come from Algorithm/services/SessionService.js's
// real engine state (SessionEngine.getActiveSessionState()), not from
// anything in this file replaying its own copy of the math — per
// CLAUDE.md, the JS depletion engine is the one source of truth, and a
// second parallel implementation here would only be able to drift from
// it. What's left below is either input shaping (engineProfileFor,
// liveConditionsAt — the mock/BLE swap seam) or display-only derivations
// (status colors, chart downsampling, heat averaging) that don't
// duplicate engine physics.

// Onboarding's burn-rate question is the closer analog to the real
// clinical Fitzpatrick test (self-reported burn/tan history) than skin
// tone alone, but skin tone (already collected on a 1–6 scale matching
// Fitzpatrick's own six types) is a useful second signal. Per CLAUDE.md
// ("when in doubt, be conservative — deplete faster"), taking the lower
// (more sun-sensitive) of the two readings rather than averaging them
// means a mismatch between self-reported burn speed and tone never
// under-protects someone.
const BURN_RATE_TO_FITZPATRICK = {
  very_fast: 1,
  fast: 2,
  moderate: 3,
  rarely: 5,
};

function estimateFitzpatrickType({ skinTone, burnRate }) {
  const fromTone = skinTone ?? engineMockProfile.fitzpatrickType;
  const fromBurn = BURN_RATE_TO_FITZPATRICK[burnRate] ?? engineMockProfile.fitzpatrickType;
  return Math.min(fromTone, fromBurn);
}

function ageRangeToGroup(ageRange) {
  if (ageRange === 0) return 'child';   // Under 12
  if (ageRange === 3) return 'elderly'; // 65+
  return 'adult';                       // 12–50, 51–64
}

// Builds the engine's profile input for a session. `userProfile` is the
// signed-in user's real, saved onboarding answers (see AuthContext /
// EditSkinProfileScreen) — when present, it replaces the mock profile's
// Fitzpatrick/age/skin-type/medication fields with real ones, so editing
// those answers genuinely changes depletion math the next session, not
// just what's displayed. devicePlacement isn't collected from onboarding,
// so it still falls back to the mock profile until there's a real device
// to calibrate it from. personalFactor comes from the user's real,
// persisted value (see updatePersonalFactor in depletionEngine.js) when
// one exists, defaulting to the neutral PERSONAL_FACTOR.initial —
// deliberately NOT the mock profile's 1.08, which would silently bias
// every real user's depletion rate by a fixed, arbitrary demo value.
export function engineProfileFor(sessionParams, userProfile) {
  const real = userProfile && userProfile.skinTone != null ? {
    fitzpatrickType: estimateFitzpatrickType(userProfile),
    ageGroup: ageRangeToGroup(userProfile.ageRange),
    skinType: userProfile.skinType ?? engineMockProfile.skinType,
    medicationFlag: !!userProfile.medications,
    skinConditionFlag: !!userProfile.skinCondition,
  } : null;
  return {
    ...engineMockProfile,
    ...real,
    personalFactor: userProfile?.personalFactor ?? PERSONAL_FACTOR.initial,
    // See PersonalCalibrationService.js — 0 is already neutral, no
    // separate "not enough data" fallback needed here.
    calibrationOffset: userProfile?.calibrationOffset ?? 0,
    // Real algorithmic input (calculatePlacementCorrection in
    // depletionEngine.js) — was previously never surfaced here even once
    // a real value existed on userProfile, since it wasn't part of
    // `real` above and had no explicit override line like
    // personalFactor/calibrationOffset do. Without this line, setting a
    // placement in DevicePlacementScreen would save correctly but never
    // actually change the depletion math — the whole feature would be
    // inert. Falls back to the mock default (not gated on
    // userProfile.skinTone like `real` above, since device placement is
    // independent of the skin-profile onboarding questions).
    devicePlacement: userProfile?.devicePlacement ?? engineMockProfile.devicePlacement,
    spf: sessionParams.spf,
    waterResistanceRating: sessionParams.waterResistance,
  };
}

export function toEngineActivityLevel(level) {
  if (level === 'High') return 'high';
  if (level === 'Moderate') return 'moderate';
  return 'sedentary';
}

// Downsamples an arbitrary {t, pct} series (real engine readings mapped
// to chart points — see ActiveSessionScreen's `curve`) for the
// sparkline, capping how many points get rendered regardless of session
// length. Pure reshaping, no math of its own, so it works identically
// whether the series came from mock-fed or real BLE-fed engine readings.
export function downsampleCurve(series, elapsed, samples = 40) {
  if (series.length <= samples + 1) return series;
  const step = elapsed <= 0 ? 1 : elapsed / samples;
  const points = [];
  let point = series[0];
  let cursor = 0;
  for (let i = 0; i <= samples; i++) {
    const t = Math.min(elapsed, Math.round(i * step));
    while (cursor < series.length && series[cursor].t <= t) point = series[cursor++];
    points.push({ t, pct: point.pct });
  }
  return points;
}

// Real sustained-conditions average for Heat Risk, over the trailing
// window of the engine's ACTUAL recorded readings (not a re-derived
// synthetic sample) — a genuine sensor can have a brief transient blip
// that shouldn't flip the heat-risk band, so this averages rather than
// reading the single latest value. This is the one piece of the old
// smoothedHeatConditions worth keeping post-BLE; the artificial
// HEAT_SWING_DAMPING constant that used to sit alongside it doesn't
// belong here anymore — it was compensating for the demo's old 29°C/
// 65% baseline sitting right on the Extreme Caution boundary (see
// mockData.js's conditions comment), which has since been recentered
// with real margin on both sides. Verified against the current
// baseline: a 120s window with no damping produces a stable band
// (2 band changes across an 80-tick/40-min simulated session, both
// during the first two minutes before the window has enough samples).
export function averagedHeatConditions(readings, windowSecs = 120) {
  if (!readings || !readings.length) {
    return { temperature: mockData.conditions.temperature, humidity: mockData.conditions.humidity };
  }
  const latestTs = readings[readings.length - 1].timestamp;
  const windowReadings = readings.filter((r) => r.timestamp >= latestTs - windowSecs * 1000);
  const n = windowReadings.length;
  const tempSum = windowReadings.reduce((s, r) => s + r.temperature, 0);
  const humiditySum = windowReadings.reduce((s, r) => s + r.humidity, 0);
  return {
    temperature: Math.round((tempSum / n) * 10) / 10,
    humidity: Math.round(humiditySum / n),
  };
}

// ─── Status mapping ───────────────────────────────────────────
export function statusFor(pct) {
  if (pct > 60) {
    return {
      word: 'Protected',
      color: colors.protected,
      gradient: [colors.gradGreenStart, colors.gradGreenEnd],
      wash: colors.greenWash,
    };
  }
  if (pct > 20) {
    return {
      word: 'Reapply soon',
      color: colors.warning,
      gradient: ['#F8B84E', '#EE8C0A'],
      wash: colors.amberWash,
    };
  }
  return {
    word: 'Reapply now',
    color: colors.danger,
    gradient: ['#F0654D', '#DD3220'],
    wash: colors.redWash,
  };
}

export function uvIndexColor(uvi) {
  if (uvi >= 8) return colors.danger;
  if (uvi >= 3) return colors.warning;
  return colors.protected;
}

// Buckets a free-text / preset environment label into the physical thing that
// strips sunscreen, with a relative depletion-pressure score. Keyword-matched so
// it survives both the preset list and Custom free text.
function classifyEnvironment(environment) {
  const e = (environment || '').toLowerCase();
  if (/(beach|water|boat|lake|sea|coast|pool|surf|marina|river)/.test(e))
    return { label: 'Water exposure', icon: 'water', score: 7 };
  if (/(snow|ski|glacier)/.test(e))
    return { label: 'Snow reflection', icon: 'snow', score: 6 };
  if (/(mountain|peak|summit|ridge|desert|dune)/.test(e))
    return { label: 'Reflected glare', icon: 'sunny', score: 3 };
  if (/(park|trail|garden|forest|reserve|hike)/.test(e))
    return { label: 'Open terrain', icon: 'leaf', score: 1.6 };
  return { label: 'Surroundings', icon: 'earth', score: 1 };
}

// Breaks live depletion into the factors driving it, each as a 0–1 share of the
// total. Scores are relative depletion pressure; conservative thresholds (err
// toward more depletion). Order is fixed (not sorted by share) so each meter
// stays put and resizes in place as conditions shift. Pure — safe on render.
export function factorBreakdown(conditions, environment) {
  const { uvIndex = 0, temperature = 20, humidity = 0, activity = 'Low' } = conditions || {};

  const uvScore = Math.max(0, uvIndex);
  const heatScore = Math.max(0, temperature - 22) * 0.4 + Math.max(0, humidity - 45) * 0.05;
  const activityScore = activity === 'High' ? 5 : activity === 'Moderate' ? 3 : 1.2;
  const env = classifyEnvironment(environment);

  const raw = [
    { key: 'uv', label: 'UV intensity', icon: 'sunny', color: colors.orange, score: uvScore },
    { key: 'heat', label: 'Heat & humidity', icon: 'thermometer', color: colors.warning, score: heatScore },
    { key: 'env', label: env.label, icon: env.icon, color: colors.bluetooth, score: env.score },
    { key: 'activity', label: 'Activity & sweat', icon: 'walk', color: colors.navy, score: activityScore },
  ];

  const total = raw.reduce((s, f) => s + f.score, 0) || 1;
  return raw.map((f) => ({ key: f.key, label: f.label, icon: f.icon, color: f.color, share: f.score / total }));
}

// Demo stand-in for live BLE/weather telemetry: drifts the base conditions so
// the factor meters visibly move. Deterministic (function of elapsed only) so it
// never jitters between renders. Cycles are deliberately fast (tens of seconds)
// and each factor uses a different period, so the meters shift at different rates
// and the change is obvious while demoing. Real telemetry would update on the 5s
// BLE cadence — when it lands, this is the single seam to replace.
export function liveConditionsAt(base, elapsedSecs) {
  if (!base) return base;
  const t = elapsedSecs;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const actPhase = Math.sin(t / 19);
  const activity = actPhase > 0.5 ? 'High' : actPhase < -0.4 ? 'Low' : 'Moderate';
  return {
    ...base,
    uvIndex: clamp(base.uvIndex + Math.sin(t / 9) * 2.6, 0, 12),
    temperature: Math.round(clamp(base.temperature + Math.sin(t / 13 + 1) * 4, -20, 55)),
    humidity: Math.round(clamp(base.humidity + Math.cos(t / 7) * 14, 0, 100)),
    activity,
  };
}

export function keyDriver(uvIndex, environment) {
  if (environment === 'Beach / Water') return 'Water activity is your main depletion factor';
  if (environment === 'Snow / Mountains') return 'Snow reflection is amplifying your UV exposure';
  if (uvIndex >= 8) return 'High UV is your main depletion factor right now';
  if (uvIndex >= 5) return 'Moderate UV is the primary driver of depletion';
  return 'Low UV, your protection is holding well';
}

export function formatElapsed(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function clockAfter(minsFromNow) {
  const d = new Date(Date.now() + minsFromNow * 60000);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}
