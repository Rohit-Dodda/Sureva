import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import SectionCard from '../SectionCard';
import colors from '../../constants/colors';

// No risk tiering here — unlike Burn Tracker/Heat Risk, this isn't a
// danger metric, so it doesn't use the green/amber/red status colors.
// A zero-IU session (fully protected) is the expected, correct outcome,
// not an error state — see buildVitaminD's line copy for why.
export default React.memo(function VitaminDCard({ vitaminD }) {
  if (!vitaminD) return null;
  const pct = Math.min(100, vitaminD.targetPct);

  return (
    <SectionCard icon="sunny-outline" title="Vitamin D">
      <View style={st.track}>
        <View style={[st.fill, { width: `${pct}%` }]} />
      </View>
      <Text style={st.line}>{vitaminD.line}</Text>
    </SectionCard>
  );
});

const st = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    marginBottom: 10,
  },
  fill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.protected,
  },
  line: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.inkMid,
    lineHeight: 19,
  },
});
