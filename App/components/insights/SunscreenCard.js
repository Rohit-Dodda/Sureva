import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SectionCard from '../SectionCard';
import IconRow from '../IconRow';
import colors from '../../constants/colors';

export default React.memo(function SunscreenCard({ sunscreen }) {
  return (
    <SectionCard glass icon="flask-outline" title="Sunscreen Performance">
      <View style={st.spfRow}>
        <View style={st.spfBox}>
          <Text style={st.spfLabel}>On the bottle</Text>
          <Text style={st.spfValue}>SPF {sunscreen.labeled}</Text>
        </View>
        <Ionicons name="arrow-forward" size={18} color={colors.muted} />
        <View style={[st.spfBox, st.spfBoxObserved]}>
          <Text style={[st.spfLabel, st.spfLabelObserved]}>On your skin</Text>
          <Text style={[st.spfValue, st.spfValueObserved]}>SPF {sunscreen.observed}</Text>
        </View>
      </View>
      <Text style={st.spfNote}>{sunscreen.effectiveLine}</Text>

      <IconRow icon="water-outline" title="Water vs dry" text={sunscreen.waterVsDry} />
      <IconRow icon="boat-outline" title="Water resistance reality" text={sunscreen.waterResistance} />
      <IconRow icon="thermometer-outline" title="Performance in heat" text={sunscreen.heat} />

      <View style={st.recoBlock}>
        <Ionicons name="bulb-outline" size={16} color={colors.warning} style={st.recoIcon} />
        <Text style={st.recoText}>{sunscreen.recommendation}</Text>
      </View>
    </SectionCard>
  );
});

const st = StyleSheet.create({
  spfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  spfBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  spfBoxObserved: {
    backgroundColor: colors.ink,
  },
  spfLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  spfLabelObserved: {
    color: colors.surface,
  },
  spfValue: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 21,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  spfValueObserved: {
    color: colors.white,
  },
  spfNote: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.inkMid,
    lineHeight: 19,
    marginBottom: 16,
  },
  recoBlock: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.warning + '15',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.warning + '50',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 2,
  },
  recoIcon: {
    marginTop: 2,
  },
  recoText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 13,
    color: colors.inkMid,
    lineHeight: 19,
    flex: 1,
  },
});
