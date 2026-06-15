import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SectionCard from '../SectionCard';
import colors from '../../constants/colors';

const PatternRow = React.memo(function PatternRow({ icon, text }) {
  return (
    <View style={st.row}>
      <Ionicons name={icon} size={16} color={colors.orangeDark} style={st.rowIcon} />
      <Text style={st.rowText}>{text}</Text>
    </View>
  );
});

export default React.memo(function PatternCard({ pattern }) {
  if (!pattern) return null;
  const dosePct = Math.min(100, (pattern.weeklyDose.meds / pattern.weeklyDose.limit) * 100);
  const overLimit = pattern.weeklyDose.meds > pattern.weeklyDose.limit;

  return (
    <SectionCard icon="analytics-outline" title="Your Pattern">
      <PatternRow icon="swap-vertical-outline" text={pattern.comparison} />
      <PatternRow icon="git-merge-outline" text={pattern.tippingPoint} />
      {pattern.factorUpdate ? (
        <PatternRow icon="construct-outline" text={pattern.factorUpdate} />
      ) : null}
      {pattern.seasonalDrift ? (
        <PatternRow icon="leaf-outline" text={pattern.seasonalDrift} />
      ) : null}

      <View style={st.doseBlock}>
        <Text style={st.doseLabel}>Weekly cumulative dose</Text>
        <View style={st.doseTrack}>
          <View
            style={[
              st.doseFill,
              { width: `${dosePct}%`, backgroundColor: overLimit ? colors.danger : colors.protected },
            ]}
          />
        </View>
        <Text style={st.doseText}>{pattern.weeklyDose.line}</Text>
      </View>
    </SectionCard>
  );
});

const st = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  rowIcon: {
    marginTop: 2,
  },
  rowText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.inkMid,
    lineHeight: 19,
    flex: 1,
  },
  doseBlock: {
    marginTop: 2,
  },
  doseLabel: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  doseTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    marginBottom: 8,
  },
  doseFill: {
    height: 8,
    borderRadius: 4,
  },
  doseText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.inkMid,
    lineHeight: 19,
  },
});
