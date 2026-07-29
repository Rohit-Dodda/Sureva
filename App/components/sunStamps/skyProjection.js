// Pure geometry for mapping sky positions onto the screen, and for deciding
// whether the phone is aimed at a given point in the sky.
//
// Kept in its own JSX-free module so it can be exercised in plain node like
// the services are — the aim check decides whether a capture is allowed at
// all, and a wrap-around bug at the 0/360 compass seam would be invisible in
// a component test.

// Degrees of sky visible across the screen. A phone camera's horizontal field
// of view is roughly 60-70°; using real figures keeps the overlay lined up
// with what the camera actually sees.
export const FOV_H = 66;
export const FOV_V = 48;

// How close the phone must be aimed at the sun before a capture is allowed.
// Roughly the middle third of the horizontal field of view.
export const LOCK_DEGREES = 16;

// Shortest signed distance between two compass bearings, so a target at 359°
// seen from 1° reads as -2° rather than +358° and stays on the correct side
// of the screen.
export function bearingDelta(target, from) {
  return ((target - from + 540) % 360) - 180;
}

// Projects a sky position (azimuth/altitude) onto screen coordinates, given
// where the phone is currently pointed. Returns null when the point is behind
// the user, so callers can skip drawing it.
export function project(azimuth, altitude, heading, elevation, width, height) {
  const dAz = bearingDelta(azimuth, heading);
  const dAlt = altitude - elevation;
  if (Math.abs(dAz) > 90) return null;
  return {
    x: width / 2 + (dAz / FOV_H) * width,
    y: height / 2 - (dAlt / FOV_V) * height,
    dAz,
    dAlt,
  };
}

// Whether the phone is aimed at the sun, and if not, which way to turn.
//
// Aim gates WHETHER a capture is allowed; it never changes WHAT tier results.
// Rarity is a fact about the sky on a given day — letting the direction the
// user happens to point change it would make the tier arbitrary and trivially
// gameable (aim at the sun on an ordinary afternoon, collect a rare stamp).
export function aimAtSun(sun, heading, elevation) {
  if (!sun) return { locked: false, hint: null };

  // Below the horizon — there's no light left to catch today.
  if (sun.altitude <= 0) {
    return { locked: false, hint: 'The sun’s already down — catch it tomorrow.' };
  }

  // No compass (permission denied, or a device without a magnetometer).
  // Degrade to allowing the capture rather than locking the user out of the
  // whole feature over a sensor they may not have.
  if (heading == null) return { locked: true, hint: null };

  const dAz = bearingDelta(sun.azimuth, heading);
  const dAlt = sun.altitude - elevation;
  if (Math.hypot(dAz, dAlt) <= LOCK_DEGREES) return { locked: true, hint: null };

  // Name the larger error first, so the hint always points at the fastest way
  // to close the gap instead of nudging along the shorter axis.
  if (Math.abs(dAz) > Math.abs(dAlt)) {
    return { locked: false, hint: dAz > 0 ? 'Turn right to find the sun' : 'Turn left to find the sun' };
  }
  return { locked: false, hint: dAlt > 0 ? 'Tilt up to find the sun' : 'Tilt down to find the sun' };
}

export default { FOV_H, FOV_V, LOCK_DEGREES, bearingDelta, project, aimAtSun };
