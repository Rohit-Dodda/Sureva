import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import Svg, { Line, Circle } from 'react-native-svg';

const { width: SCREEN_W } = Dimensions.get('window');
const BURST = SCREEN_W * 1.15;
const RAY_COUNT = 16;

// Ambient sun-motif behind every recap card: a slowly rotating ray-burst
// anchored off the top-right corner, plus two soft glow blobs that drift.
// Purely decorative, low-opacity, and native-driven so it never costs frames.
export default React.memo(function RecapDecor({ ray, active }) {
  const spin = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return undefined;
    const a = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 60000, easing: Easing.linear, useNativeDriver: true })
    );
    const b = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 7000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 7000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    a.start();
    b.start();
    return () => { a.stop(); b.stop(); };
  }, [active, spin, drift]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const blobY = drift.interpolate({ inputRange: [0, 1], outputRange: [0, 26] });
  const blobY2 = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -22] });

  const rays = [];
  for (let i = 0; i < RAY_COUNT; i++) {
    const angle = (i / RAY_COUNT) * Math.PI * 2;
    const c = BURST / 2;
    rays.push(
      <Line
        key={i}
        x1={c}
        y1={c}
        x2={c + Math.cos(angle) * c}
        y2={c + Math.sin(angle) * c}
        stroke={ray}
        strokeWidth={2}
      />
    );
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[st.burst, { transform: [{ rotate }] }]}>
        <Svg width={BURST} height={BURST}>
          {rays}
          <Circle cx={BURST / 2} cy={BURST / 2} r={BURST * 0.22} stroke={ray} strokeWidth={2} fill="none" />
        </Svg>
      </Animated.View>
      <Animated.View style={[st.blob, { backgroundColor: ray, transform: [{ translateY: blobY }] }]} />
      <Animated.View style={[st.blob2, { backgroundColor: ray, transform: [{ translateY: blobY2 }] }]} />
    </View>
  );
});

const st = StyleSheet.create({
  burst: {
    position: 'absolute',
    top: -BURST * 0.55,
    right: -BURST * 0.4,
    width: BURST,
    height: BURST,
    opacity: 0.8,
  },
  blob: {
    position: 'absolute',
    bottom: -80,
    left: -70,
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.5,
  },
  blob2: {
    position: 'absolute',
    top: '32%',
    right: -90,
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.4,
  },
});
