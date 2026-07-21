import colors from './colors';

// The streak tiers. streakTier() in services/StreakService.js decides which key
// a given streak length falls into; this file is the single source for how each
// tier LOOKS. Both the post-check-in reveal and the badge/background read the
// same entry, so a streak always presents the same everywhere.
//
// Progression of distinct hues (not recolors of one another):
//   base   1–6    fiery orange
//   blue   7–49   blue flame (hotter than orange)
//   gold   50–99  golden
//   pink   100–399 pink flame
//   purple 400–599 purple flame
//   green  600+   emerald
// All colors come from constants/colors.js (never a raw hex here).
export const STREAK_TIERS = {
  base: {
    key: 'base',
    label: 'day streak',
    gradient: [colors.gradOrangeStart, colors.gradOrangeEnd],
    glow: colors.orange,
    flame: colors.orange,
    animation: 'pulse',
    rays: false,
    breatheMs: 2600,
  },
  blue: {
    key: 'blue',
    label: 'day streak',
    title: 'Blazing',
    gradient: [colors.flameBlueStart, colors.flameBlueEnd],
    glow: colors.flameBlue,
    flame: colors.flameBlue,
    animation: 'spring',
    rays: false,
    breatheMs: 2200,
  },
  gold: {
    key: 'gold',
    label: 'day streak',
    title: 'Golden',
    gradient: [colors.flameGoldStart, colors.flameGoldEnd],
    glow: colors.flameGold,
    flame: colors.flameGold,
    rayColor: colors.flameGoldStart,
    animation: 'flare',
    rays: true,
    raysMs: 14000,
    breatheMs: 1900,
  },
  pink: {
    key: 'pink',
    label: 'day streak',
    title: 'Pink Flame',
    gradient: [colors.flamePinkStart, colors.flamePinkEnd],
    glow: colors.flamePink,
    flame: colors.flamePink,
    rayColor: colors.flamePinkStart,
    animation: 'flare',
    rays: true,
    raysMs: 12000,
    breatheMs: 1800,
  },
  purple: {
    key: 'purple',
    label: 'day streak',
    title: 'Purple Flame',
    gradient: [colors.flamePurpleStart, colors.flamePurpleEnd],
    glow: colors.flamePurple,
    flame: colors.flamePurple,
    rayColor: colors.flamePurpleStart,
    animation: 'aurora',
    rays: true,
    raysMs: 10000,
    breatheMs: 1700,
  },
  green: {
    key: 'green',
    label: 'day streak',
    title: 'Emerald',
    gradient: [colors.flameGreenStart, colors.flameGreenEnd],
    glow: colors.flameGreen,
    flame: colors.flameGreen,
    rayColor: colors.flameGreenStart,
    animation: 'aurora',
    rays: true,
    raysMs: 9000,
    breatheMs: 1600,
  },
};

export function tierFor(key) {
  return STREAK_TIERS[key] || STREAK_TIERS.base;
}
