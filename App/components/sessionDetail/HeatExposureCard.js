import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import SectionCard from '../SectionCard';
import colors from '../../constants/colors';

// Same tone mapping as the live ActiveSessionScreen HeatRiskCard, wash +
// text-color pill rather than a flat fill — matches the pill convention
// used elsewhere in the app (WeekForecastStrip, PassportInsightRow).
function bandTone(key) {
  if (key === 'danger' || key === 'extremeDanger') return { color: colors.danger, wash: colors.redWash };
  if (key === 'caution' || key === 'extremeCaution') return { color: colors.warning, wash: colors.amberWash };
  return { color: colors.protected, wash: colors.greenWash };
}

export default React.memo(function HeatExposureCard({ heatExposure }) {
  if (!heatExposure) return null;
  const tone = bandTone(heatExposure.peakBandKey);

  return (
    <SectionCard icon="thermometer-outline" title="Heat Exposure">
      <View style={[st.badge, { backgroundColor: tone.wash }]}>
        <View style={[st.dot, { backgroundColor: tone.color }]} />
        <Text style={[st.badgeText, { color: tone.color }]}>{heatExposure.peakBand}</Text>
      </View>
      <Text style={st.line}>{heatExposure.line}</Text>
    </SectionCard>
  );
});

const st = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
  },
  line: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.inkMid,
    lineHeight: 19,
  },
});
