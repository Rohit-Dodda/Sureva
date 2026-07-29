// Self-contained test suite for the achievement metrics. Same harness style as
// StreakService.test.js — run with:
//   node --experimental-strip-types App/services/AchievementService.test.js
// or, since the imports reach outside the `"type": "module"` services/ folder,
// via the bundler-agnostic runner:
//   node App/services/AchievementService.test.js
//
// Covers the metric derivations that decide whether a badge is earned. The
// registry/levelFor mapping is covered too, since an off-by-one there would
// silently award or withhold a level.

import { computeMetrics, computeAchievements, DAWN_HOURS, DUSK_HOURS } from './AchievementService.js';
import {
  levelFor, ACHIEVEMENT_BADGES, ACHIEVEMENT_CATEGORIES, badgesInCategory,
} from '../constants/achievementBadges.js';
import { BADGE_SECTIONS } from '../constants/badgeGallery.js';
import {
  computeGalleryItems, groupIntoSections, featuredFrom, earnedCount, PREVIEW_ALL_EARNED,
} from './BadgeGalleryService.js';

// ─── Fixtures ─────────────────────────────────────────────────

// A session at a given local hour on a given day, with overrides.
function session(dayOffset, hour, extra = {}) {
  const d = new Date(2026, 5, 1 + dayOffset, hour, 0, 0, 0);
  return {
    start_time: d.toISOString(),
    end_time: new Date(d.getTime() + 60 * 60 * 1000).toISOString(),
    duration_minutes: 60,
    reapplication_count: 0,
    peak_uv: 5,
    water_events: 0,
    unprotected_minutes: 0,
    city: null,
    environment: null,
    latitude: null,
    altitude_m: null,
    ...extra,
  };
}

const badgeOf = (key) =>
  computeAchievements([]).find((e) => e.badge.key === key).badge;

// ─── Cases ────────────────────────────────────────────────────

const tests = [
  {
    name: 'empty history yields zeroed metrics and no unmeasurable values',
    expected: true,
    actual: () => {
      const m = computeMetrics([]);
      return m.reapplications === 0 && m.sunHours === 0 && m.cities === 0
        && m.peakUv === 0 && m.flawlessDays === 0 && m.latitudeLevel === 0;
    },
  },
  {
    name: 'empty history locks every achievement',
    expected: 0,
    actual: () => computeAchievements([]).filter((e) => e.level > 0).length,
  },
  {
    name: 'reapplications sum across sessions',
    expected: 7,
    actual: () => computeMetrics([
      session(0, 12, { reapplication_count: 3 }),
      session(1, 12, { reapplication_count: 4 }),
    ]).reapplications,
  },
  {
    name: 'sunHours converts total minutes to hours',
    expected: 2.5,
    actual: () => computeMetrics([
      session(0, 12, { duration_minutes: 90 }),
      session(1, 12, { duration_minutes: 60 }),
    ]).sunHours,
  },
  {
    name: 'cities are distinct and case/whitespace insensitive',
    expected: 2,
    actual: () => computeMetrics([
      session(0, 12, { city: 'Denver' }),
      session(1, 12, { city: ' denver ' }),
      session(2, 12, { city: 'Boulder' }),
      session(3, 12, { city: null }),
      session(4, 12, { city: '' }),
    ]).cities,
  },
  {
    name: 'peakUv takes the max, not the sum',
    expected: 9.4,
    actual: () => computeMetrics([
      session(0, 12, { peak_uv: 9.4 }),
      session(1, 12, { peak_uv: 6.1 }),
    ]).peakUv,
  },
  {
    name: 'waterSessions counts sessions with any water event',
    expected: 2,
    actual: () => computeMetrics([
      session(0, 12, { water_events: 1 }),
      session(1, 12, { water_events: 3 }),
      session(2, 12, { water_events: 0 }),
    ]).waterSessions,
  },
  {
    name: 'dawn window counts a start inside it, excludes the end bound',
    expected: [1, 0],
    actual: () => [
      computeMetrics([session(0, DAWN_HOURS.start)]).dawnSessions,
      computeMetrics([session(0, DAWN_HOURS.end)]).dawnSessions,
    ],
  },
  {
    name: 'dusk window counts a start inside it, midday counts as neither',
    expected: [1, 0, 0],
    actual: () => {
      const midday = computeMetrics([session(0, 13)]);
      return [
        computeMetrics([session(0, DUSK_HOURS.start)]).duskSessions,
        midday.duskSessions,
        midday.dawnSessions,
      ];
    },
  },
  {
    name: 'a day is flawless only when EVERY session that day is clean',
    expected: 1,
    actual: () => computeMetrics([
      // day 0 — both clean
      session(0, 10, { unprotected_minutes: 0 }),
      session(0, 15, { unprotected_minutes: 0 }),
      // day 1 — one session blew the gap, so the day doesn't count
      session(1, 10, { unprotected_minutes: 0 }),
      session(1, 15, { unprotected_minutes: 12 }),
    ]).flawlessDays,
  },
  {
    // A session whose end-of-session write failed has null here. That's absent
    // data, not a perfect day — awarding Clean Sheet for it would be a lie.
    name: 'a session with no protection data does not count as flawless',
    expected: 0,
    actual: () => computeMetrics([session(0, 12, { unprotected_minutes: null })]).flawlessDays,
  },
  {
    name: 'one unwritten session spoils an otherwise clean day',
    expected: 0,
    actual: () => computeMetrics([
      session(0, 10, { unprotected_minutes: 0 }),
      session(0, 15, { unprotected_minutes: null }),
    ]).flawlessDays,
  },
  {
    name: 'snowDays counts distinct days, not sessions',
    expected: 2,
    actual: () => computeMetrics([
      session(0, 10, { environment: 'Snow' }),
      session(0, 14, { environment: 'Snow' }),
      session(1, 10, { environment: 'Snow' }),
      session(2, 10, { environment: 'Beach' }),
    ]).snowDays,
  },
  {
    name: 'latitudeLevel: tropics only',
    expected: 1,
    actual: () => computeMetrics([session(0, 12, { latitude: 20 })]).latitudeLevel,
  },
  {
    name: 'latitudeLevel: within 5 degrees of the equator',
    expected: 2,
    actual: () => computeMetrics([session(0, 12, { latitude: -3.2 })]).latitudeLevel,
  },
  {
    name: 'latitudeLevel: both hemispheres outranks the equator band',
    expected: 3,
    actual: () => computeMetrics([
      session(0, 12, { latitude: 45 }),
      session(1, 12, { latitude: -33 }),
    ]).latitudeLevel,
  },
  {
    name: 'latitudeLevel: outside the tropics is nothing',
    expected: 0,
    actual: () => computeMetrics([session(0, 12, { latitude: 51.5 })]).latitudeLevel,
  },
  {
    // "No altitude ever recorded" and "tracked at sea level" must not look the
    // same — only the second is real progress toward Altitude Ace.
    name: 'a session with no altitude leaves maxAltitudeM null, not 0',
    expected: null,
    actual: () => computeMetrics([session(0, 12)]).maxAltitudeM,
  },
  {
    name: 'maxAltitudeM takes the highest recorded session',
    expected: 2600,
    actual: () => computeMetrics([
      session(0, 12, { altitude_m: 1200 }),
      session(1, 12, { altitude_m: 2600 }),
      session(2, 12, { altitude_m: null }),
    ]).maxAltitudeM,
  },
  {
    name: 'altitude thresholds grade at 1,000 / 2,500 / 4,000 m',
    expected: [0, 1, 1, 2, 3],
    actual: () => {
      const b = ACHIEVEMENT_BADGES.find((x) => x.key === 'altitude');
      return [999, 1000, 2499, 2500, 4000].map((v) => levelFor(b, v));
    },
  },
  {
    name: 'Altitude Ace unlocks off a real session altitude',
    expected: 1,
    actual: () => computeAchievements([session(0, 12, { altitude_m: 1450 })])
      .find((e) => e.badge.key === 'altitude').level,
  },
  {
    name: 'registry is the 11 live badges — every one is measurable',
    expected: [11, false, false, false, false],
    actual: () => {
      const keys = ACHIEVEMENT_BADGES.map((b) => b.key);
      return [
        keys.length,
        keys.includes('scholar'), keys.includes('ambassador'),
        keys.includes('shade'), keys.includes('cloudy'),
      ];
    },
  },
  {
    // The whole point of the cull: nothing in the registry should be waiting on
    // data that doesn't exist. Every metric must be a real key on computeMetrics.
    name: 'every badge metric is produced by computeMetrics',
    expected: true,
    actual: () => {
      const m = computeMetrics([session(0, 12)]);
      return ACHIEVEMENT_BADGES.every((b) => Object.prototype.hasOwnProperty.call(m, b.metric));
    },
  },
  {
    name: 'every badge belongs to a declared category, and none is empty',
    expected: true,
    actual: () => {
      const declared = ACHIEVEMENT_CATEGORIES.map((c) => c.key);
      const allPlaced = ACHIEVEMENT_BADGES.every((b) => declared.includes(b.category));
      const noneEmpty = declared.every((k) => badgesInCategory(k).length > 0);
      const total = declared.reduce((n, k) => n + badgesInCategory(k).length, 0);
      return allPlaced && noneEmpty && total === ACHIEVEMENT_BADGES.length;
    },
  },

  // ─── Unified gallery (streak milestones + achievements) ─────
  {
    // Guard, not a behaviour test. PREVIEW_ALL_EARNED forces every badge to its
    // top level for on-device review; shipping it would show users badges they
    // haven't earned. While it's on, the two level-dependent cases below fail
    // too — this case is what tells you why.
    name: 'PREVIEW_ALL_EARNED is off (must be false to ship)',
    expected: false,
    actual: () => PREVIEW_ALL_EARNED,
  },
  {
    name: 'gallery holds both families — 5 streak milestones + 11 achievements',
    expected: [16, 5, 11],
    actual: () => {
      const items = computeGalleryItems([], 0);
      return [
        items.length,
        items.filter((i) => i.kind === 'streak').length,
        items.filter((i) => i.kind === 'achievement').length,
      ];
    },
  },
  {
    name: 'ids are unique across families, so a streak key cannot shadow an achievement',
    expected: true,
    actual: () => {
      const items = computeGalleryItems([], 0);
      return new Set(items.map((i) => i.id)).size === items.length;
    },
  },
  {
    name: 'a streak badge unlocks off longestStreak, not the session list',
    expected: [0, 1],
    actual: () => {
      const at = (streak) => computeGalleryItems([], streak)
        .find((i) => i.kind === 'streak' && i.key === 'gold').level; // 50 days
      return [at(49), at(50)];
    },
  },
  {
    name: 'every item lands in a declared section, and sections cover them all',
    expected: true,
    actual: () => {
      const items = computeGalleryItems([], 0);
      const declared = BADGE_SECTIONS.map((s) => s.key);
      const allPlaced = items.every((i) => declared.includes(i.section));
      const grouped = groupIntoSections(items);
      const total = grouped.reduce((n, s) => n + s.items.length, 0);
      return allPlaced && total === items.length;
    },
  },
  {
    name: 'sections are ordered with streak milestones first',
    expected: ['streak', 'habit', 'place', 'condition'],
    actual: () => groupIntoSections(computeGalleryItems([], 0)).map((s) => s.key),
  },
  {
    name: 'earned items sort ahead of locked ones inside a section',
    expected: true,
    actual: () => {
      // 600-day streak earns every milestone except none; use 50 so only 2 are earned.
      const grouped = groupIntoSections(computeGalleryItems([], 50));
      const streak = grouped.find((s) => s.key === 'streak').items;
      const levels = streak.map((i) => i.level);
      return levels.every((v, i) => i === 0 || levels[i - 1] >= v);
    },
  },
  {
    name: 'the 6 featured entries all resolve, and mix both families',
    expected: [6, true, true],
    actual: () => {
      const f = featuredFrom(computeGalleryItems([], 0));
      return [
        f.length,
        f.some((i) => i.kind === 'streak'),
        f.some((i) => i.kind === 'achievement'),
      ];
    },
  },
  {
    name: 'featured set spans 6 distinct shapes, so the preview row reads varied',
    expected: 6,
    actual: () => new Set(featuredFrom(computeGalleryItems([], 0)).map((i) => i.badge.shape)).size,
  },
  {
    name: 'earnedCount counts across both families',
    expected: 3,
    actual: () => {
      // longestStreak 50 earns 2 streak badges; one flawless day earns Clean Sheet.
      const items = computeGalleryItems([session(0, 12, { unprotected_minutes: 0 })], 50);
      return earnedCount(items);
    },
  },
  {
    name: 'a null metric never awards a level',
    expected: 0,
    actual: () => levelFor(badgeOf('altitude'), null),
  },
  {
    name: 'levelFor is inclusive at each threshold boundary',
    expected: [0, 1, 1, 2, 3],
    actual: () => {
      const b = badgeOf('reapply'); // thresholds 10 / 100 / 500
      return [9, 10, 99, 100, 500].map((v) => levelFor(b, v));
    },
  },
  {
    name: 'levelFor keeps the highest level once past the top threshold',
    expected: 3,
    actual: () => levelFor(badgeOf('reapply'), 5000),
  },
  {
    name: 'peakUv 9.4 earns level I but not II',
    expected: 1,
    actual: () => levelFor(badgeOf('peakUv'), 9.4),
  },
  {
    name: 'a real history awards exactly the achievements it backs',
    expected: ['flawless', 'peakUv'],
    actual: () => computeAchievements([
      session(0, 12, { peak_uv: 8.2, unprotected_minutes: 0 }),
    ]).filter((e) => e.level > 0).map((e) => e.badge.key).sort(),
  },
  {
    name: 'malformed rows are skipped, not crashed on',
    expected: true,
    actual: () => {
      const m = computeMetrics([
        { start_time: 'not-a-date' },
        { start_time: null },
        session(0, 12, { duration_minutes: null, peak_uv: undefined }),
      ]);
      return m.sunHours === 0 && m.peakUv === 0;
    },
  },
];

// ─── Runner ───────────────────────────────────────────────────

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function runAllTests() {
  const results = tests.map((t) => {
    let actual;
    let error = null;
    try {
      actual = t.actual();
    } catch (e) {
      error = e.message;
    }
    const pass = error === null && eq(actual, t.expected);
    return { name: t.name, pass, expected: t.expected, actual, error };
  });
  const failed = results.filter((r) => !r.pass);
  return { passed: results.length - failed.length, failed: failed.length, results };
}

const { passed, failed, results } = runAllTests();
for (const r of results) {
  if (r.pass) {
    console.log(`  PASS  ${r.name}`);
  } else {
    console.log(`  FAIL  ${r.name}`);
    console.log(`        expected ${JSON.stringify(r.expected)}, got ${JSON.stringify(r.actual)}${r.error ? ` (threw: ${r.error})` : ''}`);
  }
}
console.log(`\n${passed} passed, ${failed} failed`);
