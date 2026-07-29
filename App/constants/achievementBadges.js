import colors from './colors.js';

// Achievement badges — the tiered gallery that sits beside the streak
// milestones. Where STREAK_BADGES reward *consistency* (days logged in a row),
// these reward *what those sessions contained*: habits, places, conditions,
// and community. Each achievement has one emblem shape + illustration, and
// three escalating levels (I → III) that share it.
//
// `metric` names the value AchievementService computes from real session
// history; `thresholds` is the value needed for levels I, II and III. An
// achievement whose metric has no data source yet simply never unlocks — it
// renders in the design's locked state rather than showing invented progress.
//
// Ring fill is fixed per level (RING_BY_LEVEL), never the distance to the next
// threshold: an earned badge should read as an award, not an in-progress meter.
export const RING_BY_LEVEL = [45, 72, 100];

export const ACHIEVEMENT_BADGES = [
  {
    key: 'reapply',
    family: 'Reapply Ritual',
    category: 'habit',
    icon: 'droplet',
    shape: 'shield',
    gradient: [colors.achReapplyStart, colors.achReapplyEnd],
    glow: colors.achReapplyAccent,
    shade: colors.achReapplyShade,
    metric: 'reapplications',
    thresholds: [10, 100, 500],
    tiers: [
      { name: 'Fresh Coat', goal: '10 reapplications' },
      { name: 'Layer Loyalist', goal: '100 reapplications' },
      { name: 'Reapply Royalty', goal: '500 reapplications' },
    ],
  },
  {
    key: 'sunHours',
    family: 'Sun Hours',
    category: 'habit',
    icon: 'hourglass',
    shape: 'circle',
    gradient: [colors.flameGoldStart, colors.flameGoldEnd],
    glow: colors.flameGold,
    shade: colors.achSunHoursShade,
    metric: 'sunHours',
    thresholds: [50, 250, 1000],
    tiers: [
      { name: 'Daylight Dabbler', goal: '50 hours tracked' },
      { name: 'Sun Seasoned', goal: '250 hours tracked' },
      { name: 'Thousand-Hour Sun', goal: '1,000 hours tracked' },
    ],
  },
  {
    key: 'places',
    family: 'Map Roamer',
    category: 'place',
    icon: 'pin',
    shape: 'hex',
    gradient: [colors.achPlacesStart, colors.achPlacesEnd],
    glow: colors.achPlacesAccent,
    shade: colors.achPlacesShade,
    metric: 'cities',
    thresholds: [3, 10, 25],
    tiers: [
      { name: 'Local Explorer', goal: '3 cities tracked' },
      { name: 'Country Hopper', goal: '10 cities tracked' },
      { name: 'Globe Roamer', goal: '25 cities tracked' },
    ],
  },
  {
    key: 'peakUv',
    family: 'Peak Chaser',
    category: 'condition',
    icon: 'peak',
    shape: 'star8',
    gradient: [colors.achPeakUvStart, colors.achPeakUvEnd],
    glow: colors.achPeakUvAccent,
    shade: colors.achPeakUvShade,
    metric: 'peakUv',
    thresholds: [8, 10, 12],
    tiers: [
      { name: 'High Noon', goal: 'Survived UV 8' },
      { name: 'Extreme Exposure', goal: 'Survived UV 10' },
      { name: 'Peak Chaser', goal: 'Survived UV 12' },
    ],
  },
  {
    key: 'water',
    family: 'Tide Rider',
    category: 'condition',
    icon: 'wave',
    shape: 'scallop',
    gradient: [colors.achWaterStart, colors.achWaterEnd],
    glow: colors.achWaterAccent,
    shade: colors.achWaterShade,
    metric: 'waterSessions',
    thresholds: [5, 25, 100],
    tiers: [
      { name: 'Toe Dipper', goal: '5 water sessions' },
      { name: 'Surf Regular', goal: '25 water sessions' },
      { name: 'Ocean Veteran', goal: '100 water sessions' },
    ],
  },
  {
    key: 'dawn',
    family: 'First Light',
    category: 'condition',
    icon: 'sunrise',
    shape: 'pentagon',
    gradient: [colors.achDawnStart, colors.achDawnEnd],
    glow: colors.achDawnAccent,
    shade: colors.achDawnShade,
    metric: 'dawnSessions',
    thresholds: [5, 25, 100],
    tiers: [
      { name: 'Early Riser', goal: '5 sunrise sessions' },
      { name: 'Dawn Patrol', goal: '25 sunrise sessions' },
      { name: 'Sunrise Sentinel', goal: '100 sunrise sessions' },
    ],
  },
  {
    key: 'dusk',
    family: 'Golden Hour',
    category: 'condition',
    icon: 'sunset',
    shape: 'octagon',
    gradient: [colors.achDuskStart, colors.achDuskEnd],
    glow: colors.achDuskAccent,
    shade: colors.achDuskShade,
    metric: 'duskSessions',
    thresholds: [5, 25, 100],
    tiers: [
      { name: 'Dusk Watcher', goal: '5 golden hours' },
      { name: 'Golden Regular', goal: '25 golden hours' },
      { name: 'Sunset Sage', goal: '100 golden hours' },
    ],
  },
  {
    key: 'altitude',
    family: 'Altitude Ace',
    category: 'place',
    icon: 'mountain',
    shape: 'diamond',
    gradient: [colors.achAltitudeStart, colors.achAltitudeEnd],
    glow: colors.achAltitudeAccent,
    shade: colors.achAltitudeShade,
    // The wearable has no barometer, so elevation comes from the PHONE's GPS
    // fix at session start (LocationService.readAltitude) and is stored on
    // sessions.altitude_m. Null when location was denied or the fix carried no
    // trustworthy altitude, which reads as no progress rather than sea level.
    metric: 'maxAltitudeM',
    thresholds: [1000, 2500, 4000],
    tiers: [
      { name: 'Foothill Footing', goal: '1,000 m elevation' },
      { name: 'Highlander', goal: '2,500 m elevation' },
      { name: 'Summit Skin', goal: '4,000 m elevation' },
    ],
  },
  {
    key: 'latitude',
    family: 'Equator Line',
    category: 'place',
    icon: 'globe',
    shape: 'circle',
    gradient: [colors.achLatitudeStart, colors.achLatitudeEnd],
    glow: colors.achLatitudeAccent,
    shade: colors.achLatitudeShade,
    // The metric is already a level (0–3), so the thresholds are the levels.
    metric: 'latitudeLevel',
    thresholds: [1, 2, 3],
    tiers: [
      { name: 'Tropic Tourist', goal: 'Tracked in the tropics' },
      { name: 'Equator Crosser', goal: 'Tracked within 5° of 0°' },
      { name: 'Hemisphere Hopper', goal: 'Tracked in both hemispheres' },
    ],
  },
  {
    key: 'flawless',
    family: 'Flawless Day',
    category: 'habit',
    icon: 'check',
    shape: 'squircle',
    gradient: [colors.achFlawlessStart, colors.achFlawlessEnd],
    glow: colors.achFlawlessAccent,
    shade: colors.achFlawlessShade,
    metric: 'flawlessDays',
    thresholds: [1, 10, 50],
    tiers: [
      { name: 'Clean Sheet', goal: '1 fully protected day' },
      { name: 'Ten Perfect', goal: '10 fully protected days' },
      { name: 'Fifty Flawless', goal: '50 fully protected days' },
    ],
  },
  {
    key: 'snow',
    family: 'Snow Glare',
    category: 'condition',
    icon: 'snow',
    shape: 'star6',
    gradient: [colors.achSnowStart, colors.achSnowEnd],
    glow: colors.achSnowAccent,
    shade: colors.achSnowShade,
    metric: 'snowDays',
    thresholds: [3, 15, 40],
    tiers: [
      { name: 'Piste Protected', goal: '3 days on snow' },
      { name: 'Alpine Reflect', goal: '15 days on snow' },
      { name: 'Glacier Guard', goal: '40 days on snow' },
    ],
  },
];

// Section order on the full Achievements screen. `habit` is what you do,
// `place` is where you did it, `condition` is what you were up against.
export const ACHIEVEMENT_CATEGORIES = [
  { key: 'habit', title: 'Habits', blurb: 'How consistently you protect yourself' },
  { key: 'place', title: 'Places', blurb: 'Where your sessions have taken you' },
  { key: 'condition', title: 'Conditions', blurb: 'What you were up against' },
];

// The six shown on the Streaks screen before "More" — one per emblem shape and
// hue so the preview row reads as a varied set rather than a colour ramp.
export const FEATURED_KEYS = ['reapply', 'sunHours', 'places', 'peakUv', 'water', 'flawless'];

export function badgesInCategory(key) {
  return ACHIEVEMENT_BADGES.filter((b) => b.category === key);
}

export const FEATURED_BADGES = FEATURED_KEYS
  .map((k) => ACHIEVEMENT_BADGES.find((b) => b.key === k))
  .filter(Boolean);

// Highest level (1–3) reached for `value`, or 0 when nothing is earned yet.
export function levelFor(badge, value) {
  if (value == null) return 0;
  let level = 0;
  for (let i = 0; i < badge.thresholds.length; i++) {
    if (value >= badge.thresholds[i]) level = i + 1;
  }
  return level;
}
