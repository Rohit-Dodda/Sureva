// Every number the depletion algorithm uses lives here.
// Nothing is ever hardcoded inline anywhere else in the codebase.
// The firmware C version must mirror these values exactly.

// ─── Base depletion ───────────────────────────────────────────
export const BASE_DEPLETION_RATE = 0.175; // % removed per interval
export const INTERVAL_MS = 30000; // 30-second tick

// ─── UV multiplier table ──────────────────────────────────────
// Keyed by integer UV index. UV 5–6 is the 1.0x baseline since
// standard SPF testing approximates those conditions. The top of the
// table steepens (9→10→11 grows faster than 6→7→8) rather than
// continuing a flat climb: Trullàs et al. 2020 (Photodermatology,
// Photoimmunology & Photomedicine) found some sunscreen formulations
// suffer disproportionate SPF loss at high irradiance ("reciprocity
// failure" — SPF is not always dose-invariant), and reciprocity is
// separately shown to break down at high photon flux for higher-SPF
// filters (Ruvolo et al., J. Phys. Chem. Lett. 2020). Per CLAUDE.md,
// when the literature doesn't pin an exact curve, be conservative —
// deplete faster, not slower — so the extreme end assumes some of
// that reciprocity-failure risk rather than assuming it never happens.
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
  10: 1.8,
  11: 2.3,
};
export const UV_MULTIPLIER_CAP = 2.3;

// ─── Combined heat-stress + activity multiplier ───────────────
// Heat, humidity, and activity all feed the SAME underlying
// mechanism — sweat-driven sunscreen wash-off — so they don't act as
// independent multipliers. Two things changed here from the old
// design (which multiplied a temp+humidity AND-gate tier by a flat
// activity multiplier, as if a person's exertion couldn't change how
// much heat+humidity actually cost them):
//
// 1. Temperature and humidity are fused into one heat-stress index
//    (WBGT — Wet Bulb Globe Temperature, the real standard used by
//    ACSM/NIOSH/ACGIH/military heat-safety guidance) via
//    calculateWBGTApprox(), instead of an AND-gated tier table.
// 2. WBGT and activity are combined through a joint (2D) lookup, not
//    a product of two independent scalars — modeled on real combined
//    heat-category × work-intensity tables (US Army TB MED 507;
//    NIOSH's metabolic-rate-adjusted REL/RAL curves; ACGIH TLV for
//    heat stress), all of which show the "cost" of raising activity
//    intensity growing disproportionately larger as heat rises, not
//    a flat percentage add. That disproportionate growth is also
//    directly supported by exercise-physiology sweat-rate modeling:
//    Gonzalez et al. 2012 (J Appl Physiol 112(8):1300-1310) models
//    sweat rate from an activity/metabolic term and a temperature +
//    humidity "evaporative capacity" term that combine non-linearly
//    (not multiplicatively), and a 2024 review of sweat-rate models
//    (PMC12416190) found existing models systematically
//    under-predict specifically at high metabolic rate — i.e., real
//    sweat/heat-strain rises faster than independent factors would
//    predict exactly in the high-heat + high-activity corner.
export const WBGT_APPROX = {
  // Australian Bureau of Meteorology's approximate WBGT formula, used
  // when no black-globe/solar-radiation sensor is available (Sureva's
  // wearable measures air temperature + humidity, not globe temp):
  // WBGT ≈ tempCoefficient·Ta + vaporPressureCoefficient·e + constant
  // This substitutes for the full outdoor WBGT (ISO 7243 / CIE:
  // 0.7·Tnwb + 0.2·Tg + 0.1·Td), fusing temperature and a
  // humidity-derived vapor pressure into one value.
  tempCoefficient: 0.567,
  vaporPressureCoefficient: 0.393,
  constant: 3.94,
  // Vapor pressure e (hPa) from relative humidity via the
  // Magnus/Tetens approximation: e = (RH/100) · base · exp((expCoefficient·Ta) / (expOffset + Ta))
  vaporPressureBase: 6.105,
  vaporPressureExpCoefficient: 17.27,
  vaporPressureExpOffset: 237.7,
};

// WBGT bands, checked highest-first — thresholds mirror the 5 WBGT
// heat categories in TB MED 507 (US Army heat-stress work/rest
// tables), converted from °F to °C.
export const HEAT_BANDS = [
  { key: 'extreme', minWbgtC: 32.2 },
  { key: 'veryHigh', minWbgtC: 31.1 },
  { key: 'high', minWbgtC: 29.5 },
  { key: 'elevated', minWbgtC: 27.8 },
  { key: 'mild', minWbgtC: 25.6 },
  { key: 'none', minWbgtC: -Infinity },
];

// Joint WBGT-band × activity-level multiplier. Read across a row: the
// step from sedentary → high grows much larger in the hotter bands
// (none: +0.05, extreme: +1.00) — that widening gap is the actual
// interaction effect, not something a product of independent factors
// could reproduce.
export const HEAT_ACTIVITY_MULTIPLIERS = {
  none: { sedentary: 1.0, moderate: 1.0, high: 1.05 },
  mild: { sedentary: 1.0, moderate: 1.08, high: 1.2 },
  elevated: { sedentary: 1.05, moderate: 1.2, high: 1.4 },
  high: { sedentary: 1.15, moderate: 1.35, high: 1.65 },
  veryHigh: { sedentary: 1.25, moderate: 1.55, high: 2.0 },
  extreme: { sedentary: 1.35, moderate: 1.75, high: 2.35 },
};

// ─── Skin type sebum multiplier ───────────────────────────────
// Constant for the whole session; never changes from sensor data.
// This tracks oil production (a fixed personal trait), a distinct
// mechanism from the heat/humidity/activity sweat interaction above —
// not addressed by this round of combined-factor research.
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

// Added to the alert threshold when the skin condition flag is active —
// same magnitude and mechanism as the medication adjustment above (fires
// the alert earlier), matching what onboarding's own copy already tells
// the user this flag does (CONDITIONS_INFO.skinCondition in
// onboardingOptions.js: "we recommend more protective reapplication
// intervals"). Stacks additively with the medication adjustment if both
// flags are set — a modest, conservative combination, not a multiplier.
export const SKIN_CONDITION_THRESHOLD_ADJUSTMENT = 5;

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

// Scales a water event's hard cut by how active the user was during
// it. FDA/ISO/TGA water-resistance testing is all done at one
// undefined "moderate activity in water" intensity, so the base cuts
// above already assume some exertion — but two paired studies
// (Bodekær et al. 2008 and Beyer et al. 2010, both Photodermatology,
// Photoimmunology & Photomedicine, same research group/methodology)
// found SPF fell ~25% over 8h with no activity or bathing, vs ~55-58%
// with activity + bathing combined — roughly double. No published
// study isolates swim/exertion intensity specifically while already
// in water (a confirmed literature gap), so this scalar is a
// conservative, directionally-supported approximation of that ~2x
// combined effect, not a precisely fitted curve. Applying no scalar
// (activity level unknown) leaves the base cut unchanged.
export const WATER_EVENT_ACTIVITY_SCALARS = {
  sedentary: 1.0,
  moderate: 1.15,
  high: 1.3,
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
