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

  return (
    <SectionCard icon="analytics-outline" title="Your Pattern">
      {pattern.comparison ? (
        <PatternRow icon="swap-vertical-outline" text={pattern.comparison} />
      ) : null}
      {pattern.tippingPoint ? (
        <PatternRow icon="git-merge-outline" text={pattern.tippingPoint} />
      ) : null}
      {pattern.factorUpdate ? (
        <PatternRow icon="construct-outline" text={pattern.factorUpdate} />
      ) : null}
      {pattern.seasonalDrift ? (
        <PatternRow icon="leaf-outline" text={pattern.seasonalDrift} />
      ) : null}
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
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.inkMid,
    lineHeight: 19,
    flex: 1,
  },
});
