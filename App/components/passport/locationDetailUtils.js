// Pure helpers for the Location Detail screen. Not components.
// All of these are single-location analytics — cross-location aggregates
// (rankings, loyalty, etc.) live in passportUtils.js.
import colors from '../../constants/colors';
import { uvRanking } from './passportUtils';

export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

// ─── Time-of-day ──────────────────────────────────────────────────
// "10:22 AM" → 10.366 (decimal 24h hour)
function parseHour24(startTime) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec((startTime || '').trim());
  if (!m) return null;
  let h = parseInt(m[1], 10) % 12;
  if (/PM/i.test(m[3])) h += 12;
  return h + parseInt(m[2], 10) / 60;
}

function formatHourLabel(hour24) {
  const h = Math.round(hour24) % 24;
  const period = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${period}`;
}

function mode(values) {
  if (!values.length) return null;
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  let best = values[0];
  let bestCount = 0;
  for (const [v, c] of counts) {
    if (c > bestCount) { best = v; bestCount = c; }
  }
  return { value: best, count: bestCount };
}

// "around 1pm" — modal rounded start hour across the given sessions.
export function modalStartHourLabel(sessions) {
  const hours = sessions.map((s) => parseHour24(s.startTime)).filter((h) => h != null);
  if (!hours.length) return null;
  const m = mode(hours.map((h) => Math.round(h)));
  return m ? `around ${formatHourLabel(m.value)}` : null;
}

// 'Morning' | 'Midday' | 'Afternoon' bucket, modal across the sessions
// with the highest recorded peak UV (proxy for "when UV peaks here" —
// this dataset doesn't carry a per-minute UV curve).
export function modalUvPeakTimeBucket(sessions) {
  if (!sessions.length) return null;
  const sorted = [...sessions].sort((a, b) => b.peakUV - a.peakUV);
  const topHalf = sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 2)));
  const buckets = topHalf
    .map((s) => parseHour24(s.startTime))
    .filter((h) => h != null)
    .map((h) => (h < 10 ? 'Morning' : h < 14 ? 'Midday' : 'Afternoon'));
  const m = mode(buckets);
  return m ? m.value : null;
}

// ─── UV ──────────────────────────────────────────────────────────
const UV_BANDS = [
  { label: 'Low', max: 2, color: colors.protected },
  { label: 'Moderate', max: 5, color: colors.protected },
  { label: 'High', max: 7, color: colors.warning },
  { label: 'Intense', max: 10, color: colors.danger },
  { label: 'Extreme', max: Infinity, color: colors.danger },
];

// Segmented distribution of session count across the five UV bands.
export function uvDistribution(sessions) {
  const total = sessions.length;
  if (!total) return [];
  return UV_BANDS.map((band, i) => {
    const min = i === 0 ? 0 : UV_BANDS[i - 1].max;
    const count = sessions.filter((s) => s.peakUV > min && s.peakUV <= band.max).length;
    return { label: band.label, color: band.color, count, pct: Math.round((count / total) * 100) };
  });
}

export function peakUvRecord(sessions) {
  const top = sessions.reduce((a, b) => (b.peakUV > a.peakUV ? b : a));
  return { value: top.peakUV, date: top.date };
}

// Null under 2 locations — a ranking of one is meaningless.
export function locationRankLine(clusters, key) {
  const ranked = uvRanking(clusters);
  if (!ranked) return null;
  const idx = ranked.findIndex((c) => c.key === key);
  if (idx === -1) return null;
  return `${ordinal(idx + 1)} most intense of your ${ranked.length} locations`;
}

// ─── Score / performance ───────────────────────────────────────────
export function globalAverages(allSessions) {
  const n = allSessions.length || 1;
  return {
    avgScore: Math.round(allSessions.reduce((a, s) => a + s.score, 0) / n),
    avgDurationMinutes: Math.round(allSessions.reduce((a, s) => a + s.durationMinutes, 0) / n),
  };
}

export function bestWorstSession(sessions) {
  const best = sessions.reduce((a, b) => (b.score > a.score ? b : a));
  const worst = sessions.reduce((a, b) => (b.score < a.score ? b : a));
  return {
    best: { score: best.score, date: best.date },
    worst: { score: worst.score, date: worst.date },
  };
}

export function protectionGapRate(sessions) {
  const gaps = sessions.filter((s) => s.hadProtectionGap).length;
  return { gaps, total: sessions.length };
}

export function avgAlertResponse(sessions) {
  const times = sessions.map((s) => s.avgAlertResponseMinutes).filter((t) => t != null);
  if (!times.length) return null;
  return Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 10) / 10;
}

// ─── Session patterns ───────────────────────────────────────────────
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function mostCommonDayOfWeek(sessions) {
  const days = sessions.map((s) => new Date(`${s.dateISO}T00:00:00`).getDay());
  const m = mode(days);
  return m ? DAY_NAMES[m.value] : null;
}

export function mostCommonActivityLevel(sessions) {
  const levels = sessions.map((s) => s.activityLevel).filter(Boolean);
  const m = mode(levels);
  if (!m) return null;
  return { label: m.value, pct: Math.round((m.count / levels.length) * 100) };
}

// Longest run of visits spaced no more than `maxGapDays` apart — the
// user's real cadence here is biweekly-ish, not daily, so "in a row"
// means "without a long dropout," not literal consecutive calendar days.
export function longestVisitStreak(sessions, maxGapDays = 30) {
  if (!sessions.length) return 0;
  const sorted = [...sessions].sort((a, b) => (a.dateISO < b.dateISO ? -1 : 1));
  let longest = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const gapDays = (new Date(`${sorted[i].dateISO}T00:00:00`) - new Date(`${sorted[i - 1].dateISO}T00:00:00`)) / 86400000;
    current = gapDays <= maxGapDays ? current + 1 : 1;
    longest = Math.max(longest, current);
  }
  return longest;
}

export function firstLastVisit(sessions) {
  const sorted = [...sessions].sort((a, b) => (a.dateISO < b.dateISO ? -1 : 1));
  return { first: sorted[0].date, last: sorted[sorted.length - 1].date };
}

// ─── Conditions profile ─────────────────────────────────────────────
export function avgTempHumidity(sessions) {
  const temps = sessions.map((s) => s.temperature).filter((t) => t != null);
  const hums = sessions.map((s) => s.humidity).filter((h) => h != null);
  return {
    avgTemp: temps.length ? Math.round(temps.reduce((a, b) => a + b, 0) / temps.length) : null,
    avgHumidity: hums.length ? Math.round(hums.reduce((a, b) => a + b, 0) / hums.length) : null,
  };
}

export function waterEventFrequency(sessions) {
  const withFlags = sessions.filter((s) => s.conditionFlags);
  if (!withFlags.length) return null;
  const count = withFlags.filter((s) => s.conditionFlags.waterEvents).length;
  return Math.round((count / withFlags.length) * 100);
}

const SEASONS = ['Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer', 'Summer', 'Summer', 'Fall', 'Fall', 'Fall', 'Winter'];

export function mostCommonSeason(sessions) {
  const seasons = sessions.map((s) => SEASONS[new Date(`${s.dateISO}T00:00:00`).getMonth()]);
  const m = mode(seasons);
  return m ? m.value : null;
}

// One-line dominant-conditions phrase for the collapsed card header.
export function dominantConditionPhrase(sessions) {
  const { avgTemp, avgHumidity } = avgTempHumidity(sessions);
  const activity = mostCommonActivityLevel(sessions);
  const waterPct = waterEventFrequency(sessions);

  if (avgTemp != null && avgHumidity != null && avgTemp >= 82 && avgHumidity >= 65) {
    return 'Typically hot and humid';
  }
  if (activity && activity.label === 'High' && activity.pct >= 50) {
    return 'Frequently high activity';
  }
  if (waterPct != null && waterPct >= 60) {
    return 'Frequently near water';
  }
  if (avgTemp != null && avgTemp >= 82) return 'Typically hot';
  if (avgTemp != null && avgTemp <= 45) return 'Typically cold, snow-reflective conditions';
  if (avgHumidity != null && avgHumidity >= 65) return 'Typically humid';
  return 'Mixed conditions here';
}

// ─── Skin response ──────────────────────────────────────────────────
const NO_REACTION = 'No reaction, skin feels normal';

// Null unless at least 2 sessions here have check-in data — nothing
// meaningful to summarize from a single data point.
export function skinResponseSummary(sessions) {
  const withCheckIn = sessions.filter((s) => s.postSession);
  if (withCheckIn.length < 2) return null;

  const afters = withCheckIn.map((s) => s.postSession.skinFeelAfter).filter(Boolean);
  const befores = withCheckIn.map((s) => s.postSession.skinFeelBefore).filter(Boolean);
  const reactiveCount = afters.filter((a) => a !== NO_REACTION).length;

  const highUv = withCheckIn.filter((s) => s.peakUV > 8);
  const lowUv = withCheckIn.filter((s) => s.peakUV <= 8);
  let correlationLine = null;
  if (highUv.length >= 2 && lowUv.length >= 2) {
    const rate = (arr) => arr.filter((s) => s.postSession.skinFeelAfter !== NO_REACTION).length / arr.length;
    const highRate = rate(highUv);
    const lowRate = rate(lowUv);
    if (highRate - lowRate >= 0.5) {
      correlationLine = 'You report sensitivity more often when UV exceeds 8 here.';
    }
  }

  return {
    checkinCount: withCheckIn.length,
    total: sessions.length,
    reactiveCount,
    mostCommonAfter: mode(afters)?.value ?? null,
    mostCommonBefore: mode(befores)?.value ?? null,
    correlationLine,
  };
}
