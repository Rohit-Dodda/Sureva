// Skin Age calculation engine — pure logic, no UI.
//
// The skin age is the user's real age modified by UV-behavior factors
// derived from session history. Every modifier, its caps, and the final
// clamp follow the published-benchmark spec:
//   • 1 standard beach day ≈ 720 cumulative UV index units (~6h exposure)
//   • result is clamped to [10, realAge + 15], rounded to 1 decimal
//
// Aggregate inputs (already summed across all sessions):
//   { totalUVUnits, totalGapMinutes, avgSessionScore,
//     avgAlertResponseMinutes, currentStreakDays, longestStreakDays }

const BEACH_DAY_UV_UNITS = 720;
const UV_YEARS_PER_BEACH_DAY = 0.02;
const UV_CAP_YEARS = 8;
const GAP_YEARS_PER_HOUR = 0.15;
const GAP_CAP_YEARS = 6;
const MAX_RESPONSE_PENALTY = 1;

export function beachDayEquivalents(totalUVUnits) {
  return totalUVUnits / BEACH_DAY_UV_UNITS;
}

function uvDoseYears(totalUVUnits) {
  return Math.min(beachDayEquivalents(totalUVUnits) * UV_YEARS_PER_BEACH_DAY, UV_CAP_YEARS);
}

function gapYears(totalGapMinutes) {
  return Math.min((totalGapMinutes / 60) * GAP_YEARS_PER_HOUR, GAP_CAP_YEARS);
}

function scoreYears(avgSessionScore) {
  if (avgSessionScore > 95) return -2;
  if (avgSessionScore > 85) return -1;
  if (avgSessionScore > 75) return -0.5;
  if (avgSessionScore < 40) return 2;
  if (avgSessionScore < 50) return 1;
  return 0;
}

function responseYears(avgAlertResponseMinutes) {
  if (avgAlertResponseMinutes == null) return 0; // no alerts ever fired
  if (avgAlertResponseMinutes < 5) return -0.3;
  if (avgAlertResponseMinutes > 30) return 1;
  if (avgAlertResponseMinutes > 15) return 0.5;
  return 0;
}

function streakYears(currentStreakDays, longestStreakDays) {
  if (currentStreakDays >= 30) return -0.5;
  if (longestStreakDays < 5) return 0.3;
  return 0;
}

function fitzpatrickYears(fitzpatrickType) {
  if (fitzpatrickType <= 2) return 0.5;
  if (fitzpatrickType >= 5) return -0.3;
  return 0;
}

function clampAndRound(age, realAge) {
  const clamped = Math.min(Math.max(age, 10), realAge + 15);
  return Math.round(clamped * 10) / 10;
}

// Returns { skinAge, modifiers } where modifiers is a keyed breakdown in
// years — positive values raise the skin age, negative lower it.
export function calculateSkinAge(profile, agg) {
  const modifiers = {
    uvDose: uvDoseYears(agg.totalUVUnits),
    gaps: gapYears(agg.totalGapMinutes),
    score: scoreYears(agg.avgSessionScore),
    response: responseYears(agg.avgAlertResponseMinutes),
    streak: streakYears(agg.currentStreakDays, agg.longestStreakDays),
    fitzpatrick: fitzpatrickYears(profile.fitzpatrickType),
  };
  const raw = Object.values(modifiers).reduce((a, b) => a + b, profile.realAge);
  return { skinAge: clampAndRound(raw, profile.realAge), modifiers };
}

// "Without Sureva" counterfactual: the same recorded UV exposure with zero
// protection — full UV dose penalty, the gap penalty saturated (with no
// protection, all exposure is gap time), the maximum alert-response
// penalty, and none of the score/streak benefits. Fitzpatrick still
// applies; it's skin, not behavior.
export function calculateWithoutSureva(profile, agg) {
  const raw =
    profile.realAge +
    uvDoseYears(agg.totalUVUnits) +
    GAP_CAP_YEARS +
    MAX_RESPONSE_PENALTY +
    fitzpatrickYears(profile.fitzpatrickType);
  return clampAndRound(raw, profile.realAge);
}

// Trend over the last 30 days of stored points: 'improving' | 'increasing'
// | 'flat'. Points are [{ date: 'YYYY-MM-DD', age }] in chronological order.
export function trendDirection(points) {
  if (points.length < 2) return 'flat';
  const last = points[points.length - 1];
  const cutoff = new Date(last.date);
  cutoff.setDate(cutoff.getDate() - 30);
  const windowPoints = points.filter((p) => new Date(p.date) >= cutoff);
  if (windowPoints.length < 2) return 'flat';
  const delta = windowPoints[windowPoints.length - 1].age - windowPoints[0].age;
  if (delta <= -0.1) return 'improving';
  if (delta >= 0.1) return 'increasing';
  return 'flat';
}

// Monthly snapshot status + verdict from a month's aggregates:
// { sessions, uvUnits, gapMinutes, avgScore }
export function monthAssessment(month) {
  const heavyUV = beachDayEquivalents(month.uvUnits) >= 1.5;
  if (month.avgScore < 65 || month.gapMinutes > 240) {
    return { status: 'red', verdict: 'Tough month — UV was high and gaps added up.' };
  }
  if (month.avgScore >= 80 && month.gapMinutes <= 60) {
    return { status: 'green', verdict: 'Good month — your habits improved your score.' };
  }
  return {
    status: 'amber',
    verdict: heavyUV
      ? 'Mixed month — heavy UV, but your protection mostly held.'
      : 'Steady month — no damage done, room to improve.',
  };
}

// ─── Improvement levers ────────────────────────────────────────────
// Exactly three cards, ranked: factors actively hurting the score first,
// then factors with remaining room to improve, then factors whose earned
// benefit is worth protecting. Every number is the user's real value.

const round1 = (n) => Math.round(n * 10) / 10;

function leverForFactor(key, profile, agg, modifiers) {
  const m = modifiers;
  switch (key) {
    case 'gaps': {
      if (m.gaps > 0) {
        return {
          title: 'Close your protection gaps',
          body: `You've accumulated ${Math.round(agg.totalGapMinutes)} minutes below 20% protection, adding ${round1(m.gaps)} years. Confirming reapplication within 5 minutes of alerts stops this from growing.`,
        };
      }
      return {
        title: 'Keep your gaps at zero',
        body: `You have ${Math.round(agg.totalGapMinutes)} minutes of low-protection time on record — a clean sheet. Every alert answered fast keeps this factor at +0 years.`,
      };
    }
    case 'response': {
      const r = agg.avgAlertResponseMinutes;
      if (m.response > 0) {
        return {
          title: 'Respond to alerts faster',
          body: `Your average response time is ${round1(r)} minutes, adding ${round1(m.response)} years. Cutting it under 5 minutes would swing this to −0.3 years instead.`,
        };
      }
      if (m.response === 0 && r != null) {
        return {
          title: 'Respond to alerts faster',
          body: `Your average response time is ${round1(r)} minutes. Getting it under 5 minutes would subtract 0.3 years from your skin age.`,
        };
      }
      return {
        title: 'Keep answering alerts fast',
        body: `Your ${round1(r)}-minute average response is earning you −0.3 years. Staying under 5 minutes protects that benefit.`,
      };
    }
    case 'streak': {
      if (m.streak >= 0) {
        return {
          title: 'Build a longer streak',
          body: `Your longest streak is ${agg.longestStreakDays} days. Reaching 30 consecutive days would subtract 0.5 years from your score.`,
        };
      }
      return {
        title: 'Protect your streak',
        body: `Your ${agg.currentStreakDays}-day streak is earning you −0.5 years. One missed day resets it — keep the chain alive.`,
      };
    }
    case 'score': {
      if (m.score > 0) {
        return {
          title: 'Raise your session scores',
          body: `Your all-time average score is ${round1(agg.avgSessionScore)}, adding ${round1(m.score)} years. Answering alerts and reapplying on time lifts every session's score.`,
        };
      }
      if (m.score > -2) {
        const next = agg.avgSessionScore > 85 ? 95 : agg.avgSessionScore > 75 ? 85 : 75;
        return {
          title: 'Push your scores higher',
          body: `Your all-time average score is ${round1(agg.avgSessionScore)}. Averaging above ${next} unlocks the next tier of skin-age benefit.`,
        };
      }
      return {
        title: 'Hold your scores above 95',
        body: `Your ${round1(agg.avgSessionScore)} average earns the maximum −2 years. Keeping sessions above 95 preserves your biggest benefit.`,
      };
    }
    case 'uvDose':
    default: {
      const bd = round1(beachDayEquivalents(agg.totalUVUnits));
      return {
        title: 'Watch your cumulative UV',
        body: `You've recorded the equivalent of ${bd} full beach days of UV, adding ${round1(m.uvDose)} years. Shifting sessions off the 11am–2pm peak slows this factor down.`,
      };
    }
  }
}

export function buildImprovementLevers(profile, agg, modifiers) {
  const BEST = { uvDose: null, gaps: 0, score: -2, response: -0.3, streak: -0.5 };
  const keys = ['uvDose', 'gaps', 'score', 'response', 'streak'];
  const ranked = keys
    .map((key) => {
      const current = modifiers[key];
      // uvDose is cumulative and can't be undone — no improvement headroom.
      const headroom = BEST[key] == null ? 0 : Math.max(0, current - BEST[key]);
      return { key, current, headroom };
    })
    .sort((a, b) => {
      const aHurts = a.current > 0 ? 1 : 0;
      const bHurts = b.current > 0 ? 1 : 0;
      if (aHurts !== bHurts) return bHurts - aHurts; // hurting factors first
      if (aHurts) return b.current - a.current; // worst offender first
      if (a.headroom !== b.headroom) return b.headroom - a.headroom; // most to gain
      return a.current - b.current; // biggest earned benefit worth protecting
    });
  return ranked.slice(0, 3).map((r) => leverForFactor(r.key, profile, agg, modifiers));
}
