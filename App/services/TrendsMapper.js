// Groups hero-level session rows (SupabaseService.getSessions) into the three
// shapes the Trends screen already renders — weeks / months / year — with real
// UV-dose numbers instead of mock structure. We deliberately stay at the
// hero-row level (average_uv + duration via estimateSedFromHero); Trends only
// needs a per-day dose sum, never per-reading detail, so we never join
// session_readings here.
import { estimateSedFromHero } from './SessionDetailMapper';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Chips would overflow with a full year of weeks; the most recent stretch is
// what a user actually inspects, so we cap the week list.
const MAX_WEEKS = 8;

const round1 = (n) => Math.round(n * 10) / 10;
const round2 = (n) => Math.round(n * 100) / 100;
const sum = (arr) => arr.reduce((a, b) => a + b, 0);
const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

// Local (not UTC) date key so a session logged late in the evening doesn't
// roll into the next day's / week's bucket.
function localKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Monday 00:00 of the week containing `d` — weeks in this app run Mon→Sun to
// match dayLabels above.
function mondayOf(d) {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const mondayOffset = (date.getDay() + 6) % 7; // Sun=0 → 6, Mon=1 → 0, …
  date.setDate(date.getDate() - mondayOffset);
  return date;
}

function ordinal(n) {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

function indexOfMax(arr) {
  let idx = 0;
  for (let i = 1; i < arr.length; i++) if (arr[i] > arr[idx]) idx = i;
  return idx;
}

function weekLabel(monday) {
  const end = new Date(monday);
  end.setDate(end.getDate() + 6);
  const startMonth = MONTH_SHORT[monday.getMonth()];
  const endMonth = MONTH_SHORT[end.getMonth()];
  return startMonth === endMonth
    ? `${startMonth} ${monday.getDate()} – ${end.getDate()}`
    : `${startMonth} ${monday.getDate()} – ${endMonth} ${end.getDate()}`;
}

// ─── Deterministic, numbers-first narrative lines ──────────────────────────
// Same tone as SessionDetailMapper's buildVerdict/buildDrivers: short, driven
// by the real figures, no flourish. A period comparison is only stated when a
// prior period actually has dose to compare against.

function trendClause(total, prevTotal, unitWord) {
  if (prevTotal == null || prevTotal <= 0) return '';
  const delta = Math.round(((total - prevTotal) / prevTotal) * 100);
  if (delta >= 5) return ` Up ${delta}% from the prior ${unitWord}.`;
  if (delta <= -5) return ` Down ${Math.abs(delta)}% from the prior ${unitWord}.`;
  return ` Level with the prior ${unitWord}.`;
}

function weekInsight(days, prevTotal) {
  const total = round1(sum(days));
  if (total <= 0) return 'No recorded exposure this week — a clean slate for your seasonal budget.';
  const peakIdx = indexOfMax(days);
  const share = Math.round((days[peakIdx] / sum(days)) * 100);
  const active = days.filter((v) => v > 0).length;
  return `${DAY_FULL[peakIdx]} drove ${share}% of this week's ${total} MEDs across `
    + `${active} active day${active === 1 ? '' : 's'}.${trendClause(total, prevTotal, 'week')}`;
}

function monthInsight(days, monthIdx, prevTotal, partial) {
  const total = round1(sum(days));
  const name = MONTH_FULL[monthIdx];
  if (total <= 0) return `No recorded exposure in ${name}${partial ? ' so far' : ''}.`;
  const peakIdx = indexOfMax(days);
  const active = days.filter((v) => v > 0).length;
  return `${name}${partial ? ' so far' : ''}: ${total} MEDs across ${active} active `
    + `day${active === 1 ? '' : 's'}, peaking at ${round1(days[peakIdx])} on the ${ordinal(peakIdx + 1)}.`
    + trendClause(total, prevTotal, 'month');
}

function yearInsight(monthTotals) {
  const active = monthTotals
    .map((v, i) => ({ v, i }))
    .filter((x) => x.v != null && x.v > 0);
  if (active.length === 0) return 'No recorded exposure yet this year.';
  const total = round1(sum(active.map((x) => x.v)));
  const peak = active.reduce((a, b) => (b.v > a.v ? b : a));
  let trend = '';
  if (active.length >= 2) {
    const last = active[active.length - 1].v;
    const prev = active[active.length - 2].v;
    if (last > prev * 1.05) trend = ' Your monthly dose is climbing as UV rises.';
    else if (last < prev * 0.95) trend = ' Your monthly dose is easing off.';
    else trend = ' Your monthly dose is holding steady.';
  }
  return `${active.length} active month${active.length === 1 ? '' : 's'}, ${total} MEDs year to date. `
    + `${MONTH_FULL[peak.i]} was your heaviest at ${round1(peak.v)} MEDs.${trend}`;
}

// ─── Aggregation ───────────────────────────────────────────────────────────

function buildWeeks(sessions) {
  const byWeek = new Map(); // 'YYYY-MM-DD' (Monday) → { monday, days: number[7] }
  for (const s of sessions) {
    const start = new Date(s.start_time);
    const monday = mondayOf(start);
    const key = localKey(monday);
    if (!byWeek.has(key)) byWeek.set(key, { monday, days: [0, 0, 0, 0, 0, 0, 0] });
    const dayIdx = (start.getDay() + 6) % 7;
    byWeek.get(key).days[dayIdx] += estimateSedFromHero(s);
  }

  // A brand-new user with zero sessions still needs one bucket so the chart /
  // chip row have something honest (all-zero) to render.
  if (byWeek.size === 0) {
    const monday = mondayOf(new Date());
    byWeek.set(localKey(monday), { monday, days: [0, 0, 0, 0, 0, 0, 0] });
  }

  // Most recent first — the initial selection and chip order mirror the mock.
  const ordered = [...byWeek.entries()].sort(([a], [b]) => (a < b ? 1 : -1)).slice(0, MAX_WEEKS);

  return ordered.map(([key, { monday, days }], i) => {
    const rounded = days.map(round2);
    // Prior week = the next entry chronologically (list is newest-first).
    const prev = ordered[i + 1];
    const prevTotal = prev ? sum(prev[1].days) : null;
    return {
      id: `w-${key}`,
      label: weekLabel(monday),
      days: rounded,
      insight: weekInsight(rounded, prevTotal),
    };
  });
}

function buildMonths(sessions) {
  const byMonth = new Map(); // 'YYYY-MM' → { year, month, days: number[] }
  for (const s of sessions) {
    const start = new Date(s.start_time);
    const year = start.getFullYear();
    const month = start.getMonth();
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    if (!byMonth.has(key)) {
      byMonth.set(key, { year, month, days: Array(daysInMonth(year, month)).fill(0) });
    }
    byMonth.get(key).days[start.getDate() - 1] += estimateSedFromHero(s);
  }

  if (byMonth.size === 0) {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    byMonth.set(key, { year: now.getFullYear(), month: now.getMonth(), days: Array(daysInMonth(now.getFullYear(), now.getMonth())).fill(0) });
  }

  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Chronological ascending so months[length-1] is the most recent, matching
  // the mock's ordering (Trends selects the last month by default).
  const ordered = [...byMonth.entries()].sort(([a], [b]) => (a < b ? -1 : 1));

  return ordered.map(([key, { year, month, days }], i) => {
    const rounded = days.map(round2);
    const partial = key === currentKey; // the ongoing calendar month is incomplete
    const prev = ordered[i - 1];
    const prevTotal = prev ? sum(prev[1].days) : null;
    return {
      id: `m-${key}`,
      label: MONTH_FULL[month],
      short: MONTH_SHORT[month],
      year,
      days: rounded,
      partial,
      insight: monthInsight(rounded, month, prevTotal, partial),
    };
  });
}

function buildYear(sessions) {
  // Anchor on the most recent session's year (getSessions returns newest
  // first); no data → current calendar year.
  const anchorYear = sessions.length
    ? new Date(sessions[0].start_time).getFullYear()
    : new Date().getFullYear();

  const totals = Array(12).fill(0);
  const hasData = Array(12).fill(false);
  for (const s of sessions) {
    const start = new Date(s.start_time);
    if (start.getFullYear() !== anchorYear) continue;
    const m = start.getMonth();
    totals[m] += estimateSedFromHero(s);
    hasData[m] = true;
  }

  const now = new Date();
  // Months past this cutoff haven't happened yet → null (drawn as "future"
  // stubs by TrendsChart), not a dishonest zero.
  const cutoff = anchorYear < now.getFullYear() ? 11 : now.getMonth();

  const monthTotals = totals.map((t, i) => {
    if (hasData[i]) return round1(t);
    return i <= cutoff ? 0 : null; // past month with no exposure = honest 0
  });

  return {
    label: String(anchorYear),
    months: monthTotals.map((meds, i) => ({ label: MONTH_SHORT[i][0], meds })),
    insight: yearInsight(monthTotals),
  };
}

// Real replacement for mockData.trends. `sessions` is the hero-row array from
// SupabaseService.getSessions (may be empty — that's a valid, honest state).
export function buildTrends(sessions) {
  const safe = Array.isArray(sessions) ? sessions : [];
  return {
    dayLabels: DAY_LABELS,
    weeks: buildWeeks(safe),
    months: buildMonths(safe),
    year: buildYear(safe),
  };
}
