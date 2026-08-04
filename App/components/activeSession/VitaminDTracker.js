import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../../constants/colors';
import CardHeader from '../CardHeader';

// No risk tiering here — unlike Burn Tracker/Heat Risk, this isn't a
// danger metric, so no green/amber/red. A near-zero reading while
// protected is the expected, correct outcome (sunscreen blocks most
// UVB), not a problem — see the caption below.
export default React.memo(function VitaminDTracker({ vitaminD }) {
  const pct = Math.min(100, vitaminD.targetPct);
  const caption = vitaminD.estimateIU > 0
    ? `${vitaminD.lowIU}–${vitaminD.highIU} IU so far — ${pct}% of a typical daily target`
    : 'Sunscreen blocks most UVB, so this stays near zero while protected';

  return (
    <View style={st.card}>
      <CardHeader icon="sunny-outline" title="Vitamin D" subtitle={`~${vitaminD.estimateIU} IU so far`} />
      <View style={st.track}>
        <View style={[st.fill, { width: `${pct > 0 ? Math.max(3, pct) : 0}%` }]} />
      </View>
      <Text style={st.caption}>{caption}</Text>
    </View>
  );
});

const st = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginHorizontal: 16,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    marginTop: 10,
  },
  fill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.protected,
  },
  caption: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: colors.muted,
    marginTop: 10,
    lineHeight: 15,
  },
});
