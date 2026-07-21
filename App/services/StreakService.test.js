// Self-contained test suite for the Streak logic. No testing framework —
// run with `node App/services/StreakService.test.js` (the services/ folder is
// scoped `"type": "module"` so plain node loads it as ESM), or import
// runAllTests() and inspect the returned { passed, failed, results }.
//
// Mirrors the harness style of Algorithm/tests/engineTests.js: a flat list of
// cases, each with a name, an expected value, and a thunk that produces the
// actual value.

import {
  computeStreak,
  getDayState,
  streakTier,
  dayKey,
  addDays,
  startOfDay,
  STREAK_RULES,
} from './StreakService.js';

// ─── Fixtures ─────────────────────────────────────────────────

// A fixed "now" — noon, so day math never lands on a midnight boundary.
const NOW = new Date(2026, 6, 21, 12, 0, 0, 0).getTime(); // 2026-07-21, local

// Build sessions for a list of day offsets from NOW (0 = today, -1 = yesterday).
// Each becomes a raw-Supabase-shaped row with an ISO start_time at local noon.
function sessionsOn(offsets, times = {}) {
  return offsets.flatMap((off) => {
    const d = new Date(NOW);
    d.setDate(d.getDate() + off);
    d.setHours(12, 0, 0, 0);
    const count = times[off] ?? 1; // allow multiple sessions on the same day
    return Array.from({ length: count }, (_, i) => ({
      id: `s${off}_${i}`,
      start_time: new Date(d.getTime() + i * 60000).toISOString(),
    }));
  });
}

// Offsets for a clean run of `len` days ending today: [-(len-1) .. 0].
function cleanRun(len) {
  return Array.from({ length: len }, (_, i) => -(len - 1) + i);
}

// ─── Cases ────────────────────────────────────────────────────

function buildTestCases() {
  const cases = [];
  const add = (name, expected, run, compare) =>
    cases.push({ name, expected, run, compare: compare ?? deepEqual });

  // ── 1. A clean streak ──
  add('Clean 5-day streak counts 5', 5, () => computeStreak(sessionsOn(cleanRun(5)), NOW).currentStreak);
  add('Clean streak sets longest to the same value', 5, () => computeStreak(sessionsOn(cleanRun(5)), NOW).longestStreak);
  add('No sessions → streak 0', 0, () => computeStreak([], NOW).currentStreak);
  add('Multiple sessions same day count as one day', 3, () =>
    computeStreak(sessionsOn(cleanRun(3), { 0: 4, [-1]: 2 }), NOW).currentStreak);
  add('sessionsToday reflects today\'s session count', 4, () =>
    computeStreak(sessionsOn(cleanRun(3), { 0: 4 }), NOW).sessionsToday);
  add('Streak stays alive when today has no session yet', 4, () =>
    // Logged the last 4 days ending YESTERDAY; today empty → still current.
    computeStreak(sessionsOn([-4, -3, -2, -1]), NOW).currentStreak);
  add('Streak is 0 once the last logged day is >1 day old', 0, () =>
    computeStreak(sessionsOn([-5, -4, -3]), NOW).currentStreak);

  // ── 2. A single-gap streak bridged by a freeze ──
  // Days -9..-3 (7 clean days → earns 1 freeze), miss -2, log -1 and 0.
  const singleGap = sessionsOn([-9, -8, -7, -6, -5, -4, -3, -1, 0]);
  add('Single missed day bridged by a freeze keeps the streak', 9, () =>
    computeStreak(singleGap, NOW).currentStreak);
  add('The bridged day resolves to freeze-covered', 'freeze-covered', () => {
    const s = computeStreak(singleGap, NOW);
    const missedDay = addDays(startOfDay(NOW), -2);
    return getDayState(missedDay, s, NOW);
  });
  add('The freeze earned at day 7 is spent bridging the gap', 0, () =>
    computeStreak(singleGap, NOW).freezes);

  // ── 3. A multi-day gap that breaks the streak ──
  // Log -5..-3 (a gap of two: -2 and -1 both missed... ) then today.
  const multiGap = sessionsOn([-5, -4, -3, 0]);
  add('Two consecutive missed days break the streak', 1, () =>
    // Only today survives as a fresh 1-day streak.
    computeStreak(multiGap, NOW).currentStreak);
  add('A day inside a multi-day gap is plain missed, never frozen', 'missed', () => {
    const s = computeStreak(multiGap, NOW);
    const inGap = addDays(startOfDay(NOW), -2);
    return getDayState(inGap, s, NOW);
  });
  add('Even with freezes banked, a 2-day gap still breaks', 1, () => {
    // 8 clean days banks a freeze, then a two-day gap, then today.
    const banked = sessionsOn([-12, -11, -10, -9, -8, -7, -6, -5, 0]);
    // gap is -4,-3,-2,-1 (four missed) → break regardless of the banked freeze.
    return computeStreak(banked, NOW).currentStreak;
  });

  // ── 4. Freeze-credit accrual over time ──
  add('21 clean days accrue 3 freezes', 3, () => computeStreak(sessionsOn(cleanRun(21)), NOW).freezes);
  add('Freeze stockpile is capped at the max', STREAK_RULES.maxFreezes, () =>
    computeStreak(sessionsOn(cleanRun(40)), NOW).freezes);
  add('6 clean days have not earned a freeze yet', 0, () =>
    computeStreak(sessionsOn(cleanRun(6)), NOW).freezes);

  // ── Tiering ──
  add('Tier thresholds map correctly', ['base', 'base', 'blue', 'gold', 'pink', 'purple', 'green'], () =>
    [0, 6, 7, 50, 100, 400, 600].map(streakTier));
  add('computeStreak surfaces the matching tier', 'blue', () =>
    computeStreak(sessionsOn(cleanRun(10)), NOW).tier);

  // ── Day-state basics ──
  add('Today with a session logged today reads as logged', 'logged', () => {
    const s = computeStreak(sessionsOn(cleanRun(2)), NOW);
    return getDayState(NOW, s, NOW);
  });
  add('Today with no session reads as today-no-session-yet', 'today-no-session-yet', () => {
    const s = computeStreak(sessionsOn([-1, -2]), NOW);
    return getDayState(NOW, s, NOW);
  });
  add('Future days read as future', 'future', () => {
    const s = computeStreak(sessionsOn(cleanRun(2)), NOW);
    return getDayState(addDays(startOfDay(NOW), 3), s, NOW);
  });

  return cases;
}

// ─── Comparators ──────────────────────────────────────────────

function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => deepEqual(a[k], b[k]));
}

// ─── Runner ───────────────────────────────────────────────────

export function runAllTests() {
  const results = [];
  let passed = 0;
  let failed = 0;

  for (const testCase of buildTestCases()) {
    let actual;
    let error = null;
    try {
      actual = testCase.run();
    } catch (e) {
      error = e;
    }
    const pass = !error && testCase.compare(actual, testCase.expected);
    if (pass) passed++;
    else failed++;
    results.push({
      name: testCase.name,
      expected: testCase.expected,
      actual: error ? `threw: ${error.message}` : actual,
      pass,
    });
  }
  return { passed, failed, results };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { passed, failed, results } = runAllTests();
  for (const r of results) {
    if (r.pass) {
      console.log(`PASS  ${r.name}`);
    } else {
      console.log(`FAIL  ${r.name}`);
      console.log(`      expected: ${JSON.stringify(r.expected)}`);
      console.log(`      actual:   ${JSON.stringify(r.actual)}`);
    }
  }
  console.log(`\n${passed} passed, ${failed} failed, ${passed + failed} total`);
  process.exitCode = failed > 0 ? 1 : 0;
}
