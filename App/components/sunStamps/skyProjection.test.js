// Self-contained test suite for the sky projection and aim lock. Run with:
//   node App/components/sunStamps/skyProjection.test.js
//
// This math decides whether a capture is allowed at all, so its failure mode
// is a user who physically cannot use the feature. The compass wrap at the
// 0/360 seam is the specific trap: naive subtraction makes a sun 2° away read
// as 358° away, which would lock the shutter while pointing straight at it.

import { bearingDelta, project, aimAtSun, LOCK_DEGREES, FOV_H } from './skyProjection.js';

let passed = 0;
let failed = 0;

function ok(name, cond, detail = '') {
  if (cond) { passed += 1; return; }
  failed += 1;
  console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}

const sun = (azimuth, altitude) => ({ azimuth, altitude });

console.log('\nskyProjection\n');

// ─── bearingDelta ─────────────────────────────────────────────

ok('same bearing is zero', bearingDelta(180, 180) === 0);
ok('east of target is positive', bearingDelta(190, 180) === 10);
ok('west of target is negative', bearingDelta(170, 180) === -10);
ok('wraps forward across north', bearingDelta(2, 358) === 4, `got ${bearingDelta(2, 358)}`);
ok('wraps backward across north', bearingDelta(358, 2) === -4, `got ${bearingDelta(358, 2)}`);
ok('opposite bearing is ±180', Math.abs(bearingDelta(0, 180)) === 180);
ok('never exceeds 180 in magnitude', (() => {
  for (let a = 0; a < 360; a += 7) {
    for (let b = 0; b < 360; b += 11) {
      if (Math.abs(bearingDelta(a, b)) > 180) return false;
    }
  }
  return true;
})());

// ─── project ──────────────────────────────────────────────────

const W = 400;
const H = 800;

const centered = project(180, 30, 180, 30, W, H);
ok('point dead ahead lands at screen center',
  Math.abs(centered.x - W / 2) < 0.001 && Math.abs(centered.y - H / 2) < 0.001);

const toTheRight = project(190, 30, 180, 30, W, H);
ok('point to the east lands right of center', toTheRight.x > W / 2);

const toTheLeft = project(170, 30, 180, 30, W, H);
ok('point to the west lands left of center', toTheLeft.x < W / 2);

// Screen y grows downward, so a HIGHER sun must land at a SMALLER y.
const higher = project(180, 45, 180, 30, W, H);
ok('higher altitude lands above center', higher.y < H / 2);
const lower = project(180, 15, 180, 30, W, H);
ok('lower altitude lands below center', lower.y > H / 2);

ok('point behind the user is culled', project(0, 30, 180, 30, W, H) === null);
ok('point across the wrap seam still projects', project(2, 30, 358, 30, W, H) !== null);

// Half the field of view should reach roughly the screen edge.
const edge = project(180 + FOV_H / 2, 30, 180, 30, W, H);
ok('half a field of view reaches the frame edge', Math.abs(edge.x - W) < 1, `got x=${edge.x.toFixed(1)}`);

// ─── aimAtSun ─────────────────────────────────────────────────

ok('no sun data means no lock', aimAtSun(null, 180, 30).locked === false);

// Pointed straight at it.
ok('dead on locks', aimAtSun(sun(250, 30), 250, 30).locked === true);
ok('dead on shows no hint', aimAtSun(sun(250, 30), 250, 30).hint === null);

// Just inside and just outside the tolerance.
ok('just inside tolerance locks', aimAtSun(sun(250, 30), 250 + LOCK_DEGREES - 1, 30).locked === true);
ok('just outside tolerance does not lock', aimAtSun(sun(250, 30), 250 + LOCK_DEGREES + 1, 30).locked === false);

// Diagonal error must combine both axes, not just the larger one — being 12°
// off in both directions is 17° away in total and should NOT lock.
const diagonal = aimAtSun(sun(250, 30), 262, 42);
ok('diagonal error combines both axes', diagonal.locked === false,
  'a 12°+12° offset is ~17° away and must not lock');

// Directional hints point the shortest way to the sun.
ok('sun to the east says turn right', aimAtSun(sun(290, 30), 250, 30).hint === 'Turn right to find the sun');
ok('sun to the west says turn left', aimAtSun(sun(210, 30), 250, 30).hint === 'Turn left to find the sun');
ok('sun above says tilt up', aimAtSun(sun(250, 60), 250, 20).hint === 'Tilt up to find the sun');
ok('sun below says tilt down', aimAtSun(sun(250, 10), 250, 60).hint === 'Tilt down to find the sun');

// The wrap seam again, this time through the aim check — the failure that
// would strand a user pointing due north.
ok('locks across the wrap seam', aimAtSun(sun(2, 30), 358, 30).locked === true,
  'sun 4° away across north must lock');
ok('hint is correct across the seam',
  aimAtSun(sun(30, 30), 350, 30).hint === 'Turn right to find the sun',
  'sun 40° clockwise across north should say right');
ok('hint is correct across the seam, other way',
  aimAtSun(sun(350, 30), 30, 30).hint === 'Turn left to find the sun');

// Below the horizon: nothing to catch, and the copy must not blame the user.
const down = aimAtSun(sun(280, -3), 280, 0);
ok('sun below horizon never locks', down.locked === false);
ok('sun below horizon explains why', /already down/i.test(down.hint), down.hint);
ok('sun exactly on the horizon does not lock', aimAtSun(sun(280, 0), 280, 0).locked === false);

// Graceful degradation: a device with no compass must stay usable.
ok('missing heading still allows capture', aimAtSun(sun(250, 30), null, 0).locked === true);
ok('missing heading shows no hint', aimAtSun(sun(250, 30), null, 0).hint === null);
ok('missing heading still respects the horizon',
  aimAtSun(sun(250, -5), null, 0).locked === false);

// Every reachable aim resolves to exactly one state.
ok('every aim is either locked or hinted', (() => {
  for (let az = 0; az < 360; az += 13) {
    for (let alt = 1; alt < 90; alt += 17) {
      for (let head = 0; head < 360; head += 29) {
        const r = aimAtSun(sun(az, alt), head, 20);
        if (r.locked && r.hint !== null) return false;
        if (!r.locked && r.hint === null) return false;
      }
    }
  }
  return true;
})());

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
