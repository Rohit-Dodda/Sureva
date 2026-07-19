// Real location + UV/temperature forecast, via Open-Meteo (free, no API
// key required — https://open-meteo.com). Narrative lines below are
// deterministic templates off the real numbers, same style as
// SessionDetailMapper.js — not an LLM. Screens never call this or
// expo-location directly for weather; they go through here.
import * as Location from 'expo-location';

// Fitzpatrick-informed personal UV risk threshold — lower (more
// conservative) for fairer skin types, consistent with CLAUDE.md's "when
// in doubt, be conservative" rule. Not a clinical constant, just a
// reasonable per-type nudge on top of the population "high" cutoff (6).
const PERSONAL_RISK_UV_BY_FITZPATRICK = { 1: 4, 2: 5, 3: 6, 4: 7, 5: 8, 6: 8 };

function personalRiskUvFor(fitzpatrickType) {
  return PERSONAL_RISK_UV_BY_FITZPATRICK[fitzpatrickType] ?? 6;
}

function uvLevelFor(uv) {
  if (uv >= 6) return 'high';
  if (uv >= 3) return 'moderate';
  return 'low';
}

function recommendedSpfFor(peakUV) {
  if (peakUV >= 8) return 'SPF 50+';
  if (peakUV >= 5) return 'SPF 30-50';
  return 'SPF 30';
}

function reapplyMinutesFor(peakUV) {
  if (peakUV >= 8) return 60;
  if (peakUV >= 6) return 75;
  return 100;
}

// Compact chart-axis label — only for the hourly[] entries UVCurveChart
// plots along its x-axis (e.g. '11a').
function formatHourLabel(hour) {
  if (hour === 0) return '12a';
  if (hour < 12) return `${hour}a`;
  if (hour === 12) return '12p';
  return `${hour - 12}p`;
}

// Readable label for prose/badges (e.g. '11 AM') — deliberately a
// different format from formatHourLabel above: cramming '11a'/'3p' into
// sentences like "Peak 11a-3p" reads like a typo, not a time.
function formatDisplayHour(hour) {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

const EPA_MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

// EPA's DATE_TIME looks like "Jul/16/2026 02 PM".
function parseEpaDateTime(str) {
  const [datePart, hourPart, ampm] = str.split(' ');
  const [mon, day, year] = datePart.split('/');
  let hour = parseInt(hourPart, 10) % 12;
  if (ampm === 'PM') hour += 12;
  return new Date(Number(year), EPA_MONTHS[mon], Number(day), hour);
}

// EPA's Environfacts UV Index feed (data.epa.gov, no key required) is the
// US government's authoritative UV source — the same one most US weather
// apps and search results draw from. Open-Meteo's own UV forecast folds
// in its cloud-cover model and can diverge from it noticeably on a
// partly-cloudy day (verified: it forecasts today's Atlanta cloud cover
// at ~100% mid-afternoon and derates UV accordingly, while EPA's feed —
// matching what most people find searching "UV index today" — doesn't).
// US-only and hourly-only (no multi-day, no temp/humidity), so it's used
// to override just the UV numbers where available; everything else
// (temperature, humidity, the 7-day outlook) stays on Open-Meteo, and a
// non-US location or a failed fetch here just falls back to Open-Meteo's
// own UV numbers with no user-visible error.
async function fetchEpaHourlyUv(postalCode) {
  try {
    const res = await fetch(`https://data.epa.gov/efservice/getEnvirofactsUVHourly/ZIP/${postalCode}/JSON`);
    if (!res.ok) return null;
    const rows = await res.json();
    return rows.map((r) => ({ time: parseEpaDateTime(r.DATE_TIME), uv: Number(r.UV_VALUE) }));
  } catch {
    return null;
  }
}

// EPA's national UV forecast product only ever covers today + tomorrow
// (a real limit of the government product, not a call-parameter issue —
// confirmed against the live endpoint) — this is tomorrow's max only,
// used to correct the one extra day in the 7-day week view that EPA can
// reach; days 3-7 have no equivalent free authoritative source and stay
// on Open-Meteo (see the week-building comment below for what that means).
async function fetchEpaTomorrowMax(postalCode) {
  try {
    const res = await fetch(`https://data.epa.gov/efservice/getEnvirofactsUVDAILY/ZIP/${postalCode}/JSON`);
    if (!res.ok) return null;
    const rows = await res.json();
    const uv = rows?.[0]?.UV_INDEX;
    return uv != null ? Number(uv) : null;
  } catch {
    return null;
  }
}

// The contiguous stretch of hours at/above whichever is lower: this
// user's personal risk threshold, or one point under the day's actual
// peak (so a mild day still gets a sensible "peak window" instead of
// none). Returns array indices (into hourlyToday/hourly, which share the
// same order) rather than strings, so both the chart (needs indices) and
// the prose (needs a readable label) can be derived from one source of
// truth without string-matching between two different label formats.
function peakWindowIndices(hourly, personalRiskUV) {
  const peakUV = Math.max(...hourly.map((h) => h.uv));
  const cutoff = Math.min(personalRiskUV, Math.max(0, peakUV - 1));
  const aboveIdx = [];
  hourly.forEach((h, i) => { if (h.uv >= cutoff) aboveIdx.push(i); });
  if (!aboveIdx.length) return { startIdx: 0, endIdx: 0 };
  return { startIdx: aboveIdx[0], endIdx: aboveIdx[aboveIdx.length - 1] };
}

// Returns the built forecast object HistoryScreen... (ForecastScreen)
// expects, or { error: 'location_denied' } if permission isn't granted.
// Throws on network/API failure — caller decides how to surface that.
export async function getForecast(fitzpatrickType) {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    return { error: 'location_denied' };
  }

  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const { latitude, longitude } = position.coords;

  const places = await Location.reverseGeocodeAsync({ latitude, longitude });
  const place = places?.[0];
  const location = [place?.city, place?.region].filter(Boolean).join(', ') || 'Your location';
  const isUS = place?.isoCountryCode === 'US';
  const [epaHourly, epaTomorrowMax] = isUS && place?.postalCode
    ? await Promise.all([fetchEpaHourlyUv(place.postalCode), fetchEpaTomorrowMax(place.postalCode)])
    : [null, null];

  // `current=...` is Open-Meteo's near-real-time nowcast (~15min
  // granularity) — deliberately NOT the same values as the hourly forecast
  // array, which is a forecast for the top of each hour computed whenever
  // this endpoint is called, not a live reading. Verified live: at 11:45am
  // `current` gave temp 31°C/63% humidity while the hourly array's "current
  // hour" bucket said 25.5°C/86% — a large, real gap, not noise. Same
  // reasoning that already applies to UV (EPA's hourly feed can go stale
  // intraday too) — "right now" temp/humidity use this fresher nowcast;
  // the hourly curve/peak still use the forecast arrays, which is correct
  // for planning ahead.
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}`
    + `&current=uv_index,temperature_2m,relative_humidity_2m&hourly=uv_index,temperature_2m,relative_humidity_2m&daily=uv_index_max`
    + `&timezone=auto&forecast_days=7`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather API error ${res.status}`);
  const data = await res.json();

  const personalRiskUV = personalRiskUvFor(fitzpatrickType);
  const now = new Date();
  // Local calendar-date comparison, not .toISOString() (which forces
  // UTC) — otherwise "today" misidentifies itself once the local evening
  // crosses the UTC day boundary, a real case for any negative-UTC-offset
  // timezone (all of the Americas).
  const isSameLocalDay = (a, b) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  // Restricted to daylight hours (6am-7pm) — matches the chart's intended
  // "plan your day" range rather than a full 24h sweep. hourly.time
  // strings from Open-Meteo (timezone=auto) have no timezone designator,
  // so `new Date(t)` parses them as local wall-clock time already.
  const hourlyToday = data.hourly.time
    .map((t, i) => ({
      time: new Date(t),
      uv: data.hourly.uv_index[i],
      temp: data.hourly.temperature_2m[i],
      humidity: data.hourly.relative_humidity_2m[i],
    }))
    .filter((h) => isSameLocalDay(h.time, now) && h.time.getHours() >= 6 && h.time.getHours() <= 19);

  // Overlay EPA's UV values by matching hour, when available — temp/humidity
  // stay from Open-Meteo either way (EPA doesn't provide those).
  if (epaHourly) {
    const epaByHour = new Map(
      epaHourly.filter((e) => isSameLocalDay(e.time, now)).map((e) => [e.time.getHours(), e.uv])
    );
    for (const h of hourlyToday) {
      if (epaByHour.has(h.time.getHours())) h.uv = epaByHour.get(h.time.getHours());
    }
  }

  const hourly = hourlyToday.map((h) => ({ hour: formatHourLabel(h.time.getHours()), uv: Math.round(h.uv) }));
  const peakUV = hourly.length ? Math.max(...hourly.map((h) => h.uv)) : 0;
  const { startIdx: peakStartIndex, endIdx: peakEndIndex } = hourly.length
    ? peakWindowIndices(hourly, personalRiskUV)
    : { startIdx: 0, endIdx: 0 };
  const peakWindow = hourlyToday.length
    ? {
      start: formatDisplayHour(hourlyToday[peakStartIndex].time.getHours()),
      end: formatDisplayHour(hourlyToday[peakEndIndex].time.getHours()),
    }
    : { start: '—', end: '—' };

  const currentEntry = hourlyToday.find((h) => h.time.getHours() === now.getHours()) ?? hourlyToday[0] ?? null;
  const currentTemp = data.current?.temperature_2m != null
    ? Math.round(data.current.temperature_2m)
    : (currentEntry ? Math.round(currentEntry.temp) : null);
  const currentHumidity = data.current?.relative_humidity_2m != null
    ? Math.round(data.current.relative_humidity_2m)
    : (currentEntry ? Math.round(currentEntry.humidity) : null);
  const currentUV = data.current?.uv_index != null
    ? Math.round(data.current.uv_index)
    : (currentEntry ? Math.round(currentEntry.uv) : 0);

  const riskLine = peakUV >= personalRiskUV
    ? `Peak UV hits between ${peakWindow.start} and ${peakWindow.end} today. Based on your skin, that window is high risk for you.`
    : "Today's peak UV stays under your personal risk threshold — a lower-risk day for your skin.";

  const lowHourOutsidePeak = [...hourly.slice(0, peakStartIndex), ...hourly.slice(peakEndIndex + 1)]
    .find((h) => h.uv < personalRiskUV);
  const bestTime = !hourly.length
    ? 'Not enough data to recommend a window today.'
    : lowHourOutsidePeak
      ? `Before ${peakWindow.start} or after ${peakWindow.end} for lower UV exposure today.`
      : 'UV stays elevated most of today — minimize outdoor time when possible.';

  // EPA's authoritative-but-2-day-limited feed corrects days 0 (today,
  // from the hourly merge above) and 1 (tomorrow, its own daily forecast)
  // when available. Days 2-6 have no equivalent free authoritative
  // source and stay on Open-Meteo's own daily max, which this location's
  // numbers show reads meaningfully lower than EPA's for the same days
  // (a real cross-model gap, not something a simple correction factor
  // reliably fixes) — those days may under-report relative to what
  // Apple Weather/Google show for the same date.
  const week = data.daily.time.map((t, i) => {
    // date-only strings ('2026-07-16') parse as UTC midnight by default,
    // which shifts a day backward for any negative-UTC-offset timezone
    // once .getDate()/weekday convert to local time — appending a local
    // midnight time avoids that.
    const d = new Date(`${t}T00:00:00`);
    const roundedPeak = i === 0
      ? peakUV
      : (i === 1 && epaTomorrowMax != null ? epaTomorrowMax : Math.round(data.daily.uv_index_max[i]));
    return {
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      date: d.getDate(),
      peakUV: roundedPeak,
      level: uvLevelFor(roundedPeak),
      isToday: i === 0,
    };
  });

  const tomorrow = week[1];
  const alert = tomorrow && tomorrow.peakUV >= personalRiskUV
    ? {
      active: true,
      title: 'High-risk day tomorrow',
      line: `Tomorrow's peak UV (${tomorrow.peakUV}) is at or above your personal risk threshold. Plan ${recommendedSpfFor(tomorrow.peakUV)} and earlier reapplication.`,
      reapplyMinutes: reapplyMinutesFor(tomorrow.peakUV),
    }
    : { active: false, title: '', line: '', reapplyMinutes: null };

  const highHumidity = (currentHumidity ?? 0) > 60;
  const recommendedSetup = {
    spf: recommendedSpfFor(peakUV),
    waterResistant: highHumidity,
    reapplyMinutes: reapplyMinutesFor(peakUV),
    line: `For today's conditions, we recommend ${recommendedSpfFor(peakUV)}${highHumidity ? ", water-resistant if you'll be active," : ''} and reapplication every ${reapplyMinutesFor(peakUV)} minutes.`,
    factors: [
      {
        icon: 'sunny-outline',
        label: `Peak UV ${peakUV}`,
        detail: peakUV >= personalRiskUV ? 'Above your personal threshold' : 'Within your comfortable range',
      },
      ...(currentTemp != null ? [{
        icon: 'thermometer-outline',
        label: `${currentTemp}°C`,
        detail: 'Current temperature at your location',
      }] : []),
      ...(currentHumidity != null ? [{
        icon: 'water-outline',
        label: `${currentHumidity}% humidity`,
        detail: highHumidity ? 'Sweat displaces film sooner' : 'Comfortable humidity',
      }] : []),
    ],
  };

  return {
    location,
    updated: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    today: { peakWindow, peakStartIndex, peakEndIndex, peakUV, currentUV, currentTemp, currentHumidity, personalRiskUV, riskLine, hourly, bestTime },
    recommendedSetup,
    week,
    alert,
  };
}
