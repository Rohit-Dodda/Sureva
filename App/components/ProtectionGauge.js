import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import colors from '../constants/colors';
import ProgressRing from './ProgressRing';

export function gaugeColor(pct) {
  if (pct === null || pct === undefined) return colors.border;
  if (pct > 60) return colors.protected;
  if (pct > 20) return colors.warning;
  return colors.danger;
}

function gaugeGradient(pct) {
  if (pct === null || pct === undefined) return null;
  if (pct > 60) return [colors.gradGreenStart, colors.gradGreenEnd];
  if (pct > 20) return ['#F8B84E', '#EE8C0A'];
  return ['#F0654D', '#DD3220'];
}

export default React.memo(function ProtectionGauge({
  percent,
  size = 220,
  strokeRatio = 0.072,
  children,
  pulsing = false,
}) {
  const strokeWidth = Math.round(size * strokeRatio) * 2;
  const scaleAnim = useRef(new Animated.Value(1)).current;

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
        Animated.timing(scaleAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulsing]);

  const isActive = percent !== null && percent !== undefined;
  const color = gaugeColor(percent);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <ProgressRing
        percent={isActive ? percent : 0}
        size={size}
        strokeWidth={strokeWidth}
        color={color}
        gradient={gaugeGradient(percent)}
        trackColor={colors.surface}
      >
        <View style={[gcSt.center, { width: size * 0.66 }]}>
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
      </ProgressRing>
    </Animated.View>
  );
});

const gcSt = StyleSheet.create({
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pctDefault: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 44,
    letterSpacing: -2,
    lineHeight: 50,
  },
  subDefault: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.muted,
    marginTop: 4,
    textAlign: 'center',
  },
});
