import colors from '../../constants/colors';
import mockData from '../../constants/mockData';
import {
  calculateCombinedMultiplier,
  updateProtectionState,
} from '../../../Algorithm/js/depletionEngine.js';
import { INTERVAL_MS, MED_CALCULATION, PERSONAL_FACTOR } from '../../../Algorithm/constants/algorithmConstants.js';
import { mockUserProfile as engineMockProfile } from '../../../Algorithm/mock/mockData.js';

// ─── Depletion model ──────────────────────────────────────────
// This used to be a separate, hand-rolled formula that duplicated (and
// drifted from) the real engine — it used a single static UV snapshot
// even while the condition tiles visibly drifted, and its "dose"
// gauge conflated raw UV Index with SED (missing the real ~0.9
// SED-per-UVI-hour conversion the rest of the app uses). Per
// CLAUDE.md, the JS depletion engine is the one source of truth, so
// everything below now calls straight into
// Algorithm/js/depletionEngine.js instead of re-deriving its own math.
const INTERVAL_SECONDS = INTERVAL_MS / 1000;

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
    spf: sessionParams.spf,
    waterResistanceRating: sessionParams.waterResistance,
  };
}

export function toEngineActivityLevel(level) {
  if (level === 'High') return 'high';
  if (level === 'Moderate') return 'moderate';
  return 'sedentary';
}

// Replays the real engine's per-interval math over the whole session,
// tick by tick, feeding it the same drifting live conditions the
// screen already displays — so the protection curve is the same
// physics runSessionInterval() uses, not a separately tuned formula.
// A reapply event resets protection to 100% exactly like
// confirmReapplication() does.
function buildProtectionSeries(elapsedSecs, reapplyEvents, sessionParams, userProfile) {
  const profile = engineProfileFor(sessionParams, userProfile);
  const totalTicks = Math.max(0, Math.floor(elapsedSecs / INTERVAL_SECONDS));
  const series = [{ t: 0, pct: 100 }];
  let protection = 100;
  let depletionRatePerInterval = 0;
  let tSec = 0;
  for (let i = 1; i <= totalTicks; i++) {
    tSec = i * INTERVAL_SECONDS;
    const justReapplied = reapplyEvents.some((r) => r > tSec - INTERVAL_SECONDS && r <= tSec);
    if (justReapplied) protection = 100;

    const live = liveConditionsAt(mockData.conditions, tSec);
    const snapshot = {
      uvIndex: live.uvIndex,
      temperature: live.temperature,
      humidity: live.humidity,
      activityLevel: toEngineActivityLevel(live.activity),
    };
    ({ depletionRatePerInterval } = calculateCombinedMultiplier(snapshot, profile));
    protection = updateProtectionState(protection, depletionRatePerInterval);
    series.push({ t: tSec, pct: protection });
  }
  if (tSec < elapsedSecs) series.push({ t: elapsedSecs, pct: protection });
  return { series, protectionPct: protection, depletionRatePerInterval };
}

// Protection % right now, plus an estimate of minutes remaining
// projected forward at the CURRENT instantaneous depletion rate (live
// UV/heat/activity), not a fixed reference-condition formula.
export function protectionAt(elapsedSecs, reapplyEvents, sessionParams, userProfile) {
  const { protectionPct, depletionRatePerInterval } = buildProtectionSeries(
    elapsedSecs,
    reapplyEvents,
    sessionParams,
    userProfile
  );
  const minsRemaining = depletionRatePerInterval > 0
    ? Math.max(0, Math.round((protectionPct / depletionRatePerInterval) * (INTERVAL_SECONDS / 60)))
    : 0;
  return { protectionPct, minsRemaining };
}

// Builds the live depletion curve across the whole session, downsampled
// for the chart. Derived purely from elapsed + reapplyEvents + the
// deterministic live-conditions generator, so it's safe to compute on render.
export function buildCurve(elapsed, reapplyEvents, sessionParams, samples = 40, userProfile) {
  const { series } = buildProtectionSeries(elapsed, reapplyEvents, sessionParams, userProfile);
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

// Accumulated UV dose this session as a 0–1 fraction of THIS profile's
// actual MED (Minimal Erythemal Dose) — the same SED/MED math the
// depletion engine uses everywhere else (MED_CALCULATION: UV Index →
// irradiance → joules → SED), compared against the Fitzpatrick-specific
// MED threshold rather than one flat number for every skin type.
// Climbs with time and UV index; resets are not applied (dose is
// cumulative exposure regardless of sunscreen).
export function uvDoseFraction(elapsedSecs, userProfile) {
  const totalTicks = Math.max(0, Math.floor(elapsedSecs / INTERVAL_SECONDS));
  let joules = 0;
  let tSec = 0;
  for (let i = 1; i <= totalTicks; i++) {
    tSec = i * INTERVAL_SECONDS;
    const live = liveConditionsAt(mockData.conditions, tSec);
    joules += (live.uvIndex / MED_CALCULATION.uvIndexIrradianceDivisor) * INTERVAL_SECONDS;
  }
  if (tSec < elapsedSecs) {
    const live = liveConditionsAt(mockData.conditions, elapsedSecs);
    joules += (live.uvIndex / MED_CALCULATION.uvIndexIrradianceDivisor) * (elapsedSecs - tSec);
  }

  const sed = joules / MED_CALCULATION.sedJoulesPerM2;
  const fitzpatrickType = userProfile && userProfile.skinTone != null
    ? estimateFitzpatrickType(userProfile)
    : engineMockProfile.fitzpatrickType;
  const medJoules =
    MED_CALCULATION.medJoulesPerM2ByFitzpatrick[fitzpatrickType] ??
    MED_CALCULATION.medJoulesPerM2ByFitzpatrick[3];
  const medSed = medJoules / MED_CALCULATION.sedJoulesPerM2;
  return Math.max(0, Math.min(1, sed / medSed));
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
