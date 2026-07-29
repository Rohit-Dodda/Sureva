// Solar position math — where the sun actually is in the sky for a given
// place and instant. Pure and deterministic: no API call, no network, no
// stored state, and identical inputs always produce identical outputs. Same
// discipline the depletion engine follows.
//
// Implements the NOAA Solar Position Algorithm (the same one behind NOAA's
// public solar calculator). Accurate to well under a degree for any date
// within a few centuries of now, which is far tighter than the ~5-10° a
// phone's magnetometer can resolve — so the astronomy is never the limiting
// factor in the AR overlay's accuracy.
//
// Angle conventions, fixed everywhere in this file:
//   altitude — degrees above the horizon. Negative means below it (night).
//   azimuth  — degrees clockwise from true north. 0=N, 90=E, 180=S, 270=W.
//   latitude — degrees north positive, south negative.
//   longitude— degrees east positive, west negative.

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

// Earth's axial tilt. The bound on how far the sun's declination can swing,
// and therefore on the whole seasonal range at any latitude.
export const AXIAL_TILT = 23.4397;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const wrap360 = (deg) => ((deg % 360) + 360) % 360;

// ─── Julian time ──────────────────────────────────────────────

// Days since the Julian epoch. Date already carries an absolute instant, so
// this needs no timezone handling — local-vs-UTC only matters when turning a
// wall clock back into a Date, which is the caller's job.
export function julianDay(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

// Centuries since J2000.0 — the time variable every polynomial below uses.
export function julianCentury(date) {
  return (julianDay(date) - 2451545) / 36525;
}

// ─── Solar orbital elements ───────────────────────────────────

function geomMeanLongSun(t) {
  return wrap360(280.46646 + t * (36000.76983 + t * 0.0003032));
}

function geomMeanAnomalySun(t) {
  return 357.52911 + t * (35999.05029 - 0.0001537 * t);
}

function eccentricityEarthOrbit(t) {
  return 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
}

// The correction from the (fictional) mean sun to the real one, which moves
// unevenly because the orbit is elliptical.
function sunEqOfCenter(t) {
  const m = geomMeanAnomalySun(t) * RAD;
  return Math.sin(m) * (1.914602 - t * (0.004817 + 0.000014 * t))
    + Math.sin(2 * m) * (0.019993 - 0.000101 * t)
    + Math.sin(3 * m) * 0.000289;
}

function sunApparentLong(t) {
  const trueLong = geomMeanLongSun(t) + sunEqOfCenter(t);
  const omega = 125.04 - 1934.136 * t;
  return trueLong - 0.00569 - 0.00478 * Math.sin(omega * RAD);
}

function obliquityCorrection(t) {
  const seconds = 21.448 - t * (46.815 + t * (0.00059 - t * 0.001813));
  const meanObliquity = 23 + (26 + seconds / 60) / 60;
  const omega = 125.04 - 1934.136 * t;
  return meanObliquity + 0.00256 * Math.cos(omega * RAD);
}

// How far north (+) or south (−) of the celestial equator the sun sits.
// This single number drives the entire seasonal cycle: it swings between
// ±AXIAL_TILT over a year, and everything about "what season is it, and how
// extreme is the light" follows from it.
export function sunDeclination(date) {
  const t = julianCentury(date);
  const e = obliquityCorrection(t) * RAD;
  const lambda = sunApparentLong(t) * RAD;
  return Math.asin(Math.sin(e) * Math.sin(lambda)) * DEG;
}

// Minutes by which real solar time runs ahead of (or behind) clock time,
// from the orbit's ellipticity plus the axial tilt. Swings roughly ±16
// minutes across a year; ignoring it would misplace the sun by up to ~4°.
export function equationOfTime(date) {
  const t = julianCentury(date);
  const epsilon = obliquityCorrection(t) * RAD;
  const l0 = geomMeanLongSun(t) * RAD;
  const e = eccentricityEarthOrbit(t);
  const m = geomMeanAnomalySun(t) * RAD;
  const y = Math.tan(epsilon / 2) ** 2;

  const eTime = y * Math.sin(2 * l0)
    - 2 * e * Math.sin(m)
    + 4 * e * y * Math.sin(m) * Math.cos(2 * l0)
    - 0.5 * y * y * Math.sin(4 * l0)
    - 1.25 * e * e * Math.sin(2 * m);

  return eTime * 4 * DEG;
}

// ─── Position ─────────────────────────────────────────────────

// Where the sun is, right now, from right here.
// Returns { altitude, azimuth, declination, hourAngle } — all degrees.
export function sunPosition(date, latitude, longitude) {
  const decl = sunDeclination(date);
  const eqTime = equationOfTime(date);

  // Minutes elapsed in the UTC day, shifted into true solar time at this
  // longitude. 4 minutes per degree is the earth's own rotation rate.
  const utcMinutes = date.getUTCHours() * 60
    + date.getUTCMinutes()
    + date.getUTCSeconds() / 60
    + date.getUTCMilliseconds() / 60000;
  const trueSolarTime = ((utcMinutes + eqTime + 4 * longitude) % 1440 + 1440) % 1440;

  // Degrees the earth has turned past local solar noon. Negative = morning.
  let hourAngle = trueSolarTime / 4 - 180;
  if (hourAngle < -180) hourAngle += 360;

  const latRad = latitude * RAD;
  const declRad = decl * RAD;
  const haRad = hourAngle * RAD;

  const cosZenith = clamp(
    Math.sin(latRad) * Math.sin(declRad) + Math.cos(latRad) * Math.cos(declRad) * Math.cos(haRad),
    -1, 1
  );
  const zenithRad = Math.acos(cosZenith);
  const altitude = 90 - zenithRad * DEG;

  // Azimuth is undefined straight overhead or at the poles, where the
  // denominator collapses — fall back to due south/north rather than NaN.
  const denom = Math.cos(latRad) * Math.sin(zenithRad);
  let azimuth;
  if (Math.abs(denom) < 1e-9) {
    azimuth = latitude >= 0 ? 180 : 0;
  } else {
    const cosAz = clamp((Math.sin(latRad) * cosZenith - Math.sin(declRad)) / denom, -1, 1);
    const azFromSouth = Math.acos(cosAz) * DEG;
    azimuth = hourAngle > 0 ? wrap360(azFromSouth + 180) : wrap360(540 - azFromSouth);
  }

  return { altitude, azimuth, declination: decl, hourAngle };
}

// The sun's altitude at local solar noon — its highest point that day, and
// the cleanest single measure of "how strong is this season here".
// Derived directly from geometry rather than by searching the day's curve.
export function solarNoonAltitude(date, latitude) {
  const decl = sunDeclination(date);
  return 90 - Math.abs(latitude - decl);
}

// ─── Seasonal envelope ────────────────────────────────────────

// The year's highest and lowest solar-noon altitudes at this latitude, and
// the midpoint between them. The sun's declination is bounded by the axial
// tilt, so these follow in closed form — no need to sample 365 days.
//
// Both hemispheres are handled by the same expressions: `max` uses the
// declination closest to this latitude, `min` the one furthest from it.
export function seasonalEnvelope(latitude) {
  const max = 90 - Math.abs(latitude - (latitude >= 0 ? AXIAL_TILT : -AXIAL_TILT));
  const min = 90 - Math.abs(latitude - (latitude >= 0 ? -AXIAL_TILT : AXIAL_TILT));
  return { max, min, midpoint: (max + min) / 2, range: max - min };
}

// How far today sits toward either seasonal extreme, 0 (equinox-like, the
// mid-season) to 1 (solstice-like, as extreme as the light ever gets here).
//
// Near the equator the seasonal range narrows toward zero; guard the divide
// so a tropical latitude returns 0 rather than blowing up.
export function seasonalExtremity(date, latitude) {
  const { midpoint, range } = seasonalEnvelope(latitude);
  if (range < 1e-6) return 0;
  return clamp(Math.abs(solarNoonAltitude(date, latitude) - midpoint) / (range / 2), 0, 1);
}

// Degrees the solar-noon altitude shifts per day right now — the honest
// measure of how narrow a window this angle occupies. Peaks at the
// equinoxes (~0.4°/day mid-latitudes) and falls to ~0 at the solstices,
// which is exactly what "solstice" means: the sun standing still.
//
// A centered difference over ±1 day, so it measures the real local slope
// rather than a forward-biased estimate.
export function altitudeRateOfChange(date, latitude) {
  const DAY_MS = 86400000;
  const before = solarNoonAltitude(new Date(date.getTime() - DAY_MS), latitude);
  const after = solarNoonAltitude(new Date(date.getTime() + DAY_MS), latitude);
  return Math.abs(after - before) / 2;
}

// The same rate, normalized 0-1 against the fastest it ever moves at this
// latitude (which is at the equinoxes). Lets "how narrow is this window"
// compare meaningfully between a polar and a tropical user.
export function windowNarrowness(date, latitude) {
  const equinoxRate = equinoxPeakRate(latitude);
  if (equinoxRate < 1e-9) return 0;
  return clamp(altitudeRateOfChange(date, latitude) / equinoxRate, 0, 1);
}

// Fastest daily altitude swing this latitude ever sees. Sampled across one
// year at 5-day steps, rather than derived analytically — the closed form is
// messy and this is memoized anyway.
//
// Cached on latitude rounded to 0.1° (~11km), which is far finer than this
// value varies but coarse enough that a drifting GPS fix reuses one entry
// instead of recomputing on every reading.
const peakRateCache = new Map();

function equinoxPeakRate(latitude) {
  const key = Math.round(latitude * 10) / 10;
  const cached = peakRateCache.get(key);
  if (cached !== undefined) return cached;

  const DAY_MS = 86400000;
  // Any recent year works: the rate's shape repeats annually and shifts
  // negligibly between years.
  const base = Date.UTC(2024, 0, 1);
  let peak = 0;
  for (let d = 0; d < 365; d += 5) {
    const r = altitudeRateOfChange(new Date(base + d * DAY_MS), key);
    if (r > peak) peak = r;
  }
  peakRateCache.set(key, peak);
  return peak;
}

// ─── Solstices and equinoxes ──────────────────────────────────

// The four turning points of a given year, found by searching the sun's own
// declination rather than hardcoding dates — they drift by up to two days
// between years, and a hardcoded table would quietly rot.
//
// Equinoxes are where declination crosses zero; solstices are where it
// reaches its extremes. Coarse daily scan, then a bisection refine to the
// hour, which is far finer than the ±day windows the Atlas actually uses.
//
// Keys are astronomical (march/june/september/december), NOT seasonal —
// "June solstice" is midsummer in the north and midwinter in the south, so
// naming them by season here would be wrong for half the planet. Use
// `seasonNameFor` to get the hemisphere-correct label.
// Memoized by year: the search below costs a few hundred declination
// evaluations, and the rarity engine asks for the same handful of years over
// and over. Without this a single capture triggers thousands of redundant
// computations — measurably slow even on a laptop, unusable on a phone.
const markerCache = new Map();

export function seasonalMarkers(year) {
  const cached = markerCache.get(year);
  if (cached) return cached;

  const DAY_MS = 86400000;
  const declAt = (ms) => sunDeclination(new Date(ms));

  const yearStart = Date.UTC(year, 0, 1);
  const yearEnd = Date.UTC(year + 1, 0, 1);

  // Daily samples give a bracket for every event; nothing here moves fast
  // enough to hide between two consecutive days.
  const samples = [];
  for (let ms = yearStart; ms <= yearEnd; ms += DAY_MS) samples.push({ ms, decl: declAt(ms) });

  // Zero crossings → equinoxes.
  const crossings = [];
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1];
    const b = samples[i];
    if ((a.decl <= 0 && b.decl > 0) || (a.decl >= 0 && b.decl < 0)) {
      let lo = a.ms;
      let hi = b.ms;
      const rising = b.decl > a.decl;
      for (let k = 0; k < 40; k++) {
        const mid = (lo + hi) / 2;
        const d = declAt(mid);
        if (rising ? d < 0 : d > 0) lo = mid; else hi = mid;
      }
      crossings.push({ ms: (lo + hi) / 2, rising });
    }
  }

  // Extremes → solstices. Refined by ternary search around the daily peak.
  function refineExtreme(centerMs, wantMax) {
    let lo = centerMs - DAY_MS * 2;
    let hi = centerMs + DAY_MS * 2;
    for (let k = 0; k < 60; k++) {
      const m1 = lo + (hi - lo) / 3;
      const m2 = hi - (hi - lo) / 3;
      const better = wantMax ? declAt(m1) < declAt(m2) : declAt(m1) > declAt(m2);
      if (better) lo = m1; else hi = m2;
    }
    return (lo + hi) / 2;
  }

  let maxSample = samples[0];
  let minSample = samples[0];
  for (const s of samples) {
    if (s.decl > maxSample.decl) maxSample = s;
    if (s.decl < minSample.decl) minSample = s;
  }

  const markers = {
    march: new Date(crossings.find((c) => c.rising)?.ms ?? Date.UTC(year, 2, 20)),
    june: new Date(refineExtreme(maxSample.ms, true)),
    september: new Date(crossings.find((c) => !c.rising)?.ms ?? Date.UTC(year, 8, 22)),
    december: new Date(refineExtreme(minSample.ms, false)),
  };
  markerCache.set(year, markers);
  return markers;
}

// Hemisphere-correct season name for one of the four astronomical markers.
// The June solstice is 'summer' in the north and 'winter' in the south.
export function seasonNameFor(marker, latitude) {
  const north = latitude >= 0;
  switch (marker) {
    case 'march': return north ? 'spring' : 'autumn';
    case 'june': return north ? 'summer' : 'winter';
    case 'september': return north ? 'autumn' : 'spring';
    case 'december': return north ? 'winter' : 'summer';
    default: return null;
  }
}

// Distance in days to the nearest of the given markers, unbounded. Checks
// the neighbouring years too, so a late-December capture still measures
// against that year's December solstice rather than falling through the
// year boundary and matching something ten months away.
export function markerDistance(date, keys = ['march', 'june', 'september', 'december']) {
  const year = date.getUTCFullYear();
  let best = null;
  for (const y of [year - 1, year, year + 1]) {
    const markers = seasonalMarkers(y);
    for (const key of keys) {
      const days = Math.abs(date.getTime() - markers[key].getTime()) / 86400000;
      if (!best || days < best.days) best = { marker: key, days, at: markers[key] };
    }
  }
  return best;
}

// Which seasonal marker (if any) a date falls close enough to to count as
// "caught at" it.
export function nearestMarker(date, windowDays = 10) {
  const best = markerDistance(date);
  return best && best.days <= windowDays ? best : null;
}

// ─── Day arc ──────────────────────────────────────────────────

// Samples the sun's whole path for a day, for the Scout view's arc overlay.
// Returns only points above the horizon — the arc should start where the sun
// actually rises and end where it sets, not run through the ground.
//
// `stepMinutes` trades smoothness for cost; 10 gives a visually continuous
// curve at a few dozen points.
export function sampleDayArc(date, latitude, longitude, stepMinutes = 10) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const points = [];
  for (let m = 0; m < 1440; m += stepMinutes) {
    const at = new Date(startOfDay.getTime() + m * 60000);
    const { altitude, azimuth } = sunPosition(at, latitude, longitude);
    if (altitude > 0) points.push({ at, altitude, azimuth });
  }
  return points;
}

// Whether the sun is currently in the low, warm-light band. Defined by real
// solar altitude rather than a clock window, so it stays correct across
// seasons and latitudes where "6pm" means wildly different things.
//
// 0-6° is the classic golden-hour band; below 0 is past sunset.
export function isGoldenHour(date, latitude, longitude) {
  const { altitude } = sunPosition(date, latitude, longitude);
  return altitude > 0 && altitude <= 6;
}

export default {
  julianDay,
  julianCentury,
  sunDeclination,
  equationOfTime,
  sunPosition,
  solarNoonAltitude,
  seasonalEnvelope,
  seasonalExtremity,
  altitudeRateOfChange,
  windowNarrowness,
  seasonalMarkers,
  seasonNameFor,
  nearestMarker,
  markerDistance,
  sampleDayArc,
  isGoldenHour,
  AXIAL_TILT,
};
