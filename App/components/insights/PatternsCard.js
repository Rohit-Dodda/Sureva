import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SectionCard from '../SectionCard';
import IconRow from '../IconRow';
import colors from '../../constants/colors';

export default React.memo(function PatternsCard({ patterns }) {
  return (
    <SectionCard glass icon="analytics-outline" title="Your Patterns">
      <View style={st.riskBanner}>
        <View style={st.riskIconWrap}>
          <Ionicons name="time" size={18} color={colors.white} />
        </View>
        <View style={st.riskBody}>
          <Text style={st.riskLabel}>Highest risk window</Text>
          <Text style={st.riskValue}>{patterns.riskWindow.label}</Text>
        </View>
      </View>
      <Text style={st.riskText}>{patterns.riskWindow.text}</Text>

      <IconRow icon="git-merge-outline" title="Risk combination" text={patterns.riskCombo} />
      <IconRow icon="refresh-outline" title="First reapplication" text={patterns.firstReapply} />
      <IconRow icon="flame-outline" title="Most common culprit" text={patterns.topCulprit} />
      <IconRow icon="trending-down-outline" title="Where you slip" text={patterns.weakSpot} />

      <View style={st.windowBlock}>
        <Ionicons name="alarm-outline" size={16} color={colors.orange} />
        <Text style={st.windowText}>{patterns.reapplyWindow}</Text>
      </View>
    </SectionCard>
  );
});

const st = StyleSheet.create({
  riskBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.ink,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginBottom: 10,
  },
  riskIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.inkMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riskBody: {
    flex: 1,
  },
  riskLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: colors.surface,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  riskValue: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 20,
    color: colors.white,
    letterSpacing: -0.4,
  },
  riskText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.inkMid,
    lineHeight: 19,
    marginBottom: 16,
  },
  windowBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.orangeLight + '40',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 2,
  },
  windowText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 13,
    color: colors.orange,
    lineHeight: 19,
    flex: 1,
  },
});
