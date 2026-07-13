import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { BlurView } from 'expo-blur';
import colors from '../constants/colors';

const ORBIT_STEPS = 24; // points sampled around the circle for the interpolation table
const ORBIT_INPUT = Array.from({ length: ORBIT_STEPS + 1 }, (_, i) => i / ORBIT_STEPS);

// Default scattered patches — orange tint diffused into white glass, not
// a directional fill. Radius/period/phase vary per blob so the wash keeps
// reshaping instead of moving in lockstep. Shared default so every glass
// surface in the app reads as the same material.
export const DEFAULT_GLASS_BLOBS = [
  { color: colors.orangeMid, size: 150, top: -50, right: -30, opacity: 0.32, rxFrac: 0.30, ryFrac: 0.55, periodMs: 6200, phase: 0 },
  { color: colors.orangeLight, size: 120, bottom: -35, left: -20, opacity: 0.4, rxFrac: 0.26, ryFrac: 0.5, periodMs: 7400, phase: Math.PI / 2 },
  { color: colors.orange, size: 70, bottom: 6, right: '28%', opacity: 0.16, rxFrac: 0.22, ryFrac: 0.4, periodMs: 5200, phase: Math.PI },
  { color: colors.orangeLight, size: 60, top: -10, left: '22%', opacity: 0.3, rxFrac: 0.2, ryFrac: 0.45, periodMs: 6800, phase: (3 * Math.PI) / 2 },
];

// Reusable animated glassmorphic background: a white base, a handful of
// soft color patches that continuously orbit behind a blur (the blur is
// what diffuses their hard edges into a loose, scattered wash instead of
// a fixed fill), and a translucent glass border. Purely decorative — an
// absolute-fill layer the caller stacks real content on top of.
export default React.memo(function GlassSurface({ borderRadius = 28, blobs = DEFAULT_GLASS_BLOBS }) {
  const [size, setSize] = useState({ w: 1, h: 1 });
  const onLayout = useCallback((e) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  }, []);

  const orbitProgress = useRef(blobs.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    const loops = blobs.map((b, i) => Animated.loop(
      Animated.timing(orbitProgress[i], {
        toValue: 1,
        duration: b.periodMs,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ));
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [orbitProgress, blobs]);

  // Circular path per blob: radius is a fraction of the *measured* size,
  // so it visibly travels around the whole surface on any screen.
  const orbitTransforms = useMemo(() => blobs.map((b, i) => {
    const rx = size.w * b.rxFrac;
    const ry = size.h * b.ryFrac;
    const outputRangeX = ORBIT_INPUT.map((f) => Math.cos(b.phase + f * Math.PI * 2) * rx);
    const outputRangeY = ORBIT_INPUT.map((f) => Math.sin(b.phase + f * Math.PI * 2) * ry);
    return {
      translateX: orbitProgress[i].interpolate({ inputRange: ORBIT_INPUT, outputRange: outputRangeX }),
      translateY: orbitProgress[i].interpolate({ inputRange: ORBIT_INPUT, outputRange: outputRangeY }),
    };
  }), [size, orbitProgress, blobs]);

  return (
    <View
      onLayout={onLayout}
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, st.clip, { borderRadius }]}
    >
      <View style={[StyleSheet.absoluteFill, st.base]} />
      {blobs.map((b, i) => (
        <Animated.View
          key={i}
          style={[
            st.blob,
            {
              width: b.size,
              height: b.size,
              borderRadius: b.size / 2,
              backgroundColor: b.color,
              opacity: b.opacity,
              top: b.top,
              bottom: b.bottom,
              left: b.left,
              right: b.right,
              transform: [
                { translateX: orbitTransforms[i].translateX },
                { translateY: orbitTransforms[i].translateY },
              ],
            },
          ]}
        />
      ))}
      <BlurView
        intensity={40}
        tint="light"
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, st.border, { borderRadius }]} />
    </View>
  );
});

const st = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
  base: {
    backgroundColor: colors.white,
  },
  blob: {
    position: 'absolute',
  },
  border: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
});
