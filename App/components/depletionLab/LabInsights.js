import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import SectionCard from '../SectionCard';
import { clockAtMinute, formatLabDuration } from '../../services/DepletionLabService';

const FACTOR_META = {
  uv: { label: 'UV', icon: 'sunny' },
  heatHumidity: { label: 'Heat & humidity', icon: 'thermometer' },
  activity: { label: 'Activity', icon: 'walk' },
  skinType: { label: 'Skin type', icon: 'person' },
  waterEvents: { label: 'Water', icon: 'water' },
};

function stressWord(stress) {
  if (stress < 34) return 'a manageable environment';
  if (stress < 67) return 'a demanding environment';
  return 'a punishing environment';
}

// What the simulated conditions actually mean for this user's skin:
// stress score, the standout moments of the run, and which factors drove
// the depletion — all straight from the engine's own analytics.
export default React.memo(function LabInsights({ lab, fitzpatrickType }) {
  const { skinStress, criticalMoments, factorBreakdown, startTime, yourResult } = lab;
  const stressColor = skinStress < 34 ? colors.protected : skinStress < 67 ? colors.warning : colors.danger;
  const factors = Object.entries(factorBreakdown).filter(([, pct]) => pct > 0);

  return (
    <SectionCard glass icon="analytics" title="What this means for your skin" subtitle={`Tuned to Fitzpatrick type ${fitzpatrickType}`}>
      <View style={st.stressRow}>
        <Text style={[st.stressVal, { color: stressColor }]}>{skinStress}</Text>
        <View style={st.stressTextWrap}>
          <Text style={st.stressLabel}>Skin stress · out of 100</Text>
          <Text style={st.stressLine}>
            For your skin type, these conditions are {stressWord(skinStress)}
            {yourResult.unprotectedMinutes > 0
              ? ` — your plan leaves ${yourResult.unprotectedMinutes} unprotected minutes.`
              : '.'}
          </Text>
        </View>
      </View>

      <View style={st.momentList}>
        {criticalMoments.fastestDepletionMinute && (
          <View style={st.momentRow}>
            <Ionicons name="flash" size={15} color={colors.danger} />
            <Text style={st.momentText}>
              Fastest depletion around {clockAtMinute(startTime, (criticalMoments.fastestDepletionMinute.timestamp - startTime) / 60000)}
              {' '}— {criticalMoments.fastestDepletionMinute.percentageLost}% lost in a minute
            </Text>
          </View>
        )}
        {criticalMoments.bestProtectedWindow && (
          <View style={st.momentRow}>
            <Ionicons name="shield-checkmark" size={15} color={colors.protected} />
            <Text style={st.momentText}>
              Best protected stretch: {formatLabDuration(Math.round(criticalMoments.bestProtectedWindow.durationMinutes))}
            </Text>
          </View>
        )}
        {criticalMoments.longestUnprotectedWindow && (
          <View style={st.momentRow}>
            <Ionicons name="alert-circle" size={15} color={colors.warning} />
            <Text style={st.momentText}>
              Longest unprotected stretch: {formatLabDuration(Math.round(criticalMoments.longestUnprotectedWindow.durationMinutes))}
            </Text>
          </View>
        )}
      </View>

      <Text style={st.whyLabel}>What drove the depletion</Text>
      <View style={st.chipRow}>
        {factors.map(([key, pct]) => (
          <View key={key} style={st.chip}>
            <Ionicons name={FACTOR_META[key].icon} size={13} color={colors.inkMid} />
            <Text style={st.chipText}>{FACTOR_META[key].label} {pct}%</Text>
          </View>
        ))}
      </View>
    </SectionCard>
  );
});

const st = StyleSheet.create({
  stressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  stressVal: {
    fontFamily: 'Outfit-Regular',
    fontSize: 38,
    letterSpacing: -1,
  },
  stressTextWrap: {
    flex: 1,
    gap: 2,
  },
  stressLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 0.4,
  },
  stressLine: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkMid,
  },
  momentList: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 14,
  },
  momentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  momentText: {
    flex: 1,
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: colors.inkMid,
  },
  whyLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  chipText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.inkMid,
  },
});
