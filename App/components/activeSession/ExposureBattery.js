import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../../constants/colors';
import CardHeader from '../CardHeader';

// UV "exposure battery" — cumulative erythemal dose this session, 0–100%.
// Fills toward a burn budget; color escalates green → amber → red.
export default React.memo(function ExposureBattery({ fraction }) {
  const pct = Math.round(fraction * 100);
  const grad =
    fraction > 0.66
      ? ['#F0654D', '#DD3220']
      : fraction > 0.33
      ? ['#F8B84E', '#EE8C0A']
      : [colors.gradGreenStart, colors.gradGreenEnd];
  const caption =
    fraction > 0.66
      ? 'High accumulated exposure, limit further sun'
      : fraction > 0.33
      ? 'Moderate dose building up'
      : 'Low exposure so far today';

  return (
    <View style={st.card}>
      <CardHeader icon="sunny" title="UV exposure today" subtitle={`${pct}% of daily budget`} />
      <View style={st.battery}>
        <View style={st.cells}>
          <LinearGradient
            colors={grad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[st.fill, { width: `${Math.max(3, pct)}%` }]}
          />
        </View>
        <View style={st.cap} />
      </View>
      <Text style={st.caption}>{caption}</Text>
    </View>
  );
});

const st = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  battery: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cells: {
    flex: 1,
    height: 26,
    borderRadius: 8,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 8,
  },
  cap: {
    width: 4,
    height: 12,
    borderRadius: 2,
    backgroundColor: colors.surface,
    marginLeft: 3,
  },
  caption: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: colors.muted,
    marginTop: 10,
    lineHeight: 15,
  },
});
