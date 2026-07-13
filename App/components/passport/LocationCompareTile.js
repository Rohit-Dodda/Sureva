import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';

// "Here" vs. a comparison point (global average, past self), with the
// delta called out in a colored pill between the two — replaces a plain
// label/value row with something that actually reads as a comparison.
// tone: 'score' colors the pill green/red by direction, 'neutral' keeps
// it a plain gray (duration, etc. — bigger isn't inherently better).
export default React.memo(function LocationCompareTile({
  leftLabel, leftValue, rightLabel, rightValue, delta, tone = 'score',
}) {
  const positive = delta >= 0;
  const deltaColor = tone === 'neutral' ? colors.inkMid : positive ? colors.protected : colors.danger;
  const pillBg = tone === 'neutral' ? colors.surface : positive ? colors.greenWash : colors.redWash;

  return (
    <View style={st.wrap}>
      <View style={st.col}>
        <Text style={st.value}>{leftValue}</Text>
        <Text style={st.label}>{leftLabel}</Text>
      </View>
      <View style={[st.deltaPill, { backgroundColor: pillBg }]}>
        <Ionicons name={positive ? 'arrow-up' : 'arrow-down'} size={12} color={deltaColor} />
        <Text style={[st.deltaText, { color: deltaColor }]}>{Math.abs(delta)}</Text>
      </View>
      <View style={st.col}>
        <Text style={st.value}>{rightValue}</Text>
        <Text style={st.label}>{rightLabel}</Text>
      </View>
    </View>
  );
});

const st = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  col: {
    flex: 1,
    alignItems: 'center',
  },
  value: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 20,
    color: colors.ink,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  label: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    color: colors.muted,
    marginTop: 3,
    textAlign: 'center',
  },
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginHorizontal: 6,
  },
  deltaText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 12,
  },
});
