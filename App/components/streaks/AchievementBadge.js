import React from 'react';
import { Animated, View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import ProgressRing from '../ProgressRing';
import BadgeEmblem from './BadgeEmblem';
import BadgeCardTint from './BadgeCardTint';
import BadgeRayGlow from './BadgeRayGlow';
import GlistenText from './GlistenText';
import useBadgeCelebration from './useBadgeCelebration';
import { RING_BY_LEVEL } from '../../constants/achievementBadges';
import {
  TEXT_BLOCK_HEIGHT, NAME_FONT_SIZE, NAME_LINE_HEIGHT,
  SUB_FONT_SIZE, SUB_LINE_HEIGHT, SUB_MARGIN_TOP, NAME_MAX_LINES, SUB_MAX_LINES,
} from './badgeCardMetrics';

const LEVEL_NUMERALS = ['I', 'II', 'III'];

// One achievement at whatever level the user has reached. `level` (0 = locked,
// 1–3 earned) is computed by AchievementService and passed in, never derived
// here. `celebrate` plays the unlock animation — the gallery sets it both on a
// first unlock AND on a level-up, so climbing II → III feels like an event
// rather than a ring quietly moving.
function AchievementBadge({ badge, level = 0, celebrate = false, ringSize = 124, sheenDelay = 0 }) {
  if (level < 1) return <LockedAchievement badge={badge} ringSize={ringSize} />;
  return (
    <EarnedAchievement
      badge={badge}
      level={level}
      celebrate={celebrate}
      ringSize={ringSize}
      sheenDelay={sheenDelay}
    />
  );
}

// Locked stays a cheap static render — none of the animation machinery mounts.
function LockedAchievement({ badge, ringSize }) {
  return (
    <View style={st.card}>
      <View style={[st.ringWrap, { width: ringSize, height: ringSize }]}>
        <ProgressRing percent={0} size={ringSize} strokeWidth={8} color={colors.surface} trackColor={colors.surface} duration={0}>
          <BadgeEmblem
            size={ringSize * 0.6}
            gradient={badge.gradient}
            glow={badge.glow}
            shadeColor={badge.shade}
            shape={badge.shape}
            icon={badge.icon}
            iconSet="achievement"
            locked
          />
        </ProgressRing>
      </View>
      <View style={st.textBlock}>
        <Text style={[st.name, st.nameLocked]} numberOfLines={NAME_MAX_LINES}>{badge.family}</Text>
        <Text style={st.sub} numberOfLines={SUB_MAX_LINES}>{badge.tiers[0].goal}</Text>
      </View>
    </View>
  );
}

function EarnedAchievement({ badge, level, celebrate, ringSize, sheenDelay }) {
  const idx = Math.min(2, level - 1);
  const tier = badge.tiers[idx];
  const emblem = ringSize * 0.6;
  const c = useBadgeCelebration(RING_BY_LEVEL[idx], celebrate);
  const showRays = idx >= 1;

  return (
    <Pressable style={st.card} onPress={c.play}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: c.tintOpacity }]} pointerEvents="none">
        <BadgeCardTint gradient={badge.gradient} glow={badge.glow} />
      </Animated.View>

      <View style={[st.ringWrap, { width: ringSize, height: ringSize }]}>
        <Animated.View
          pointerEvents="none"
          style={[
            st.flash,
            {
              width: emblem, height: emblem, borderRadius: emblem / 2,
              backgroundColor: badge.glow, opacity: c.flashOpacity,
              transform: [{ scale: c.flashScale }],
            },
          ]}
        />

        {showRays ? (
          <Animated.View pointerEvents="none" style={{ position: 'absolute', opacity: c.rayOpacity, transform: [{ scale: c.rayScale }] }}>
            <BadgeRayGlow size={ringSize} color={badge.gradient[0]} />
          </Animated.View>
        ) : null}

        <ProgressRing
          percent={c.ringPct}
          size={ringSize}
          strokeWidth={8}
          gradient={badge.gradient}
          color={colors.surface}
          trackColor={colors.surface}
          duration={800}
        >
          <Animated.View style={{ opacity: c.emblemOpacity }}>
            <BadgeEmblem
              size={emblem}
              gradient={badge.gradient}
              glow={badge.glow}
              shadeColor={badge.shade}
              shape={badge.shape}
              icon={badge.icon}
              iconSet="achievement"
              sheenDelay={sheenDelay}
            />
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

        {/* Level pill, straddling the bottom edge of the ring. */}
        <Animated.View style={[st.pillWrap, { opacity: c.contentOpacity }]} pointerEvents="none">
          <LinearGradient colors={badge.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.pill}>
            <Text style={st.pillText}>{LEVEL_NUMERALS[idx]}</Text>
          </LinearGradient>
        </Animated.View>
      </View>

      <Animated.View style={[st.textBlock, { opacity: c.contentOpacity }]}>
        <GlistenText text={tier.name} color={badge.glow} style={st.name} />
        <Text style={st.sub} numberOfLines={SUB_MAX_LINES}>{tier.goal}</Text>
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
  ringWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
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
  pillWrap: { position: 'absolute', bottom: -2, alignItems: 'center' },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: { fontFamily: 'Switzer-Bold', fontSize: 11, letterSpacing: 1, color: colors.white },
  // Fixed height + centred, so a two-line goal line can't make this card taller
  // than its neighbours. See badgeCardMetrics.js.
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
});

export default React.memo(AchievementBadge);
