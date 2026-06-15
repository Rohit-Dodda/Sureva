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
