// The unified "Badges & Achievements" gallery — streak milestones and
// achievements presented as one collection. Streak badges reward *consistency*
// (days logged in a row), achievements reward *what those sessions contained*,
// but to the user they're all just badges, so they live under one heading and
// one "More".

// Section order on the full Badges screen. Streak milestones lead because they
// are the ones every user makes progress on from day one.
export const BADGE_SECTIONS = [
  { key: 'streak', title: 'Streak Milestones', blurb: 'Days logged back to back' },
  { key: 'habit', title: 'Habits', blurb: 'How consistently you protect yourself' },
  { key: 'place', title: 'Places', blurb: 'Where your sessions have taken you' },
  { key: 'condition', title: 'Conditions', blurb: 'What you were up against' },
];

// The six on the Streaks screen before "More" — two streak milestones and four
// achievements, chosen so no emblem shape or hue repeats and the row reads as a
// sample of the whole collection rather than one corner of it.
export const FEATURED = [
  { kind: 'streak', key: 'blue' },        // hexagon, blue
  { kind: 'streak', key: 'gold' },        // circle, gold
  { kind: 'achievement', key: 'reapply' }, // shield, teal
  { kind: 'achievement', key: 'peakUv' },  // star8, red
  { kind: 'achievement', key: 'water' },   // scallop, cyan
  { kind: 'achievement', key: 'flawless' }, // squircle, green
];

// Stable identity across the two badge families, used for React keys and for
// the newly-earned map (a streak key and an achievement key could collide).
export const idOf = (kind, key) => `${kind}:${key}`;
