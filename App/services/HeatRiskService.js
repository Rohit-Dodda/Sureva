// Heat Index — the NWS/NOAA civilian heat-illness risk scale, separate
// from the depletion engine's WBGT model (Algorithm/constants/
// algorithmConstants.js). WBGT there stays exactly as-is — it's already
// validated for the sunscreen-depletion multiplier it drives, calibrated
// against TB MED 507 (US Army heat-stress work/rest tables). That's a
// military scale for fit, acclimatized personnel; it isn't the right
// thing to show a general consumer as "your heatstroke risk." Heat Index
// is what NWS/CDC/OSHA actually publish for the public, and it's a
// different formula (temperature + humidity only — no wind or
// solar-radiation term), so it's computed independently here rather than
// derived from the engine's WBGT output.
//
// Formula: the Rothfusz regression (NWS Technical Attachment SR 90-23,
// 1990) — the same one behind weather.gov's own Heat Index. Calibrated
// in °F; converted at the boundary since the rest of this app displays
// temperature in °C.

function toF(c) {
  return (c * 9) / 5 + 32;
}
function toC(f) {
  return ((f - 32) * 5) / 9;
}

// NWS's own two-step approach: a simple average-based estimate first;
// the full polynomial regression only kicks in once that estimate
// clears 80°F (the regression isn't considered reliable below that).
function rothfusz(tempF, rh) {
  const simple = 0.5 * (tempF + 61 + (tempF - 68) * 1.2 + rh * 0.094);
  const avg = (simple + tempF) / 2;
  if (avg < 80) return simple;

  let hi =
    -42.379 + 2.04901523 * tempF + 10.14333127 * rh
    - 0.22475541 * tempF * rh - 0.00683783 * tempF * tempF
    - 0.05481717 * rh * rh + 0.00122874 * tempF * tempF * rh
    + 0.00085282 * tempF * rh * rh - 0.00000199 * tempF * tempF * rh * rh;

  // Low/high-humidity corrections NWS applies on top of the raw regression.
  if (rh < 13 && tempF >= 80 && tempF <= 112) {
    hi -= ((13 - rh) / 4) * Math.sqrt((17 - Math.abs(tempF - 95)) / 17);
  } else if (rh > 85 && tempF >= 80 && tempF <= 87) {
    hi += ((rh - 85) / 10) * ((87 - tempF) / 5);
  }
  return hi;
}

export function calculateHeatIndex(temperatureC, humidityPct) {
  const tempF = toF(temperatureC);
  const rh = Math.max(0, Math.min(100, humidityPct ?? 0));
  const hiF = rothfusz(tempF, rh);
  return {
    heatIndexF: Math.round(hiF),
    heatIndexC: Math.round(toC(hiF) * 10) / 10,
  };
}

// NWS/NOAA Heat Index chart (weather.gov/safety/heat-tools; NOAA Heat
// Index Chart, noaa.gov). Checked highest-first. Health-effect text is
// the chart's own published wording, not paraphrased.
export const HEAT_RISK_BANDS = [
  {
    key: 'extremeDanger',
    minF: 130,
    label: 'Extreme Danger',
    effect: 'Heat stroke highly likely with continued exposure.',
  },
  {
    key: 'danger',
    minF: 105,
    label: 'Danger',
    effect: 'Heat cramps and heat exhaustion likely; heat stroke probable with continued activity.',
  },
  {
    key: 'extremeCaution',
    minF: 90,
    label: 'Extreme Caution',
    effect: 'Heat cramps, heat exhaustion, and heat stroke possible with prolonged exposure or activity.',
  },
  {
    key: 'caution',
    minF: 80,
    label: 'Caution',
    effect: 'Fatigue possible with prolonged exposure or activity.',
  },
  {
    key: 'none',
    minF: -Infinity,
    label: 'Normal',
    effect: 'No elevated heat risk right now.',
  },
];

export function heatRiskBandFor(heatIndexF) {
  return HEAT_RISK_BANDS.find((b) => heatIndexF >= b.minF);
}

// NIOSH/CDC "Water. Rest. Shade." hydration guidance (CDC/NIOSH Pub.
// 2017-126, "Heat Stress: Hydration"): ~8 oz every 15-20 minutes while
// active in heat, capped well under the point where overhydration
// (hyponatremia) becomes its own risk.
export const HYDRATION_GUIDANCE =
  'Drink about 8 oz of water every 15–20 minutes while active in the heat — up to roughly 48 oz per hour, not more.';

// CDC/NIOSH heat stroke warning signs (cdc.gov/niosh/heat-stress) — the
// "stop and get help" trigger, distinct from the caution-level guidance
// above. This is functional safety content, not disclaimer boilerplate.
export const HEAT_STROKE_WARNING_SIGNS = [
  'Confusion, slurred speech, or acting strangely',
  'Loss of consciousness',
  'Hot, dry skin — or profuse sweating',
  'Seizures',
  'Very high body temperature',
];
export const HEAT_STROKE_ACTION =
  'Stop activity immediately, move to shade or a cool space, and seek emergency medical care.';
