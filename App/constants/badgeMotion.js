// Idle motion for an EARNED emblem's illustration, keyed by icon name. A
// locked badge never moves — stillness is what makes "not yours yet" read.
//
// Each icon moves the way the thing it depicts would: radial suns and the globe
// turn, the wave and the pin bob, the hourglass sways, the droplet
// and the tick swell. Motion is slow and small on purpose — this is a badge
// catching your eye across a scrolling grid, not a loading spinner.
//
// All four types animate a transform only, so every loop runs on the native
// driver and a full grid of them stays off the JS thread.
export const BADGE_MOTION = {
  // ── Achievement illustrations ──
  droplet: { type: 'pulse', dur: 2600, amount: 0.07 },
  hourglass: { type: 'sway', dur: 3400, deg: 8 },
  pin: { type: 'bob', dur: 2400, dist: 2.5 },
  peak: { type: 'spin', dur: 14000 },
  wave: { type: 'bob', dur: 2600, dist: 2 },
  sunrise: { type: 'bob', dur: 3000, dist: 2.5 },
  sunset: { type: 'bob', dur: 3200, dist: 2.5 },
  mountain: { type: 'sway', dur: 4200, deg: 3 },
  globe: { type: 'spin', dur: 16000 },
  check: { type: 'pulse', dur: 2800, amount: 0.05 },
  snow: { type: 'spin', dur: 18000 },

  // ── Streak-tier illustrations ──
  flame: { type: 'pulse', dur: 1800, amount: 0.09 },
  sunburst: { type: 'spin', dur: 15000 },
  flameSun: { type: 'spin', dur: 13000 },
  corona: { type: 'spin', dur: 20000 },
  radiant: { type: 'spin', dur: 16000 },
};

// How far the emblem's gradient drifts toward its reversed self, and how long a
// full there-and-back takes. Subtle: the badge should look like it's catching
// changing light, not flashing a second colourway.
export const GRADIENT_DRIFT = { peak: 0.7, dur: 5200 };
