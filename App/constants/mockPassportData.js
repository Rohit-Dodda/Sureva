// MOCK DATA — session location summaries for the Passport map.
// TODO: wire real data. In production this comes from Supabase via
// SupabaseService: fetch only the summary fields below per session —
// never the full readings arrays on this screen.
//
// Field notes:
//   avgDepletionRate       — protection % lost per minute across the session
//   conditionFlags         — which condition types the session included; used
//                            for the cross-location behavior pattern insight
//   temperature / humidity — °F / % averaged over the session
//   activityLevel          — 'Low' | 'Moderate' | 'High'
//   avgAlertResponseMinutes — minutes to acknowledge alerts; null if none fired
//   hadProtectionGap       — true if an alert went unanswered long enough to
//                            leave a real unprotected window
//   postSession            — the post-session check-in answers (Q1/Q2 from
//                            PostSessionService), only present on sessions
//                            where the user actually completed the check-in
//
// Sessions '1'–'3' mirror mockData.sessions so tapping them opens the
// existing detailed session breakdowns. Malibu carries eight sessions (an
// improving score arc, for the Location Detail screen's fuller analytics —
// first-vs-recent comparison, UV distribution, streaks, skin response
// correlation, etc.), Waikiki three tightly-scored sessions (consistency
// comparison vs Malibu's spread).

const mockPassportSessions = [
  // ── Malibu Beach, CA — eight sessions, one cluster, improving arc ──
  {
    id: '1',
    lat: 34.0259, lng: -118.7798,
    city: 'Malibu', region: 'California, USA',
    location: 'Malibu Beach, CA', environment: 'Beach / Water',
    date: 'Jun 4, 2026', dateISO: '2026-06-04',
    startTime: '10:22 AM', endTime: '12:36 PM',
    duration: '2h 14m', durationMinutes: 134,
    score: 92, peakUV: 8.4, avgDepletionRate: 0.52,
    conditions: 'Hot · Moderate activity · 3 water events',
    conditionFlags: { highActivity: false, highHumidity: true, waterEvents: true, highUV: true },
    temperature: 89, humidity: 74, activityLevel: 'Moderate',
    avgAlertResponseMinutes: 3, hadProtectionGap: false,
    postSession: { skinFeelAfter: 'Feels warm or flushed', skinFeelBefore: 'Normal, no issues' },
  },
  {
    id: 'p-malibu-2',
    lat: 34.0271, lng: -118.7762,
    city: 'Malibu', region: 'California, USA',
    location: 'Malibu Beach, CA', environment: 'Beach / Water',
    date: 'May 24, 2026', dateISO: '2026-05-24',
    startTime: '11:05 AM', endTime: '1:41 PM',
    duration: '2h 36m', durationMinutes: 156,
    score: 81, peakUV: 8.9, avgDepletionRate: 0.56,
    conditions: 'Hot · High activity · 2 water events',
    conditionFlags: { highActivity: true, highHumidity: true, waterEvents: true, highUV: true },
    temperature: 91, humidity: 77, activityLevel: 'High',
    avgAlertResponseMinutes: 6, hadProtectionGap: true,
    postSession: { skinFeelAfter: 'Feels sensitive to touch', skinFeelBefore: 'Slightly dry or tight' },
  },
  {
    id: 'p-malibu-3',
    lat: 34.0248, lng: -118.7813,
    city: 'Malibu', region: 'California, USA',
    location: 'Malibu Beach, CA', environment: 'Beach / Water',
    date: 'May 10, 2026', dateISO: '2026-05-10',
    startTime: '9:48 AM', endTime: '11:52 AM',
    duration: '2h 04m', durationMinutes: 124,
    score: 74, peakUV: 7.6, avgDepletionRate: 0.49,
    conditions: 'Warm · Moderate activity · 1 water event',
    conditionFlags: { highActivity: false, highHumidity: false, waterEvents: true, highUV: true },
    temperature: 80, humidity: 52, activityLevel: 'Moderate',
    avgAlertResponseMinutes: 7, hadProtectionGap: true,
  },
  {
    id: 'p-malibu-4',
    lat: 34.0263, lng: -118.7785,
    city: 'Malibu', region: 'California, USA',
    location: 'Malibu Beach, CA', environment: 'Beach / Water',
    date: 'Apr 18, 2026', dateISO: '2026-04-18',
    startTime: '12:10 PM', endTime: '2:20 PM',
    duration: '2h 10m', durationMinutes: 130,
    score: 71, peakUV: 8.1, avgDepletionRate: 0.54,
    conditions: 'Hot · High activity · 2 water events',
    conditionFlags: { highActivity: true, highHumidity: true, waterEvents: true, highUV: true },
    temperature: 88, humidity: 71, activityLevel: 'High',
    avgAlertResponseMinutes: 8, hadProtectionGap: true,
  },
  {
    id: 'p-malibu-5',
    lat: 34.0254, lng: -118.7806,
    city: 'Malibu', region: 'California, USA',
    location: 'Malibu Beach, CA', environment: 'Beach / Water',
    date: 'Mar 29, 2026', dateISO: '2026-03-29',
    startTime: '11:30 AM', endTime: '1:15 PM',
    duration: '1h 45m', durationMinutes: 105,
    score: 63, peakUV: 6.8, avgDepletionRate: 0.5,
    conditions: 'Warm · High activity · 1 water event',
    conditionFlags: { highActivity: true, highHumidity: false, waterEvents: true, highUV: false },
    temperature: 78, humidity: 46, activityLevel: 'High',
    avgAlertResponseMinutes: 9, hadProtectionGap: true,
    postSession: { skinFeelAfter: 'No reaction, skin feels normal', skinFeelBefore: 'Normal, no issues' },
  },
  {
    id: 'p-malibu-6',
    lat: 34.0266, lng: -118.7791,
    city: 'Malibu', region: 'California, USA',
    location: 'Malibu Beach, CA', environment: 'Beach / Water',
    date: 'Mar 14, 2026', dateISO: '2026-03-14',
    startTime: '1:05 PM', endTime: '3:00 PM',
    duration: '1h 55m', durationMinutes: 115,
    score: 58, peakUV: 6.2, avgDepletionRate: 0.51,
    conditions: 'Mild · High activity · 2 water events',
    conditionFlags: { highActivity: true, highHumidity: false, waterEvents: true, highUV: false },
    temperature: 69, humidity: 41, activityLevel: 'High',
    avgAlertResponseMinutes: null, hadProtectionGap: true,
    postSession: { skinFeelAfter: 'No reaction, skin feels normal', skinFeelBefore: 'Normal, no issues' },
  },
  {
    id: 'p-malibu-7',
    lat: 34.0261, lng: -118.7799,
    city: 'Malibu', region: 'California, USA',
    location: 'Malibu Beach, CA', environment: 'Beach / Water',
    date: 'Jun 18, 2026', dateISO: '2026-06-18',
    startTime: '10:40 AM', endTime: '12:58 PM',
    duration: '2h 18m', durationMinutes: 138,
    score: 95, peakUV: 8.6, avgDepletionRate: 0.5,
    conditions: 'Hot · Moderate activity · 3 water events',
    conditionFlags: { highActivity: false, highHumidity: true, waterEvents: true, highUV: true },
    temperature: 90, humidity: 75, activityLevel: 'Moderate',
    avgAlertResponseMinutes: 2, hadProtectionGap: false,
  },
  {
    id: 'p-malibu-8',
    lat: 34.0257, lng: -118.7803,
    city: 'Malibu', region: 'California, USA',
    location: 'Malibu Beach, CA', environment: 'Beach / Water',
    date: 'Jul 2, 2026', dateISO: '2026-07-02',
    startTime: '10:15 AM', endTime: '12:30 PM',
    duration: '2h 15m', durationMinutes: 135,
    score: 97, peakUV: 8.2, avgDepletionRate: 0.47,
    conditions: 'Hot · Low activity · 2 water events',
    conditionFlags: { highActivity: false, highHumidity: true, waterEvents: true, highUV: true },
    temperature: 89, humidity: 73, activityLevel: 'Low',
    avgAlertResponseMinutes: 2, hadProtectionGap: false,
  },

  // ── Griffith Park, CA ───────────────────────────────────────────
  {
    id: '2',
    lat: 34.1365, lng: -118.2942,
    city: 'Los Angeles', region: 'California, USA',
    location: 'Griffith Park, CA', environment: 'Outdoor / Trail',
    date: 'May 28, 2026', dateISO: '2026-05-28',
    startTime: '7:45 AM', endTime: '9:17 AM',
    duration: '1h 32m', durationMinutes: 92,
    score: 85, peakUV: 5.1, avgDepletionRate: 0.58,
    conditions: 'Mild morning · High activity · Dry',
    conditionFlags: { highActivity: true, highHumidity: false, waterEvents: false, highUV: false },
    temperature: 64, humidity: 35, activityLevel: 'High',
    avgAlertResponseMinutes: 4, hadProtectionGap: false,
  },

  // ── Santa Monica Pier, CA — fastest average depletion ───────────
  {
    id: '3',
    lat: 34.0089, lng: -118.4973,
    city: 'Santa Monica', region: 'California, USA',
    location: 'Santa Monica Pier, CA', environment: 'Beach / Urban',
    date: 'May 20, 2026', dateISO: '2026-05-20',
    startTime: '12:00 PM', endTime: '3:05 PM',
    duration: '3h 05m', durationMinutes: 185,
    score: 78, peakUV: 9.2, avgDepletionRate: 0.74,
    conditions: 'Peak midday UV · High activity · 2 water events',
    conditionFlags: { highActivity: true, highHumidity: true, waterEvents: true, highUV: true },
    temperature: 86, humidity: 68, activityLevel: 'High',
    avgAlertResponseMinutes: 9, hadProtectionGap: true,
  },

  // ── Waikiki, Hawaii — three tightly-scored sessions ─────────────
  {
    id: 'p-waikiki-1',
    lat: 21.2793, lng: -157.8294,
    city: 'Honolulu', region: 'Hawaii, USA',
    location: 'Waikiki Beach, HI', environment: 'Beach / Water',
    date: 'Apr 12, 2026', dateISO: '2026-04-12',
    startTime: '10:10 AM', endTime: '1:22 PM',
    duration: '3h 12m', durationMinutes: 192,
    score: 82, peakUV: 11.2, avgDepletionRate: 0.66,
    conditions: 'Extreme UV · High activity · 4 water events',
    conditionFlags: { highActivity: true, highHumidity: true, waterEvents: true, highUV: true },
    temperature: 87, humidity: 79, activityLevel: 'High',
    avgAlertResponseMinutes: 5, hadProtectionGap: false,
  },
  {
    id: 'p-waikiki-2',
    lat: 21.2801, lng: -157.8311,
    city: 'Honolulu', region: 'Hawaii, USA',
    location: 'Waikiki Beach, HI', environment: 'Beach / Water',
    date: 'Apr 14, 2026', dateISO: '2026-04-14',
    startTime: '8:30 AM', endTime: '10:45 AM',
    duration: '2h 15m', durationMinutes: 135,
    score: 88, peakUV: 9.8, avgDepletionRate: 0.61,
    conditions: 'Intense UV · Moderate activity · 2 water events',
    conditionFlags: { highActivity: false, highHumidity: true, waterEvents: true, highUV: true },
    temperature: 85, humidity: 76, activityLevel: 'Moderate',
    avgAlertResponseMinutes: 3, hadProtectionGap: false,
  },
  {
    id: 'p-waikiki-3',
    lat: 21.2787, lng: -157.8302,
    city: 'Honolulu', region: 'Hawaii, USA',
    location: 'Waikiki Beach, HI', environment: 'Beach / Water',
    date: 'Apr 16, 2026', dateISO: '2026-04-16',
    startTime: '9:15 AM', endTime: '11:40 AM',
    duration: '2h 25m', durationMinutes: 145,
    score: 85, peakUV: 10.6, avgDepletionRate: 0.64,
    conditions: 'Extreme UV · High activity · 3 water events',
    conditionFlags: { highActivity: true, highHumidity: true, waterEvents: true, highUV: true },
    temperature: 88, humidity: 80, activityLevel: 'High',
    avgAlertResponseMinutes: 4, hadProtectionGap: false,
  },

  // ── Cancún, Mexico ──────────────────────────────────────────────
  {
    id: 'p-cancun-1',
    lat: 21.135, lng: -86.8475,
    city: 'Cancún', region: 'Mexico',
    location: 'Playa Delfines, Cancún', environment: 'Beach / Water',
    date: 'Mar 3, 2026', dateISO: '2026-03-03',
    startTime: '11:20 AM', endTime: '2:05 PM',
    duration: '2h 45m', durationMinutes: 165,
    score: 83, peakUV: 10.4, avgDepletionRate: 0.6,
    conditions: 'Extreme UV · Low activity · 3 water events',
    conditionFlags: { highActivity: false, highHumidity: true, waterEvents: true, highUV: true },
    temperature: 90, humidity: 82, activityLevel: 'Low',
    avgAlertResponseMinutes: 6, hadProtectionGap: true,
  },

  // ── Barcelona, Spain ────────────────────────────────────────────
  {
    id: 'p-barcelona-1',
    lat: 41.3784, lng: 2.1925,
    city: 'Barcelona', region: 'Spain',
    location: 'Barceloneta Beach', environment: 'Beach / Urban',
    date: 'Aug 19, 2025', dateISO: '2025-08-19',
    startTime: '12:40 PM', endTime: '3:10 PM',
    duration: '2h 30m', durationMinutes: 150,
    score: 79, peakUV: 8.1, avgDepletionRate: 0.45,
    conditions: 'Hot · Low activity · 1 water event',
    conditionFlags: { highActivity: false, highHumidity: false, waterEvents: true, highUV: true },
    temperature: 84, humidity: 55, activityLevel: 'Low',
    avgAlertResponseMinutes: 5, hadProtectionGap: false,
  },

  // ── Lake Tahoe, CA — altitude session ───────────────────────────
  {
    id: 'p-tahoe-1',
    lat: 39.0968, lng: -120.0324,
    city: 'Lake Tahoe', region: 'California, USA',
    location: 'Lake Tahoe, CA', environment: 'Outdoor / Alpine',
    date: 'Feb 21, 2026', dateISO: '2026-02-21',
    startTime: '10:00 AM', endTime: '2:30 PM',
    duration: '4h 30m', durationMinutes: 270,
    score: 90, peakUV: 6.4, avgDepletionRate: 0.38,
    conditions: 'Snow reflection · High activity · Dry',
    conditionFlags: { highActivity: true, highHumidity: false, waterEvents: false, highUV: false },
    temperature: 31, humidity: 22, activityLevel: 'High',
    avgAlertResponseMinutes: 7, hadProtectionGap: true,
  },
];

export default mockPassportSessions;
