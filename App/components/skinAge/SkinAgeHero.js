import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Ellipse } from 'react-native-svg';
import colors from '../../constants/colors';

const GLOW_W = 260;
const GLOW_H = 160;

// Feature 1 — the core number. Orange when younger than real age, white
// when equal (within ±0.5y), danger red when older. The orange state gets
// the full treatment: gradient-filled digits, a breathing halo behind
// them, and a shimmer sweeping across the glyphs.
export default React.memo(function SkinAgeHero({ skinAge, realAge, lastUpdatedLabel, style, glass }) {
  const diff = Math.round((realAge - skinAge) * 10) / 10;
  const isEqual = Math.abs(diff) <= 0.5;
  const younger = !isEqual && skinAge < realAge;

  // Breathing halo + shimmer loops (native driver, run forever).
  const glow = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!younger) return undefined;
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(900),
      ])
    );
    glowLoop.start();
    shimmerLoop.start();
    return () => { glowLoop.stop(); shimmerLoop.stop(); };
  }, [younger, glow, shimmer]);

  const context = isEqual
    ? `You are ${realAge}. Your skin age matches your biological age. Keep protecting.`
    : younger
      ? `You are ${realAge}. Sureva has kept your skin ${Math.abs(diff)} years younger than your UV history would suggest.`
      : `You are ${realAge}. Your UV history has added an estimated ${Math.abs(diff)} years to your skin age. Here is what is driving it.`;

  return (
    <View style={[st.card, glass && st.cardGlass, style]}>
      <Text style={st.kicker}>YOUR SKIN AGE</Text>

      {younger ? (
        <View style={st.numberWrap}>
          {/* Shapeless radial glow — orange fading to nothing, no edges. */}
          <Animated.View
            pointerEvents="none"
            style={[st.halo, {
              opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] }),
              transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) }],
            }]}
          >
            <Svg width={GLOW_W} height={GLOW_H}>
              <Defs>
                <RadialGradient id="skinAgeGlow" cx="50%" cy="50%" rx="50%" ry="50%">
                  <Stop offset="0" stopColor={colors.orange} stopOpacity="0.32" />
                  <Stop offset="0.55" stopColor={colors.orange} stopOpacity="0.1" />
                  <Stop offset="1" stopColor={colors.orange} stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Ellipse cx={GLOW_W / 2} cy={GLOW_H / 2} rx={GLOW_W / 2} ry={GLOW_H / 2} fill="url(#skinAgeGlow)" />
            </Svg>
          </Animated.View>
          <MaskedView maskElement={<Text style={st.number}>{skinAge}</Text>}>
            <LinearGradient
              colors={[colors.gradOrangeStart, colors.orangeMid, colors.gradOrangeEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={[st.number, st.hiddenText]}>{skinAge}</Text>
              <Animated.View
                pointerEvents="none"
                style={[st.shimmer, {
                  transform: [
                    { translateX: shimmer.interpolate({ inputRange: [0, 1], outputRange: [-80, 240] }) },
                    { rotate: '18deg' },
                  ],
                }]}
              />
            </LinearGradient>
          </MaskedView>
        </View>
      ) : (
        <Text style={[st.number, { color: isEqual ? colors.white : colors.orange }]}>{skinAge}</Text>
      )}

      <Text style={st.context}>{context}</Text>
      <Text style={st.updated}>{lastUpdatedLabel}</Text>
    </View>
  );
});

const st = StyleSheet.create({
  card: {
    backgroundColor: colors.charcoal,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 26,
    marginBottom: 14,
    alignItems: 'center',
    overflow: 'hidden',
  },
  // The wrapping interactive card supplies its own dark-glass background
  // + border + radial spots — this just gets out of the way of it.
  cardGlass: {
    backgroundColor: 'transparent',
  },
  kicker: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    letterSpacing: 2,
    color: colors.onDarkMuted,
    marginBottom: 6,
  },
  numberWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: GLOW_W,
    height: GLOW_H,
  },
  number: {
    fontFamily: 'Outfit-Regular',
    fontSize: 76,
    letterSpacing: -2.5,
    color: colors.ink, // mask uses alpha only; any solid color works
  },
  hiddenText: {
    opacity: 0, // sizes the gradient to the glyphs; the mask does the rest
  },
  shimmer: {
    position: 'absolute',
    top: -20,
    bottom: -20,
    width: 46,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  context: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    lineHeight: 21,
    color: colors.onDark,
    textAlign: 'center',
    marginTop: 8,
  },
  updated: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: colors.onDarkMuted,
    marginTop: 10,
  },
});
