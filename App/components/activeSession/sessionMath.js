import colors from '../../constants/colors';
import mockData from '../../constants/mockData';

// ─── Depletion model ──────────────────────────────────────────
// Kept identical to the original ActiveSessionScreen logic so outputs
// don't drift. When real BLE/firmware lands this is the single seam to swap.
const UV_BASELINE = 7;

export function totalProtectionMinutes({ waterResistance, spf }) {
  const uvIndex = mockData.conditions.uvIndex;
  const spfBonus = spf >= 50 ? 1.15 : 1.0;
  return waterResistance * (UV_BASELINE / uvIndex) * spfBonus;
}

// Protection % at a given number of seconds since the last reapply.
export function protectionAt(secsSinceReapply, sessionParams) {
  const totalMins = totalProtectionMinutes(sessionParams);
  const elapsedMins = secsSinceReapply / 60;
  const pct = Math.max(0, 100 - (elapsedMins / totalMins) * 100);
  const minsRemaining = Math.max(0, Math.round(totalMins - elapsedMins));
  return { protectionPct: pct, minsRemaining };
}

// Builds the live depletion curve across the whole session, accounting for
// every reapply event (each resets protection to 100%). Derived purely from
// elapsed + reapplyEvents, so it's safe to compute on render.
export function buildCurve(elapsed, reapplyEvents, sessionParams, samples = 40) {
  const events = [0, ...reapplyEvents];
  const points = [];
  const step = elapsed <= 0 ? 1 : elapsed / samples;
  for (let i = 0; i <= samples; i++) {
    const t = Math.min(elapsed, Math.round(i * step));
    let basis = 0;
    for (let e = 0; e < events.length; e++) {
      if (events[e] <= t) basis = events[e];
    }
    const { protectionPct } = protectionAt(t - basis, sessionParams);
    points.push({ t, pct: protectionPct });
  }
  return points;
}

// Accumulated UV "dose" this session as a 0–1 fraction of a standard
// erythemal day. Climbs with time and UV index; resets are not applied
// (dose is cumulative exposure regardless of sunscreen).
export function uvDoseFraction(elapsedSecs) {
  const uvIndex = mockData.conditions.uvIndex;
  const sed = (uvIndex * (elapsedSecs / 3600)) / 6; // ~6 SED ≈ a full burn budget
  return Math.max(0, Math.min(1, sed));
}

// ─── Status mapping ───────────────────────────────────────────
export function statusFor(pct) {
  if (pct > 60) {
    return {
      word: 'Protected',
      color: colors.protected,
      gradient: [colors.gradGreenStart, colors.gradGreenEnd],
      wash: colors.greenWash,
    };
  }
  if (pct > 20) {
    return {
      word: 'Reapply soon',
      color: colors.warning,
      gradient: ['#F8B84E', '#EE8C0A'],
      wash: colors.amberWash,
    };
  }
  return {
    word: 'Reapply now',
    color: colors.danger,
    gradient: ['#F0654D', '#DD3220'],
    wash: colors.redWash,
  };
}

export function uvIndexColor(uvi) {
  if (uvi >= 8) return colors.danger;
  if (uvi >= 3) return colors.warning;
  return colors.protected;
}

// Buckets a free-text / preset environment label into the physical thing that
// strips sunscreen, with a relative depletion-pressure score. Keyword-matched so
// it survives both the preset list and Custom free text.
function classifyEnvironment(environment) {
  const e = (environment || '').toLowerCase();
  if (/(beach|water|boat|lake|sea|coast|pool|surf|marina|river)/.test(e))
    return { label: 'Water exposure', icon: 'water', score: 7 };
  if (/(snow|ski|glacier)/.test(e))
    return { label: 'Snow reflection', icon: 'snow', score: 6 };
  if (/(mountain|peak|summit|ridge|desert|dune)/.test(e))
    return { label: 'Reflected glare', icon: 'sunny', score: 3 };
  if (/(park|trail|garden|forest|reserve|hike)/.test(e))
    return { label: 'Open terrain', icon: 'leaf', score: 1.6 };
  return { label: 'Surroundings', icon: 'earth', score: 1 };
}

// Breaks live depletion into the factors driving it, each as a 0–1 share of the
// total. Scores are relative depletion pressure; conservative thresholds (err
// toward more depletion). Order is fixed (not sorted by share) so each meter
// stays put and resizes in place as conditions shift. Pure — safe on render.
export function factorBreakdown(conditions, environment) {
  const { uvIndex = 0, temperature = 20, humidity = 0, activity = 'Low' } = conditions || {};

  const uvScore = Math.max(0, uvIndex);
  const heatScore = Math.max(0, temperature - 22) * 0.4 + Math.max(0, humidity - 45) * 0.05;
  const activityScore = activity === 'High' ? 5 : activity === 'Moderate' ? 3 : 1.2;
  const env = classifyEnvironment(environment);

  const raw = [
    { key: 'uv', label: 'UV intensity', icon: 'sunny', color: colors.orange, score: uvScore },
    { key: 'heat', label: 'Heat & humidity', icon: 'thermometer', color: colors.warning, score: heatScore },
    { key: 'env', label: env.label, icon: env.icon, color: colors.bluetooth, score: env.score },
    { key: 'activity', label: 'Activity & sweat', icon: 'walk', color: colors.navy, score: activityScore },
  ];

  const total = raw.reduce((s, f) => s + f.score, 0) || 1;
  return raw.map((f) => ({ key: f.key, label: f.label, icon: f.icon, color: f.color, share: f.score / total }));
}

// Demo stand-in for live BLE/weather telemetry: drifts the base conditions so
// the factor meters visibly move. Deterministic (function of elapsed only) so it
// never jitters between renders. Cycles are deliberately fast (tens of seconds)
// and each factor uses a different period, so the meters shift at different rates
// and the change is obvious while demoing. Real telemetry would update on the 5s
// BLE cadence — when it lands, this is the single seam to replace.
export function liveConditionsAt(base, elapsedSecs) {
  if (!base) return base;
  const t = elapsedSecs;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const actPhase = Math.sin(t / 19);
  const activity = actPhase > 0.5 ? 'High' : actPhase < -0.4 ? 'Low' : 'Moderate';
  return {
    ...base,
    uvIndex: clamp(base.uvIndex + Math.sin(t / 9) * 2.6, 0, 12),
    temperature: Math.round(clamp(base.temperature + Math.sin(t / 13 + 1) * 4, -20, 55)),
    humidity: Math.round(clamp(base.humidity + Math.cos(t / 7) * 14, 0, 100)),
    activity,
  };
}

export function keyDriver(uvIndex, environment) {
  if (environment === 'Beach / Water') return 'Water activity is your main depletion factor';
  if (environment === 'Snow / Mountains') return 'Snow reflection is amplifying your UV exposure';
  if (uvIndex >= 8) return 'High UV is your main depletion factor right now';
  if (uvIndex >= 5) return 'Moderate UV is the primary driver of depletion';
  return 'Low UV — your protection is holding well';
}

export function formatElapsed(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function clockAfter(minsFromNow) {
  const d = new Date(Date.now() + minsFromNow * 60000);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}
