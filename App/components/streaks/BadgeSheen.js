import React, { useRef, useEffect } from 'react';
import { Animated, StyleSheet, View, Easing } from 'react-native';
import Svg, {
  Defs, ClipPath, Polygon, Circle, LinearGradient, Stop, Rect, G,
} from 'react-native-svg';
import { SHAPE_POINTS, CIRCLE_RADIUS } from './badgeShapes';

// A light band that sweeps diagonally across an earned emblem — the "glisten".
//
// This lives INSIDE an <Svg> and clips with <ClipPath> rather than wrapping a
// moving View in a MaskedView. The MaskedView version rendered nothing on
// device: on iOS it composites its children into a masked layer, and a
// native-driver transform on a child updates that layer without the mask
// repainting, so the band swept invisibly. Clipping inside SVG is the reliable
// path — the cost is that an SVG attribute can't use the native driver, so this
// one loop runs on the JS thread (see the note in useBadgeIdleMotion; every
// other badge animation is still native).
//
// Only rendered on earned badges: a locked emblem that glints would look
// interactive when it isn't.

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const SWEEP_MS = 1400;
const REST_MS = 2600;
// All geometry is in the shape's own 0–100 box.
const BAND_W = 34;
const TILT = 18;

let seq = 0;

function BadgeSheen({ size, shape, delay = 0 }) {
  const x = useRef(new Animated.Value(-BAND_W - 20)).current;
  const id = useRef(`shn${++seq}`).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(x, {
          toValue: 100 + 20,
          duration: SWEEP_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false, // SVG attribute — cannot be native-driven
        }),
        Animated.delay(REST_MS),
        Animated.timing(x, { toValue: -BAND_W - 20, duration: 0, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [x, delay]);

  const points = SHAPE_POINTS[shape];

  return (
    <View style={[StyleSheet.absoluteFill, st.center]} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <ClipPath id={`${id}c`}>
            {points
              ? <Polygon points={points} />
              : <Circle cx={50} cy={50} r={CIRCLE_RADIUS} />}
          </ClipPath>
          <LinearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
            <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.55" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </LinearGradient>
        </Defs>

        <G clipPath={`url(#${id}c)`}>
          {/* Taller than the box so the tilt never exposes a corner. */}
          <AnimatedRect
            x={x}
            y={-40}
            width={BAND_W}
            height={180}
            fill={`url(#${id}b)`}
            rotation={TILT}
            originX={50}
            originY={50}
          />
        </G>
      </Svg>
    </View>
  );
}

const st = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});

export default React.memo(BadgeSheen);
