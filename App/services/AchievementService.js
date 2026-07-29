// Explicit .js extensions so this module also loads under plain node for
// AchievementService.test.js (Metro resolves them identically).
import { dayKey } from './StreakService.js';
import { ACHIEVEMENT_BADGES, levelFor } from '../constants/achievementBadges.js';

// Turns the completed-session list into the metric values the achievement
// badges are graded against. Pure and synchronous — it takes the same
// `sessions` array StreakContext already holds, so nothing extra is fetched
// and no derived value is ever stored.
//
// A metric with no data source anywhere in the pipeline returns null, and
// levelFor maps null to level 0 (locked). That is deliberate: a badge the app
// cannot yet measure stays visibly unearned rather than showing a number the
// hardware or schema can't back up.

// Sunrise/sunset times aren't stored (and the wearable can't supply them), so
// "first light" and "golden hour" fall back to local clock windows. Wide
// enough to hold across seasons, narrow enough that a midday session never
// counts as either.
export const DAWN_HOURS = { start: 5, end: 8 };
export const DUSK_HOURS = { start: 17, end: 20 };

// Latitude of the Tropics of Cancer/Capricorn.
const TROPICS_LAT = 23.44;
const EQUATOR_BAND_LAT = 5;

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const startMs = (s) => new Date(s.start_time).getTime();

function hourOf(session) {
  const ms = startMs(session);
  return Number.isNaN(ms) ? null : new Date(ms).getHours();
}

function inWindow(hour, window) {
  return hour != null && hour >= window.start && hour < window.end;
}

// Days where every logged session finished with zero unprotected minutes.
// A day with no sessions isn't flawless, it's just absent.
//
// A null unprotected_minutes means the session never got its end-of-session
// fields written (ActiveSessionScreen's persist step failed), NOT that the user
// was perfectly covered — so it can't count as clean. Coercing null to 0 here
// would hand out Clean Sheet for a session we have no protection data for.
function countFlawlessDays(sessions) {
  const byDay = new Map();
  for (const s of sessions) {
    const ms = startMs(s);
    if (Number.isNaN(ms)) continue;
    const key = dayKey(ms);
    const clean = typeof s.unprotected_minutes === 'number' && s.unprotected_minutes === 0;
    byDay.set(key, (byDay.get(key) ?? true) && clean);
  }
  let n = 0;
  for (const clean of byDay.values()) if (clean) n += 1;
  return n;
}

function countDistinctDays(sessions, predicate) {
  const days = new Set();
  for (const s of sessions) {
    if (!predicate(s)) continue;
    const ms = startMs(s);
    if (Number.isNaN(ms)) continue;
    days.add(dayKey(ms));
  }
  return days.size;
}

// 3 = tracked in both hemispheres, 2 = within 5° of the equator,
// 1 = anywhere in the tropics, 0 = none of those.
function latitudeLevel(sessions) {
  let north = false;
  let south = false;
  let equatorial = false;
  let tropical = false;
  for (const s of sessions) {
    const lat = s.latitude;
    if (typeof lat !== 'number' || !Number.isFinite(lat)) continue;
    if (lat > 0) north = true;
    if (lat < 0) south = true;
    const abs = Math.abs(lat);
    if (abs <= EQUATOR_BAND_LAT) equatorial = true;
    if (abs <= TROPICS_LAT) tropical = true;
  }
  if (north && south) return 3;
  if (equatorial) return 2;
  if (tropical) return 1;
  return 0;
}

export function computeMetrics(sessions = []) {
  const list = Array.isArray(sessions) ? sessions : [];

  const cities = new Set();
  let reapplications = 0;
  let minutes = 0;
  let peakUv = 0;
  let waterSessions = 0;
  let dawnSessions = 0;
  let duskSessions = 0;
  // null, not 0 — "never recorded an altitude" and "tracked at sea level" are
  // different, and only the second should read as real progress.
  let maxAltitudeM = null;

  for (const s of list) {
    reapplications += num(s.reapplication_count);
    minutes += num(s.duration_minutes);
    peakUv = Math.max(peakUv, num(s.peak_uv));
    if (num(s.water_events) > 0) waterSessions += 1;

    const city = typeof s.city === 'string' ? s.city.trim().toLowerCase() : '';
    if (city) cities.add(city);

    const alt = s.altitude_m;
    if (typeof alt === 'number' && Number.isFinite(alt)) {
      maxAltitudeM = maxAltitudeM === null ? alt : Math.max(maxAltitudeM, alt);
    }

    const hour = hourOf(s);
    if (inWindow(hour, DAWN_HOURS)) dawnSessions += 1;
    if (inWindow(hour, DUSK_HOURS)) duskSessions += 1;
  }

  return {
    reapplications,
    sunHours: minutes / 60,
    cities: cities.size,
    peakUv,
    waterSessions,
    dawnSessions,
    duskSessions,
    flawlessDays: countFlawlessDays(list),
    snowDays: countDistinctDays(list, (s) => s.environment === 'Snow'),
    latitudeLevel: latitudeLevel(list),
    maxAltitudeM,
  };
}

// [{ badge, level, value }] in registry order — level 0 means locked.
export function computeAchievements(sessions = []) {
  const metrics = computeMetrics(sessions);
  return ACHIEVEMENT_BADGES.map((badge) => {
    const value = metrics[badge.metric];
    return { badge, value, level: levelFor(badge, value) };
  });
}

export default { computeMetrics, computeAchievements };
