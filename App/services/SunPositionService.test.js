// Self-contained test suite for the solar position math. Same harness style as
// AchievementService.test.js — run with:
//   node App/services/SunPositionService.test.js
//
// These assert against PHYSICAL INVARIANTS rather than values copied from
// another implementation: the sun's declination is bounded by the axial tilt,
// solar-noon altitude has a closed form, the sun peaks at solar noon and is
// due south at that moment in the northern hemisphere. If the algorithm is
// wrong, geometry that simple is what catches it.

import {
  sunDeclination, sunPosition, solarNoonAltitude, seasonalEnvelope,
  seasonalExtremity, altitudeRateOfChange, windowNarrowness, sampleDayArc,
  equationOfTime, AXIAL_TILT,
} from './SunPositionService.js';

let passed = 0;
let failed = 0;

function ok(name, cond, detail = '') {
  if (cond) { passed += 1; return; }
  failed += 1;
  console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}

function near(name, actual, expected, tolerance) {
  const delta = Math.abs(actual - expected);
  ok(name, delta <= tolerance, `got ${actual.toFixed(4)}, expected ${expected} ±${tolerance}`);
}

// Solstices and equinoxes for 2026, in UTC. Times are approximate to the hour,
// which is well inside every tolerance used below.
const MAR_EQUINOX = new Date(Date.UTC(2026, 2, 20, 14, 46));
const JUN_SOLSTICE = new Date(Date.UTC(2026, 5, 21, 8, 25));
const SEP_EQUINOX = new Date(Date.UTC(2026, 8, 23, 0, 5));
const DEC_SOLSTICE = new Date(Date.UTC(2026, 11, 21, 20, 50));

console.log('\nSunPositionService\n');

// ─── Declination: the seasonal driver ─────────────────────────

near('declination ~0 at March equinox', sunDeclination(MAR_EQUINOX), 0, 0.3);
near('declination ~0 at September equinox', sunDeclination(SEP_EQUINOX), 0, 0.3);
near('declination ~+23.44 at June solstice', sunDeclination(JUN_SOLSTICE), AXIAL_TILT, 0.1);
near('declination ~-23.44 at December solstice', sunDeclination(DEC_SOLSTICE), -AXIAL_TILT, 0.1);

// Never exceeds the axial tilt, on any day of the year.
let maxAbsDecl = 0;
for (let d = 0; d < 365; d++) {
  const decl = Math.abs(sunDeclination(new Date(Date.UTC(2026, 0, 1) + d * 86400000)));
  if (decl > maxAbsDecl) maxAbsDecl = decl;
}
ok('declination never exceeds axial tilt', maxAbsDecl <= AXIAL_TILT + 0.01,
  `max |declination| was ${maxAbsDecl.toFixed(4)}`);

// ─── Equation of time ─────────────────────────────────────────

// Swings within roughly ±17 minutes across the year — a standard bound.
let maxAbsEot = 0;
for (let d = 0; d < 365; d++) {
  const e = Math.abs(equationOfTime(new Date(Date.UTC(2026, 0, 1) + d * 86400000)));
  if (e > maxAbsEot) maxAbsEot = e;
}
ok('equation of time stays within ±17 min', maxAbsEot < 17, `max was ${maxAbsEot.toFixed(2)} min`);

// ─── Solar noon altitude ──────────────────────────────────────

// The headline check: on the June solstice the sun is exactly overhead at
// the Tropic of Cancer. If the declination or the altitude formula is off,
// this is the first thing to break.
near('sun overhead at Tropic of Cancer, June solstice',
  solarNoonAltitude(JUN_SOLSTICE, AXIAL_TILT), 90, 0.1);
near('sun overhead at Tropic of Capricorn, December solstice',
  solarNoonAltitude(DEC_SOLSTICE, -AXIAL_TILT), 90, 0.1);
near('sun overhead at equator on equinox',
  solarNoonAltitude(MAR_EQUINOX, 0), 90, 0.3);

// Closed form: 90 − |latitude − declination|, at every latitude.
for (const lat of [-70, -33.9, 0, 23.44, 40.7, 64]) {
  const decl = sunDeclination(JUN_SOLSTICE);
  near(`noon altitude matches closed form at lat ${lat}`,
    solarNoonAltitude(JUN_SOLSTICE, lat), 90 - Math.abs(lat - decl), 0.001);
}

// Polar night: above the Arctic Circle at the December solstice the sun
// never clears the horizon.
ok('polar night at 80°N in December', solarNoonAltitude(DEC_SOLSTICE, 80) < 0,
  `got ${solarNoonAltitude(DEC_SOLSTICE, 80).toFixed(2)}°`);
ok('midnight sun at 80°N in June', solarNoonAltitude(JUN_SOLSTICE, 80) > 0,
  `got ${solarNoonAltitude(JUN_SOLSTICE, 80).toFixed(2)}°`);

// ─── Full position: altitude + azimuth ────────────────────────

// Scan a day at 1-minute resolution and confirm the peak matches the closed
// form, and that the sun is due south at that peak (northern hemisphere).
function scanDay(date, lat, lon) {
  const start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  let best = { altitude: -Infinity };
  for (let m = 0; m < 1440; m++) {
    const at = new Date(start + m * 60000);
    const pos = sunPosition(at, lat, lon);
    if (pos.altitude > best.altitude) best = { ...pos, at };
  }
  return best;
}

const nyc = { lat: 40.7128, lon: -74.006 };
const peakNyc = scanDay(JUN_SOLSTICE, nyc.lat, nyc.lon);
near('NYC June solstice peak altitude matches closed form',
  peakNyc.altitude, solarNoonAltitude(JUN_SOLSTICE, nyc.lat), 0.02);
near('NYC sun is due south at solar noon', peakNyc.azimuth, 180, 1.0);
near('hour angle ~0 at solar noon', peakNyc.hourAngle, 0, 0.3);

// Southern hemisphere: the sun peaks due NORTH, so azimuth wraps near 0/360.
const sydney = { lat: -33.8688, lon: 151.2093 };
const peakSyd = scanDay(DEC_SOLSTICE, sydney.lat, sydney.lon);
near('Sydney December peak altitude matches closed form',
  peakSyd.altitude, solarNoonAltitude(DEC_SOLSTICE, sydney.lat), 0.02);
const sydAzFromNorth = Math.min(peakSyd.azimuth, 360 - peakSyd.azimuth);
ok('Sydney sun is due north at solar noon', sydAzFromNorth < 1.0,
  `azimuth was ${peakSyd.azimuth.toFixed(2)}°`);

// Sun rises in the east and sets in the west, everywhere, always.
const arcNyc = sampleDayArc(JUN_SOLSTICE, nyc.lat, nyc.lon, 10);
ok('day arc has points above the horizon', arcNyc.length > 0, `got ${arcNyc.length}`);
ok('day arc never dips below the horizon', arcNyc.every((p) => p.altitude > 0));
ok('first arc point is easterly', arcNyc[0].azimuth > 0 && arcNyc[0].azimuth < 180,
  `got ${arcNyc[0].azimuth.toFixed(1)}°`);
ok('last arc point is westerly', arcNyc[arcNyc.length - 1].azimuth > 180,
  `got ${arcNyc[arcNyc.length - 1].azimuth.toFixed(1)}°`);

// Azimuth stays in range across a full day at an awkward latitude.
let azInRange = true;
let altSane = true;
for (let m = 0; m < 1440; m += 7) {
  const pos = sunPosition(new Date(Date.UTC(2026, 3, 11) + m * 60000), 64.14, -21.94);
  if (!(pos.azimuth >= 0 && pos.azimuth <= 360)) azInRange = false;
  if (!(pos.altitude >= -90 && pos.altitude <= 90)) altSane = false;
}
ok('azimuth stays within 0-360 all day', azInRange);
ok('altitude stays within ±90 all day', altSane);

// Poles must not produce NaN, where azimuth is genuinely undefined.
const northPole = sunPosition(JUN_SOLSTICE, 90, 0);
ok('north pole returns finite values',
  Number.isFinite(northPole.altitude) && Number.isFinite(northPole.azimuth));

// ─── Seasonal envelope ────────────────────────────────────────

const envNyc = seasonalEnvelope(nyc.lat);
near('NYC seasonal max equals June solstice noon',
  envNyc.max, solarNoonAltitude(JUN_SOLSTICE, nyc.lat), 0.05);
near('NYC seasonal min equals December solstice noon',
  envNyc.min, solarNoonAltitude(DEC_SOLSTICE, nyc.lat), 0.05);
near('seasonal range is twice the axial tilt', envNyc.range, AXIAL_TILT * 2, 0.05);

// Southern hemisphere envelope must not invert (max below min).
const envSyd = seasonalEnvelope(sydney.lat);
ok('southern hemisphere envelope is not inverted', envSyd.max > envSyd.min,
  `max ${envSyd.max.toFixed(2)}, min ${envSyd.min.toFixed(2)}`);
near('Sydney seasonal max equals December solstice noon',
  envSyd.max, solarNoonAltitude(DEC_SOLSTICE, sydney.lat), 0.05);

// ─── The two rarity signals ───────────────────────────────────

// Extremity: ~1 at a solstice (as extreme as the light gets), ~0 at an equinox.
ok('extremity is near 1 at June solstice (north)',
  seasonalExtremity(JUN_SOLSTICE, nyc.lat) > 0.99,
  `got ${seasonalExtremity(JUN_SOLSTICE, nyc.lat).toFixed(4)}`);
ok('extremity is near 1 at December solstice (north)',
  seasonalExtremity(DEC_SOLSTICE, nyc.lat) > 0.99,
  `got ${seasonalExtremity(DEC_SOLSTICE, nyc.lat).toFixed(4)}`);
ok('extremity is near 0 at March equinox',
  seasonalExtremity(MAR_EQUINOX, nyc.lat) < 0.02,
  `got ${seasonalExtremity(MAR_EQUINOX, nyc.lat).toFixed(4)}`);
ok('extremity stays within 0-1 year-round', (() => {
  for (let d = 0; d < 365; d++) {
    const v = seasonalExtremity(new Date(Date.UTC(2026, 0, 1) + d * 86400000), nyc.lat);
    if (!(v >= 0 && v <= 1)) return false;
  }
  return true;
})());

// Narrowness: the inverse pattern. This is the distinction the spec calls out
// — solstices are EXTREME, equinoxes are NARROW. Getting these backwards was
// a real error caught during design.
ok('narrowness is high at equinox',
  windowNarrowness(MAR_EQUINOX, nyc.lat) > 0.97,
  `got ${windowNarrowness(MAR_EQUINOX, nyc.lat).toFixed(4)}`);
ok('narrowness is low at solstice',
  windowNarrowness(JUN_SOLSTICE, nyc.lat) < 0.05,
  `got ${windowNarrowness(JUN_SOLSTICE, nyc.lat).toFixed(4)}`);
ok('extremity and narrowness are inverse at solstice',
  seasonalExtremity(JUN_SOLSTICE, nyc.lat) > windowNarrowness(JUN_SOLSTICE, nyc.lat));
ok('extremity and narrowness are inverse at equinox',
  windowNarrowness(MAR_EQUINOX, nyc.lat) > seasonalExtremity(MAR_EQUINOX, nyc.lat));

// Rate of change peaks near 0.4°/day at mid-latitudes around the equinox.
const eqRate = altitudeRateOfChange(MAR_EQUINOX, nyc.lat);
ok('equinox rate of change is a realistic ~0.4°/day', eqRate > 0.3 && eqRate < 0.45,
  `got ${eqRate.toFixed(4)}°/day`);

ok('narrowness stays within 0-1 year-round', (() => {
  for (let d = 0; d < 365; d += 3) {
    const v = windowNarrowness(new Date(Date.UTC(2026, 0, 1) + d * 86400000), nyc.lat);
    if (!(v >= 0 && v <= 1)) return false;
  }
  return true;
})());

// ─── Determinism ──────────────────────────────────────────────

// The same capture must render identically forever — the spec treats a
// stamp's recipe as immutable, which only holds if this is pure.
const fixed = new Date(Date.UTC(2026, 6, 4, 17, 30));
const runA = sunPosition(fixed, 34.05, -118.24);
const runB = sunPosition(fixed, 34.05, -118.24);
ok('identical inputs produce identical output',
  runA.altitude === runB.altitude && runA.azimuth === runB.azimuth);

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
