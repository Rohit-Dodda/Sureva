import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../../constants/colors';
import CardHeader from '../CardHeader';

// Today's cumulative UV dose across ALL of today's sessions (prior
// completed ones + this one in progress), protection-discounted the same
// way Home's "Today's UV dose" bar is — see
// SessionDetailMapper.computeTodayDosePercentReal. Distinct from Burn
// Tracker (ExposureBattery) above it on this screen, which only shows
// THIS session's dose; a user who already had a session earlier today
// needs to see that it's compounding, not resetting to 0% each time they
// start a new one.
export default React.memo(function TodayDoseCard({ pct }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const color =
    clamped < 50 ? colors.protected :
    clamped < 80 ? colors.warning : colors.danger;
  const caption =
    clamped < 50 ? "Well within today's safe limit" :
    clamped < 80 ? 'Getting close to the daily limit' :
    'At or near the daily safe limit, consider covering up';

  return (
    <View style={st.card}>
      <CardHeader icon="today-outline" title="Today's UV Dose" subtitle={`${clamped}% of daily safe limit`} />
      <View style={st.track}>
        <View style={[st.fill, { width: `${Math.max(3, clamped)}%`, backgroundColor: color }]} />
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
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
  caption: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: colors.muted,
    marginTop: 10,
    lineHeight: 15,
  },
});
