// Pure helpers for the Passport map. Not a component.
import colors from '../../constants/colors';
import { formatDateLabel, formatClock, formatDuration } from '../../services/SessionDetailMapper';

const ACTIVITY_LABELS = { high: 'High', moderate: 'Moderate', sedentary: 'Low' };

// Reshapes a SupabaseService.getSessionPinSummaries() row into the exact
// shape clusterSessions/passportStats/HotspotRankingsSection expect —
// matching mockPassportData.js's field names so both sources are
// interchangeable to every consumer below.
export function mapPinSummaryToSession(row) {
  const start = new Date(row.start_time);
  const end = row.end_time ? new Date(row.end_time) : null;
  const durationMinutes = row.duration_minutes != null
    ? Math.round(row.duration_minutes)
    : (end ? Math.round((end - start) / 60000) : 0);
  const activityLevel = ACTIVITY_LABELS[row.activity_level] ?? 'Moderate';
  const waterEventCount = row.water_events ?? 0;
  const checkIn = Array.isArray(row.post_session_checkins) ? row.post_session_checkins[0] : row.post_session_checkins;

  return {
    id: row.id,
    lat: row.latitude,
    lng: row.longitude,
    city: row.city,
    region: row.region,
    location: row.location_name || [row.city, row.region].filter(Boolean).join(', ') || row.environment || 'Session',
    environment: row.environment ?? 'Outdoors',
    date: formatDateLabel(row.start_time),
    dateISO: start.toISOString().slice(0, 10),
    startTime: formatClock(row.start_time),
    endTime: end ? formatClock(row.end_time) : '—',
    duration: formatDuration(durationMinutes),
    durationMinutes,
    score: row.protection_score ?? 0,
    // Rounded to one decimal — the stored value is a raw float from the
    // synthetic UV drift math (e.g. 9.000011) until real sensor data lands.
    peakUV: Math.round((row.peak_uv ?? 0) * 10) / 10,
    avgDepletionRate: row.average_depletion_rate ?? null,
    conditions: `${Math.round(row.peak_temperature ?? 0)}° peak · ${activityLevel} activity${waterEventCount ? ` · ${waterEventCount} water event${waterEventCount === 1 ? '' : 's'}` : ''}`,
    conditionFlags: {
      highActivity: row.activity_level === 'high',
      highHumidity: (row.average_humidity ?? 0) > 65,
      waterEvents: waterEventCount > 0,
      highUV: (row.peak_uv ?? 0) >= 7,
    },
    temperature: row.peak_temperature ?? null,
    humidity: row.average_humidity ?? null,
    activityLevel,
    avgAlertResponseMinutes: row.alert_response_time_avg ?? null,
    hadProtectionGap: (row.unprotected_minutes ?? 0) > 0,
    postSession: checkIn ? { skinFeelAfter: checkIn.skin_feel_after, skinFeelBefore: checkIn.skin_feel_before } : undefined,
  };
}

const CLUSTER_RADIUS_M = 500;
const EARTH_RADIUS_M = 6371000;

// Haversine distance in meters.
export function distanceMeters(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(s));
}

// Groups sessions within 500 m of each other into location clusters.
// Simple greedy pass — fine client-side for a typical user's session count.
export function clusterSessions(sessions) {
  const clusters = [];
  for (const session of sessions) {
    const home = clusters.find(
      (c) => distanceMeters(c, { lat: session.lat, lng: session.lng }) <= CLUSTER_RADIUS_M
    );
    if (home) {
      home.sessions.push(session);
      // Keep the pin on the cluster's centroid.
      home.lat = home.sessions.reduce((a, s) => a + s.lat, 0) / home.sessions.length;
      home.lng = home.sessions.reduce((a, s) => a + s.lng, 0) / home.sessions.length;
    } else {
      clusters.push({
        key: `${session.lat.toFixed(3)},${session.lng.toFixed(3)}`,
        lat: session.lat,
        lng: session.lng,
        sessions: [session],
      });
    }
  }
  for (const c of clusters) {
    c.sessions.sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1)); // newest first
    c.bestScore = Math.max(...c.sessions.map((s) => s.score));
    c.avgPeakUV =
      Math.round((c.sessions.reduce((a, s) => a + s.peakUV, 0) / c.sessions.length) * 10) / 10;
    c.city = c.sessions[0].city;
    c.region = c.sessions[0].region;
  }
  return clusters;
}

// Passport header stats: unique pinned places + unique countries/states.
export function passportStats(clusters) {
  return {
    places: clusters.length,
    regions: new Set(clusters.map((c) => c.region)).size,
  };
}

// The pin with the single best session score across ALL locations gets
// the gold ring.
export function bestClusterKey(clusters) {
  if (!clusters.length) return null;
  return clusters.reduce((a, b) => (b.bestScore > a.bestScore ? b : a)).key;
}

// UV environment descriptor for a location's average recorded UV.
export function uvEnvironment(avgUV) {
  if (avgUV < 3) return { label: 'Mild', color: colors.protected };
  if (avgUV <= 5) return { label: 'Moderate', color: colors.protected };
  if (avgUV <= 7) return { label: 'High', color: colors.warning };
  if (avgUV <= 10) return { label: 'Intense', color: colors.danger };
  return { label: 'Extreme', color: colors.danger };
}

export function scoreColor(score) {
  if (score >= 85) return colors.protected;
  if (score >= 65) return colors.warning;
  return colors.danger;
}

// ─── Cross-location aggregates ─────────────────────────────────────

// Feature 1: locations ranked most → least UV intense. Null under 2
// locations — a ranking of one is meaningless.
export function uvRanking(clusters) {
  if (clusters.length < 2) return null;
  return [...clusters].sort((a, b) => b.avgPeakUV - a.avgPeakUV);
}

// Feature 2: the location where protection depletes fastest per minute
// on average, regardless of why. Null unless 2+ locations have rate data.
export function fastestDepletionCluster(clusters) {
  const rated = clusters
    .map((c) => {
      const rates = c.sessions.map((s) => s.avgDepletionRate).filter((r) => r != null);
      if (!rates.length) return null;
      return { cluster: c, rate: rates.reduce((a, b) => a + b, 0) / rates.length };
    })
    .filter(Boolean);
  if (rated.length < 2) return null;
  return rated.reduce((a, b) => (b.rate > a.rate ? b : a)).cluster;
}

// Feature 3: regulars (more than 3 sessions) vs one-time visits.
export function loyaltyLine(clusters) {
  const regular = clusters.filter((c) => c.sessions.length > 3).length;
  const once = clusters.filter((c) => c.sessions.length === 1).length;
  const loc = (n) => `location${n === 1 ? '' : 's'}`;
  return `You have ${regular} ${loc(regular)} you visit regularly and ${once} you’ve explored once.`;
}

// Feature 4: most/least consistent locations by protection-score variance,
// among locations with more than 2 sessions. Null unless 2+ qualify.
export function consistencyExtremes(clusters) {
  const qualified = clusters
    .filter((c) => c.sessions.length > 2)
    .map((c) => {
      const scores = c.sessions.map((s) => s.score);
      const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
      const variance = scores.reduce((a, s) => a + (s - mean) ** 2, 0) / scores.length;
      return { key: c.key, variance };
    });
  if (qualified.length < 2) return null;
  const sorted = [...qualified].sort((a, b) => a.variance - b.variance);
  return { mostKey: sorted[0].key, leastKey: sorted[sorted.length - 1].key };
}

// Feature 5: first 3 visits vs most recent 3 visits, for locations with
// more than 3 sessions. Cluster sessions are sorted newest-first.
export function progressStats(cluster) {
  if (cluster.sessions.length <= 3) return null;
  const chronological = [...cluster.sessions].reverse();
  const avg = (arr) => Math.round(arr.reduce((a, s) => a + s.score, 0) / arr.length);
  const firstAvg = avg(chronological.slice(0, 3));
  const recentAvg = avg(chronological.slice(-3));
  return { firstAvg, recentAvg, delta: recentAvg - firstAvg };
}

// Feature 6: the condition type present in the largest share of sessions
// across every location. Null unless it clears 50% — no weak insights.
const CONDITION_LABELS = {
  highActivity: 'high activity',
  highHumidity: 'high humidity',
  waterEvents: 'water events',
  highUV: 'high UV',
};

export function dominantConditionLine(sessions) {
  const flagged = sessions.filter((s) => s.conditionFlags);
  if (!flagged.length) return null;
  let best = null;
  for (const key of Object.keys(CONDITION_LABELS)) {
    const count = flagged.filter((s) => s.conditionFlags[key]).length;
    if (!best || count > best.count) best = { key, count };
  }
  const pct = Math.round((best.count / flagged.length) * 100);
  if (pct <= 50) return null;
  const verb = best.key === 'waterEvents' ? 'show up' : 'shows up';
  return `Across all your locations, ${CONDITION_LABELS[best.key]} ${verb} in ${pct}% of your sessions wherever you go.`;
}
