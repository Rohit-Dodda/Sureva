import React, { useRef, useEffect } from 'react';
import { Animated, View, StyleSheet, Dimensions, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../../constants/colors';

const { width: W, height: H } = Dimensions.get('window');

// Soft orange "aurora" blobs that slowly drift, scale, and breathe behind the
// reveal card — clean flowing warm light around the edges. Each blob is a big
// circle holding a color→transparent gradient, kept translucent and partly
// off-screen so only its soft interior shows. Pure decoration.
const BLOB_LAYOUT = [
  { size: W * 1.15, from: { x: -W * 0.35, y: -H * 0.12, s: 1, o: 0.5 }, to: { x: -W * 0.18, y: H * 0.04, s: 1.18, o: 0.32 }, dur: 7000 },
  { size: W * 1.05, from: { x: W * 0.45, y: H * 0.62, s: 1.1, o: 0.42 }, to: { x: W * 0.3, y: H * 0.48, s: 1, o: 0.26 }, dur: 8200 },
  { size: W * 0.9, from: { x: W * 0.4, y: -H * 0.06, s: 1, o: 0.3 }, to: { x: W * 0.55, y: H * 0.06, s: 1.2, o: 0.16 }, dur: 9000 },
  { size: W * 0.85, from: { x: -W * 0.2, y: H * 0.7, s: 1.05, o: 0.28 }, to: { x: -W * 0.32, y: H * 0.58, s: 1.2, o: 0.18 }, dur: 7600 },
];

const DEFAULT_PALETTE = [colors.orangeMid, colors.orange, colors.gold, colors.orangeDark];

function Blob({ color, size, from, to, dur }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [t, dur]);

  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [from.x, to.x] });
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [from.y, to.y] });
  const scale = t.interpolate({ inputRange: [0, 1], outputRange: [from.s, to.s] });
  const opacity = t.interpolate({ inputRange: [0, 1], outputRange: [from.o, to.o] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        st.blob,
        { width: size, height: size, borderRadius: size / 2, opacity, transform: [{ translateX }, { translateY }, { scale }] },
      ]}
    >
      <LinearGradient
        colors={[color, `${color}00`]}
        start={{ x: 0.35, y: 0.2 }}
        end={{ x: 0.85, y: 0.9 }}
        style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
      />
    </Animated.View>
  );
}

function StreakAuroraBackground({ palette }) {
  const hues = palette?.length ? palette : DEFAULT_PALETTE;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[StyleSheet.absoluteFill, st.base]} />
      {BLOB_LAYOUT.map((b, i) => (
        <Blob key={i} color={hues[i % hues.length]} {...b} />
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  base: { backgroundColor: colors.canvas },
  blob: { position: 'absolute' },
});

export default React.memo(StreakAuroraBackground);
