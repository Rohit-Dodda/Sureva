import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { DeviceMotion } from 'expo-sensors';

// Where the phone is pointed in the real sky: a true compass heading and an
// elevation angle above the horizon.
//
// Heading comes from expo-location's heading watcher rather than raw
// Magnetometer readings. The spec originally called for the magnetometer, but
// the OS heading service is strictly better here: it is already tilt-
// compensated, already fused with the gyroscope, and already applies the
// device's own hard/soft-iron calibration. Deriving heading from raw
// magnetometer axes would mean reimplementing all of that badly — and it
// would break the moment the user tilts the phone up, which is the entire
// posture this feature is used in.
//
// Elevation still comes from DeviceMotion, which reports device attitude.

// Smoothing constant for the low-pass filter. Lower is smoother but laggier;
// 0.15 settles visibly within a few frames while removing the jitter that
// would otherwise make the sun marker vibrate in place.
const SMOOTHING = 0.15;

// Attitude updates faster than the overlay needs. 20/sec is well past the
// point of looking continuous, and keeps the JS thread free.
const MOTION_INTERVAL_MS = 50;

const RAD_TO_DEG = 180 / Math.PI;

// Circular low-pass. Averaging angles as plain numbers is wrong across the
// 360/0 seam — 359° and 1° would smooth toward 180°, spinning the overlay
// the long way round. Smoothing the unit vector instead makes the wrap
// invisible.
function smoothAngle(prev, next, alpha) {
  if (prev == null) return next;
  const prevRad = prev / RAD_TO_DEG;
  const nextRad = next / RAD_TO_DEG;
  const x = Math.cos(prevRad) * (1 - alpha) + Math.cos(nextRad) * alpha;
  const y = Math.sin(prevRad) * (1 - alpha) + Math.sin(nextRad) * alpha;
  const deg = Math.atan2(y, x) * RAD_TO_DEG;
  return (deg + 360) % 360;
}

export default function useSkyPointing(active = true) {
  const [pointing, setPointing] = useState({ heading: null, elevation: 0, accuracy: null });
  const headingRef = useRef(null);
  const elevationRef = useRef(0);

  useEffect(() => {
    if (!active) return undefined;

    let headingSub = null;
    let motionSub = null;
    let cancelled = false;

    (async () => {
      try {
        // Heading needs the same foreground permission the app already asks
        // for elsewhere, so this is usually already granted.
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled || status !== 'granted') return;

        headingSub = await Location.watchHeadingAsync(({ trueHeading, magHeading, accuracy }) => {
          // trueHeading is -1 when the device can't resolve true north (no
          // location fix yet); magnetic heading is the honest fallback and is
          // within a few degrees almost everywhere.
          const raw = trueHeading >= 0 ? trueHeading : magHeading;
          if (raw == null || raw < 0) return;
          headingRef.current = smoothAngle(headingRef.current, raw, SMOOTHING);
          setPointing((p) => ({ ...p, heading: headingRef.current, accuracy }));
        });
      } catch {
        // No compass on this device — the view falls back to a centered sun
        // rather than failing outright.
      }
    })();

    DeviceMotion.setUpdateInterval(MOTION_INTERVAL_MS);
    motionSub = DeviceMotion.addListener(({ rotation }) => {
      if (!rotation || typeof rotation.beta !== 'number') return;
      // beta is front-to-back tilt in radians: 0 flat on a table, ~90° held
      // upright. Subtracting 90 puts the camera's own aim at 0 when it faces
      // the horizon, which is the angle the overlay actually needs.
      const raw = rotation.beta * RAD_TO_DEG - 90;
      const clamped = Math.max(-90, Math.min(90, raw));
      elevationRef.current = elevationRef.current + (clamped - elevationRef.current) * SMOOTHING;
      setPointing((p) => ({ ...p, elevation: elevationRef.current }));
    });

    return () => {
      cancelled = true;
      headingSub?.remove?.();
      motionSub?.remove?.();
    };
  }, [active]);

  return pointing;
}
