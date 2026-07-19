import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SectionCard from '../SectionCard';
import colors from '../../constants/colors';

export default React.memo(function PreventedCard({ prevented }) {
  const { withSureva, without } = prevented.doseComparison;
  const maxDose = Math.max(withSureva, without);

  return (
    <SectionCard icon="shield-outline" title="What Sureva Prevented">
      <View style={st.simRow}>
        <Ionicons name="git-branch-outline" size={16} color={colors.danger} style={st.simIcon} />
        <Text style={st.simText}>{prevented.simulated}</Text>
      </View>

      <View style={st.compareBlock}>
        <Text style={st.compareLabel}>UV dose comparison</Text>
        <View style={st.barRow}>
          <Text style={st.barLabel}>With Sureva</Text>
          <View style={st.barTrack}>
            <View style={[st.barFill, { width: `${(withSureva / maxDose) * 100}%`, backgroundColor: colors.protected }]} />
          </View>
          <Text style={st.barValue}>{withSureva} MEDs</Text>
        </View>
        <View style={st.barRow}>
          <Text style={st.barLabel}>Without</Text>
          <View style={st.barTrack}>
            <View style={[st.barFill, { width: `${(without / maxDose) * 100}%`, backgroundColor: colors.danger }]} />
          </View>
          <Text style={st.barValue}>{without} MEDs</Text>
        </View>
      </View>

      <View style={st.weeklyBlock}>
        <Text style={st.weeklyText}>{prevented.weeklyTotal}</Text>
      </View>
    </SectionCard>
  );
});

const st = StyleSheet.create({
  simRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  simIcon: {
    marginTop: 2,
  },
  simText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.inkMid,
    lineHeight: 19,
    flex: 1,
  },
  compareBlock: {
    marginBottom: 14,
  },
  compareLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  barLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.inkMid,
    width: 86,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  barFill: {
    height: 10,
    borderRadius: 5,
  },
  barValue: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.ink,
    width: 64,
    textAlign: 'right',
  },
  weeklyBlock: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  weeklyText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.orange,
    lineHeight: 19,
  },
});
