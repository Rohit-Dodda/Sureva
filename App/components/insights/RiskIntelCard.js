import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SectionCard from '../SectionCard';
import IconRow from '../IconRow';
import colors from '../../constants/colors';

export default React.memo(function RiskIntelCard({ risk }) {
  const dosePct = Math.min(100, (risk.monthDose.current / risk.monthDose.limit) * 100);
  const doseColor =
    dosePct < 50 ? colors.protected : dosePct < 80 ? colors.warning : colors.danger;

  return (
    <SectionCard glass icon="telescope-outline" title="Risk Intelligence">
      <Text style={st.doseLabel}>UV dose this month</Text>
      <View style={st.doseTrack}>
        <View style={[st.doseFill, { width: `${dosePct}%`, backgroundColor: doseColor }]} />
      </View>
      <Text style={st.doseText}>{risk.monthDose.line}</Text>

      <IconRow icon="calendar-outline" title="Projected annual dose" text={risk.projected} />
      <IconRow icon="warning-outline" title="Most vulnerable session type" text={risk.vulnerableType} iconColor={colors.warning} />
      <IconRow icon="hourglass-outline" title="Skin age impact" text={risk.skinAge} />

      <View style={st.trendBlock}>
        <View style={st.trendBadge}>
          <Ionicons name="trending-up" size={14} color={colors.white} />
          <Text style={st.trendBadgeText}>{risk.trend.label}</Text>
        </View>
        <Text style={st.trendText}>{risk.trend.text}</Text>
      </View>
    </SectionCard>
  );
});

const st = StyleSheet.create({
  doseLabel: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  doseTrack: {
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    marginBottom: 8,
  },
  doseFill: {
    height: 9,
    borderRadius: 4.5,
  },
  doseText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.inkMid,
    lineHeight: 19,
    marginBottom: 16,
  },
  trendBlock: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 2,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: colors.protected,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginBottom: 8,
  },
  trendBadgeText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 12,
    color: colors.white,
  },
  trendText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.inkMid,
    lineHeight: 19,
  },
});
