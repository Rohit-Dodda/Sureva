import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SectionCard from '../SectionCard';
import colors from '../../constants/colors';

const FactorBar = React.memo(function FactorBar({ label, pct, max }) {
  return (
    <View style={st.factorRow}>
      <Text style={st.factorLabel}>{label}</Text>
      <View style={st.factorTrack}>
        <View style={[st.factorFill, { width: `${(pct / max) * 100}%` }]} />
      </View>
      <Text style={st.factorPct}>{pct}%</Text>
    </View>
  );
});

export default React.memo(function DriversCard({ drivers }) {
  const maxPct = Math.max(...drivers.factors.map((f) => f.pct));

  return (
    <SectionCard icon="flame-outline" title="What Drove Your Depletion">
      <Text style={st.culprit}>{drivers.culprit}</Text>

      <View style={st.factors}>
        {drivers.factors.map((f) => (
          <FactorBar key={f.label} label={f.label} pct={f.pct} max={maxPct} />
        ))}
      </View>

      <View style={st.peakBlock}>
        <View style={st.peakHeader}>
          <Text style={st.peakValue}>{drivers.peakMultiplier.value}x</Text>
          <Text style={st.peakNote}>peak combined multiplier at {drivers.peakMultiplier.time}</Text>
        </View>
        {drivers.activeAtPeak.map((m) => (
          <View key={m.sensor} style={st.multRow}>
            <Text style={st.multSensor}>
              {m.sensor}{m.reading ? ` ${m.reading}` : ''}
            </Text>
            <Text style={st.multValue}>{m.mult}</Text>
          </View>
        ))}
      </View>

      <View style={st.aggressive}>
        <Ionicons name="warning-outline" size={15} color={colors.warning} style={st.aggressiveIcon} />
        <Text style={st.aggressiveText}>
          <Text style={st.aggressiveTime}>{drivers.aggressiveAt.time}</Text>
          {'  '}{drivers.aggressiveAt.note}
        </Text>
      </View>
    </SectionCard>
  );
});

const st = StyleSheet.create({
  culprit: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 15,
    color: colors.ink,
    lineHeight: 21,
    letterSpacing: -0.2,
    marginBottom: 16,
  },
  factors: {
    gap: 10,
    marginBottom: 18,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  factorLabel: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 13,
    color: colors.inkMid,
    width: 110,
  },
  factorTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  factorFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.orange,
  },
  factorPct: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 13,
    color: colors.ink,
    width: 38,
    textAlign: 'right',
  },
  peakBlock: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  peakHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 8,
  },
  peakValue: {
    fontFamily: 'SFProDisplay-Black',
    fontSize: 24,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  peakNote: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 12,
    color: colors.muted,
    flex: 1,
  },
  multRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: colors.surface,
  },
  multSensor: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 13,
    color: colors.inkMid,
    flex: 1,
  },
  multValue: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 13,
    color: colors.orangeDark,
  },
  aggressive: {
    flexDirection: 'row',
    gap: 8,
  },
  aggressiveIcon: {
    marginTop: 2,
  },
  aggressiveText: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 13,
    color: colors.inkMid,
    lineHeight: 19,
    flex: 1,
  },
  aggressiveTime: {
    fontFamily: 'SFProDisplay-Bold',
    color: colors.ink,
  },
});
