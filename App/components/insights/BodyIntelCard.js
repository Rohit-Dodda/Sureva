import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SectionCard from '../SectionCard';
import IconRow from '../IconRow';
import colors from '../../constants/colors';

export default React.memo(function BodyIntelCard({ body }) {
  return (
    <SectionCard icon="body-outline" title="Body Intelligence">
      <IconRow icon="rainy-outline" title="Your sweat profile" text={body.sweat} />
      <IconRow icon="fitness-outline" title="Activity impact" text={body.activityImpact} />

      <Text style={st.subLabel}>Your personal thresholds</Text>
      <View style={st.thresholds}>
        {body.thresholds.map((t) => (
          <View key={t.label} style={st.tile}>
            <Ionicons name={t.icon} size={16} color={colors.orange} style={st.tileIcon} />
            <Text style={st.tileValue}>{t.value}</Text>
            <Text style={st.tileLabel}>{t.label}</Text>
            <Text style={st.tileNote}>{t.note}</Text>
          </View>
        ))}
      </View>
    </SectionCard>
  );
});

const st = StyleSheet.create({
  subLabel: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 2,
    marginBottom: 10,
  },
  thresholds: {
    flexDirection: 'row',
    gap: 8,
  },
  tile: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  tileIcon: {
    marginBottom: 6,
  },
  tileValue: {
    fontFamily: 'SFProDisplay-Black',
    fontSize: 19,
    color: colors.ink,
    letterSpacing: -0.5,
    marginBottom: 1,
  },
  tileLabel: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  tileNote: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 11,
    color: colors.inkMid,
    lineHeight: 15,
  },
});
