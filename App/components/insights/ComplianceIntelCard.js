import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SectionCard from '../SectionCard';
import IconRow from '../IconRow';
import colors from '../../constants/colors';

const StreakChip = React.memo(function StreakChip({ label, value, highlight }) {
  return (
    <View style={[st.chip, highlight && st.chipHighlight]}>
      <Text style={[st.chipValue, highlight && st.chipValueHighlight]}>{value}</Text>
      <Text style={[st.chipLabel, highlight && st.chipLabelHighlight]}>{label}</Text>
    </View>
  );
});

export default React.memo(function ComplianceIntelCard({ compliance }) {
  return (
    <SectionCard icon="checkmark-done-outline" title="Compliance Intelligence">
      <View style={st.chips}>
        <StreakChip label="Best streak · alerts confirmed under 10 min" value={compliance.bestStreak} />
        <StreakChip label="Current streak · keep it going" value={compliance.currentStreak} highlight />
      </View>

      <IconRow icon="stopwatch-outline" title="Response time" text={compliance.responseTrend} />
      <IconRow icon="sunny-outline" title="Morning vs afternoon" text={compliance.fastSlow} />
      <IconRow icon="water-outline" title="When you ignore alerts" text={compliance.ignoreCondition} iconColor={colors.danger} />

      <View style={st.flagBlock}>
        <Ionicons name="flag-outline" size={16} color={colors.danger} style={st.flagIcon} />
        <Text style={st.flagText}>{compliance.flag}</Text>
      </View>
    </SectionCard>
  );
});

const st = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  chip: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  chipHighlight: {
    backgroundColor: colors.orange,
  },
  chipValue: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 26,
    color: colors.ink,
    letterSpacing: -0.8,
    marginBottom: 3,
  },
  chipValueHighlight: {
    color: colors.white,
  },
  chipLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: colors.muted,
    lineHeight: 15,
  },
  chipLabelHighlight: {
    color: colors.orangeLight,
  },
  flagBlock: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.danger + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.danger + '40',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 2,
  },
  flagIcon: {
    marginTop: 2,
  },
  flagText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 13,
    color: colors.inkMid,
    lineHeight: 19,
    flex: 1,
  },
});
