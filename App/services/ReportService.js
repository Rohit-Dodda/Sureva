import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
// Narrative fallback ONLY — the exact same still-mock insight prose the
// live Insights screen shows today (see InsightsService.js's header note on
// which fields are real vs. not-yet-wired). Every field the real signed-in
// user has actual data for (profile, lifetime numbers, sensitivities, top
// culprit, risk combo, computed Skin Age, full session log) is sourced from
// Supabase below and overrides this — so this report matches, field-for-
// field, what the user sees in-app rather than a hardcoded persona.
import mockData from '../constants/mockData';
import { calculateSkinAge, calculateWithoutSureva } from './SkinAgeService';
import SupabaseService from './SupabaseService';
import { buildComputedInsights } from './InsightsService';
import {
  buildCompletedSessionLike,
  buildSessionHero,
  estimateSedFromHero,
} from './SessionDetailMapper';
import { engineProfileFor } from '../components/activeSession/sessionMath';
import { AGE_RANGES, BURN_OPTIONS, SKIN_TYPES } from '../constants/onboardingOptions';

// A personal "Your Sun Profile" report — everything Sureva has learned about
// the user: who they are (including the clinical-adjacent onboarding
// answers a doctor or another AI would actually need), their numbers,
// trends, patterns, computed Skin Age, and what it means. A machine-
// readable data block closes the report so another chatbot can read the
// numbers precisely instead of re-parsing prose. The full session-by-
// session log is optional (includeFullLog) since it can run long.

const FITZPATRICK_LABELS = {
  1: 'Always burns, never tans',
  2: 'Usually burns, tans minimally',
  3: 'Sometimes burns mildly, tans gradually',
  4: 'Rarely burns, tans well',
  5: 'Very rarely burns, tans very easily',
  6: 'Never burns',
};
const ROMAN = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI' };

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function todayStr() {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// ─── Real-data assembly ───────────────────────────────────────────
// Mirrors the exact real-data patterns already established in the app:
// engineProfileFor()/getUserProfile for the profile, InsightsService's
// buildComputedInsights over SessionDetailMapper's completedSession-like
// rows for the numbers (same as InsightsScreen), and SkinAgeService over
// real aggregates (same as SkinAgeScreen).

// Context-shaped profile (camelCase) that engineProfileFor + fallbackRealAge
// expect — built from the raw Supabase `users` row exactly the way
// AuthContext maps it, so depletion/Fitzpatrick math here matches the app.
function toCtxProfile(row) {
  if (!row) return null;
  return {
    skinTone: row.skin_tone ?? null,
    ageRange: row.age_range ?? null,
    skinType: row.skin_type ?? null,
    burnRate: row.burn_rate ?? null,
    medications: !!row.medications,
    skinCondition: !!row.skin_condition,
    exactAge: row.exact_age ?? null,
  };
}

// Same coarse age-range → realAge fallback SkinAgeScreen uses (age_range is
// an onboarding bucket; exactAge always wins when present).
const AGE_RANGE_MIDPOINTS = { 0: 10, 1: 31, 2: 57, 3: 70 };
function fallbackRealAge(ctxProfile) {
  if (ctxProfile?.exactAge != null) return ctxProfile.exactAge;
  return AGE_RANGE_MIDPOINTS[ctxProfile?.ageRange] ?? 30;
}

// All-time aggregates across every recorded session — mirrors
// SkinAgeScreen.buildRealAggregates exactly (that helper isn't exported).
function buildRealAggregates(sessions) {
  const totalUVUnits = sessions.reduce((a, s) => a + estimateSedFromHero(s), 0);
  const totalGapMinutes = sessions.reduce((a, s) => a + (s.unprotected_minutes ?? 0), 0);
  const avgSessionScore = sessions.reduce((a, s) => a + (s.protection_score ?? 0), 0) / sessions.length;
  const responseTimes = sessions.map((s) => s.alert_response_time_avg).filter((v) => v != null);
  const avgAlertResponseMinutes = responseTimes.length
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : null;

  const days = [...new Set(sessions.map((s) => new Date(s.start_time).toISOString().slice(0, 10)))].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const gapDays = Math.round((new Date(days[i]) - new Date(days[i - 1])) / 86400000);
    run = gapDays === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  const daysSinceLast = Math.round((Date.now() - new Date(days[days.length - 1])) / 86400000);
  const currentStreakDays = daysSinceLast <= 1 ? run : 0;

  return {
    totalUVUnits: Math.round(totalUVUnits * 100) / 100,
    totalGapMinutes: Math.round(totalGapMinutes),
    avgSessionScore: Math.round(avgSessionScore),
    avgAlertResponseMinutes: avgAlertResponseMinutes != null ? Math.round(avgAlertResponseMinutes * 10) / 10 : null,
    currentStreakDays,
    longestStreakDays: longest,
  };
}

// Best/worst by real protection score, labeled off the real session hero.
function bestWorstFrom(sessions, fitzpatrickType) {
  if (!sessions.length) return { best: null, worst: null };
  const scored = sessions.map((row) => {
    const h = buildSessionHero(row, fitzpatrickType);
    return { score: h.score, text: `${h.date} · ${h.location}` };
  });
  const best = scored.reduce((a, b) => (b.score > a.score ? b : a));
  const worst = scored.reduce((a, b) => (b.score < a.score ? b : a));
  return { best, worst };
}

// Fetches the real profile + sessions, computes real insights (the same way
// InsightsScreen does) and a real Skin Age (the same way SkinAgeScreen does),
// and assembles the single data object every section builder reads from.
// Throws on a hard fetch failure so generateReport surfaces the friendly
// error; a signed-in user with zero completed sessions is NOT a failure —
// the report still generates, just with the session-dependent sections
// gracefully noted as "needs more sessions."
async function buildReportData(uid) {
  if (!uid) throw new Error('Not signed in');

  const [profileRes, sessionsRes] = await Promise.all([
    SupabaseService.getUserProfile(uid),
    SupabaseService.getSessions(uid),
  ]);
  if (profileRes.error) throw profileRes.error;

  const row = profileRes.data ?? {};
  const ctxProfile = toCtxProfile(row);
  const engineProfile = engineProfileFor({}, ctxProfile ?? {});
  const fitzpatrickType = engineProfile.fitzpatrickType;

  // Most-recent-first completed sessions (hero-level columns).
  const sessions = sessionsRes.error ? [] : (sessionsRes.data ?? []);
  const hasSessions = sessions.length > 0;

  // Real computed numbers — same N+1 getSessionById → completedSession-like →
  // buildComputedInsights pipeline InsightsScreen uses. Rows without joined
  // readings can't be reconstructed, so they're filtered out (buildComputed-
  // Insights is safe on an empty array — see calculateLifetimeStats guards).
  let built = [];
  if (hasSessions) {
    const fullRows = await Promise.all(
      sessions.map((r) =>
        SupabaseService.getSessionById(r.id)
          .then(({ data }) => (data ? buildCompletedSessionLike(data, engineProfile) : null))
          .catch(() => null)
      )
    );
    built = fullRows.filter(Boolean);
  }
  const computed = buildComputedInsights(built);

  // Real numbers merged over the still-mock narrative prose — the exact same
  // object InsightsScreen renders its cards from (see InsightsScreen.js).
  const insights = {
    ...mockData.insights,
    sessionsAnalyzed: computed.sessionsAnalyzed,
    history: {
      ...mockData.insights.history,
      stats: computed.stats,
      alerts: computed.alerts,
      water: computed.water,
    },
    skinProfile: {
      ...mockData.insights.skinProfile,
      sensitivities: computed.sensitivities ?? mockData.insights.skinProfile.sensitivities,
    },
    patterns: {
      ...mockData.insights.patterns,
      topCulprit: computed.topCulprit ?? mockData.insights.patterns.topCulprit,
      riskCombo: computed.riskCombo ?? mockData.insights.patterns.riskCombo,
    },
  };

  // Real Skin Age — computed only when there's real session history to build
  // aggregates from (mirrors SkinAgeScreen's hasRealSessions gate). A brand-
  // new user's report omits it with a note rather than showing a persona.
  let skinAge = null;
  if (hasSessions) {
    const firstSessionDate = sessions.reduce(
      (min, s) => (s.start_time < min ? s.start_time : min),
      sessions[0].start_time
    );
    const skinAgeProfile = {
      realAge: fallbackRealAge(ctxProfile),
      fitzpatrickType,
      firstSessionDate,
    };
    const agg = buildRealAggregates(sessions);
    const { skinAge: computedAge, modifiers } = calculateSkinAge(skinAgeProfile, agg);
    skinAge = {
      realAge: skinAgeProfile.realAge,
      firstSessionDate,
      value: computedAge,
      withoutSureva: calculateWithoutSureva(skinAgeProfile, agg),
      modifiers,
    };
  }

  const { best, worst } = bestWorstFrom(sessions, fitzpatrickType);

  // Display strings for the medical summary, mapped from the raw onboarding
  // columns the same way the in-app profile screens label them.
  const ageRangeLabel = AGE_RANGES.find((a) => a.id === row.age_range)?.label ?? 'Not specified';
  const burn = BURN_OPTIONS.find((b) => b.id === row.burn_rate);
  const burnLabel = burn ? (burn.sub ? `${burn.label} — ${burn.sub}` : burn.label) : 'Not specified';
  const skinTypeLabel = SKIN_TYPES.find((t) => t.id === row.skin_type)?.label ?? 'Not specified';
  const skinToneLabel = row.skin_tone != null
    ? `Shade ${row.skin_tone} of 6 (1 = lightest, 6 = deepest)`
    : 'Not specified';

  const latest = hasSessions ? buildSessionHero(sessions[0], fitzpatrickType) : null;
  const sunscreenLabel = latest && latest.spf != null
    ? `SPF ${latest.spf}${latest.waterResistance != null ? `, water-resistant (${latest.waterResistance} min rated)` : ''}`
    : 'Not recorded yet';

  const name = `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() || 'Sureva User';

  return {
    name,
    fitzpatrickType,
    ageLabel: row.exact_age != null ? String(row.exact_age) : ageRangeLabel,
    profile: {
      ageRangeLabel,
      exactAge: row.exact_age ?? null,
      skinToneLabel,
      burnLabel,
      skinTypeLabel,
      medicationsText: row.medications ? 'Photosensitizing medications reported' : 'None reported',
      skinConditionText: row.skin_condition ? 'Skin condition reported' : 'None reported',
      sunscreenLabel,
    },
    insights,
    skinAge,
    best,
    worst,
    sessions,
    fitzLabel: FITZPATRICK_LABELS[fitzpatrickType] ?? '',
  };
}

// ─── Section builders ─────────────────────────────────────────
// Each takes the assembled report data `d` and reads real values from it,
// never the module-level mock imports.

function headerHtml(d) {
  return `
    <div class="rep-header">
      <div class="logo">SUREVA</div>
      <div class="rep-title">Your Sun Profile</div>
    </div>
    <div class="profile-line">
      <span><strong>${esc(d.name)}</strong></span>
      <span>Age ${esc(d.ageLabel)}</span>
      <span>Fitzpatrick Type ${ROMAN[d.fitzpatrickType] ?? '—'}</span>
      <span>${d.insights.sessionsAnalyzed} sessions analyzed</span>
      <span>Generated ${esc(todayStr())}</span>
    </div>
    <hr class="rule" />`;
}

// Everything a doctor would ask at an appointment: skin type, burn
// pattern, medications, conditions — self-reported at onboarding, not
// clinically verified, and labeled as such.
function medicalSummaryHtml(d) {
  const p = d.profile;
  return `
    <h2>Medical Summary</h2>
    <table class="kv">
      <tr><td class="k">Reported age</td><td>${esc(p.exactAge != null ? String(p.exactAge) : p.ageRangeLabel)}</td></tr>
      <tr><td class="k">Fitzpatrick skin type</td><td>Type ${ROMAN[d.fitzpatrickType] ?? '—'}: ${esc(d.fitzLabel)}</td></tr>
      <tr><td class="k">Skin tone / burn response</td><td>${esc(p.skinToneLabel)}</td></tr>
      <tr><td class="k">Typical burn/tan pattern</td><td>${esc(p.burnLabel)}</td></tr>
      <tr><td class="k">Skin type (oiliness)</td><td>${esc(p.skinTypeLabel)}</td></tr>
      <tr><td class="k">Medications</td><td>${esc(p.medicationsText)}</td></tr>
      <tr><td class="k">Skin conditions</td><td>${esc(p.skinConditionText)}</td></tr>
      <tr><td class="k">Typical sunscreen used</td><td>${esc(p.sunscreenLabel)}</td></tr>
    </table>
    <p class="note">Self-reported at onboarding; not clinically verified. Share alongside your own history for a doctor's full picture.</p>`;
}

function aboutYouHtml(d) {
  return `
    <h2>The Short Version</h2>
    <p class="lead">${esc(d.insights.aiRead)}</p>`;
}

// Computed live from SkinAgeService off the user's real session aggregates —
// the same numbers the Skin Age screen shows. Omitted with a note when the
// user has no completed sessions yet to compute it from.
function skinAgeHtml(d) {
  const sa = d.skinAge;
  if (!sa) {
    return `
    <h2>Skin Age Model</h2>
    <p>Your Skin Age is computed from the UV dose accumulated across your recorded sessions.
    No completed sessions are on record yet, so this section unlocks once you've logged your first one.</p>`;
  }
  const m = sa.modifiers;
  const sign = (n) => (n >= 0 ? '+' : '');
  const startDate = new Date(sa.firstSessionDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return `
    <h2>Skin Age Model</h2>
    <p>Sureva's evidence-informed model estimates a <strong>Skin Age of ${sa.value}</strong> against
    a tracked age of ${sa.realAge}, derived from accumulated UV dose since ${esc(startDate)}.
    This can only add photoaging risk relative to tracked age, never subtract below it. There is no
    scientific basis for a below-real-age result, only for accumulating less added photoaging than
    unprotected behavior would produce.</p>
    <table class="kv">
      <tr><td class="k">Tracked age (model input)</td><td>${sa.realAge}</td></tr>
      <tr><td class="k">Computed Skin Age</td><td><strong>${sa.value}</strong></td></tr>
      <tr><td class="k">Projected Skin Age without Sureva</td><td>${sa.withoutSureva}</td></tr>
      <tr><td class="k">UV-dose contribution</td><td>${sign(m.uvDose)}${m.uvDose.toFixed(1)} yrs (of which ${m.gaps.toFixed(1)} yrs from unprotected gaps)</td></tr>
      <tr><td class="k">Fitzpatrick adjustment</td><td>${sign(m.fitzpatrick)}${m.fitzpatrick.toFixed(1)} yrs</td></tr>
    </table>
    <p class="note">Behavioral factors (session consistency, alert response time) are tracked as
    separate habit indicators and are not summed into the Skin Age number above.</p>`;
}

function yourNumbersHtml(d) {
  const i = d.insights;
  const cards = i.history.stats
    .map((s) => `<div class="stat"><div class="stat-val">${esc(s.value)}</div><div class="stat-label">${esc(s.label)}</div></div>`)
    .join('');
  const best = d.best;
  const worst = d.worst;
  const bestWorst = (best && worst)
    ? `<table class="kv">
      <tr><td class="k">Best session</td><td><strong>${best.score}/100</strong>: ${esc(best.text)}</td></tr>
      <tr><td class="k">Hardest session</td><td><strong>${worst.score}/100</strong>: ${esc(worst.text)}</td></tr>
    </table>`
    : '';
  return `
    <h2>Your Numbers</h2>
    <div class="stat-grid">${cards}</div>
    <p>${esc(i.history.medContext)}</p>
    <p>${esc(i.history.alerts)} ${esc(i.history.water)}</p>
    ${bestWorst}`;
}

function yourSkinHtml(d) {
  const i = d.insights;
  const bars = i.skinProfile.sensitivities
    .map(
      (s) => `
      <div class="bar-row">
        <div class="bar-label">${esc(s.label)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${s.value}%"></div></div>
        <div class="bar-val">${s.value}</div>
      </div>`
    )
    .join('');
  return `
    <h2>Your Skin</h2>
    <p>Sureva's model has learned that your skin depletes sunscreen
    <strong>${i.skinProfile.heroPct}% ${esc(i.skinProfile.heroLine)}</strong>.
    ${esc(i.skinProfile.population)}</p>
    <p><strong>Your calm-day baseline.</strong> ${esc(i.skinProfile.baseline)}</p>
    <h3>What your skin reacts to most</h3>
    <div class="bars">${bars}</div>
    <p class="note">${esc(i.skinProfile.modelAccuracy)}</p>`;
}

// Monthly depletion-rate line for the year so far.
function seasonalChartSvg(i) {
  const months = i.seasonal.months;
  const W = 640, H = 180, PAD = 36;
  const known = months.filter((m) => m.rate != null);
  const maxRate = Math.max(...known.map((m) => m.rate), 0.8);
  const x = (idx) => PAD + (idx / (months.length - 1)) * (W - 2 * PAD);
  const y = (rate) => H - PAD - (rate / maxRate) * (H - 2 * PAD);
  const pts = months
    .map((m, idx) => (m.rate != null ? `${x(idx).toFixed(1)},${y(m.rate).toFixed(1)}` : null))
    .filter(Boolean)
    .join(' ');
  const dots = months
    .map((m, idx) =>
      m.rate != null
        ? `<circle cx="${x(idx).toFixed(1)}" cy="${y(m.rate).toFixed(1)}" r="2.6" fill="#FF5A1F"/>`
        : ''
    )
    .join('');
  const labels = months
    .map((m, idx) => `<text x="${x(idx).toFixed(1)}" y="${H - 12}" font-size="9" fill="#777" text-anchor="middle">${esc(m.m)}</text>`)
    .join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg">
    <line x1="${PAD}" y1="${H - PAD}" x2="${W - PAD}" y2="${H - PAD}" stroke="#ddd" stroke-width="0.5"/>
    <polyline points="${pts}" fill="none" stroke="#FF5A1F" stroke-width="1.8"/>
    ${dots}${labels}
    <text x="${PAD - 6}" y="${PAD + 4}" font-size="9" fill="#777" text-anchor="end">high</text>
    <text x="${PAD - 6}" y="${H - PAD}" font-size="9" fill="#777" text-anchor="end">low</text>
  </svg>`;
}

function yourTrendsHtml(d) {
  const i = d.insights;
  return `
    <h2>Your Trends</h2>
    <h3>Depletion rate through the year</h3>
    ${seasonalChartSvg(i)}
    <p>${esc(i.seasonal.yoy)}</p>
    <p><strong>Your riskiest stretch.</strong> ${esc(i.seasonal.highestRiskMonth)}</p>
    <p><strong>Where you're heading.</strong> ${esc(mockData.trends.year.insight)}</p>
    <p><strong>Getting better.</strong> ${esc(i.history.trend)} ${esc(i.compliance.responseTrend)}</p>
    <p class="note">${esc(i.seasonal.complianceShift)}</p>`;
}

function yourPatternsHtml(d) {
  const i = d.insights;
  return `
    <h2>Your Patterns</h2>
    <p><strong>What depletes you most.</strong> ${esc(i.patterns.topCulprit)}</p>
    <p><strong>Your high-risk window.</strong> ${esc(i.patterns.riskWindow.text)} ${esc(i.patterns.riskCombo)}</p>
    <p><strong>How you respond.</strong> ${esc(i.compliance.fastSlow)} ${esc(i.compliance.ignoreCondition)}</p>
    <p><strong>Reapplication.</strong> ${esc(i.patterns.firstReapply)} ${esc(i.patterns.reapplyWindow)}</p>
    <p><strong>Your weak spot.</strong> ${esc(i.patterns.weakSpot)} ${esc(i.compliance.flag)}</p>
    <table class="kv">
      <tr><td class="k">Current streak</td><td>${i.compliance.currentStreak} sessions</td></tr>
      <tr><td class="k">Best streak</td><td>${i.compliance.bestStreak} sessions</td></tr>
    </table>`;
}

function yourSunscreenHtml(d) {
  const i = d.insights;
  return `
    <h2>Your Sunscreen</h2>
    <p>Across your sessions, your sunscreen performed like an
    <strong>effective SPF ${i.sunscreen.observed}</strong> against a labeled
    SPF ${i.sunscreen.labeled}. ${esc(i.sunscreen.effectiveLine)}</p>
    <p><strong>Wet vs dry.</strong> ${esc(i.sunscreen.waterVsDry)} ${esc(i.sunscreen.waterResistance)}</p>
    <p><strong>Heat.</strong> ${esc(i.sunscreen.heat)}</p>`;
}

function yourBodyHtml(d) {
  const i = d.insights;
  const rows = i.body.thresholds
    .map((t) => `<tr><td class="k">${esc(t.label)}: ${esc(t.value)}</td><td>${esc(t.note)}</td></tr>`)
    .join('');
  return `
    <h2>Your Body</h2>
    <p>${esc(i.body.sweat)}</p>
    <p>${esc(i.body.activityImpact)}</p>
    <h3>The points where your protection starts to slip</h3>
    <table class="kv">${rows}</table>`;
}

function yourOutlookHtml(d) {
  const i = d.insights;
  const pct = Math.round((i.risk.monthDose.current / i.risk.monthDose.limit) * 100);
  return `
    <h2>Your Outlook</h2>
    <p>${esc(i.risk.monthDose.line)}</p>
    <div class="bar-row">
      <div class="bar-label">This month</div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
      <div class="bar-val">${i.risk.monthDose.current}/${i.risk.monthDose.limit}</div>
    </div>
    <p><strong>Projected for the year.</strong> ${esc(i.risk.projected)}</p>
    <p><strong>Your skin's clock.</strong> ${esc(i.risk.skinAge)}</p>
    <p><strong>Overall trend: ${esc(i.risk.trend.label)}.</strong> ${esc(i.risk.trend.text)}</p>`;
}

function whatToDoHtml(d) {
  const i = d.insights;
  return `
    <h2>What Would Help You Most</h2>
    <p><strong>Step up your SPF.</strong> ${esc(i.sunscreen.recommendation)} For your summer depletion rate, ${esc(i.seasonal.spfReco)}</p>
    <p><strong>Reapply on a clock, not on a feeling.</strong> ${esc(i.patterns.reapplyWindow)} Treat every exit from water as an automatic reapplication.</p>
    <p><strong>Mind your one vulnerable scenario.</strong> ${esc(i.risk.vulnerableType)} That single situation is where most of your risk lives.</p>`;
}

// Every session, not just the best/worst two narrated elsewhere — for a
// doctor or anyone reviewing the whole history rather than the highlights.
// Sourced from the user's real Supabase session rows.
function fullSessionLogHtml(d) {
  const sessions = [...d.sessions].sort((a, b) => (a.start_time < b.start_time ? 1 : -1));
  if (!sessions.length) {
    return `
    <h2>Full Session Log</h2>
    <p class="note">No sessions recorded yet. Your session-by-session history will appear here once you've logged your first outdoor session.</p>`;
  }
  const rows = sessions
    .map((row) => {
      const h = buildSessionHero(row, d.fitzpatrickType);
      const activity = row.activity_level ? esc(cap(row.activity_level)) : 'N/A';
      const resp = row.alert_response_time_avg != null ? `${row.alert_response_time_avg} min` : 'N/A';
      const gap = (row.unprotected_minutes ?? 0) > 0 ? 'Yes' : 'No';
      return `
      <tr>
        <td>${esc(h.date)}</td>
        <td>${esc(h.location)}</td>
        <td>${esc(h.duration)}</td>
        <td>${h.peakUV}</td>
        <td>${h.score}/100</td>
        <td>${activity}</td>
        <td>${resp}</td>
        <td>${gap}</td>
      </tr>`;
    })
    .join('');
  return `
    <h2>Full Session Log</h2>
    <p class="note">Every recorded session (${sessions.length} total), most recent first.</p>
    <table class="log">
      <thead>
        <tr>
          <th>Date</th><th>Location</th><th>Duration</th><th>Peak UV</th>
          <th>Score</th><th>Activity</th><th>Alert response</th><th>Protection gap</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function methodologyHtml(d) {
  const i = d.insights;
  return `
    <h2>Methodology &amp; Data Provenance</h2>
    <p>This profile is built from your Sureva wearable, which measures UV index, temperature, humidity,
    motion/activity, and water contact every 30 seconds during a session, plus a depletion model calibrated
    to your skin across ${i.sessionsAnalyzed} sessions.</p>
    <p><strong>Units.</strong> 1 SED (Standard Erythemal Dose) = 100 J/m² of erythemally-weighted UV.
    1 MED (Minimal Erythemal Dose) is the UV dose expected to just barely redden a given skin type's
    skin — it varies by Fitzpatrick type, so "MEDs accumulated" in this report is already scaled to
    your reported skin type, not a population average.</p>
    <p><strong>Combined-conditions model.</strong> Heat, humidity, and activity are modeled jointly (via a
    WBGT-style heat-stress index combined with activity intensity) rather than as independent multipliers,
    since they share the same underlying mechanism — sweat-driven sunscreen wash-off.</p>
    <p class="note">This is your personal summary, generated from self-reported onboarding answers and
    sensor-derived session data. The model errs conservative on purpose. This is not medical advice and
    has not been reviewed by a clinician.</p>`;
}

// A compact, labeled key:value block so another AI/chatbot (or a doctor's
// EHR-adjacent tool) can read the exact figures precisely instead of
// re-parsing the prose above. Built from the same real objects the rest of
// this report reads from, so it can't drift out of sync with them.
function structuredDataHtml(d) {
  const i = d.insights;
  const p = d.profile;

  const data = {
    generatedAt: new Date().toISOString(),
    name: d.name,
    profile: {
      age: p.exactAge != null ? p.exactAge : p.ageRangeLabel,
      fitzpatrickType: `Type ${ROMAN[d.fitzpatrickType] ?? '—'}`,
      skinTone: p.skinToneLabel,
      burnRate: p.burnLabel,
      skinTypeOiliness: p.skinTypeLabel,
      medications: p.medicationsText,
      skinConditions: p.skinConditionText,
    },
    skinAge: d.skinAge
      ? {
        trackedAge: d.skinAge.realAge,
        computed: d.skinAge.value,
        projectedWithoutSureva: d.skinAge.withoutSureva,
        modifiers: d.skinAge.modifiers,
      }
      : 'Not enough session data yet',
    lifetime: {
      sessionsAnalyzed: i.sessionsAnalyzed,
      stats: Object.fromEntries(i.history.stats.map((s) => [s.label, s.value])),
      bestSession: d.best,
      hardestSession: d.worst,
    },
    sunscreen: {
      typicalUsed: p.sunscreenLabel,
    },
    skinSensitivities: i.skinProfile.sensitivities,
  };

  return `
    <h2>Structured Data (for AI / clinical tools)</h2>
    <p class="note">The figures above, restated as machine-readable key:value data.</p>
    <pre class="datablock">${esc(JSON.stringify(data, null, 2))}</pre>`;
}

// ─── Public API ───────────────────────────────────────────────

export function buildReportHtml(d, { includeFullLog = false } = {}) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
  <style>
    @page { margin: 48px 44px 56px 44px; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1A1712; font-size: 11px; line-height: 1.6; }
    h2 { font-family: Georgia, 'Times New Roman', serif; font-size: 17px; font-weight: 600; color: #1A1712; margin: 26px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #FF5A1F; }
    h3 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #B23A0C; margin: 16px 0 6px; }
    p { margin: 0 0 9px; color: #2A2620; }
    p.lead { font-size: 12px; line-height: 1.7; }
    .note { color: #555; font-size: 10px; }
    .rep-header { display: flex; justify-content: space-between; align-items: baseline; }
    .logo { font-family: Georgia, serif; font-size: 20px; letter-spacing: 4px; font-weight: 700; color: #B23A0C; }
    .rep-title { font-family: Georgia, serif; font-size: 15px; color: #333; }
    .profile-line { margin-top: 8px; font-size: 10.5px; color: #444; }
    .profile-line span { margin-right: 14px; }
    .rule { border: none; border-top: 2px solid #1A1712; margin: 10px 0 4px; }
    .rule.thin { border-top: 0.5px solid #ccc; margin: 28px 0 8px; }
    table.kv { width: 100%; border-collapse: collapse; margin: 6px 0 10px; }
    table.kv td { padding: 5px 8px 5px 0; vertical-align: top; font-size: 10.5px; border-bottom: 0.5px solid #eee; }
    table.kv td.k { width: 190px; color: #555; font-weight: 600; }
    .stat-grid { display: flex; flex-wrap: wrap; gap: 10px; margin: 8px 0 12px; }
    .stat { flex: 1 1 21%; min-width: 110px; border: 1px solid #eee; border-radius: 8px; padding: 10px 12px; background: #FBF8F3; }
    .stat-val { font-family: Georgia, serif; font-size: 20px; font-weight: 700; color: #B23A0C; }
    .stat-label { font-size: 9.5px; color: #555; margin-top: 2px; }
    .bars { margin: 6px 0 10px; }
    .bar-row { display: flex; align-items: center; margin-bottom: 6px; }
    .bar-label { width: 150px; font-size: 10.5px; color: #2A2620; }
    .bar-track { flex: 1; height: 9px; background: #F0EAE1; border-radius: 5px; overflow: hidden; }
    .bar-fill { height: 9px; background: #FF5A1F; border-radius: 5px; }
    .keep { page-break-inside: avoid; }
    table.log { width: 100%; border-collapse: collapse; margin: 6px 0 10px; font-size: 9.5px; }
    table.log th { text-align: left; padding: 5px 6px; background: #FBF8F3; color: #555; font-weight: 700; border-bottom: 1px solid #eee; }
    table.log td { padding: 5px 6px; border-bottom: 0.5px solid #eee; }
    .datablock { background: #F7F4EF; border: 1px solid #eee; border-radius: 8px; padding: 12px 14px; font-family: 'Courier New', monospace; font-size: 9px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
  </style></head><body>
  ${headerHtml(d)}
  ${medicalSummaryHtml(d)}
  ${aboutYouHtml(d)}
  ${skinAgeHtml(d)}
  ${yourNumbersHtml(d)}
  ${yourSkinHtml(d)}
  ${yourTrendsHtml(d)}
  ${yourPatternsHtml(d)}
  ${yourSunscreenHtml(d)}
  ${yourBodyHtml(d)}
  ${yourOutlookHtml(d)}
  ${whatToDoHtml(d)}
  ${includeFullLog ? fullSessionLogHtml(d) : ''}
  ${methodologyHtml(d)}
  ${structuredDataHtml(d)}
  </body></html>`;
}

export async function generateReport(uid, { includeFullLog = false } = {}) {
  try {
    const data = await buildReportData(uid);
    const html = buildReportHtml(data, { includeFullLog });
    const { uri } = await Print.printToFileAsync({ html });
    return { ok: true, uri };
  } catch (e) {
    console.log('Report generation failed:', e);
    return { ok: false, message: 'Could not generate your profile. Please try again.' };
  }
}

export async function shareReport(uri) {
  try {
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      return { ok: false, message: 'Sharing is not available on this device.' };
    }
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Share Your Sun Profile',
    });
    return { ok: true };
  } catch (e) {
    console.log('Report sharing failed:', e);
    return { ok: false, message: 'Could not open the share sheet. Please try again.' };
  }
}
