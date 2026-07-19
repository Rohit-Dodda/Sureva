// MOCK DATA — synthesized raw 30-second sensor readings for each mock
// session in mockData.js, shaped exactly like the readings a real BLE
// session will store (per Week 6 integration): the What If simulator
// consumes this shape as a prop, so swapping to real data is only a
// change of source. The environmental curves and water events follow
// each session's narrative in mockData.sessionDetails.

// Shared mock user profile (Fitzpatrick III, combination skin, wrist
// placement) — matches the persona used across the mock session details.
const MOCK_USER_PROFILE = {
  fitzpatrickType: 3,
  skinType: 'combination',
  ageGroup: 'adult',
  medicationFlag: false,
  skinConditionFlag: false,
  devicePlacement: 'wrist',
  personalFactor: 1.0,
};

// Linear interpolation across environmental anchor points.
function interp(anchors, key, m) {
  if (m <= anchors[0].m) return anchors[0][key];
  for (let i = 1; i < anchors.length; i++) {
    if (m <= anchors[i].m) {
      const a = anchors[i - 1];
      const b = anchors[i];
      const t = (m - a.m) / (b.m - a.m);
      return a[key] + (b[key] - a[key]) * t;
    }
  }
  return anchors[anchors.length - 1][key];
}

function buildReadings({ startIso, durationMinutes, anchors, activitySegments, waterEvents }) {
  const startTs = Date.parse(startIso);
  const readings = [];
  for (let i = 0; i <= durationMinutes * 2; i++) {
    const m = i * 0.5;
    const segment = activitySegments.find((s) => m <= s.toM) ?? activitySegments[activitySegments.length - 1];
    const water = waterEvents.find((w) => w.m === m);
    readings.push({
      timestamp: startTs + i * 30000,
      uvIndex: Math.round(interp(anchors, 'uv', m) * 10) / 10,
      temperature: Math.round(interp(anchors, 'temp', m) * 10) / 10,
      humidity: Math.round(interp(anchors, 'hum', m)),
      activityLevel: segment.level,
      waterEventActive: !!water,
      waterEventDuration: water ? water.durationSeconds : 0,
    });
  }
  return readings;
}

// Per-session simulation inputs: raw readings, the user's profile, and the
// actual choices made in the real session (the controls' starting values).
const mockSessionSimData = {
  '1': {
    // Malibu Beach — 2h14m, SPF 50 / 80-min WR, 2 reapplications, 3 water events.
    userProfile: MOCK_USER_PROFILE,
    actuals: {
      spf: 50,
      waterResistanceRating: 80,
      applicationDelayMinutes: 0,
      reapplicationMinutes: [70, 120],
      activityLevel: null,
      dominantActivity: 'moderate',
    },
    readings: buildReadings({
      startIso: '2026-06-04T10:22:00',
      durationMinutes: 134,
      anchors: [
        { m: 0, uv: 6.2, temp: 27, hum: 64 },
        { m: 40, uv: 7.6, temp: 29, hum: 68 },
        { m: 80, uv: 8.4, temp: 31, hum: 72 },
        { m: 134, uv: 7.8, temp: 30, hum: 70 },
      ],
      activitySegments: [{ toM: 134, level: 'moderate' }],
      waterEvents: [
        { m: 58, durationSeconds: 55 },
        { m: 96, durationSeconds: 15 },
        { m: 112, durationSeconds: 48 },
      ],
    }),
  },
  '2': {
    // Griffith Park trail run — 1h32m, SPF 30 / 40-min WR, 1 reapplication, dry.
    userProfile: MOCK_USER_PROFILE,
    actuals: {
      spf: 30,
      waterResistanceRating: 40,
      applicationDelayMinutes: 0,
      reapplicationMinutes: [68],
      activityLevel: null,
      dominantActivity: 'high',
    },
    readings: buildReadings({
      startIso: '2026-05-28T07:45:00',
      durationMinutes: 92,
      anchors: [
        { m: 0, uv: 2.0, temp: 21, hum: 52 },
        { m: 45, uv: 3.8, temp: 24, hum: 56 },
        { m: 92, uv: 5.1, temp: 26, hum: 58 },
      ],
      activitySegments: [
        { toM: 8, level: 'moderate' },
        { toM: 64, level: 'high' },
        { toM: 92, level: 'moderate' },
      ],
      waterEvents: [],
    }),
  },
  '3': {
    // Santa Monica Pier — 3h05m midday, SPF 50 / 80-min WR, 3 reapplications,
    // one immersion and one splash.
    userProfile: MOCK_USER_PROFILE,
    actuals: {
      spf: 50,
      waterResistanceRating: 80,
      applicationDelayMinutes: 0,
      reapplicationMinutes: [72, 134, 172],
      activityLevel: null,
      dominantActivity: 'moderate',
    },
    readings: buildReadings({
      startIso: '2026-05-20T12:00:00',
      durationMinutes: 185,
      anchors: [
        { m: 0, uv: 7.4, temp: 29, hum: 66 },
        { m: 60, uv: 8.8, temp: 32, hum: 74 },
        { m: 110, uv: 9.2, temp: 34, hum: 81 },
        { m: 185, uv: 7.0, temp: 31, hum: 72 },
      ],
      activitySegments: [
        { toM: 55, level: 'moderate' },
        { toM: 125, level: 'high' },
        { toM: 185, level: 'moderate' },
      ],
      waterEvents: [
        { m: 109, durationSeconds: 75 },
        { m: 129, durationSeconds: 12 },
      ],
    }),
  },
};

// MOCK: real sessions will carry their readings on the session document.
export function getSimDataForSession(sessionId) {
  return mockSessionSimData[sessionId] ?? null;
}

export default mockSessionSimData;
