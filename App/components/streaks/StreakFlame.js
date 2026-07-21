import React, { useRef, useEffect } from 'react';
import { Animated, View, StyleSheet, Easing } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';

// Deterministic spark definitions: horizontal start, sideways drift, size, how
// high it rises, its lifetime, a stagger delay, and an ember color.
const SPARK_DEFS = [
  { x: -2, drift: -12, size: 5, rise: 92, dur: 1500, delay: 0, c: 0 },
  { x: 8, drift: 10, size: 3, rise: 120, dur: 1850, delay: 240, c: 1 },
  { x: -12, drift: -6, size: 4, rise: 104, dur: 1650, delay: 480, c: 2 },
  { x: 14, drift: 6, size: 2, rise: 132, dur: 2000, delay: 120, c: 1 },
  { x: 0, drift: 4, size: 6, rise: 84, dur: 1400, delay: 680, c: 0 },
  { x: -18, drift: -10, size: 3, rise: 112, dur: 1750, delay: 360, c: 3 },
  { x: 18, drift: 12, size: 4, rise: 96, dur: 1600, delay: 900, c: 2 },
  { x: 6, drift: -4, size: 2, rise: 128, dur: 1950, delay: 540, c: 1 },
  { x: -8, drift: 8, size: 5, rise: 100, dur: 1550, delay: 780, c: 2 },
  { x: 12, drift: -8, size: 3, rise: 118, dur: 1800, delay: 300, c: 3 },
  { x: -14, drift: 4, size: 4, rise: 108, dur: 1700, delay: 1050, c: 0 },
  { x: 2, drift: -2, size: 2, rise: 136, dur: 2050, delay: 620, c: 1 },
];

// The flame starts as an empty outline, then — a beat later — ignites: a bright
// flash, the gradient flame swelling into the outline, and embers beginning to
// rise. Once lit, it "burns" via brightness flicker + a breathing glow + the
// rising sparks. Crucially, the LIT flame is never continuously geometry-
// transformed (only opacity flickers), so the mask stays crisp — no
// rasterization shimmer. The one-time ignition pop is transient and settles
// exactly at scale 1.
function StreakFlame({ gradient, size = 96, igniteDelay = 700 }) {
  const ignite = useRef(new Animated.Value(0)).current; // 0 = unlit outline, 1 = lit
  const flash = useRef(new Animated.Value(0)).current;
  const flick = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const sparks = useRef(SPARK_DEFS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = [];
    const timers = [];

    const burn = () => {
      const flame = Animated.loop(
        Animated.sequence([
          Animated.timing(flick, { toValue: 1, duration: 130, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(flick, { toValue: 0.35, duration: 110, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(flick, { toValue: 0.8, duration: 150, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(flick, { toValue: 0.1, duration: 170, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ])
      );
      const breath = Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 850, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0, duration: 850, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
      loops.push(flame, breath);
      flame.start();
      breath.start();
      SPARK_DEFS.forEach((def, i) => {
        timers.push(setTimeout(() => {
          const l = Animated.loop(
            Animated.timing(sparks[i], { toValue: 1, duration: def.dur, easing: Easing.out(Easing.quad), useNativeDriver: true })
          );
          loops.push(l);
          l.start();
        }, def.delay));
      });
    };

    timers.push(setTimeout(() => {
      Animated.parallel([
        Animated.spring(ignite, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(flash, { toValue: 1, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(flash, { toValue: 0, duration: 480, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]),
      ]).start();
      burn();
    }, igniteDelay));

    return () => {
      timers.forEach(clearTimeout);
      loops.forEach((l) => l.stop());
    };
  }, [ignite, flash, flick, glow, sparks, igniteDelay]);

  const litOpacity = Animated.multiply(
    ignite.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.7, 1], extrapolate: 'clamp' }),
    flick.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] })
  );
  const outlineOpacity = ignite.interpolate({ inputRange: [0, 0.45], outputRange: [1, 0], extrapolate: 'clamp' });
  const igniteScale = ignite.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }); // slight spring pop, settles at 1
  const glowOpacity = Animated.multiply(
    ignite.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
    glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] })
  );
  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.18] });
  const flashOpacity = flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.85] });
  const flashScale = flash.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.8] });
  const glowSize = size * 1.7;
  const box = size * 2;
  // Embers take the flame's own color — a bright white core through the tier
  // gradient — so they change hue with the tier.
  const embers = [colors.white, gradient?.[0] ?? colors.orange, gradient?.[gradient.length - 1] ?? colors.orange];

  return (
    <View style={[st.wrap, { width: box, height: box }]}>
      {/* Breathing glow (appears on ignite). */}
      <Animated.View
        pointerEvents="none"
        style={[st.glow, { width: glowSize, height: glowSize, borderRadius: glowSize / 2, backgroundColor: gradient[0], opacity: glowOpacity, transform: [{ scale: glowScale }] }]}
      />
      {/* One-time ignition flash. */}
      <Animated.View
        pointerEvents="none"
        style={[st.glow, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.white, opacity: flashOpacity, transform: [{ scale: flashScale }] }]}
      />

      {/* Outline (unlit) crossfading into the lit gradient flame. */}
      <Animated.View style={[st.flameStack, { width: size, height: size, transform: [{ scale: igniteScale }] }]}>
        <Animated.View style={[StyleSheet.absoluteFill, st.center, { opacity: outlineOpacity }]}>
          <Ionicons name="flame-outline" size={size} color={colors.muted} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, st.center, { opacity: litOpacity }]}>
          <MaskedView maskElement={<Ionicons name="flame" size={size} color={colors.ink} />}>
            <LinearGradient colors={gradient} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }}>
              <Ionicons name="flame" size={size} color="transparent" />
            </LinearGradient>
          </MaskedView>
        </Animated.View>
      </Animated.View>

      {/* Rising embers. */}
      {SPARK_DEFS.map((def, i) => {
        const p = sparks[i];
        const translateY = p.interpolate({ inputRange: [0, 1], outputRange: [-size * 0.18, -size * 0.18 - def.rise] });
        const translateX = p.interpolate({ inputRange: [0, 1], outputRange: [def.x, def.x + def.drift] });
        const opacity = p.interpolate({ inputRange: [0, 0.12, 0.6, 1], outputRange: [0, 1, 0.7, 0] });
        const scale = p.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.3, 1, 0.15] });
        return (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={[st.spark, { width: def.size, height: def.size, borderRadius: def.size / 2, backgroundColor: embers[def.c % embers.length], opacity, transform: [{ translateX }, { translateY }, { scale }] }]}
          />
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute' },
  flameStack: { position: 'absolute' },
  center: { alignItems: 'center', justifyContent: 'center' },
  spark: { position: 'absolute', left: '50%', top: '50%' },
});

export default React.memo(StreakFlame);
