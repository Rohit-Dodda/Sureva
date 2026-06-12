import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import colors from '../constants/colors';

export function gaugeColor(pct) {
  if (pct === null || pct === undefined) return colors.border;
  if (pct > 60) return colors.protected;
  if (pct > 20) return colors.warning;
  return colors.danger;
}

// percent → interpolated arc rotations (native-driver safe string interpolation)
function makeArcInterpolations(animPct) {
  const right = animPct.interpolate({
    inputRange: [0, 50, 100],
    outputRange: ['-180deg', '0deg', '0deg'],
    extrapolate: 'clamp',
  });
  const left = animPct.interpolate({
    inputRange: [0, 50, 100],
    outputRange: ['-180deg', '-180deg', '0deg'],
    extrapolate: 'clamp',
  });
  return { right, left };
}

export default React.memo(function ProtectionGauge({
  percent,
  size = 220,
  strokeRatio = 0.072,
  children,
  pulsing = false,
}) {
  const G     = size;
  const S     = Math.round(G * strokeRatio);
  const INNER = G - S * 2;

  const animPct   = useRef(new Animated.Value(percent ?? 0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Smooth arc transition on percent change
  useEffect(() => {
    if (percent === null || percent === undefined) return;
    Animated.timing(animPct, {
      toValue: percent,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, [percent]);

  // Pulse breathe
  useEffect(() => {
    if (!pulsing) {
      scaleAnim.stopAnimation();
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.03, duration: 900, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulsing]);

  const isActive = percent !== null && percent !== undefined;
  const color    = gaugeColor(percent);
  const { right: rightRotate, left: leftRotate } = makeArcInterpolations(animPct);

  // Geometry inline styles (can't use StyleSheet.create since G/S vary per instance)
  const trackStyle = {
    position: 'absolute',
    width: G, height: G, borderRadius: G / 2,
    borderWidth: S, borderColor: colors.surface,
  };
  const arcBase = {
    position: 'absolute', top: 0,
    width: G, height: G, borderRadius: G / 2,
    borderWidth: S, borderColor: color,
  };
  const innerStyle = {
    position: 'absolute',
    width: INNER, height: INNER, borderRadius: INNER / 2,
    backgroundColor: colors.white,
  };

  return (
    <Animated.View style={{ width: G, height: G, alignItems: 'center', justifyContent: 'center', transform: [{ scale: scaleAnim }] }}>
      {/* Track */}
      <View style={trackStyle} />

      {/* Right half arc (covers 0–50%) */}
      {isActive && (
        <View style={{ position: 'absolute', top: 0, left: G / 2, width: G / 2, height: G, overflow: 'hidden' }}>
          <Animated.View style={[arcBase, { left: -(G / 2), transform: [{ rotate: rightRotate }] }]} />
        </View>
      )}

      {/* Left half arc (covers 50–100%) */}
      {isActive && (
        <View style={{ position: 'absolute', top: 0, left: 0, width: G / 2, height: G, overflow: 'hidden' }}>
          <Animated.View style={[arcBase, { left: 0, transform: [{ rotate: leftRotate }] }]} />
        </View>
      )}

      {/* Donut hole */}
      <View style={innerStyle} />

      {/* Center content */}
      <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center', width: INNER * 0.78 }}>
        {children ?? (
          <>
            <Text style={[gcSt.pctDefault, { color: isActive ? color : colors.muted }]}>
              {isActive ? `${Math.round(percent)}%` : '- -'}
            </Text>
            <Text style={gcSt.subDefault}>
              {isActive ? 'Protection remaining' : 'No active session'}
            </Text>
          </>
        )}
      </View>
    </Animated.View>
  );
});

const gcSt = StyleSheet.create({
  pctDefault: {
    fontFamily: 'SFProDisplay-Black',
    fontSize: 44,
    letterSpacing: -2,
    lineHeight: 50,
  },
  subDefault: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 13,
    color: colors.muted,
    marginTop: 4,
    textAlign: 'center',
  },
});
