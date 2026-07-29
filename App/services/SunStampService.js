// Sun Stamp rarity — decides what tier a capture earns and why.
//
// Pure and deterministic, like SunPositionService and DepletionLabService:
// no React Native imports, no network, no stored state. The same capture
// always resolves to the same tier and the same sentence, forever — which
// the spec requires, since a stamp's recipe is immutable once caught.
//
// Rarity is the MAX of several independent signals, never their sum. Each
// signal answers a different question ("is this light extreme?", "is this
// new for you?", "did you get lucky with the sky?"), so adding them would
// let three mediocre answers masquerade as one remarkable one. Taking the
// max means a stamp is exactly as rare as its single most remarkable
// property — and that property is what the user gets told about.
//
// Nothing here reads protection data, UV, or session state. Per the feature's
// governing rule, a stamp is never a comment on risk.

import {
  sunPosition, nearestMarker, markerDistance, seasonNameFor,
} from './SunPositionService.js';

// Band edges reused verbatim from AchievementService's existing metrics, so
// the Atlas and the achievement badges can never disagree about what counts
// as "the tropics" or "highland".
const TROPICS_LAT = 23.44;
const EQUATOR_BAND_LAT = 5;
const ARCTIC_LAT = 66.56;
const ALTITUDE_EDGES = [1000, 2500, 4000];

// Golden hour, by real solar altitude rather than clock time — "6pm" means
// completely different light in Reykjavik and Quito.
const GOLDEN_MAX_ALTITUDE = 6;

// Both geometric signals measure PROXIMITY IN DAYS to their event, not the
// raw physical quantity.
//
// This was a real correction. Using the smooth physical signals directly
// (seasonal extremity, altitude rate-of-change) fails badly, because the two
// are anti-correlated: extremity peaks at the solstices exactly where
// narrowness bottoms out, and vice versa. Their max is therefore high almost
// year-round — measured at 37% of days landing in the top tier, which would
// make "Once-a-Year" meaningless. No amount of exponent shaping fixes an
// anti-correlated pair.
//
// Distance-to-event is both honest and directly tunable: with this falloff,
// the top tier needs a capture within ~1.3 days of an actual solstice or
// equinox — about 11 days a year across all four markers.
const MARKER_FALLOFF_DAYS = 4;

// Gaussian falloff on days-from-event: 1.0 at the event, ~0.78 at 2 days,
// ~0.32 at 4.5, negligible past a week.
function markerProximity(days) {
  return Math.exp(-((days / MARKER_FALLOFF_DAYS) ** 2));
}

// Golden hour happens every single day, so on its own it must never out-rank
// something that happens once a year. Capped below the ALIGNMENT threshold
// by construction: a golden-hour capture is reliably Seasonal, never more.
const GOLDEN_FLOOR = 0.45;
const GOLDEN_CEILING = 0.68;

// Novelty is discrete — you either have been to this band before or you
// haven't. A first-ever latitude or altitude band is a bigger deal than a
// new town, which is why they score differently.
//
// Deliberately capped BELOW the Once-a-Year threshold. Novelty is relative to
// one person's own collection, so it can't be evidence of genuine rarity: the
// top tier is reserved for astronomical events that really do come round once
// a year. Reaching a new band is an Alignment at most.
const NOVELTY_NEW_LATITUDE = 0.76;
const NOVELTY_NEW_ALTITUDE = 0.74;
const NOVELTY_NEW_PLACE = 0.5;

export const TIER_THRESHOLDS = { once: 0.9, alignment: 0.7, seasonal: 0.45 };
export const TIERS = ['everyday', 'seasonal', 'alignment', 'once'];

const clamp01 = (v) => Math.min(1, Math.max(0, v));

// ─── Band classification ──────────────────────────────────────

export function latitudeBand(latitude) {
  const abs = Math.abs(latitude);
  if (abs <= EQUATOR_BAND_LAT) return 'equatorial';
  if (abs <= TROPICS_LAT) return 'tropics';
  if (abs < ARCTIC_LAT) return 'temperate';
  return 'polar';
}

// Null altitude means the GPS fix carried no trustworthy elevation — that is
// NOT sea level, and must not fill the Sea Level slot. Same distinction
// AchievementService already draws for the Altitude Ace badge.
export function altitudeBand(altitudeM) {
  if (typeof altitudeM !== 'number' || !Number.isFinite(altitudeM)) return null;
  if (altitudeM < ALTITUDE_EDGES[0]) return 'seaLevel';
  if (altitudeM < ALTITUDE_EDGES[1]) return 'foothill';
  if (altitudeM < ALTITUDE_EDGES[2]) return 'highland';
  return 'summit';
}

// Normalizes a place name for identity comparison, so "Laguna Beach" and
// "laguna beach " are the same place and don't each claim their own slot.
export function placeKey(placeName) {
  return typeof placeName === 'string' && placeName.trim()
    ? placeName.trim().toLowerCase()
    : null;
}

// ─── Signals ──────────────────────────────────────────────────

// Each returns 0-1, and carries the sentence explaining itself. The sentence
// lives beside the number deliberately: whichever signal wins is the one the
// user gets told about, so they can never be out of sync.

// Solstice proximity — the sun at its yearly extreme. In the north the June
// solstice is the high one; in the south it's December, which is why the
// season name is resolved per-hemisphere rather than hardcoded.
function extremitySignal({ date, latitude }) {
  const nearest = markerDistance(date, ['june', 'december']);
  const season = seasonNameFor(nearest.marker, latitude);
  const isHighSun = (nearest.marker === 'june') === (latitude >= 0);

  return {
    key: 'extremity',
    value: markerProximity(nearest.days),
    reason: isHighSun
      ? `The ${season} solstice — the sun is as high as it ever climbs here.`
      : `The ${season} solstice — the sun sits as low as it ever will here.`,
  };
}

// Equinox proximity — the genuinely narrow window. The sun's angle shifts
// fastest at the equinoxes (~0.4°/day at mid-latitudes), so this exact
// geometry holds for only a couple of days before it's measurably different.
function narrownessSignal({ date }) {
  const nearest = markerDistance(date, ['march', 'september']);
  const value = markerProximity(nearest.days);

  // Stated as a concrete window rather than a score, and derived from the
  // same falloff so the sentence can never drift from the number.
  const windowDays = Math.max(2, Math.round(2 + nearest.days));

  return {
    key: 'narrowness',
    value,
    reason: nearest.days <= 2
      ? 'An equinox capture — this angle holds for barely two days a year.'
      : `This exact angle only recurs in about a ${windowDays}-day window each year here.`,
  };
}

function goldenSignal({ date, latitude, longitude }) {
  const { altitude } = sunPosition(date, latitude, longitude);
  if (altitude <= 0 || altitude > GOLDEN_MAX_ALTITUDE) {
    return { key: 'golden', value: 0, reason: null };
  }
  const depth = 1 - altitude / GOLDEN_MAX_ALTITUDE;
  return {
    key: 'golden',
    value: GOLDEN_FLOOR + depth * (GOLDEN_CEILING - GOLDEN_FLOOR),
    reason: 'Caught in the low, warm band — golden hour, by the sun\'s real angle.',
  };
}

function noveltySignal({ latitude, altitudeM, placeName }, history) {
  // Novelty is meaningless without a collection to be new relative to. On the
  // very first capture EVERYTHING is unseen, so awarding novelty there would
  // hand a brand-new user the rarest tier for standing in their own garden —
  // which is exactly what happened before this guard existed. Their first
  // stamp is judged on the sky alone.
  if (!history.length) return { key: 'novelty', value: 0, reason: null };

  // Prior stamps arrive either as live objects (with bands already resolved)
  // or as stored rows (which carry only the raw values), so derive the band
  // when it isn't already present rather than trusting one shape.
  const bandOf = (h, kind) => (
    kind === 'lat'
      ? (h.latitudeBand ?? (typeof h.latitude === 'number' ? latitudeBand(h.latitude) : null))
      : (h.altitudeBand ?? altitudeBand(h.altitudeM))
  );

  const seenLatitudes = new Set(history.map((h) => bandOf(h, 'lat')).filter(Boolean));
  const seenAltitudes = new Set(history.map((h) => bandOf(h, 'alt')).filter(Boolean));
  const seenPlaces = new Set(history.map((h) => placeKey(h.placeName)).filter(Boolean));

  const lat = latitudeBand(latitude);
  const alt = altitudeBand(altitudeM);
  const place = placeKey(placeName);

  // Ordered by how much of an achievement each is — a new altitude band
  // usually means a real climb, a new town might just be the next exit.
  if (alt && !seenAltitudes.has(alt)) {
    return {
      key: 'novelty',
      value: NOVELTY_NEW_ALTITUDE,
      reason: `Your first capture in the ${ALTITUDE_LABELS[alt].toLowerCase()} band.`,
    };
  }
  if (!seenLatitudes.has(lat)) {
    return {
      key: 'novelty',
      value: NOVELTY_NEW_LATITUDE,
      reason: `Your first light caught in the ${LATITUDE_LABELS[lat].toLowerCase()}.`,
    };
  }
  if (place && !seenPlaces.has(place)) {
    return {
      key: 'novelty',
      value: NOVELTY_NEW_PLACE,
      reason: `A place you've never caught the sun before — ${placeName}.`,
    };
  }
  return { key: 'novelty', value: 0, reason: null };
}

// The one genuinely probabilistic signal: clear sky where clear sky is
// uncommon. Everything else here is geometry or personal history, both of
// which are certain; this is the only place real luck enters.
//
// Both figures are percentages. A missing baseline (no climate history for
// this place yet) yields 0 rather than a guess.
function luckSignal({ cloudCoverPct, typicalCloudPct, placeName }) {
  if (typeof cloudCoverPct !== 'number' || typeof typicalCloudPct !== 'number') {
    return { key: 'luck', value: 0, reason: null };
  }
  // How much clearer than usual, as a fraction of how cloudy it usually is.
  // Scaling by the baseline matters: dropping from 85% to 5% cloud is
  // remarkable, dropping from 20% to 5% is just a normal day.
  if (typicalCloudPct < 40) return { key: 'luck', value: 0, reason: null };
  const gap = (typicalCloudPct - cloudCoverPct) / 100;
  const value = clamp01(gap * (typicalCloudPct / 100) * 1.6);
  return {
    key: 'luck',
    value,
    reason: `Clear sky somewhere that's overcast ${Math.round(typicalCloudPct)}% of the time${placeName ? ` — ${placeName}` : ''}.`,
  };
}

// ─── Labels ───────────────────────────────────────────────────

export const LATITUDE_LABELS = {
  equatorial: 'Equatorial',
  tropics: 'Tropics',
  temperate: 'Temperate',
  polar: 'Polar',
};

export const ALTITUDE_LABELS = {
  seaLevel: 'Sea Level',
  foothill: 'Foothill',
  highland: 'Highland',
  summit: 'Summit',
};

export const SEASON_LABELS = {
  spring: 'Spring Equinox',
  summer: 'Summer Solstice',
  autumn: 'Autumn Equinox',
  winter: 'Winter Solstice',
};

export const TIER_LABELS = {
  everyday: 'Everyday',
  seasonal: 'Seasonal',
  alignment: 'Alignment',
  once: 'Once-a-Year',
};

// ─── Tier resolution ──────────────────────────────────────────

export function tierForScore(score) {
  if (score >= TIER_THRESHOLDS.once) return 'once';
  if (score >= TIER_THRESHOLDS.alignment) return 'alignment';
  if (score >= TIER_THRESHOLDS.seasonal) return 'seasonal';
  return 'everyday';
}

// Higher index = rarer. Used by the Atlas's keep-the-best logic.
export function tierRank(tier) {
  const i = TIERS.indexOf(tier);
  return i < 0 ? 0 : i;
}

export function isBetterTier(candidate, existing) {
  return tierRank(candidate) > tierRank(existing);
}

// ─── The main entry point ─────────────────────────────────────

// Builds a complete stamp from a capture and the user's prior stamps.
//
// `capture` — { date, latitude, longitude, altitudeM, placeName,
//               cloudCoverPct, typicalCloudPct }
// `history` — prior stamps, each { latitudeBand, altitudeBand, placeName }
//
// Returns the stamp record: its tier, the sentence explaining it, every
// signal's score (kept for debugging and future tuning), the sun's real
// position, and which Atlas axes it qualifies for.
export function buildStamp(capture, history = []) {
  const { date, latitude, longitude, altitudeM, placeName } = capture;

  const signals = [
    extremitySignal(capture),
    narrownessSignal(capture),
    goldenSignal(capture),
    noveltySignal(capture, history),
    luckSignal(capture),
  ];

  // Max, not sum — see the note at the top of this file. Ties resolve to the
  // earlier signal, which is deliberate: the geometric signals come first
  // because they're the ones the user can't influence, and so read as the
  // more remarkable explanation.
  const winner = signals.reduce((best, s) => (s.value > best.value ? s : best), signals[0]);
  const tier = tierForScore(winner.value);
  const position = sunPosition(date, latitude, longitude);

  // An Everyday stamp gets the Everyday sentence, whichever signal nominally
  // came top. The geometric signals never reach exactly zero — they decay
  // toward it — so on an ordinary day one of them still "wins" with a
  // vanishing score, and using its text would claim a solstice in August.
  const earned = tier !== 'everyday';

  return {
    tier,
    score: winner.value,
    reason: earned ? (winner.reason ?? EVERYDAY_REASON) : EVERYDAY_REASON,
    dominantSignal: earned ? winner.key : null,
    signals: Object.fromEntries(signals.map((s) => [s.key, s.value])),
    capturedAt: date,
    latitude,
    longitude,
    altitudeM: typeof altitudeM === 'number' && Number.isFinite(altitudeM) ? altitudeM : null,
    placeName: placeName ?? null,
    altitude: position.altitude,
    azimuth: position.azimuth,
    axes: qualifyingAxes(capture),
  };
}

// Deliberately warm rather than apologetic — an ordinary sky is still worth
// keeping, and the copy must never imply the user failed to earn something.
const EVERYDAY_REASON = 'Ordinary light, but yours — an afternoon, kept.';

// Which Atlas slots this capture can fill. Every axis is evaluated
// independently: one capture can legitimately advance several rows at once,
// and gating it to a single row (as the early prototype did) would throw
// away real progress the user genuinely earned.
export function qualifyingAxes(capture) {
  const { date, latitude, altitudeM, placeName } = capture;
  const axes = {};

  const place = placeKey(placeName);
  if (place) axes.place = { slot: place, label: placeName.trim() };

  const lat = latitudeBand(latitude);
  axes.latitude = { slot: lat, label: LATITUDE_LABELS[lat] };

  const alt = altitudeBand(altitudeM);
  if (alt) axes.altitude = { slot: alt, label: ALTITUDE_LABELS[alt] };

  const marker = nearestMarker(date, 10);
  if (marker) {
    const season = seasonNameFor(marker.marker, latitude);
    if (season) axes.season = { slot: season, label: SEASON_LABELS[season] };
  }

  return axes;
}

// Rebuilds an in-memory stamp from a stored row. The axes were resolved at
// capture time and stored, so they're read back rather than recomputed —
// re-deriving them would let a later change to the band edges silently move
// a stamp out of the slot it was actually collected into.
export function fromRow(row) {
  const axes = {};
  if (row.axis_place) axes.place = { slot: row.axis_place, label: row.place_name ?? row.axis_place };
  if (row.axis_latitude) axes.latitude = { slot: row.axis_latitude, label: LATITUDE_LABELS[row.axis_latitude] };
  if (row.axis_altitude) axes.altitude = { slot: row.axis_altitude, label: ALTITUDE_LABELS[row.axis_altitude] };
  if (row.axis_season) axes.season = { slot: row.axis_season, label: SEASON_LABELS[row.axis_season] };

  return {
    id: row.id,
    tier: row.tier,
    reason: row.reason,
    dominantSignal: row.dominant_signal ?? null,
    signals: row.signals ?? {},
    capturedAt: new Date(row.captured_at),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    altitudeM: row.altitude_m == null ? null : Number(row.altitude_m),
    placeName: row.place_name ?? null,
    altitude: Number(row.sun_altitude),
    azimuth: Number(row.sun_azimuth),
    axes,
  };
}

// ─── Atlas board ──────────────────────────────────────────────

// The board is derived from the stamp list on every read, never stored — the
// same rule the rest of the app follows for anything computable from its
// source. Each slot keeps the single best stamp that qualifies for it, plus
// a count of how many times it's been caught.
export function buildAtlas(stamps = [], latitude = 0) {
  const north = latitude >= 0;
  const board = {
    place: { label: 'Place', slots: [] },
    latitude: { label: 'Latitude', slots: fixedSlots(LATITUDE_LABELS, ['equatorial', 'tropics', 'temperate', 'polar']) },
    altitude: { label: 'Altitude', slots: fixedSlots(ALTITUDE_LABELS, ['seaLevel', 'foothill', 'highland', 'summit']) },
    // Ordered by when they actually occur in the user's own hemisphere, so
    // the row reads as a year rather than an arbitrary list.
    season: { label: 'Season', slots: fixedSlots(SEASON_LABELS, north
      ? ['spring', 'summer', 'autumn', 'winter']
      : ['autumn', 'winter', 'spring', 'summer']) },
  };

  for (const stamp of stamps) {
    for (const [axis, { slot, label }] of Object.entries(stamp.axes ?? {})) {
      const row = board[axis];
      if (!row) continue;
      let entry = row.slots.find((s) => s.slot === slot);
      if (!entry) {
        // Only the Place row grows; the other three have fixed, known slots
        // so their gaps can be shown as specific named invitations.
        if (axis !== 'place') continue;
        entry = { slot, label, stamp: null, count: 0 };
        row.slots.push(entry);
      }
      entry.count += 1;
      if (!entry.stamp || isBetterTier(stamp.tier, entry.stamp.tier)) entry.stamp = stamp;
    }
  }

  return board;
}

function fixedSlots(labels, order) {
  return order.map((slot) => ({ slot, label: labels[slot], stamp: null, count: 0 }));
}

export function atlasProgress(board) {
  let filled = 0;
  let total = 0;
  for (const row of Object.values(board)) {
    for (const slot of row.slots) {
      total += 1;
      if (slot.stamp) filled += 1;
    }
  }
  return { filled, total };
}

export default {
  buildStamp,
  buildAtlas,
  atlasProgress,
  fromRow,
  qualifyingAxes,
  latitudeBand,
  altitudeBand,
  placeKey,
  tierForScore,
  tierRank,
  isBetterTier,
  TIERS,
  TIER_LABELS,
  TIER_THRESHOLDS,
  LATITUDE_LABELS,
  ALTITUDE_LABELS,
  SEASON_LABELS,
};
