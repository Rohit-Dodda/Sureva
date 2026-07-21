// Pure logic for "Sun Recap" — a Spotify-Wrapped-style, fully automatic
// recap of a chapter of the user's sun-protection history. No UI, no React
// Native imports: everything here is deterministic and node-testable.
//
// The design goal is *unpredictable* composition: there's a large bank of
// insight generators, each with its own data-driven activation threshold,
// and a recap surfaces only the subset that fired for that chapter. Two
// consecutive recaps end up structurally different, not just numerically —
// which is what recreates the "I don't know what I'll get" feeling.
//
// Everything operates on a normalized session shape (see normalizeSession)
// so the screen's loader can feed it either lightweight getSessions rows or
// the richer buildCompletedSessionLike output — generators that need a
// field that isn't present simply don't fire.

const DAY = 24 * 60 * 60 * 1000;

// ─── Trigger thresholds ───────────────────────────────────────
export const RECAP_RULES = {
  minSessionsSinceLast: 10,   // matches calculateComplianceTrend's slice(-10) sample size
  activityGapDays: 14,        // a gap this long = a chapter has closed
  cooldownDays: 45,           // hard anti-spam floor between recaps
  maxPerYear: 6,              // hard annual cap
};

const DECK_MIN = 5;
const DECK_MAX = 9;

// ─── Session normalization ────────────────────────────────────

// Adapts a raw Supabase `sessions` row (snake_case) into the shape every
// generator reads. Safe on partial rows — missing fields become null/0 and
// the generators that depend on them just won't fire.
export function normalizeSession(row) {
  const water = row.water_events;
  return {
    id: row.id,
    startTime: row.start_time ? new Date(row.start_time).getTime() : 0,
    endTime: row.end_time ? new Date(row.end_time).getTime() : 0,
    durationMinutes: row.duration_minutes ?? 0,
    spf: row.spf ?? null,
    activityLevel: row.activity_level ?? null,
    environment: row.environment ?? null,
    peakUv: row.peak_uv ?? 0,
    averageUv: row.average_uv ?? 0,
    averageHumidity: row.average_humidity ?? 0,
    peakTemperature: row.peak_temperature ?? 0,
    averageDepletionRate: row.average_depletion_rate ?? 0,
    score: row.protection_score ?? 0,
    alertResponseAvg: row.alert_response_time_avg ?? null,
    alertCount: row.alert_count ?? 0,
    waterEvents: Array.isArray(water) ? water.length : (water ?? 0),
    unprotectedMinutes: row.unprotected_minutes ?? 0,
    location: row.city || row.region || row.location_name || null,
  };
}

// ─── Trigger evaluation ───────────────────────────────────────

// recapHistory: array of past recap records, each { firedAt (ms),
// chapterEnd (ms), ... }, newest-first not required. sessions: normalized,
// any order. Returns { shouldFire, reason, chapter } — chapter is the
// scoped session slice when shouldFire, else null.
export function evaluateTrigger(sessions, recapHistory = [], now = Date.now()) {
  const lastRecap = recapHistory.reduce((a, r) => (r.firedAt > (a?.firedAt ?? -1) ? r : a), null);
  const sinceMs = lastRecap ? lastRecap.chapterEnd : 0;

  const chapter = scopeChapter(sessions, sinceMs);
  if (chapter.length < RECAP_RULES.minSessionsSinceLast) {
    return { shouldFire: false, reason: 'not-enough-sessions', chapter: null };
  }

  // The chapter must have actually *closed*: the most recent session is at
  // least activityGapDays old, so we're summarizing a finished stretch, not
  // interrupting one mid-run.
  const lastSessionAt = chapter.reduce((a, s) => Math.max(a, s.startTime), 0);
  if (now - lastSessionAt < RECAP_RULES.activityGapDays * DAY) {
    return { shouldFire: false, reason: 'chapter-still-active', chapter: null };
  }

  if (lastRecap && now - lastRecap.firedAt < RECAP_RULES.cooldownDays * DAY) {
    return { shouldFire: false, reason: 'cooldown', chapter: null };
  }

  const thisYear = new Date(now).getFullYear();
  const firedThisYear = recapHistory.filter((r) => new Date(r.firedAt).getFullYear() === thisYear).length;
  if (firedThisYear >= RECAP_RULES.maxPerYear) {
    return { shouldFire: false, reason: 'annual-cap', chapter: null };
  }

  return { shouldFire: true, reason: 'ready', chapter };
}

// Sessions strictly after the previous recap's chapter end (or all, for the
// first recap), oldest-first so the narrative reads in order.
export function scopeChapter(sessions, sinceMs = 0) {
  return sessions
    .filter((s) => s.startTime > sinceMs)
    .sort((a, b) => a.startTime - b.startTime);
}

// ─── Aggregate stats over a chapter ───────────────────────────

function chapterStats(chapter, allSessions) {
  const n = chapter.length;
  const sum = (f) => chapter.reduce((a, s) => a + (f(s) || 0), 0);
  const totalMinutes = sum((s) => s.durationMinutes);
  const totalAlerts = sum((s) => s.alertCount);
  const totalWater = sum((s) => s.waterEvents);
  const totalUnprotected = sum((s) => s.unprotectedMinutes);
  const avgScore = n ? Math.round(sum((s) => s.score) / n) : 0;
  const peakUvSession = chapter.reduce((a, s) => (s.peakUv > (a?.peakUv ?? -1) ? s : a), null);
  const bestSession = chapter.reduce((a, s) => (s.score > (a?.score ?? -1) ? s : a), null);
  const longestSession = chapter.reduce((a, s) => (s.durationMinutes > (a?.durationMinutes ?? -1) ? s : a), null);

  const locations = [...new Set(chapter.map((s) => s.location).filter(Boolean))];
  const medianPeakUv = median(chapter.map((s) => s.peakUv));

  return {
    n,
    totalMinutes,
    totalHours: Math.round((totalMinutes / 60) * 10) / 10,
    totalAlerts,
    totalWater,
    totalUnprotected,
    avgScore,
    peakUvSession,
    bestSession,
    longestSession,
    locations,
    medianPeakUv,
    allSessions,
  };
}

function median(xs) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function clockDate(ms) {
  return new Date(ms).toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
}

// Pearson correlation, guarded for zero-variance inputs.
function correlation(pairs) {
  const n = pairs.length;
  if (n < 4) return 0;
  const mx = pairs.reduce((a, [x]) => a + x, 0) / n;
  const my = pairs.reduce((a, [, y]) => a + y, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (const [x, y] of pairs) {
    sxy += (x - mx) * (y - my);
    sxx += (x - mx) ** 2;
    syy += (y - my) ** 2;
  }
  if (sxx === 0 || syy === 0) return 0;
  return sxy / Math.sqrt(sxx * syy);
}

// ─── Insight generator bank ───────────────────────────────────
// Each generator receives (stats, ctx) and returns a card object or null.
// A card only appears if the data earns it, so the deck's composition
// varies chapter to chapter by construction. `significance` orders the deck
// when more cards fire than fit; `position` pins openers/finales.

const GENERATORS = [
  // ── Opener bookend: always fires. Logo draws itself in, title card, then a
  // personalized greeting — mirrored by the finale at the close. ──
  function chapterOpener(st) {
    return {
      id: 'opener',
      mechanic: 'bookend',
      kind: 'open',
      position: 'first',
      significance: 100,
      accent: 'orange',
      kicker: 'SUN RECAP',
      title: 'Your sun chapter',
      headline: st.locations.length
        ? `${st.n} sessions across ${st.locations.length} ${st.locations.length === 1 ? 'place' : 'places'}`
        : `${st.n} sessions in the sun`,
      subtext: 'Here’s how you protected your skin this chapter.',
    };
  },

  // ── Total time protected ──
  function totalTime(st) {
    if (st.totalHours < 1) return null;
    return {
      id: 'total-time',
      mechanic: 'shake',
      visual: 'meter',
      meterFrac: Math.min(1, st.totalHours / 12),
      significance: 70,
      accent: 'orange',
      kicker: 'TIME IN THE SUN',
      coveredLabel: 'Shake to reveal your hours',
      bigValue: `${st.totalHours}`,
      bigLabel: st.totalHours === 1 ? 'hour protected' : 'hours protected',
      subtext: `Across ${st.n} tracked sessions.`,
    };
  },

  // ── Places visited ──
  function placesVisited(st) {
    if (st.locations.length < 2) return null;
    const list = st.locations.slice(0, 4);
    const tail = st.locations.length > 4 ? ` and ${st.locations.length - 4} more` : '';
    return {
      id: 'places',
      mechanic: 'reveal',
      visual: 'path',
      places: st.locations,
      significance: 65,
      accent: 'navy',
      kicker: 'WHERE YOU WENT',
      headline: `You stayed covered across ${st.locations.length} places`,
      subtext: `${list.join(' · ')}${tail}.`,
    };
  },

  // ── Highest UV faced ──
  function peakUv(st) {
    if (!st.peakUvSession || st.peakUvSession.peakUv < 8) return null;
    const s = st.peakUvSession;
    return {
      id: 'peak-uv',
      mechanic: 'reveal',
      visual: 'uvscale',
      uvValue: s.peakUv,
      significance: 72,
      accent: 'danger',
      kicker: 'YOUR HARSHEST SUN',
      subtext: s.location
        ? `The strongest sun you faced — ${clockDate(s.startTime)} in ${s.location}.`
        : `The strongest sun you faced this chapter, on ${clockDate(s.startTime)}.`,
    };
  },

  // ── Reconstructed riskiest moment (scene, not stat) ──
  function riskiestMoment(st) {
    const s = st.peakUvSession;
    // Only fires when the standout day is genuinely an outlier vs the
    // chapter's own median — not just "the max by definition".
    if (!s || st.medianPeakUv <= 0 || s.peakUv < st.medianPeakUv * 1.4 || s.peakUv < 7) return null;
    if (!s.unprotectedMinutes && s.score >= 80) return null; // nothing dramatic actually happened
    return {
      id: 'riskiest-moment',
      mechanic: 'reveal',
      visual: 'depletion',
      significance: 85,
      accent: 'danger',
      kicker: 'YOUR RISKIEST DAY',
      headline: s.location ? `${clockDate(s.startTime)}, ${s.location}` : clockDate(s.startTime),
      subtext: `UV hit ${Math.round(s.peakUv)} and you spent ${Math.round(s.unprotectedMinutes)} minutes under-protected — the closest call of the chapter.`,
    };
  },

  // ── Protection personality ──
  function personality(st) {
    // Response times are only meaningful where alerts actually fired.
    const withAlerts = st.allSessions.chapter.filter((s) => s.alertCount > 0 && s.alertResponseAvg != null);
    const alertsFraction = st.n ? st.allSessions.chapter.filter((s) => s.alertCount > 0).length / st.n : 0;
    let label, blurb;
    if (alertsFraction <= 0.25) {
      label = 'The Proactive Reapplier';
      blurb = 'You mostly reapplied before an alert ever needed to fire.';
    } else if (withAlerts.length) {
      const avgResp = withAlerts.reduce((a, s) => a + s.alertResponseAvg, 0) / withAlerts.length;
      if (avgResp <= 5) {
        label = 'The Just-In-Timer';
        blurb = `When an alert fired, you answered it in about ${Math.round(avgResp)} minutes flat.`;
      } else if (avgResp >= 15) {
        label = 'The Snoozer';
        blurb = `Alerts sat for around ${Math.round(avgResp)} minutes before you reapplied — worth tightening up.`;
      } else {
        return null; // ambiguous middle — don't force a label
      }
    } else {
      return null;
    }
    const icon = label.includes('Proactive') ? 'shield-checkmark' : label.includes('Just') ? 'timer' : 'alarm';
    return {
      id: 'personality',
      mechanic: 'reveal',
      visual: 'badge',
      icon,
      significance: 80,
      accent: 'orange',
      kicker: 'YOUR PROTECTION STYLE',
      headline: label,
      subtext: blurb,
    };
  },

  // ── What drove your depletion (proxy factor breakdown) ──
  function topFactor(st) {
    if (st.n < 3) return null;
    const avg = (f) => st.allSessions.chapter.reduce((a, s) => a + (f(s) || 0), 0) / st.n;
    const scores = [
      { key: 'UV', v: avg((s) => s.peakUv) / 11 },
      { key: 'Heat', v: Math.max(0, avg((s) => s.peakTemperature) - 25) / 20 },
      { key: 'Water', v: Math.min(1, avg((s) => s.waterEvents) / 3) },
      { key: 'Activity', v: avg((s) => (s.activityLevel === 'high' ? 1 : s.activityLevel === 'moderate' ? 0.5 : 0.15)) },
    ].sort((a, b) => b.v - a.v);
    const top = scores[0];
    if (top.v <= 0) return null;
    const maxV = top.v || 1;
    return {
      id: 'top-factor',
      mechanic: 'reveal',
      visual: 'bars',
      bars: scores.map((s) => ({ label: s.key, value: Math.max(0.08, s.v / maxV) })),
      significance: 60,
      accent: 'orange',
      kicker: 'WHAT WORE YOU DOWN',
      headline: `${top.key} was your biggest depletion driver`,
      subtext: 'It stripped your protection faster than anything else this chapter.',
    };
  },

  // ── Water exposure tally ──
  function waterWarrior(st) {
    if (st.totalWater < 3) return null;
    return {
      id: 'water',
      mechanic: 'scratch',
      visual: 'waves',
      significance: 55,
      accent: 'navy',
      kicker: 'IN AND OUT OF THE WATER',
      coveredLabel: 'Scratch to reveal',
      bigValue: `${st.totalWater}`,
      bigLabel: st.totalWater === 1 ? 'water break' : 'water breaks',
      subtext: 'Each one cut into your protection the moment it happened.',
    };
  },

  // ── Compliance quiz ──
  function complianceQuiz(st) {
    if (st.totalAlerts < 3) return null;
    // Compliance across the chapter, inferred from stored alert counts:
    // sessions where alerts fired but the score stayed high indicate they
    // were answered. Use avgScore as a soft proxy for the reveal number.
    const rate = Math.max(0, Math.min(100, st.avgScore)); // proxy — kept honest as "protection score"
    const options = shuffleBands(rate);
    return {
      id: 'compliance-quiz',
      mechanic: 'quiz',
      visual: 'gauge',
      significance: 68,
      accent: 'orange',
      kicker: 'QUIZ',
      question: 'What was your average protection score this chapter?',
      options,
      correctValue: nearestBand(rate),
      bigValue: `${st.avgScore}`,
      bigLabel: 'avg score',
      revealText: `Your average protection score was ${st.avgScore}.`,
    };
  },

  // ── Best session ──
  function bestSession(st) {
    if (st.n < 3 || !st.bestSession || st.bestSession.score < 70) return null;
    const s = st.bestSession;
    return {
      id: 'best-session',
      mechanic: 'reveal',
      visual: 'ring',
      bigValue: `${s.score}`,
      bigLabel: 'protection score',
      significance: 58,
      accent: 'protected',
      kicker: 'YOUR BEST DAY',
      subtext: s.location
        ? `Your cleanest session — ${clockDate(s.startTime)} in ${s.location}.`
        : `Your cleanest session, on ${clockDate(s.startTime)}.`,
    };
  },

  // ── Longest single session ──
  function longestSession(st) {
    if (!st.longestSession || st.longestSession.durationMinutes < 120) return null;
    const mins = Math.round(st.longestSession.durationMinutes);
    const label = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
    return {
      id: 'longest',
      mechanic: 'shake',
      visual: 'meter',
      meterFrac: Math.min(1, mins / 360),
      significance: 50,
      accent: 'orange',
      kicker: 'YOUR LONGEST STRETCH',
      coveredLabel: 'Shake to reveal',
      bigValue: label,
      bigLabel: 'in one session',
      subtext: st.longestSession.location ? `Out in ${st.longestSession.location}.` : 'Impressive endurance.',
    };
  },

  // ── Self-relative UV percentile (vs the user's own year) ──
  function uvPercentile(st) {
    const year = st.allSessions.year;
    if (!year || year.length < 8 || !st.peakUvSession) return null;
    const mine = st.peakUvSession.peakUv;
    const below = year.filter((s) => s.peakUv < mine).length;
    const pct = Math.round((below / year.length) * 100);
    if (pct < 70) return null; // only interesting when it's a standout
    return {
      id: 'uv-percentile',
      mechanic: 'scratch',
      visual: 'percentile',
      meterFrac: pct / 100,
      significance: 62,
      accent: 'danger',
      kicker: 'A STANDOUT',
      coveredLabel: 'Scratch to reveal',
      bigValue: `${pct}%`,
      bigLabel: 'of your year was milder',
      subtext: `Your harshest day this chapter beat ${pct}% of all your other sessions this year.`,
    };
  },

  // ── Unexpected correlation ──
  function correlationCard(st) {
    const pairs = st.allSessions.chapter.map((s) => [s.peakUv, s.score]);
    const r = correlation(pairs);
    if (r > -0.45) return null; // only fires on a real, negative UV↔score link
    return {
      id: 'correlation',
      mechanic: 'reveal',
      visual: 'scatter',
      significance: 66,
      accent: 'navy',
      kicker: 'A PATTERN WE SPOTTED',
      headline: 'Higher UV, lower scores',
      subtext: 'Your protection scores dropped noticeably on your highest-UV days — those are the sessions to plan harder for.',
    };
  },

  // ── Chapter vs the previous recap ──
  function chapterVsLast(st) {
    const prev = st.allSessions.prevRecap;
    if (!prev || prev.avgScore == null) return null;
    const delta = st.avgScore - prev.avgScore;
    if (Math.abs(delta) < 4) return null;
    return {
      id: 'vs-last',
      mechanic: 'reveal',
      visual: 'compare',
      bars: [
        { label: 'Last', value: Math.max(0.08, prev.avgScore / 100) },
        { label: 'This', value: Math.max(0.08, st.avgScore / 100), highlight: true },
      ],
      significance: 64,
      accent: delta > 0 ? 'protected' : 'warning',
      kicker: 'SINCE YOUR LAST RECAP',
      headline: delta > 0 ? `Up ${delta} points` : `Down ${Math.abs(delta)} points`,
      subtext: delta > 0
        ? 'Your average protection score improved since last time — keep it going.'
        : 'Your average protection score slipped since last time — worth a reset.',
    };
  },

  // ── Finale bookend: mirrors the opener — the signature mark redraws, the
  // average score flips up, and the chapter badge lands. ──
  function finale(st) {
    const tier = st.avgScore >= 85 ? { name: 'Sun-Smart', accent: 'protected' }
      : st.avgScore >= 65 ? { name: 'Well Covered', accent: 'orange' }
      : { name: 'Room to Grow', accent: 'warning' };
    return {
      id: 'finale',
      mechanic: 'bookend',
      kind: 'close',
      bigValue: `${st.avgScore}`,
      bigLabel: 'average score',
      position: 'last',
      significance: 90,
      accent: tier.accent,
      kicker: 'YOUR CHAPTER BADGE',
      title: 'That’s your chapter',
      headline: tier.name,
      subtext: 'Share your recap and start your next chapter.',
    };
  },
];

// Quiz band helpers: turn a real value into a multiple-choice set of 20-pt
// bands with the correct one included.
function nearestBand(v) {
  const lo = Math.max(0, Math.min(80, Math.floor(v / 20) * 20));
  return `${lo}–${lo + 20}`;
}
function shuffleBands(v) {
  const correct = nearestBand(v);
  const all = ['0–20', '20–40', '40–60', '60–80', '80–100'];
  const others = all.filter((b) => b !== correct);
  // deterministic pick of 3 distractors + correct, then a stable shuffle by
  // value so the option order isn't always low→high.
  const picks = [correct, ...others.slice(0, 3)];
  return picks
    .map((label) => ({ label: `${label}`, value: label }))
    .sort((a, b) => (a.value > b.value ? 1 : -1));
}

// ─── Signature glyphs + anticipation bridges ──────────────────

// Maps a card to the name of the signature glyph the transition layer morphs
// through. Names resolve to shapes in the player's glyph registry; the
// opener and finale share 'sun' so the deck opens and closes on the same mark.
const MORPH_BY_ID = {
  opener: 'sun',
  'total-time': 'ring',
  places: 'pin',
  'peak-uv': 'flame',
  'riskiest-moment': 'flame',
  personality: 'shield',
  'top-factor': 'chart',
  water: 'drop',
  'compliance-quiz': 'shield',
  'best-session': 'check',
  longest: 'ring',
  'uv-percentile': 'star',
  correlation: 'chart',
  'vs-last': 'chart',
  finale: 'sun',
};

function morphIconFor(card) {
  return MORPH_BY_ID[card.id] ?? 'sun';
}

// The number-reveal cards that earn a run-up card in front of them.
const BRIDGE_BEFORE = new Set([
  'total-time', 'longest', 'water', 'compliance-quiz', 'uv-percentile', 'finale',
]);

function bridgeTeaser(next) {
  switch (next.id) {
    case 'total-time': return 'Add up all your time in the sun…';
    case 'longest': return 'Your single longest stretch out there…';
    case 'water': return 'Every time you hit the water…';
    case 'compliance-quiz': return 'Time to test yourself…';
    case 'uv-percentile': return 'And how your harshest day ranks…';
    case 'finale': return 'And your chapter score is…';
    default: return 'Here’s what’s coming up…';
  }
}

function makeBridge(next) {
  return {
    id: `bridge-${next.id}`,
    mechanic: 'bridge',
    accent: next.accent,
    kicker: next.id === 'finale' ? 'ONE LAST THING' : 'COMING UP',
    teaser: bridgeTeaser(next),
    morphIcon: next.morphIcon ?? morphIconFor(next),
    durationMs: 2400,
  };
}

// Inserts up to two bridge cards ahead of eligible reveals. The finale always
// gets one when present (the marquee run-up); one more goes to the earliest
// other eligible card, so a short deck stays tight and a rich one gets rhythm.
function injectBridges(cards) {
  const eligible = cards.filter((c) => BRIDGE_BEFORE.has(c.id));
  const chosen = [];
  const finaleCard = eligible.find((c) => c.id === 'finale');
  if (finaleCard) chosen.push(finaleCard);
  for (const c of eligible) {
    if (chosen.length >= 2) break;
    if (!chosen.includes(c)) chosen.push(c);
  }
  const chosenIds = new Set(chosen.map((c) => c.id));

  const out = [];
  for (const c of cards) {
    if (chosenIds.has(c.id)) out.push(makeBridge(c));
    out.push(c);
  }
  return out;
}

// ─── Recap assembly ───────────────────────────────────────────

// Builds the full recap object from a chapter. `context` carries the year's
// sessions (for self-percentile) and the previous recap summary (for
// chapter-over-chapter). Returns the persisted-ready recap record.
export function buildRecap(chapter, { yearSessions = [], prevRecap = null } = {}, now = Date.now()) {
  const st = chapterStats(chapter, {
    chapter,
    year: yearSessions,
    prevRecap,
  });

  const fired = GENERATORS.map((g) => g(st)).filter(Boolean);

  // Order: pinned opener first, pinned finale last, the rest by significance
  // capped to the deck size.
  const first = fired.filter((c) => c.position === 'first');
  const last = fired.filter((c) => c.position === 'last');
  const middle = fired
    .filter((c) => c.position !== 'first' && c.position !== 'last')
    .sort((a, b) => b.significance - a.significance)
    .slice(0, DECK_MAX - first.length - last.length);

  const ordered = [...first, ...middle, ...last];

  // Each card carries a signature glyph name; the player morphs one card's
  // glyph into the next at transitions instead of hard-cutting.
  for (const c of ordered) c.morphIcon = c.morphIcon ?? morphIconFor(c);

  // Slot short anticipation "bridge" cards ahead of the big number reveals,
  // so a stat's icon scene and its number land as a setup-then-payoff beat.
  const cards = injectBridges(ordered);

  const chapterStart = chapter.length ? chapter[0].startTime : now;
  const chapterEnd = chapter.length ? chapter[chapter.length - 1].startTime : now;

  return {
    id: `recap-${now}`,
    firedAt: now,
    chapterStart,
    chapterEnd,
    dominantLocation: mostCommon(chapter.map((s) => s.location).filter(Boolean)),
    dateRangeLabel: rangeLabel(chapterStart, chapterEnd),
    avgScore: st.avgScore,
    cardCount: cards.length,
    // A compact summary persisted for the NEXT recap's chapter-vs-last card.
    summary: { avgScore: st.avgScore, totalHours: st.totalHours, n: st.n },
    cards,
  };
}

export function hasEnoughForDeck(recap) {
  return recap.cards.length >= DECK_MIN;
}

function mostCommon(xs) {
  if (!xs.length) return null;
  const counts = new Map();
  for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function rangeLabel(startMs, endMs) {
  const s = new Date(startMs);
  const e = new Date(endMs);
  const opts = { month: 'short', day: 'numeric' };
  const sameYear = s.getFullYear() === e.getFullYear();
  const left = s.toLocaleDateString(undefined, opts);
  const right = e.toLocaleDateString(undefined, sameYear ? opts : { ...opts, year: 'numeric' });
  return left === right ? `${left}, ${e.getFullYear()}` : `${left} – ${right}, ${e.getFullYear()}`;
}
