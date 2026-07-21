import React, { useRef, useEffect, useMemo } from 'react';
import { Animated, View, Text, StyleSheet, Easing, Pressable } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { tierFor } from '../../constants/streakTiers';
import StreakRays from './StreakRays';

// The big glowy streak number — shared verbatim by the post-check-in reveal
// and the Streaks hero so a streak always presents in the same tier in both.
// The tier drives BOTH the color/gradient and the motion: a gentle glow-pulse
// at base, a bouncy shimmer at tier 2, a flaring corona at tier 3, and a
// faster iridescent corona at tier 4. `breathe` turns on the continuous idle
// loop (the hero breathes; the reveal just makes its entrance). `replayKey`
// re-fires the entrance when it changes.
function StreakNumber({
  value,
  tierKey,
  size = 120,
  breathe = false,
  showFlame = true,
  showTitle = false,
  replayKey = 0,
  onPress,
}) {
  const tier = tierFor(tierKey);
  const enter = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  // Entrance: a spring whose bounciness rises with the tier. tier 3's "flare"
  // starts closer to full size and leans on the glow burst instead of scale.
  useEffect(() => {
    enter.setValue(0);
    const bouncy = tier.animation === 'spring';
    const flare = tier.animation === 'flare' || tier.animation === 'aurora';
    Animated.spring(enter, {
      toValue: 1,
      friction: bouncy ? 5 : flare ? 8 : 6.5,
      tension: bouncy ? 90 : 70,
      useNativeDriver: true,
    }).start();
  }, [enter, tier.animation, replayKey, value]);

  // Continuous breathing loop for the hero.
  useEffect(() => {
    if (!breathe) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: tier.breatheMs, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: tier.breatheMs, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [breathe, breath, tier.breatheMs]);

  // Shimmer sweep for tier 2.
  useEffect(() => {
    if (tier.animation !== 'spring') return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(1400),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer, tier.animation]);

  const enterScale = enter.interpolate({
    inputRange: [0, 1],
    outputRange: [tier.animation === 'flare' ? 0.72 : tier.animation === 'spring' ? 0.35 : 0.5, 1],
  });
  const breathScale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });
  const scale = Animated.multiply(enterScale, breathScale);
  const glowOpacity = Animated.multiply(enter, breath.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }));
  const glowScale = Animated.add(1, Animated.multiply(breath, 0.18));

  const numberStyle = useMemo(() => [st.number, { fontSize: size, lineHeight: size * 1.08 }], [size]);
  const box = size * 2.2;

  const content = (
    <View style={[st.wrap, { width: box, height: box }]}>
      {/* Soft radial glow behind everything. */}
      <Animated.View
        pointerEvents="none"
        style={[
          st.glow,
          { width: box, height: box, borderRadius: box / 2, backgroundColor: tier.glow, opacity: Animated.multiply(glowOpacity, 0.5), transform: [{ scale: glowScale }] },
        ]}
      />
      {tier.rays && (
        <Animated.View pointerEvents="none" style={{ opacity: glowOpacity }}>
          <StreakRays size={box * 0.92} color={tier.rayColor} durationMs={tier.raysMs} />
        </Animated.View>
      )}

      <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
        {showFlame && (
          <Ionicons name="flame" size={size * 0.34} color={tier.flame} style={{ marginBottom: -size * 0.06 }} />
        )}
        <MaskedView maskElement={<Text style={numberStyle}>{value}</Text>}>
          <LinearGradient colors={tier.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={[numberStyle, { opacity: 0 }]}>{value}</Text>
          </LinearGradient>
        </MaskedView>
        {/* tier-2 shimmer bar sweeps across the number. */}
        {tier.animation === 'spring' && (
          <Animated.View
            pointerEvents="none"
            style={[
              st.shimmer,
              {
                height: size,
                opacity: shimmer.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.9, 0.9, 0] }),
                transform: [{ translateX: shimmer.interpolate({ inputRange: [0, 1], outputRange: [-size, size] }) }, { rotate: '18deg' }],
              },
            ]}
          />
        )}
        {showTitle && tier.title && (
          <Text style={[st.title, { color: tier.flame }]}>{tier.title}</Text>
        )}
      </Animated.View>
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} hitSlop={24}>
      {content}
    </Pressable>
  );
}

const st = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute' },
  number: {
    fontFamily: 'Outfit-Regular',
    color: colors.ink,
    textAlign: 'center',
    includeFontPadding: false,
  },
  shimmer: {
    position: 'absolute',
    width: 22,
    backgroundColor: colors.white,
  },
  title: {
    fontFamily: 'Outfit-Regular',
    fontSize: 22,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 6,
  },
});

export default React.memo(StreakNumber);
