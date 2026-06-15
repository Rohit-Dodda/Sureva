import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Circle } from 'react-native-svg';
import colors from '../../constants/colors';
import ProgressRing from '../ProgressRing';
import { statusFor, clockAfter } from './sessionMath';

// Faint tick marks around the ring so it reads as a real gauge.
const TickRing = React.memo(function TickRing({ size, count = 48 }) {
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2 - 2;
  const rInner = rOuter - 7;
  const ticks = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * 2 * Math.PI - Math.PI / 2;
    ticks.push(
      <Circle
        key={i}
        cx={cx + rInner * Math.cos(a)}
        cy={cy + rInner * Math.sin(a)}
        r={0.9}
        fill="rgba(23,20,14,0.12)"
      />
    );
  }
  return (
    <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
      {ticks}
    </Svg>
  );
});

export default React.memo(function SessionHero({ percent, minsRemaining, size }) {
  const status = statusFor(percent);
  const glow = useRef(new Animated.Value(0.5)).current;

  // Breathing glow — faster + brighter as urgency rises.
  useEffect(() => {
    const period = percent > 60 ? 3200 : percent > 20 ? 1000 : 420;
    const peak = percent > 60 ? 0.22 : percent > 20 ? 0.3 : 0.4;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: peak, duration: period, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.1, duration: period, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [percent]);

  const barWidth = `${Math.max(0, Math.min(100, percent))}%`;

  return (
    <View style={st.card}>
      {/* Colored blobs that the frosted glass refracts */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[st.blob, st.blobTop, { backgroundColor: status.color }]} />
        <View style={[st.blob, st.blobBottom, { backgroundColor: status.color }]} />
        <View style={[st.blob, st.blobMid, { backgroundColor: status.color }]} />
      </View>

      {/* Frosted glass layer */}
      <BlurView
        intensity={Platform.OS === 'android' ? 40 : 28}
        tint="light"
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      {/* Status-colored wash across the whole pane */}
      <View pointerEvents="none" style={[st.tint, { backgroundColor: status.color }]} />
      {/* Glass sheen + hairline */}
      <View pointerEvents="none" style={st.sheen} />

      <View style={st.ringWrap}>
        {/* Colored glow halo behind the ring */}
        <Animated.View
          style={[
            st.glow,
            {
              width: size * 0.9,
              height: size * 0.9,
              borderRadius: size,
              backgroundColor: status.color,
              opacity: glow,
            },
          ]}
        />
        <ProgressRing
          percent={percent}
          size={size}
          strokeWidth={Math.round(size * 0.07)}
          gradient={status.gradient}
          trackColor="rgba(23,20,14,0.07)"
        >
          <TickRing size={size} />
          <View style={st.center}>
            <View style={st.pctRow}>
              <Text style={[st.pct, { color: colors.white }]} numberOfLines={1}>
                {Math.round(percent)}
              </Text>
              <Text style={st.pctSign}>%</Text>
            </View>
            <View style={[st.statusPill, { backgroundColor: status.color }]}>
              <Text style={st.statusWord}>{status.word}</Text>
            </View>
          </View>
        </ProgressRing>
      </View>

      {/* Countdown row */}
      <View style={st.countdownRow}>
        <Text style={st.countLabel}>Reapply in</Text>
        <Text style={[st.countValue, { color: status.color }]}>
          ~{minsRemaining} min
        </Text>
        <Text style={st.countClock}>at {clockAfter(minsRemaining)}</Text>
      </View>
      <View style={st.barTrack}>
        <View style={[st.barFill, { width: barWidth, backgroundColor: status.color }]} />
      </View>
    </View>
  );
});

const st = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    borderRadius: 28,
    paddingTop: 28,
    paddingBottom: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: '#FBF7F1',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 26,
    elevation: 6,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.55,
  },
  blobTop: {
    width: 200,
    height: 200,
    top: -70,
    left: -50,
  },
  blobBottom: {
    width: 180,
    height: 180,
    bottom: -60,
    right: -40,
    opacity: 0.4,
  },
  blobMid: {
    width: 150,
    height: 150,
    top: 60,
    right: 30,
    opacity: 0.3,
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.14,
  },
  sheen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.55)',
  },
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    shadowColor: colors.protected,
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pctRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  pct: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 64,
    letterSpacing: -2,
    lineHeight: 76,
    includeFontPadding: false,
    paddingHorizontal: 2,
  },
  pctSign: {
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 26,
    color: colors.white,
    lineHeight: 40,
    marginLeft: 2,
    includeFontPadding: false,
  },
  statusPill: {
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
  },
  statusWord: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13,
    color: colors.white,
    letterSpacing: 0.3,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 7,
    marginTop: 26,
  },
  countLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.muted,
  },
  countValue: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 17,
    letterSpacing: -0.3,
  },
  countClock: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.muted,
  },
  barTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(23,20,14,0.08)',
    marginTop: 14,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
});
