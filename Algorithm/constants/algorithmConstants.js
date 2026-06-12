// Every number the depletion algorithm uses lives here.
// Nothing is ever hardcoded inline anywhere else in the codebase.
// The firmware C version must mirror these values exactly.

// ─── Base depletion ───────────────────────────────────────────
export const BASE_DEPLETION_RATE = 0.175; // % removed per interval
export const INTERVAL_MS = 30000; // 30-second tick

// ─── UV multiplier table ──────────────────────────────────────
// Keyed by integer UV index. UV 5–6 is the 1.0x baseline since
// standard SPF testing approximates those conditions.
// Readings above 11 use UV_MULTIPLIER_CAP.
export const UV_MULTIPLIERS = {
  0: 0.5,
  1: 0.5,
  2: 0.5,
  3: 0.8,
  4: 0.8,
  5: 1.0,
  6: 1.0,
  7: 1.3,
  8: 1.3,
  9: 1.6,
  10: 1.6,
  11: 2.0,
};
export const UV_MULTIPLIER_CAP = 2.0;

// ─── Heat + humidity combined multiplier ──────────────────────
// A tier activates only when BOTH temperature AND humidity meet
// its thresholds simultaneously — never on either alone.
// Always apply the highest matching tier; 1.0x when none match.
export const HEAT_HUMIDITY_TIERS = [
  { minTempC: 36, minHumidityPct: 85, multiplier: 1.45 },
  { minTempC: 32, minHumidityPct: 75, multiplier: 1.3 },
  { minTempC: 27, minHumidityPct: 60, multiplier: 1.15 },
];
export const HEAT_HUMIDITY_DEFAULT = 1.0;

// ─── Activity multiplier ──────────────────────────────────────
// Covers dry sweat and friction only — water contact is handled
// separately by hard cuts.
export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.0,
  moderate: 1.15,
  high: 1.35,
};

// ─── Skin type sebum multiplier ───────────────────────────────
// Constant for the whole session; never changes from sensor data.
export const SKIN_TYPE_MULTIPLIERS = {
  dry: 1.0,
  normal: 1.05,
  combination: 1.1,
  oily: 1.2,
};

// ─── Alert thresholds ─────────────────────────────────────────
// Protection % at which the first alert fires, by Fitzpatrick type.
export const FITZPATRICK_ALERT_THRESHOLDS = {
  1: 30,
  2: 25,
  3: 20,
  4: 20,
  5: 20,
  6: 20,
};

// Added on top of the Fitzpatrick threshold (fires earlier).
export const AGE_THRESHOLD_ADJUSTMENTS = {
  child: 5, // under 12
  adult: 0,
  elderly: 5, // over 65
};

// Added to the alert threshold when the medication flag is active.
export const MEDICATION_THRESHOLD_ADJUSTMENT = 5;

// ─── Device placement correction ──────────────────────────────
// Adjusts the UV input before it enters the multiplier calculation.
// Wrist consistently underreads actual body UV exposure.
export const PLACEMENT_CORRECTION_FACTORS = {
  hat_brim: 1.0,
  shoulder_strap: 1.0,
  chest: 1.05,
  upper_arm: 1.05,
  wrist: 1.15,
};

// ─── Water event hard cuts ────────────────────────────────────
// Protection % removed immediately when a water event is detected,
// keyed by the sunscreen's water resistance rating in minutes.
export const WATER_EVENT_CUTS = {
  40: { splash: 8, briefImmersion: 20, fullImmersion: 35 },
  80: { splash: 5, briefImmersion: 12, fullImmersion: 22 },
};

// Classification boundaries for water event duration in seconds.
// Under IGNORE is discarded entirely; IGNORE..SPLASH_MAX is a splash;
// over SPLASH_MAX is a full immersion. Brief immersion sits between
// BRIEF_MIN and SPLASH_MAX for hard-cut purposes.
export const WATER_EVENT_DURATIONS = {
  ignoreUnderSeconds: 5,
  splashMaxSeconds: 30,
  briefImmersionMinSeconds: 10,
};

// ─── Personal factor ──────────────────────────────────────────
export const PERSONAL_FACTOR = {
  initial: 1.0,
  min: 0.7,
  max: 1.5,
  maxAdjustmentPerSession: 0.03,
  minSessionsBeforeAdjusting: 3,
};

// ─── Alert escalation ─────────────────────────────────────────
export const ALERT_ESCALATION = {
  secondAlertDelayMs: 15 * 60 * 1000, // after first alert if unconfirmed
  thirdAlertDelayMs: 30 * 60 * 1000, // after first alert if still unconfirmed
  safetyFloorMs: 2 * 60 * 60 * 1000, // fires regardless of protection %
};

// ─── Session score weights ────────────────────────────────────
export const SESSION_SCORE_WEIGHTS = {
  complianceRate: 0.4,
  unprotectedTimePenalty: 0.35,
  depletionManagement: 0.25,
};

// ─── Analysis thresholds ──────────────────────────────────────
export const UNPROTECTED_THRESHOLD_PCT = 20; // "unprotected" for scoring and critical moments
export const BEST_WINDOW_THRESHOLD_PCT = 60; // "well protected" stretch threshold
export const AGGRESSIVE_MULTIPLIER_THRESHOLD = 1.8; // combined multiplier considered aggressive
export const SCORE_PENALTY_PER_UNPROTECTED_MINUTE = 2.5; // points off the unprotected-time component
export const COMPLIANCE_TREND_STABILITY_PCT = 5; // within ±5% counts as stable

// ─── MED / UV dose conversion ─────────────────────────────────
// UV index ≈ erythemally weighted irradiance (W/m²) × 40, so
// irradiance = uvIndex / 40. 1 SED = 100 J/m². The MED threshold
// in J/m² varies by Fitzpatrick type (standard dermatology values).
export const MED_CALCULATION = {
  uvIndexIrradianceDivisor: 40, // uvIndex / 40 → W/m²
  sedJoulesPerM2: 100,
  medJoulesPerM2ByFitzpatrick: {
    1: 200,
    2: 250,
    3: 300,
    4: 450,
    5: 600,
    6: 1000,
  },
};

// Recommended weekly cumulative MED limit by Fitzpatrick type.
export const WEEKLY_MED_LIMITS = {
  1: 3,
  2: 3,
  3: 5,
  4: 5,
  5: 8,
  6: 8,
};

// ─── Sweat load estimation ────────────────────────────────────
// Litres per hour at the reference temperature, scaled
// proportionally by actual temperature / reference temperature.
export const SWEAT_RATES_L_PER_HOUR = {
  high: 1.2,
  moderate: 0.6,
  sedentary: 0.1,
};
export const SWEAT_REFERENCE_TEMP_C = 30;

// ─── Skin stress score ────────────────────────────────────────
export const SKIN_STRESS_WEIGHTS = {
  medDose: 0.5,
  unprotectedMinutes: 0.35,
  peakTemperature: 0.15,
};
// Values at which each component saturates at maximum stress.
export const SKIN_STRESS_NORMALIZERS = {
  maxMedDose: 3,
  maxUnprotectedMinutes: 60,
  tempBaseC: 25,
  tempMaxC: 40,
};
