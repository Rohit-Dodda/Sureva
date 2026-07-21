// Orchestrates a Sun Recap end to end: pull completed sessions, evaluate
// the trigger, build the recap, persist it. Keeps SupabaseService and the
// AsyncStorage store behind one call so screens don't wire the pieces.
import SupabaseService from './SupabaseService';
import {
  normalizeSession, evaluateTrigger, scopeChapter, buildRecap, hasEnoughForDeck,
} from './SunRecapService';
import { loadTriggerHistory, loadPrevSummary, saveRecap } from './SunRecapStore';

async function loadNormalizedSessions(userId) {
  const { data } = await SupabaseService.getSessions(userId);
  return (data ?? []).map(normalizeSession);
}

function yearOf(sessions, now) {
  const y = new Date(now).getFullYear();
  return sessions.filter((s) => new Date(s.startTime).getFullYear() === y);
}

// Automatic path: fires only when the trigger conditions are all met.
// Returns the newly built recap (already saved) or null.
export async function runAutoTrigger(userId, now = Date.now()) {
  try {
    if (!userId) return null;
    const sessions = await loadNormalizedSessions(userId);
    const history = await loadTriggerHistory();
    const { shouldFire, chapter } = evaluateTrigger(sessions, history, now);
    if (!shouldFire) return null;

    const prevRecap = await loadPrevSummary();
    const recap = buildRecap(chapter, { yearSessions: yearOf(sessions, now), prevRecap }, now);
    if (!hasEnoughForDeck(recap)) return null;

    await saveRecap(recap);
    return recap;
  } catch {
    // A recap is a nice-to-have — never let its failure surface an error.
    return null;
  }
}

// Sample path: fabricates a rich, varied chapter of synthetic sessions so
// the full experience (most card mechanics firing) can be seen for testing,
// independent of the signed-in account's real history. Not saved.
export function buildSampleRecap(now = Date.now()) {
  const DAY = 86400000;
  const s = (daysAgo, o) => ({
    id: `sample-${daysAgo}`,
    startTime: now - daysAgo * DAY,
    endTime: now - daysAgo * DAY + (o.durationMinutes ?? 90) * 60000,
    durationMinutes: o.durationMinutes ?? 90,
    spf: o.spf ?? 30,
    activityLevel: o.activityLevel ?? 'moderate',
    environment: o.environment ?? 'Beach',
    peakUv: o.peakUv ?? 6,
    averageUv: (o.peakUv ?? 6) - 1,
    averageHumidity: 60,
    peakTemperature: o.peakTemperature ?? 30,
    averageDepletionRate: o.averageDepletionRate ?? 0.4,
    score: o.score ?? 78,
    alertResponseAvg: o.alertResponseAvg ?? 8,
    alertCount: o.alertCount ?? 1,
    waterEvents: o.waterEvents ?? 1,
    unprotectedMinutes: o.unprotectedMinutes ?? 6,
    location: o.location ?? 'Miami',
  });
  const chapter = [
    s(46, { location: 'Miami', peakUv: 7, score: 82, waterEvents: 2 }),
    s(44, { location: 'Miami', peakUv: 6, score: 79 }),
    s(41, { location: 'Austin', peakUv: 5, score: 88, alertCount: 0, waterEvents: 0 }),
    s(39, { location: 'Austin', peakUv: 6, score: 84, alertCount: 0 }),
    s(35, { location: 'Cabo', peakUv: 11, score: 41, unprotectedMinutes: 58, waterEvents: 3, peakTemperature: 38, alertResponseAvg: 21, alertCount: 2 }),
    s(33, { location: 'Cabo', peakUv: 9, score: 56, unprotectedMinutes: 28, waterEvents: 2, peakTemperature: 36 }),
    s(29, { location: 'Miami', peakUv: 6, score: 90, durationMinutes: 205 }),
    s(27, { location: 'Miami', peakUv: 5, score: 92 }),
    s(24, { location: 'Tahoe', peakUv: 8, score: 71 }),
    s(22, { location: 'Tahoe', peakUv: 7, score: 74 }),
    s(20, { location: 'Tahoe', peakUv: 6, score: 69 }),
    s(18, { location: 'Miami', peakUv: 6, score: 86 }),
  ];
  return buildRecap(chapter, { yearSessions: chapter, prevRecap: { avgScore: 68 } }, now);
}

// Preview path: builds a recap from ALL completed sessions regardless of the
// trigger gates, so the experience can be seen on demand (empty history, or
// a "see a sample" entry). Not saved to history.
export async function buildPreview(userId, now = Date.now()) {
  try {
    if (!userId) return null;
    const sessions = await loadNormalizedSessions(userId);
    const chapter = scopeChapter(sessions, 0);
    if (chapter.length < 3) return null;
    const recap = buildRecap(chapter, { yearSessions: yearOf(sessions, now), prevRecap: null }, now);
    return hasEnoughForDeck(recap) ? recap : null;
  } catch {
    return null;
  }
}
