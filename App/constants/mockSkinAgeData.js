// MOCK DATA — Skin Age inputs and stored trend history.
// TODO: wire real Supabase data. In production:
//   • the aggregates come from summing session rows (SupabaseService)
//   • trendPoints come from skin_age_snapshots (one row per day,
//     written by the Skin Age screen at most once per day)
//
// Persona per spec: real age 27, Fitzpatrick III, six months of use
// (started Jan 6), strong recent habits — skin age lands at exactly 24.3
// with a gentle downward trend across the last 30 days.

export const mockSkinAgeProfile = {
  realAge: 27,
  fitzpatrickType: 3,
  firstSessionDate: '2026-01-06',
};

// All-time aggregates across every recorded session.
// Yields: UV +0.1 (5 beach-day equivalents), gaps +0 (clean sheet),
// score −2 (avg > 95), response −0.3 (fast), streak −0.5 (34 days) → 24.3.
export const mockSkinAgeAggregates = {
  totalUVUnits: 3600,
  totalGapMinutes: 0,
  avgSessionScore: 96,
  avgAlertResponseMinutes: 4.2,
  currentStreakDays: 34,
  longestStreakDays: 34,
};

// One stored calculation per day the user opened the app — ~150 points
// from late January to today, drifting from ~26.1 down to 24.3 with small
// deterministic wobble (no Math.random so renders are stable).
function genTrendPoints() {
  const points = [];
  const start = new Date('2026-01-24');
  const end = new Date('2026-07-06');
  const totalDays = Math.round((end - start) / 86400000);
  for (let d = 0; d <= totalDays; d += 1) {
    // Skip a few days here and there — the user doesn't open it daily.
    if (d % 9 === 4 || d % 13 === 7) continue;
    const t = d / totalDays;
    const base = 26.1 - 1.8 * t; // 26.1 → 24.3
    const wobble = Math.sin(d * 1.7) * 0.08 * (1 - t); // settles as habits do
    const date = new Date(start);
    date.setDate(start.getDate() + d);
    points.push({
      date: date.toISOString().slice(0, 10),
      age: Math.round((base + wobble) * 10) / 10,
    });
  }
  points[points.length - 1].age = 24.3;
  return points;
}
export const mockSkinAgeTrendPoints = genTrendPoints();

// Last 6 months, most recent first. Gap minutes stay 0 to match the
// all-time aggregate; the variety comes from scores and UV load.
export const mockSkinAgeMonths = [
  { key: '2026-07', label: 'Jul', sessions: 2, uvUnits: 310, gapMinutes: 0, avgScore: 97 },
  { key: '2026-06', label: 'Jun', sessions: 9, uvUnits: 640, gapMinutes: 0, avgScore: 96 },
  { key: '2026-05', label: 'May', sessions: 11, uvUnits: 890, gapMinutes: 0, avgScore: 94 },
  { key: '2026-04', label: 'Apr', sessions: 8, uvUnits: 720, gapMinutes: 0, avgScore: 76 },
  { key: '2026-03', label: 'Mar', sessions: 6, uvUnits: 560, gapMinutes: 0, avgScore: 62 },
  { key: '2026-02', label: 'Feb', sessions: 7, uvUnits: 480, gapMinutes: 0, avgScore: 88 },
];
