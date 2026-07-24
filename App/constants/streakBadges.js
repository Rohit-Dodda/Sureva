import colors from './colors';

// Streak milestone badges — the gamified gallery under the Streaks calendar.
// One per streak tier (7/50/100/400/600), each with its own name, gradient,
// emblem shape, inner icon, and a FIXED ring fill (every earned badge reads as
// "mostly full", not an in-progress meter). Colors mirror constants/colors.js
// exactly (matching the design handoff). A badge unlocks once the user's
// longest streak ever reaches `days`.
export const STREAK_BADGES = [
  { key: 'blue', name: 'Ray Rookie', days: 7, gradient: [colors.flameBlueStart, colors.flameBlueEnd], glow: colors.flameBlue, ray: null, shape: 'hexagon', icon: 'flame', ring: 45 },
  { key: 'gold', name: 'Sun Apprentice', days: 50, gradient: [colors.flameGoldStart, colors.flameGoldEnd], glow: colors.flameGold, ray: colors.flameGoldStart, shape: 'circle', icon: 'sunburst', ring: 60 },
  { key: 'pink', name: 'Flame Adept', days: 100, gradient: [colors.flamePinkStart, colors.flamePinkEnd], glow: colors.flamePink, ray: colors.flamePinkStart, shape: 'scallop', icon: 'flameSun', ring: 72 },
  { key: 'purple', name: 'Eclipse Master', days: 400, gradient: [colors.flamePurpleStart, colors.flamePurpleEnd], glow: colors.flamePurple, ray: colors.flamePurpleStart, shape: 'star8', icon: 'corona', ring: 88 },
  { key: 'green', name: 'Solar Sage', days: 600, gradient: [colors.flameGreenStart, colors.flameGreenEnd], glow: colors.flameGreen, ray: colors.flameGreenStart, shape: 'shield', icon: 'radiant', ring: 100 },
];
