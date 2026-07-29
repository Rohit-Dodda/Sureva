import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import colors from '../../constants/colors';
import { artFor } from '../../constants/sunStamps';
import { TIER_LABELS } from '../../services/SunStampService';
import StampArt from './StampArt';

export const CHIP_W = 104;
export const CHIP_H = 92;

// One slot on the Atlas board. Filled slots are a shrunken echo of the reveal
// card — same sky art, same dotted micro-frame — so the grid reads as a row
// of the same objects rather than a cheaper second system.
//
// Empty slots are invitations, never errors: dashed neutral outline, the
// missing thing named plainly. Nothing here is ever rendered in a warning
// color, per the feature's governing rule.
function StampChip({ slot, onPress }) {
  const { stamp, label, count } = slot;

  if (!stamp) {
    return (
      <View style={[st.chip, st.empty]}>
        <Text style={st.emptyLabel} numberOfLines={2}>{label}</Text>
      </View>
    );
  }

  const art = artFor(stamp.tier);

  return (
    <Pressable
      style={[st.chip, { borderWidth: art.frameWidth, borderColor: art.accent }]}
      onPress={onPress ? () => onPress(slot) : undefined}
    >
      <StampArt tier={stamp.tier} width={CHIP_W} height={CHIP_H} borderRadius={RADIUS} />
      <View style={st.dotted} pointerEvents="none" />

      {count > 1 ? (
        <View style={st.countPip}>
          <Text style={st.countText}>×{count}</Text>
        </View>
      ) : null}

      <View style={st.caption} pointerEvents="none">
        <Text style={st.name} numberOfLines={1}>{label}</Text>
        <Text style={st.tier} numberOfLines={1}>{TIER_LABELS[stamp.tier]}</Text>
      </View>
    </Pressable>
  );
}

const RADIUS = 18;

const st = StyleSheet.create({
  chip: {
    width: CHIP_W,
    height: CHIP_H,
    borderRadius: RADIUS,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: colors.surface,
  },
  empty: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  emptyLabel: {
    fontFamily: 'Switzer-Medium',
    fontSize: 11,
    lineHeight: 14,
    color: colors.muted,
    textAlign: 'center',
  },
  dotted: {
    ...StyleSheet.absoluteFillObject,
    margin: 4,
    borderRadius: RADIUS - 4,
    borderWidth: 1,
    borderStyle: 'dotted',
    borderColor: colors.white,
    opacity: 0.5,
  },
  countPip: {
    position: 'absolute',
    top: 7,
    right: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(10,8,4,0.5)',
  },
  countText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 9.5,
    color: colors.white,
    fontVariant: ['tabular-nums'],
  },
  caption: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  name: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.white,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  tier: {
    fontFamily: 'Switzer-Bold',
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.white,
    opacity: 0.88,
    marginTop: 1,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});

export default React.memo(StampChip);
