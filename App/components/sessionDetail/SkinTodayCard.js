import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SectionCard from '../SectionCard';
import colors from '../../constants/colors';

const STRESS_LEVELS = ['Low', 'Moderate', 'High', 'Severe'];
const STRESS_COLORS = {
  Low: colors.protected,
  Moderate: colors.warning,
  High: colors.danger,
  Severe: colors.danger,
};

const InsightRow = React.memo(function InsightRow({ icon, text }) {
  return (
    <View style={st.row}>
      <Ionicons name={icon} size={16} color={colors.orange} style={st.rowIcon} />
      <Text style={st.rowText}>{text}</Text>
    </View>
  );
});

export default React.memo(function SkinTodayCard({ skin }) {
  const stressColor = STRESS_COLORS[skin.stress.level];
  const medPct = Math.min(100, (skin.med.accumulated / skin.med.threshold) * 100);

  return (
    <SectionCard icon="body-outline" title="Your Skin Today">
      <InsightRow icon="shield-half-outline" text={skin.effectiveSpf.line} />
      <InsightRow icon="water-outline" text={skin.sebum} />
      <InsightRow icon="thermometer-outline" text={skin.sweat} />

      <View style={st.stressBlock}>
        <Text style={st.blockLabel}>Skin stress score</Text>
        <View style={st.stressScale}>
          {STRESS_LEVELS.map((level) => {
            const active = level === skin.stress.level;
            return (
              <View
                key={level}
                style={[st.stressPill, active && { backgroundColor: stressColor, borderColor: stressColor }]}
              >
                <Text style={[st.stressPillText, active && st.stressPillTextActive]}>{level}</Text>
              </View>
            );
          })}
        </View>
        <Text style={st.blockNote}>{skin.stress.note}</Text>
      </View>

      <View style={st.medBlock}>
        <Text style={st.blockLabel}>Cumulative UV dose</Text>
        <View style={st.medTrack}>
          <View style={[st.medFill, { width: `${medPct}%`, backgroundColor: stressColor }]} />
        </View>
        <Text style={st.blockNote}>{skin.med.line}</Text>
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
  stressBlock: {
    marginTop: 4,
    marginBottom: 16,
  },
  blockLabel: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  stressScale: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  stressPill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  stressPillText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 12,
    color: colors.muted,
  },
  stressPillTextActive: {
    color: colors.white,
  },
  blockNote: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.inkMid,
    lineHeight: 19,
  },
  medBlock: {},
  medTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    marginBottom: 8,
  },
  medFill: {
    height: 8,
    borderRadius: 4,
  },
});
