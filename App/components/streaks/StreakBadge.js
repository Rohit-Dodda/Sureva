import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Animated, View, Text, StyleSheet, Easing, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import ProgressRing from '../ProgressRing';
import BadgeEmblem from './BadgeEmblem';
import GlistenText from './GlistenText';

const RAY_COUNT = 16;

function RayGlow({ size, color }) {
  const len = size * 0.62;
  return (
    <View style={[st.rayWrap, { width: size, height: size }]} pointerEvents="none">
      {Array.from({ length: RAY_COUNT }).map((_, i) => (
        <View key={i} style={[st.ray, { height: len, backgroundColor: color, transform: [{ rotate: `${(360 / RAY_COUNT) * i}deg` }, { translateY: -len / 2 }] }]} />
      ))}
    </View>
  );
}

function TintBlob({ color, size, from, to, dur }) {
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
  const opacity = t.interpolate({ inputRange: [0, 1], outputRange: [from.o, to.o] });
  return (
    <Animated.View style={[st.blob, { width: size, height: size, borderRadius: size / 2, opacity, transform: [{ translateX }, { translateY }] }]}>
      <LinearGradient colors={[color, `${color}00`]} start={{ x: 0.3, y: 0.2 }} end={{ x: 0.85, y: 0.9 }} style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]} />
    </Animated.View>
  );
}

function CardTint({ gradient, glow }) {
  return (
    <View style={st.tintClip} pointerEvents="none">
      <TintBlob color={gradient[0]} size={150} from={{ x: -46, y: -34, o: 0.16 }} to={{ x: -18, y: -8, o: 0.28 }} dur={3200} />
      <TintBlob color={glow} size={140} from={{ x: 72, y: 78, o: 0.12 }} to={{ x: 46, y: 54, o: 0.24 }} dur={3900} />
    </View>
  );
}

// ─── The badge card ───────────────────────────────────────────
function StreakBadge({ badge, unlocked, justUnlocked = false, ringSize = 124 }) {
  // ── Locked: a dimmed colored ghost + lock, no elegance. ──
  if (!unlocked) {
    return (
      <View style={st.card}>
        <View style={[st.ringWrap, { width: ringSize, height: ringSize }]}>
          <ProgressRing percent={0} size={ringSize} strokeWidth={8} color={colors.surface} trackColor={colors.surface} duration={0}>
            <BadgeEmblem size={ringSize * 0.6} gradient={badge.gradient} glow={badge.glow} shape={badge.shape} icon={badge.icon} locked />
          </ProgressRing>
        </View>
        <Text style={[st.name, st.nameLocked]} numberOfLines={1}>{badge.name}</Text>
        <Text style={st.sub}>
          <Text style={[st.subNum, { color: colors.muted }]}>{badge.days}</Text>
          <Text>-Day Streak</Text>
        </Text>
      </View>
    );
  }

  return <UnlockedBadge badge={badge} justUnlocked={justUnlocked} ringSize={ringSize} />;
}

// Unlocked (and the unlock celebration). Split out so the locked path stays a
// cheap static render with none of the animation machinery.
function UnlockedBadge({ badge, justUnlocked, ringSize }) {
  const a = useRef(new Animated.Value(justUnlocked ? 0 : 1)).current;
  const [ringPct, setRingPct] = useState(justUnlocked ? 0 : badge.ring);
  const emblem = ringSize * 0.6;

  const play = useCallback(() => {
    a.setValue(0);
    setRingPct(0);
    setTimeout(() => setRingPct(badge.ring), 420); // ring fills as the lock clears
    Animated.timing(a, { toValue: 1, duration: 1500, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [a, badge.ring]);

  useEffect(() => { if (justUnlocked) play(); }, [justUnlocked, play]);

  // Emblem washes in from a dim ghost to full color as the lock clears.
  const emblemOpacity = a.interpolate({ inputRange: [0, 0.5], outputRange: [0.3, 1], extrapolate: 'clamp' });
  // Lock: shakes, then crumbles — shrinks, spins, drops, fades.
  const lockRotate = a.interpolate({ inputRange: [0, 0.08, 0.16, 0.24, 0.3, 0.5], outputRange: ['0deg', '-9deg', '9deg', '-7deg', '0deg', '55deg'], extrapolate: 'clamp' });
  const lockScale = a.interpolate({ inputRange: [0, 0.3, 0.5], outputRange: [1, 1, 0], extrapolate: 'clamp' });
  const lockTranslateY = a.interpolate({ inputRange: [0.3, 0.5], outputRange: [0, 24], extrapolate: 'clamp' });
  const lockOpacity = a.interpolate({ inputRange: [0.3, 0.5], outputRange: [1, 0], extrapolate: 'clamp' });
  // Flash burst behind the emblem.
  const flashOpacity = a.interpolate({ inputRange: [0.35, 0.5, 0.72], outputRange: [0, 0.8, 0], extrapolate: 'clamp' });
  const flashScale = a.interpolate({ inputRange: [0.35, 0.85], outputRange: [0.4, 1.9], extrapolate: 'clamp' });
  // Rays burst out then settle.
  const rayOpacity = a.interpolate({ inputRange: [0.42, 0.62, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' });
  const rayScale = a.interpolate({ inputRange: [0.42, 0.68, 1], outputRange: [0.5, 1.18, 1], extrapolate: 'clamp' });
  const contentOpacity = a.interpolate({ inputRange: [0.5, 0.85], outputRange: [0, 1], extrapolate: 'clamp' });

  // Tint fades in with the unlock, so at the start of the animation (a=0) the
  // card reads as locked — no vibrant background — and the color washes in.
  return (
    <Pressable style={st.card} onPress={play}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: a }]} pointerEvents="none">
        <CardTint gradient={badge.gradient} glow={badge.glow} />
      </Animated.View>
      <View style={[st.ringWrap, { width: ringSize, height: ringSize }]}>
        {/* Flash */}
        <Animated.View
          pointerEvents="none"
          style={[st.flash, { width: emblem, height: emblem, borderRadius: emblem / 2, backgroundColor: badge.glow, opacity: flashOpacity, transform: [{ scale: flashScale }] }]}
        />
        {/* Rays */}
        {badge.ray ? (
          <Animated.View pointerEvents="none" style={{ position: 'absolute', opacity: rayOpacity, transform: [{ scale: rayScale }] }}>
            <RayGlow size={ringSize} color={badge.ray} />
          </Animated.View>
        ) : null}

        <ProgressRing percent={ringPct} size={ringSize} strokeWidth={8} gradient={badge.gradient} color={colors.surface} trackColor={colors.surface} duration={800}>
          <Animated.View style={{ opacity: emblemOpacity }}>
            <BadgeEmblem size={emblem} gradient={badge.gradient} glow={badge.glow} shape={badge.shape} icon={badge.icon} />
          </Animated.View>
        </ProgressRing>

        {/* Crumbling lock, at the emblem's bottom-right. */}
        <Animated.View
          pointerEvents="none"
          style={[
            st.lockChip,
            {
              width: emblem * 0.42, height: emblem * 0.42, borderRadius: emblem * 0.21,
              left: ringSize / 2 + emblem / 2 - emblem * 0.34,
              top: ringSize / 2 + emblem / 2 - emblem * 0.34,
              opacity: lockOpacity,
              transform: [{ translateY: lockTranslateY }, { rotate: lockRotate }, { scale: lockScale }],
            },
          ]}
        >
          <Ionicons name="lock-closed" size={emblem * 0.22} color={colors.muted} />
        </Animated.View>
      </View>

      <Animated.View style={{ opacity: contentOpacity, alignItems: 'center' }}>
        <GlistenText text={badge.name} color={badge.glow} style={st.name} />
        <Text style={st.sub}>
          <Text style={[st.subNum, { color: badge.glow }]}>{badge.days}</Text>
          <Text>-Day Streak</Text>
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 22,
    paddingHorizontal: 14,
    alignItems: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  tintClip: { ...StyleSheet.absoluteFillObject, borderRadius: 27, overflow: 'hidden' },
  blob: { position: 'absolute', top: 0, left: 0 },
  ringWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  rayWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  ray: { position: 'absolute', width: 2, borderRadius: 1, opacity: 0.4 },
  flash: { position: 'absolute' },
  lockChip: {
    position: 'absolute',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  name: { fontFamily: 'Outfit-Regular', fontSize: 19, color: colors.ink, letterSpacing: -0.3 },
  nameLocked: { color: colors.muted },
  sub: { fontFamily: 'Outfit-Regular', fontSize: 14, color: colors.muted, marginTop: 3 },
  subNum: { fontFamily: 'Switzer-Bold', fontSize: 15 },
});

export default React.memo(StreakBadge);
