// MOCK DATA — Skin Age inputs and stored trend history.
// TODO: wire real Supabase data. In production:
//   • the aggregates come from summing session rows (SupabaseService)
//   • trendPoints come from skin_age_snapshots (one row per day,
//     written by the Skin Age screen at most once per day)
//
// Persona: real age 27, Fitzpatrick III, six months of use (started
// Jan 6). Under SkinAgeService's evidence-informed model, UV-driven aging
// can only add risk relative to real age — there's no scientific basis
// for good habits producing a skin age below chronological age, only for
// accumulating less added photoaging than you otherwise would. This
// persona reflects a diligent-but-not-perfect user: a small, honest
// elevated-risk number (~27.7 given the aggregates below), gently
// improving as tracked habits got more consistent, not a below-real-age
// number produced by an ungrounded bonus system.

export const mockSkinAgeProfile = {
  realAge: 27,
  fitzpatrickType: 3,
  firstSessionDate: '2026-01-06',
};

// All-time aggregates across every recorded session. totalUVUnits is
// cumulative SED (Standard Erythemal Dose, the real photobiology unit —
// see SkinAgeService.js), not the old invented "beach day" scale.
// ~188 tracked days x 280 SED ≈ 1.49 SED/day, moderately above the
// ARPANSA ~1 SED/day safe reference, yielding a small uvDoseYears
// contribution (~0.7 years) rather than the flat "beach day" math this
// used to use.
export const mockSkinAgeAggregates = {
  totalUVUnits: 280,
  totalGapMinutes: 0,
  avgSessionScore: 96,
  avgAlertResponseMinutes: 4.2,
  currentStreakDays: 34,
  longestStreakDays: 34,
};

// One stored calculation per day the user opened the app — ~150 points
// from late January to today, drifting from ~28.3 down to 27.7 (matching
// what calculateSkinAge actually computes from the aggregates above) with
// small deterministic wobble (no Math.random so renders are stable).
function genTrendPoints() {
  const points = [];
  const start = new Date('2026-01-24');
  const end = new Date('2026-07-06');
  const totalDays = Math.round((end - start) / 86400000);
  for (let d = 0; d <= totalDays; d += 1) {
    // Skip a few days here and there — the user doesn't open it daily.
    if (d % 9 === 4 || d % 13 === 7) continue;
    const t = d / totalDays;
    const base = 28.3 - 0.6 * t; // 28.3 → 27.7
    const wobble = Math.sin(d * 1.7) * 0.08 * (1 - t); // settles as habits do
    const date = new Date(start);
    date.setDate(start.getDate() + d);
    points.push({
      date: date.toISOString().slice(0, 10),
      age: Math.round((base + wobble) * 10) / 10,
    });
  }
  points[points.length - 1].age = 27.7;
  return points;
}
export const mockSkinAgeTrendPoints = genTrendPoints();

// Last 6 months, most recent first. Gap minutes stay 0 to match the
// all-time aggregate; the variety comes from scores and UV load. uvUnits
// is cumulative SED per month (see note above) — a few sessions at a
// couple hours each and a moderate-high Index lands around 20-30 SED per
// session, not the old inflated "beach day" scale.
export const mockSkinAgeMonths = [
  { key: '2026-07', label: 'Jul', sessions: 2, uvUnits: 45, gapMinutes: 0, avgScore: 97 },
  { key: '2026-06', label: 'Jun', sessions: 9, uvUnits: 195, gapMinutes: 0, avgScore: 96 },
  { key: '2026-05', label: 'May', sessions: 11, uvUnits: 230, gapMinutes: 0, avgScore: 94 },
  { key: '2026-04', label: 'Apr', sessions: 8, uvUnits: 170, gapMinutes: 0, avgScore: 76 },
  { key: '2026-03', label: 'Mar', sessions: 6, uvUnits: 140, gapMinutes: 0, avgScore: 62 },
  { key: '2026-02', label: 'Feb', sessions: 7, uvUnits: 155, gapMinutes: 0, avgScore: 88 },
];
