import React from 'react';
import { Animated, View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import ProgressRing from '../ProgressRing';
import BadgeEmblem from './BadgeEmblem';
import BadgeCardTint from './BadgeCardTint';
import BadgeRayGlow from './BadgeRayGlow';
import GlistenText from './GlistenText';
import useBadgeCelebration from './useBadgeCelebration';
import {
  TEXT_BLOCK_HEIGHT, NAME_FONT_SIZE, NAME_LINE_HEIGHT,
  SUB_FONT_SIZE, SUB_LINE_HEIGHT, SUB_MARGIN_TOP, NAME_MAX_LINES,
} from './badgeCardMetrics';

// ─── The badge card ───────────────────────────────────────────
function StreakBadge({ badge, unlocked, justUnlocked = false, ringSize = 124, sheenDelay = 0 }) {
  // ── Locked: a dimmed colored ghost + lock, no elegance. ──
  if (!unlocked) {
    return (
      <View style={st.card}>
        <View style={[st.ringWrap, { width: ringSize, height: ringSize }]}>
          <ProgressRing percent={0} size={ringSize} strokeWidth={8} color={colors.surface} trackColor={colors.surface} duration={0}>
            <BadgeEmblem size={ringSize * 0.6} gradient={badge.gradient} glow={badge.glow} shape={badge.shape} icon={badge.icon} locked />
          </ProgressRing>
        </View>
        <View style={st.textBlock}>
          <Text style={[st.name, st.nameLocked]} numberOfLines={NAME_MAX_LINES}>{badge.name}</Text>
          <Text style={st.sub}>
            <Text style={[st.subNum, { color: colors.muted }]}>{badge.days}</Text>
            <Text>-Day Streak</Text>
          </Text>
        </View>
      </View>
    );
  }

  return <UnlockedBadge badge={badge} justUnlocked={justUnlocked} ringSize={ringSize} sheenDelay={sheenDelay} />;
}

// Unlocked (and the unlock celebration). Split out so the locked path stays a
// cheap static render with none of the animation machinery.
function UnlockedBadge({ badge, justUnlocked, ringSize, sheenDelay }) {
  const emblem = ringSize * 0.6;
  const c = useBadgeCelebration(badge.ring, justUnlocked);

  // Tint fades in with the unlock, so at the start of the animation the card
  // reads as locked — no vibrant background — and the color washes in.
  return (
    <Pressable style={st.card} onPress={c.play}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: c.tintOpacity }]} pointerEvents="none">
        <BadgeCardTint gradient={badge.gradient} glow={badge.glow} />
      </Animated.View>
      <View style={[st.ringWrap, { width: ringSize, height: ringSize }]}>
        {/* Flash */}
        <Animated.View
          pointerEvents="none"
          style={[st.flash, { width: emblem, height: emblem, borderRadius: emblem / 2, backgroundColor: badge.glow, opacity: c.flashOpacity, transform: [{ scale: c.flashScale }] }]}
        />
        {/* Rays */}
        {badge.ray ? (
          <Animated.View pointerEvents="none" style={{ position: 'absolute', opacity: c.rayOpacity, transform: [{ scale: c.rayScale }] }}>
            <BadgeRayGlow size={ringSize} color={badge.ray} />
          </Animated.View>
        ) : null}

        <ProgressRing percent={c.ringPct} size={ringSize} strokeWidth={8} gradient={badge.gradient} color={colors.surface} trackColor={colors.surface} duration={800}>
          <Animated.View style={{ opacity: c.emblemOpacity }}>
            <BadgeEmblem size={emblem} gradient={badge.gradient} glow={badge.glow} shape={badge.shape} icon={badge.icon} sheenDelay={sheenDelay} />
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
              opacity: c.lockOpacity,
              transform: [{ translateY: c.lockTranslateY }, { rotate: c.lockRotate }, { scale: c.lockScale }],
            },
          ]}
        >
          <Ionicons name="lock-closed" size={emblem * 0.22} color={colors.muted} />
        </Animated.View>
      </View>

      <Animated.View style={[st.textBlock, { opacity: c.contentOpacity }]}>
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
  ringWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
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
  // Fixed height + centred, so this card matches an achievement card whose goal
  // line wraps to two lines — the two families share one grid on the Badges
  // screen, so their type and block height have to agree. See badgeCardMetrics.js.
  textBlock: {
    height: TEXT_BLOCK_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  name: {
    fontFamily: 'Outfit-Regular',
    fontSize: NAME_FONT_SIZE,
    lineHeight: NAME_LINE_HEIGHT,
    color: colors.ink,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  nameLocked: { color: colors.muted },
  sub: {
    fontFamily: 'Outfit-Regular',
    fontSize: SUB_FONT_SIZE,
    lineHeight: SUB_LINE_HEIGHT,
    color: colors.muted,
    textAlign: 'center',
    marginTop: SUB_MARGIN_TOP,
  },
  subNum: { fontFamily: 'Switzer-Bold', fontSize: SUB_FONT_SIZE + 1 },
});

export default React.memo(StreakBadge);
