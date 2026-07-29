// Self-contained test suite for Sun Stamp rarity. Run with:
//   node App/services/SunStampService.test.js
//
// Beyond unit-testing the pieces, this measures the TIER DISTRIBUTION across
// a simulated year. That check is the real design validation: rarity that
// isn't actually rare would make the whole collectible worthless, and no
// amount of unit tests on individual functions would catch it.

import {
  buildStamp, buildAtlas, atlasProgress, qualifyingAxes, fromRow,
  latitudeBand, altitudeBand, placeKey, tierForScore, tierRank, isBetterTier,
  TIER_LABELS,
} from './SunStampService.js';

let passed = 0;
let failed = 0;

function ok(name, cond, detail = '') {
  if (cond) { passed += 1; return; }
  failed += 1;
  console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}

const NYC = { latitude: 40.7128, longitude: -74.006 };
const SYDNEY = { latitude: -33.8688, longitude: 151.2093 };

// A history broad enough that novelty never fires, so geometric signals can
// be tested in isolation.
const SATURATED_HISTORY = [
  { latitudeBand: 'equatorial', altitudeBand: 'seaLevel', placeName: 'A' },
  { latitudeBand: 'tropics', altitudeBand: 'foothill', placeName: 'B' },
  { latitudeBand: 'temperate', altitudeBand: 'highland', placeName: 'C' },
  { latitudeBand: 'polar', altitudeBand: 'summit', placeName: 'D' },
];

const seen = (placeName) => [...SATURATED_HISTORY, { latitudeBand: 'temperate', altitudeBand: 'seaLevel', placeName }];

console.log('\nSunStampService\n');

// ─── Band classification ──────────────────────────────────────

ok('equator is equatorial', latitudeBand(0) === 'equatorial');
ok('4°N is still equatorial', latitudeBand(4) === 'equatorial');
ok('15°S is tropics', latitudeBand(-15) === 'tropics');
ok('40°N is temperate', latitudeBand(40.7) === 'temperate');
ok('70°N is polar', latitudeBand(70) === 'polar');
ok('70°S is polar too', latitudeBand(-70) === 'polar');

ok('0m is sea level', altitudeBand(0) === 'seaLevel');
ok('1500m is foothill', altitudeBand(1500) === 'foothill');
ok('3000m is highland', altitudeBand(3000) === 'highland');
ok('4500m is summit', altitudeBand(4500) === 'summit');
ok('null altitude is not a band', altitudeBand(null) === null);
ok('undefined altitude is not sea level', altitudeBand(undefined) === null);
ok('NaN altitude is not a band', altitudeBand(NaN) === null);

ok('place key normalizes case and space', placeKey('  Laguna Beach ') === 'laguna beach');
ok('empty place is null', placeKey('   ') === null);
ok('non-string place is null', placeKey(null) === null);

// ─── Tier resolution ──────────────────────────────────────────

ok('0.95 is once', tierForScore(0.95) === 'once');
ok('0.75 is alignment', tierForScore(0.75) === 'alignment');
ok('0.5 is seasonal', tierForScore(0.5) === 'seasonal');
ok('0.1 is everyday', tierForScore(0.1) === 'everyday');
ok('tier ranks ascend', tierRank('everyday') < tierRank('seasonal')
  && tierRank('seasonal') < tierRank('alignment')
  && tierRank('alignment') < tierRank('once'));
ok('better tier detected', isBetterTier('once', 'alignment'));
ok('equal tier is not better', !isBetterTier('seasonal', 'seasonal'));
ok('lower tier is not better', !isBetterTier('everyday', 'once'));

// ─── Signals fire on the right occasions ──────────────────────

// Solstice, mid-afternoon (sun high, so golden hour can't be the winner).
const solsticeNoon = new Date(Date.UTC(2026, 5, 21, 17, 0));
const solsticeStamp = buildStamp({ ...NYC, date: solsticeNoon, altitudeM: 10, placeName: 'Home' }, seen('Home'));
ok('solstice fires the extremity signal', solsticeStamp.dominantSignal === 'extremity',
  `won by ${solsticeStamp.dominantSignal}`);
ok('solstice mentions the solstice', /solstice/i.test(solsticeStamp.reason), solsticeStamp.reason);
ok('solstice reads as summer in the north', /summer/i.test(solsticeStamp.reason), solsticeStamp.reason);

// Same instant, southern hemisphere — must read as winter, not summer.
const solsticeSouth = buildStamp(
  { ...SYDNEY, date: solsticeNoon, altitudeM: 10, placeName: 'Home' },
  [...seen('Home'), { latitudeBand: 'temperate', altitudeBand: 'seaLevel', placeName: 'Home' }]
);
ok('June solstice reads as winter in the south', /winter/i.test(solsticeSouth.reason), solsticeSouth.reason);

// Equinox — narrowness should win, not extremity.
const equinoxNoon = new Date(Date.UTC(2026, 2, 20, 17, 0));
const equinoxStamp = buildStamp({ ...NYC, date: equinoxNoon, altitudeM: 10, placeName: 'Home' }, seen('Home'));
ok('equinox fires the narrowness signal', equinoxStamp.dominantSignal === 'narrowness',
  `won by ${equinoxStamp.dominantSignal}`);
ok('equinox mentions the equinox', /equinox/i.test(equinoxStamp.reason), equinoxStamp.reason);

// Novelty beats an ordinary day.
const noveltyStamp = buildStamp(
  { ...NYC, date: new Date(Date.UTC(2026, 7, 5, 17, 0)), altitudeM: 4200, placeName: 'Somewhere New' },
  [{ latitudeBand: 'temperate', altitudeBand: 'seaLevel', placeName: 'Home' }]
);
ok('new altitude band fires novelty', noveltyStamp.dominantSignal === 'novelty',
  `won by ${noveltyStamp.dominantSignal}`);
ok('novelty names the band', /summit/i.test(noveltyStamp.reason), noveltyStamp.reason);

// Luck: clear sky in a place that's usually socked in.
const luckyStamp = buildStamp(
  { ...NYC, date: new Date(Date.UTC(2026, 7, 5, 17, 0)), altitudeM: 10, placeName: 'Home',
    cloudCoverPct: 3, typicalCloudPct: 85 },
  seen('Home')
);
ok('clear sky in a cloudy place fires luck', luckyStamp.dominantSignal === 'luck',
  `won by ${luckyStamp.dominantSignal}`);

// A normally-clear place gives no luck credit for being clear.
const unluckyStamp = buildStamp(
  { ...NYC, date: new Date(Date.UTC(2026, 7, 5, 17, 0)), altitudeM: 10, placeName: 'Home',
    cloudCoverPct: 3, typicalCloudPct: 15 },
  seen('Home')
);
ok('clear sky where it is usually clear earns nothing', unluckyStamp.signals.luck === 0);

// Missing weather data must not invent a signal.
ok('absent cloud data yields no luck', solsticeStamp.signals.luck === 0);

// ─── Novelty must not hand out the top tier ───────────────────

// Regression: a brand-new user's first capture scored 0.94 (novelty) and
// resolved to Once-a-Year, so every early stamp looked maximally rare. On an
// empty collection there is nothing to be novel relative to.
const firstEver = buildStamp(
  { ...NYC, date: new Date(Date.UTC(2026, 7, 5, 17, 0)), altitudeM: 0, placeName: 'Home' },
  []
);
ok('first-ever capture earns no novelty', firstEver.signals.novelty === 0,
  `got ${firstEver.signals.novelty}`);
ok('first-ever capture is not Once-a-Year', firstEver.tier !== 'once', `got ${firstEver.tier}`);

// Novelty is capped below the top tier even when it does fire — reaching a
// new band is personal, not astronomical.
const newBand = buildStamp(
  { ...NYC, date: new Date(Date.UTC(2026, 7, 5, 17, 0)), altitudeM: 4500, placeName: 'Peak' },
  [{ latitudeBand: 'temperate', altitudeBand: 'seaLevel', placeName: 'Home' }]
);
ok('a new band fires novelty', newBand.dominantSignal === 'novelty');
ok('novelty never reaches Once-a-Year', newBand.tier !== 'once', `got ${newBand.tier}`);

// Regression: history entries produced by buildStamp/fromRow carry `latitude`
// and `altitudeM`, never `latitudeBand`/`altitudeBand`. The band sets were
// therefore always empty and novelty fired forever. History must be read in
// whichever shape it actually arrives in.
const realShapedHistory = [
  buildStamp({ ...NYC, date: new Date(Date.UTC(2026, 7, 5, 17, 0)), altitudeM: 10, placeName: 'Home' }, []),
];
ok('history lacking explicit band fields still suppresses novelty', (() => {
  const repeat = buildStamp(
    { ...NYC, date: new Date(Date.UTC(2026, 7, 6, 17, 0)), altitudeM: 12, placeName: 'Home' },
    realShapedHistory
  );
  return repeat.signals.novelty === 0;
})(), 'novelty fired on a place/band the user had already captured');

// ─── Golden hour is capped ────────────────────────────────────

// Golden hour happens daily, so on its own it must never exceed Seasonal.
let goldenMax = 0;
let goldenSamples = 0;
for (let d = 0; d < 365; d += 1) {
  for (let m = 0; m < 1440; m += 5) {
    const date = new Date(Date.UTC(2026, 0, 1) + d * 86400000 + m * 60000);
    const s = buildStamp({ ...NYC, date, altitudeM: 10, placeName: 'Home' }, seen('Home'));
    if (s.dominantSignal === 'golden') {
      goldenSamples += 1;
      if (s.signals.golden > goldenMax) goldenMax = s.signals.golden;
      if (s.tier !== 'seasonal') {
        ok('golden hour never exceeds seasonal', false, `got ${s.tier} at ${date.toISOString()}`);
        d = 999; m = 99999;
      }
    }
  }
}
ok('golden hour occurs and always lands on seasonal', goldenSamples > 0 && goldenMax < 0.7,
  `${goldenSamples} golden samples, max signal ${goldenMax.toFixed(3)}`);

// ─── Determinism ──────────────────────────────────────────────

const fixedCapture = { ...NYC, date: new Date(Date.UTC(2026, 6, 4, 22, 30)), altitudeM: 120, placeName: 'Pier' };
const a = buildStamp(fixedCapture, seen('Pier'));
const b = buildStamp(fixedCapture, seen('Pier'));
ok('identical captures produce identical stamps',
  a.tier === b.tier && a.reason === b.reason && a.score === b.score && a.azimuth === b.azimuth);

// ─── Axes ─────────────────────────────────────────────────────

const axes = qualifyingAxes({ ...NYC, date: solsticeNoon, altitudeM: 3100, placeName: 'Ridge' });
ok('axes include place', axes.place?.slot === 'ridge');
ok('axes include latitude band', axes.latitude?.slot === 'temperate');
ok('axes include altitude band', axes.altitude?.slot === 'highland');
ok('axes include season at a solstice', axes.season?.slot === 'summer');

// One capture must be able to advance several rows at once — the prototype's
// one-tier-one-row mapping was a simplification the spec explicitly corrects.
ok('a single capture can fill multiple axes', Object.keys(axes).length === 4,
  `got ${Object.keys(axes).join(', ')}`);

// Far from any marker, the season axis stays empty rather than guessing.
const midSeasonAxes = qualifyingAxes({ ...NYC, date: new Date(Date.UTC(2026, 7, 5)), altitudeM: 10, placeName: 'X' });
ok('no season axis mid-season', !midSeasonAxes.season);

// Unknown altitude must not claim the Sea Level slot.
const noAltAxes = qualifyingAxes({ ...NYC, date: solsticeNoon, altitudeM: null, placeName: 'X' });
ok('null altitude claims no altitude slot', !noAltAxes.altitude);

// ─── Atlas board ──────────────────────────────────────────────

const emptyBoard = buildAtlas([], NYC.latitude);
const emptyProgress = atlasProgress(emptyBoard);
ok('empty atlas has 12 fixed slots', emptyProgress.total === 12, `got ${emptyProgress.total}`);
ok('empty atlas has nothing filled', emptyProgress.filled === 0);
ok('fixed rows expose their named gaps',
  emptyBoard.altitude.slots.map((s) => s.label).join(',') === 'Sea Level,Foothill,Highland,Summit');

// Southern hemisphere season row must start with its own autumn (March), not
// the northern spring.
const southBoard = buildAtlas([], SYDNEY.latitude);
ok('southern season row is hemisphere-ordered',
  southBoard.season.slots[0].slot === 'autumn', southBoard.season.slots[0].slot);

// Keep-the-best: a rarer recapture of the same place upgrades the slot; a
// commoner one does not replace it.
const commonStamp = buildStamp(
  { ...NYC, date: new Date(Date.UTC(2026, 7, 5, 17, 0)), altitudeM: 10, placeName: 'Pier' },
  seen('Pier')
);
const rareStamp = buildStamp(
  { ...NYC, date: solsticeNoon, altitudeM: 10, placeName: 'Pier' },
  seen('Pier')
);
ok('test fixture tiers differ as expected',
  tierRank(rareStamp.tier) > tierRank(commonStamp.tier),
  `${commonStamp.tier} vs ${rareStamp.tier}`);

const upgraded = buildAtlas([commonStamp, rareStamp], NYC.latitude);
const pierSlot = upgraded.place.slots.find((s) => s.slot === 'pier');
ok('slot keeps the rarer stamp', pierSlot.stamp.tier === rareStamp.tier);
ok('slot counts every visit', pierSlot.count === 2);

const notDowngraded = buildAtlas([rareStamp, commonStamp], NYC.latitude);
ok('a commoner recapture never downgrades a slot',
  notDowngraded.place.slots.find((s) => s.slot === 'pier').stamp.tier === rareStamp.tier);

// Place row grows; fixed rows never do.
ok('place row grows with new places',
  buildAtlas([commonStamp], NYC.latitude).place.slots.length === 1);
ok('fixed rows never grow',
  buildAtlas([commonStamp, rareStamp], NYC.latitude).latitude.slots.length === 4);

// ─── Row round-trip ───────────────────────────────────────────

// The shape SupabaseService writes must survive being read back, or the Atlas
// silently loses stamps the user actually collected. Mirrors the insert in
// SupabaseService.saveSunStamp exactly.
const roundTripSource = buildStamp(
  { ...NYC, date: solsticeNoon, altitudeM: 3100, placeName: 'Ridge', cloudCoverPct: 5, typicalCloudPct: 70 },
  seen('Ridge')
);
const asRow = {
  id: 'uuid-1',
  captured_at: new Date(roundTripSource.capturedAt).toISOString(),
  latitude: String(roundTripSource.latitude),      // numeric comes back as string
  longitude: String(roundTripSource.longitude),
  altitude_m: String(roundTripSource.altitudeM),
  place_name: roundTripSource.placeName,
  sun_altitude: String(roundTripSource.altitude),
  sun_azimuth: String(roundTripSource.azimuth),
  tier: roundTripSource.tier,
  reason: roundTripSource.reason,
  dominant_signal: roundTripSource.dominantSignal,
  signals: roundTripSource.signals,
  axis_place: roundTripSource.axes.place?.slot ?? null,
  axis_latitude: roundTripSource.axes.latitude?.slot ?? null,
  axis_altitude: roundTripSource.axes.altitude?.slot ?? null,
  axis_season: roundTripSource.axes.season?.slot ?? null,
};
const restored = fromRow(asRow);

ok('round-trip preserves tier', restored.tier === roundTripSource.tier);
ok('round-trip preserves reason', restored.reason === roundTripSource.reason);
ok('round-trip coerces numeric strings back to numbers',
  typeof restored.latitude === 'number' && typeof restored.altitude === 'number'
  && typeof restored.altitudeM === 'number');
ok('round-trip preserves coordinates', Math.abs(restored.latitude - roundTripSource.latitude) < 1e-9);
ok('round-trip preserves sun angles',
  Math.abs(restored.altitude - roundTripSource.altitude) < 1e-9
  && Math.abs(restored.azimuth - roundTripSource.azimuth) < 1e-9);
ok('round-trip preserves every axis',
  Object.keys(restored.axes).sort().join(',') === Object.keys(roundTripSource.axes).sort().join(','),
  `got ${Object.keys(restored.axes).join(',')}`);
ok('round-trip keeps axis slots identical',
  restored.axes.altitude.slot === roundTripSource.axes.altitude.slot
  && restored.axes.season.slot === roundTripSource.axes.season.slot);
ok('round-trip relabels fixed axes from the registry',
  restored.axes.altitude.label === 'Highland' && restored.axes.season.label === 'Summer Solstice',
  `${restored.axes.altitude.label} / ${restored.axes.season.label}`);
ok('round-trip date is a Date', restored.capturedAt instanceof Date);

// A restored stamp must build the same board as the original.
const boardFromRestored = buildAtlas([restored], NYC.latitude);
const boardFromSource = buildAtlas([roundTripSource], NYC.latitude);
ok('restored stamp fills the same slots as the original',
  atlasProgress(boardFromRestored).filled === atlasProgress(boardFromSource).filled);

// A null altitude row must not be coerced into sea level on the way back.
const nullAltRestored = fromRow({ ...asRow, altitude_m: null, axis_altitude: null });
ok('round-trip keeps null altitude null', nullAltRestored.altitudeM === null);
ok('round-trip claims no altitude slot when there was none', !nullAltRestored.axes.altitude);

// ─── Distribution: is "rare" actually rare? ───────────────────

// Simulate a committed user capturing once a day, all year, from one place
// they have already visited — so only geometry can earn them a tier.
const dist = { everyday: 0, seasonal: 0, alignment: 0, once: 0 };
for (let d = 0; d < 365; d++) {
  const date = new Date(Date.UTC(2026, 0, 1) + d * 86400000 + 17 * 3600000); // ~noon local
  const stamp = buildStamp({ ...NYC, date, altitudeM: 10, placeName: 'Home' }, seen('Home'));
  dist[stamp.tier] += 1;
}

console.log('  Daily-capture tier distribution over one year (midday, familiar place):');
for (const tier of ['everyday', 'seasonal', 'alignment', 'once']) {
  const pct = ((dist[tier] / 365) * 100).toFixed(1);
  console.log(`    ${TIER_LABELS[tier].padEnd(12)} ${String(dist[tier]).padStart(3)} days  ${pct}%`);
}

ok('Once-a-Year is genuinely scarce (<8% of days)', dist.once / 365 < 0.08,
  `${((dist.once / 365) * 100).toFixed(1)}% of days`);
ok('Once-a-Year is still reachable (>0 days)', dist.once > 0);
ok('Everyday is the common case (>50% of days)', dist.everyday / 365 > 0.5,
  `${((dist.everyday / 365) * 100).toFixed(1)}% of days`);
ok('every tier is reachable across a year',
  dist.everyday > 0 && dist.seasonal + dist.alignment > 0 && dist.once > 0);

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
