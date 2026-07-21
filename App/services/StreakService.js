// Pure logic for the Streak system: a daily-engagement mechanic that rewards
// CONSISTENCY OF LOGGING, never amount of sun exposure. Any completed session
// on a given local calendar day counts that day equally — 5 minutes in shade
// or 3 hours at the beach are identical here. This is deliberate: the mechanic
// must never nudge a user toward more UV than they actually need, which would
// fight the app's core safety stance.
//
// No UI, no React Native imports — everything is deterministic and testable in
// plain node, the same pure-module pattern used by DepletionLabService and
// SunRecapService. Feed it either raw Supabase `sessions` rows (snake_case
// start_time) or already-normalized rows ({ startTime } in ms); both are read
// by startMsOf below.

// ─── Tunables ─────────────────────────────────────────────────
export const STREAK_RULES = {
  daysPerFreeze: 7, // one freeze credit earned per 7 days of active streak
  maxFreezes: 4,    // stockpile cap
};

const DAY_MS = 24 * 60 * 60 * 1000;

// ─── Day math (local calendar time) ───────────────────────────

// A stable per-day key in the user's LOCAL time — this is what makes two
// sessions on the same calendar day collapse to one streak day.
export function dayKey(ms) {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Midnight (local) of the day containing `ms`.
export function startOfDay(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Add `n` whole calendar days via setDate so it stays correct across DST
// boundaries (a raw +n*DAY_MS would drift by an hour twice a year).
export function addDays(dayMs, n) {
  const d = new Date(dayMs);
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Reads a start timestamp (ms) from either a raw Supabase row or a normalized
// one; returns 0 when there's nothing usable (that session simply won't count).
function startMsOf(s) {
  if (typeof s?.startTime === 'number') return s.startTime;
  if (s?.start_time) return new Date(s.start_time).getTime();
  return 0;
}

// The set of local-day keys on which at least one session was logged.
export function loggedDaySet(sessions) {
  const set = new Set();
  for (const s of sessions || []) {
    const t = startMsOf(s);
    if (t) set.add(dayKey(t));
  }
  return set;
}

// How many sessions fell on a given day key — used to tell "this session just
// started/extended the streak" (count === 1) from a same-day repeat.
export function countSessionsOnDay(sessions, key) {
  let n = 0;
  for (const s of sessions || []) {
    const t = startMsOf(s);
    if (t && dayKey(t) === key) n += 1;
  }
  return n;
}

// ─── Tiering ──────────────────────────────────────────────────
// The one place streak length maps to a presentation tier — both the
// post-check-in reveal and the Streaks hero read the tier from here so they
// can never disagree. Colors/animations for each tier live in
// constants/streakTiers.js.
export function streakTier(n) {
  if (n >= 600) return 'green';
  if (n >= 400) return 'purple';
  if (n >= 100) return 'pink';
  if (n >= 50) return 'gold';
  if (n >= 7) return 'blue';
  return 'base'; // 0–6
}

// ─── Core streak simulation ───────────────────────────────────

// Walks every calendar day from the first logged day through today, forward,
// maintaining the active run, the longest run ever, and the freeze stockpile.
// Freezes (Duolingo-style): +1 per 7 days of active run (capped), auto-consumed
// to bridge exactly ONE isolated missed day. Two or more consecutive missed
// days always break the streak regardless of freezes on hand — a break resets
// both the run and the stockpile, since freezes belong to the active streak.
//
// Returns a summary the UI can render directly, plus the raw sets the
// per-day state function needs.
export function computeStreak(sessions, now = Date.now()) {
  const logged = loggedDaySet(sessions);
  const todayMs = startOfDay(now);
  const todayKey = dayKey(todayMs);
  const sessionsToday = countSessionsOnDay(sessions, todayKey);

  const base = {
    currentStreak: 0,
    longestStreak: 0,
    freezes: 0,
    tier: 'base',
    todayLogged: logged.has(todayKey),
    sessionsToday,
    loggedDays: logged,
    freezeCovered: new Set(),
    now,
  };

  if (logged.size === 0) return base;

  // First and last logged day (local midnights) bound the simulation.
  let firstMs = Infinity;
  let lastLoggedMs = -Infinity;
  for (const s of sessions) {
    const t = startMsOf(s);
    if (!t) continue;
    const day = startOfDay(t);
    if (day < firstMs) firstMs = day;
    if (day > lastLoggedMs) lastLoggedMs = day;
  }

  let run = 0;
  let longest = 0;
  let freezes = 0;
  let consecutiveMissed = 0; // trailing missed PAST days awaiting resolution
  let pendingMissedKey = null; // the single missed day a freeze could bridge
  const freezeCovered = new Set();

  for (let dMs = firstMs; dMs <= todayMs; dMs = addDays(dMs, 1)) {
    const k = dayKey(dMs);
    const isToday = k === todayKey;

    if (logged.has(k)) {
      if (consecutiveMissed === 1 && run > 0 && freezes > 0) {
        // Bridge the single missed day: spend a freeze, keep the run alive.
        // The frozen day itself doesn't add to the count (matches the
        // Duolingo model where the number holds, then resumes climbing).
        freezes -= 1;
        if (pendingMissedKey) freezeCovered.add(pendingMissedKey);
        run += 1;
      } else if (consecutiveMissed >= 1) {
        // Broken: either 2+ missed days, or a single gap with no freeze to
        // spend. The active streak — and its stockpile — restart here.
        run = 1;
        freezes = 0;
      } else {
        run += 1;
      }
      consecutiveMissed = 0;
      pendingMissedKey = null;

      if (run % STREAK_RULES.daysPerFreeze === 0) {
        freezes = Math.min(STREAK_RULES.maxFreezes, freezes + 1);
      }
      if (run > longest) longest = run;
    } else if (!isToday) {
      // A missed PAST day. Today with no session yet is NOT a miss — the
      // streak stays alive until the day actually ends (see the gating below).
      consecutiveMissed += 1;
      if (consecutiveMissed === 1) pendingMissedKey = k;
    }
  }

  // `run` now holds the streak length as of the last logged day (misses after
  // it never reset it). The streak is "current" only if that last logged day
  // is today or yesterday — otherwise it lapsed and reads as 0.
  const yesterdayMs = addDays(todayMs, -1);
  const currentStreak =
    lastLoggedMs === todayMs || lastLoggedMs === yesterdayMs ? run : 0;

  return {
    currentStreak,
    longestStreak: longest,
    freezes,
    tier: streakTier(currentStreak),
    todayLogged: logged.has(todayKey),
    sessionsToday,
    loggedDays: logged,
    freezeCovered,
    now,
  };
}

// ─── Per-day state for calendar rendering ─────────────────────

// Resolves any day (across any month the calendar scrolls to) to a render
// state. The four canonical states are 'logged' | 'missed' | 'freeze-covered'
// | 'today-no-session-yet'; days after today return 'future' so a real month
// grid can leave them blank rather than mislabeling them as missed. `streak`
// is the object computeStreak returned.
export function getDayState(ms, streak, now = streak?.now ?? Date.now()) {
  const dayStart = startOfDay(ms);
  const todayStart = startOfDay(now);
  const k = dayKey(ms);

  if (dayStart > todayStart) return 'future';
  if (streak?.loggedDays?.has(k)) return 'logged';
  if (dayStart === todayStart) return 'today-no-session-yet';
  if (streak?.freezeCovered?.has(k)) return 'freeze-covered';
  return 'missed';
}

export { DAY_MS };
