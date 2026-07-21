import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Animated, Easing } from 'react-native';
import { Path } from 'react-native-svg';
import { interpolate as flubberInterpolate } from 'flubber';

// SVG shape morphing for the recap: turn one card's icon into the next card's
// icon as one continuous path change instead of a hard cut at a transition
// boundary. Built on `flubber` (pure JS, no native module) for true path
// interpolation, with a hard-swap fallback if a pair of paths can't be
// interpolated (e.g. malformed input).
//
// Because the interpolated `d` is a plain string that Animated can't drive
// natively, we sample it off an Animated.Value listener into React state —
// the same count-up pattern RecapBigValue uses for its number.

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Build a t -> pathString interpolator between two `d` strings. Never throws:
// on failure it returns a hard-swap interpolator (from until halfway, then to).
export function createMorphInterpolator(from, to, options = {}) {
  const { maxSegmentLength = 2 } = options;
  if (!from || !to) {
    const only = to || from || '';
    return () => only;
  }
  try {
    return flubberInterpolate(from, to, { maxSegmentLength });
  } catch (e) {
    return (t) => (t < 0.5 ? from : to);
  }
}

// Hook: returns the current interpolated `d` string for a from->to morph.
//
// - Pass an external `progress` Animated.Value (0..1) to drive the morph from
//   a shared timeline (e.g. a transition controller). When omitted, an
//   internal value animates 0->1 whenever `active` flips true.
// - `duration`/`delay`/`easing` apply only to the internal driver.
export function useMorph({
  from,
  to,
  progress,
  active = true,
  duration = 600,
  delay = 0,
  easing = Easing.inOut(Easing.cubic),
  maxSegmentLength = 2,
}) {
  const interpolator = useMemo(
    () => createMorphInterpolator(from, to, { maxSegmentLength }),
    [from, to, maxSegmentLength],
  );

  const internal = useRef(new Animated.Value(0)).current;
  const driver = progress || internal;
  const [d, setD] = useState(() => interpolator(progress ? 0 : active ? 0 : 1));

  // Keep the sampled path in sync with the driver's current position.
  useEffect(() => {
    setD(interpolator(driver.__getValue ? driver.__getValue() : 0));
    const id = driver.addListener(({ value }) => setD(interpolator(value)));
    return () => driver.removeListener(id);
  }, [interpolator, driver]);

  // Only run the built-in animation when no external progress is supplied.
  useEffect(() => {
    if (progress) return undefined;
    if (!active) { internal.setValue(0); return undefined; }
    internal.setValue(0);
    const anim = Animated.timing(internal, {
      toValue: 1,
      duration,
      delay,
      easing,
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [progress, active, internal, duration, delay, easing]);

  return d;
}

// Convenience component: a react-native-svg <Path> whose `d` morphs from
// `from` to `to`. Forwards fill/stroke/etc. through `pathProps`.
export function MorphPath({
  from,
  to,
  progress,
  active = true,
  duration = 600,
  delay = 0,
  easing,
  maxSegmentLength = 2,
  ...pathProps
}) {
  const d = useMorph({ from, to, progress, active, duration, delay, easing, maxSegmentLength });
  return <Path d={d} {...pathProps} />;
}

export { AnimatedPath };
