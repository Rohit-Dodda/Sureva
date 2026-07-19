// Skin Age calculation engine — pure logic, no UI.
//
// IMPORTANT — read before changing any constant below. This is an
// evidence-INFORMED heuristic, not a validated clinical algorithm. There
// is no published, peer-reviewed formula that converts "cumulative UV
// dose + protection behavior" into a single "skin age in years" number —
// three independent literature reviews (dosimetry, photoaging
// epidemiology, sunscreen decay science) confirmed this gap directly. What
// follows uses real, cited, standardized units and real effect sizes from
// actual studies as anchors, but the specific mapping from those numbers
// to "years" remains this app's own synthesis. Do not present this to
// users as a medical or diagnostic measurement — it's a motivational
// wellness estimate, and should be labeled as such in-product.
//
// ─── Real photobiology units (not invented ones) ───────────────────
// SED (Standard Erythemal Dose): 1 SED = 100 J/m² of erythemally-effective
// radiant exposure. Internationally standardized — CIE S 007/E-1998,
// also published as ISO 17166:1999.
//
// UV Index is itself defined (WHO/ICNIRP/CIE) as erythemally-weighted
// irradiance x 40, i.e. dose rate = UVI x 0.025 W/m². Integrated over an
// hour: UVI x 0.025 x 3600 / 100 ≈ UVI x 0.9 SED per hour of exposure at
// that index. Sources: TEMIS/KNMI satellite UV service technical notes,
// NOAA ESRL UV dose calculations, WHO "Global Solar UV Index: A Practical
// Guide" (WHO/SDE/OEH/02.2).
const SED_PER_UVI_HOUR = 0.9;

// ARPANSA (Australia's radiation protection agency) publishes ~1 SED/day
// as a public reference for a cumulative daily dose most people tolerate
// without materially elevated risk (arpansa.gov.au UV dose guidance).
// Used here as the neutral baseline rate — the UV-dose modifier responds
// to sustained exposure *above* this rate, not to raw cumulative SED
// alone, so someone who has used the app longer isn't penalized just for
// having more tracked days at the same, healthy daily rate.
const ARPANSA_SAFE_SED_PER_DAY = 1;

// Calibration anchor, not a literal transplant: a 2021 systematic review
// and meta-analysis (Scientific Reports 11:22382) found that more than
// 1 hour/day of sun exposure predicted meaningfully worse wrinkling
// (pooled OR 1.90, 95% CI 1.14–3.18) versus less exposure. At a moderate
// UV Index of ~6, that's roughly 6 x 0.9 ≈ 5.4 SED/day — about 5x the
// ARPANSA daily reference. That ratio is used below as the point where
// the UV-dose modifier reaches its cap, since that's the exposure level
// the cited study associates with clearly elevated (not marginal) risk.
// The literature does not provide a validated SED-to-years conversion;
// the mapping below is this app's own bounded heuristic.
const ELEVATED_RISK_SED_MULTIPLE = 5;
const UV_CAP_YEARS = 6;

// Gap ("unprotected") minutes accumulate real dose too. This aggregate
// only carries total gap minutes, not the UV Index during each gap, so a
// conservative moderate Index is assumed — 6, the boundary WHO's own UV
// Index guide labels "high" — consistent with this project's rule to
// always be conservative (CLAUDE.md: "deplete faster rather than
// slower"). It will not underestimate a gap's real contribution.
const ASSUMED_GAP_UVI = 6;

// Nambour Skin Cancer and Actinic Eye Disease Prevention Trial — the
// photoaging-outcome paper: Hughes MC, Williams GM, Baker P, Green AC.
// "Sunscreen and Prevention of Skin Aging: A Randomized Trial." Annals of
// Internal Medicine 2013;158(11):781–790. A real RCT (903 adults, 4.5
// years, blinded photonumeric grading): daily sunscreen users had 24%
// lower odds of increased photoaging than discretionary users (OR 0.76,
// 95% CI 0.59–0.98). Used below as the effect size for "consistent
// protection vs. not" — an approximation for "with Sureva's tracked
// behavior vs. without it," not a literal restatement of that trial's
// specific population or methodology.
const NAMBOUR_SUNSCREEN_PROTECTIVE_ODDS_RATIO = 0.76;

// User-facing convenience unit only — NOT a scientific unit; SED is.
// Modeled as roughly 6 hours at UV Index 7, a representative moderate-to
// -high beach day: 6 x 7 x 0.9 (SED_PER_UVI_HOUR) ≈ 38 SED.
const SED_PER_BEACH_DAY = 38;

export function beachDayEquivalents(totalSED) {
  return totalSED / SED_PER_BEACH_DAY;
}

function daysSinceFirstSession(firstSessionDateISO) {
  if (!firstSessionDateISO) return 1;
  const start = new Date(firstSessionDateISO);
  const days = Math.round((Date.now() - start.getTime()) / 86400000);
  return Math.max(1, days);
}

// SED accumulated during unprotected gap time, at the conservative
// assumed Index above.
function gapSED(totalGapMinutes) {
  return (totalGapMinutes / 60) * ASSUMED_GAP_UVI * SED_PER_UVI_HOUR;
}

// Bounded years-modifier from a cumulative SED total over the tracked
// period: 0 at or below the ARPANSA safe daily rate, scaling up to
// UV_CAP_YEARS at ELEVATED_RISK_SED_MULTIPLE x that rate and beyond.
function uvDoseYears(totalSED, trackedDays) {
  const dailyRate = totalSED / trackedDays;
  const ratio = dailyRate / ARPANSA_SAFE_SED_PER_DAY;
  const excess = Math.max(0, ratio - 1) / (ELEVATED_RISK_SED_MULTIPLE - 1);
  return Math.min(excess, 1) * UV_CAP_YEARS;
}

// Skin type changes real MED (UV tolerance), but a large population study
// (Tan et al., J Eur Acad Dermatol Venereol 2020;34(7):1595-1600, n =
// 22,146) found Fitzpatrick self-report correlates only loosely with
// measured MED — real but noisy (β = −0.33). Kept as a small directional
// nudge, not a precise clinical constant.
function fitzpatrickYears(fitzpatrickType) {
  if (fitzpatrickType <= 2) return 0.4;
  if (fitzpatrickType >= 5) return -0.2;
  return 0;
}

// ─── Motivational-only coaching signals ─────────────────────────────
// None of these are independently validated aging predictors, and their
// real effect on skin age is already captured above: a faster alert
// response or a longer streak means less accumulated gap SED in the
// first place. Counting them again here as separate "years" would
// double-count the same behavior. They're kept only to drive the
// encouragement copy in buildImprovementLevers below — they never
// contribute to the actual skinAge number.
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

// UV-driven aging can only add risk relative to real age — there's no
// scientific basis for sun-protection behavior making skin younger than
// chronological age, only for accumulating less photoaging than you
// otherwise would. The small negative floor allows for the Fitzpatrick
// reduction above; it is not a "you can look younger than you are" claim.
function clampAndRound(age, realAge) {
  const clamped = Math.min(Math.max(age, realAge - 1), realAge + 15);
  return Math.round(clamped * 10) / 10;
}

// Returns { skinAge, modifiers }. modifiers.uvDose and .fitzpatrick are
// what actually make up skinAge; .gaps is an informational breakdown of
// how much of uvDose came from unprotected gap time specifically; .score/
// .response/.streak are motivational-only (see note above) and are not
// summed into skinAge.
export function calculateSkinAge(profile, agg) {
  const trackedDays = daysSinceFirstSession(profile.firstSessionDate);
  const protectedSED = agg.totalUVUnits;
  const unprotectedSED = gapSED(agg.totalGapMinutes);
  const totalDoseYears = uvDoseYears(protectedSED + unprotectedSED, trackedDays);
  const gapsContribution = totalDoseYears - uvDoseYears(protectedSED, trackedDays);
  const fitzpatrick = fitzpatrickYears(profile.fitzpatrickType);

  const modifiers = {
    uvDose: totalDoseYears,
    gaps: gapsContribution,
    fitzpatrick,
    score: scoreYears(agg.avgSessionScore),
    response: responseYears(agg.avgAlertResponseMinutes),
    streak: streakYears(agg.currentStreakDays, agg.longestStreakDays),
  };
  const raw = profile.realAge + totalDoseYears + fitzpatrick;
  return { skinAge: clampAndRound(raw, profile.realAge), modifiers };
}

// "Without Sureva" counterfactual: what the dose-driven modifier would
// look like without consistent protection, scaled by the real Nambour
// trial effect size above rather than assumed max-penalty constants.
// Fitzpatrick still applies — it's skin, not behavior.
export function calculateWithoutSureva(profile, agg) {
  const trackedDays = daysSinceFirstSession(profile.firstSessionDate);
  const protectedSED = agg.totalUVUnits;
  const unprotectedSED = gapSED(agg.totalGapMinutes);
  const actualDoseYears = uvDoseYears(protectedSED + unprotectedSED, trackedDays);
  const withoutDoseYears = Math.min(
    actualDoseYears / NAMBOUR_SUNSCREEN_PROTECTIVE_ODDS_RATIO,
    UV_CAP_YEARS
  );
  const fitzpatrick = fitzpatrickYears(profile.fitzpatrickType);
  const raw = profile.realAge + withoutDoseYears + fitzpatrick;
  return clampAndRound(raw, profile.realAge);
}

// Synthetic "without Sureva" trajectory for the trend chart: there's no
// historical day-by-day counterfactual on record, only today's cumulative
// one (calculateWithoutSureva). This starts level with the real trend on
// day one — before any protection difference has had time to accumulate —
// and interpolates to today's real counterfactual value, so the two lines
// visibly diverge over the same period instead of just differing today.
export function withoutSurevaTrend(points, withoutSureva) {
  if (!points.length) return [];
  const startAge = points[0].age;
  const n = points.length;
  return points.map((p, i) => {
    const t = n > 1 ? i / (n - 1) : 1;
    return { date: p.date, age: Math.round((startAge + (withoutSureva - startAge) * t) * 10) / 10 };
  });
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
    return { status: 'red', verdict: 'Tough month: UV was high and gaps added up.' };
  }
  if (month.avgScore >= 80 && month.gapMinutes <= 60) {
    return { status: 'green', verdict: 'Good month: your habits improved your score.' };
  }
  return {
    status: 'amber',
    verdict: heavyUV
      ? 'Mixed month: heavy UV, but your protection mostly held.'
      : 'Steady month: no damage done, room to improve.',
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
        body: `You have ${Math.round(agg.totalGapMinutes)} minutes of low-protection time on record: a clean sheet. Every alert answered fast keeps this factor at +0 years.`,
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
        body: `Your ${agg.currentStreakDays}-day streak is earning you −0.5 years. One missed day resets it, so keep the chain alive.`,
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
