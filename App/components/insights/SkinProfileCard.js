import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import SectionCard from '../SectionCard';
import IconRow from '../IconRow';
import colors from '../../constants/colors';

export default React.memo(function SkinProfileCard({ profile }) {
  const maxSens = Math.max(...profile.sensitivities.map((s) => s.value));

  return (
    <SectionCard glass icon="finger-print-outline" title="Your Skin Profile">
      <View style={st.hero}>
        <Text style={st.heroPct}>{profile.heroPct}%</Text>
        <Text style={st.heroLine}>{profile.heroLine}</Text>
      </View>

      <IconRow icon="construct-outline" text={profile.modelAccuracy} />

      <Text style={st.subLabel}>Factor sensitivity · ranked from your sessions</Text>
      <View style={st.sensList}>
        {profile.sensitivities.map((s, i) => (
          <View key={s.label} style={st.sensRow}>
            <Text style={st.sensRank}>{i + 1}</Text>
            <Text style={st.sensLabel}>{s.label}</Text>
            <View style={st.sensTrack}>
              <View style={[st.sensFill, { width: `${(s.value / maxSens) * 100}%`, opacity: 1 - i * 0.18 }]} />
            </View>
          </View>
        ))}
      </View>

      <IconRow icon="speedometer-outline" title="Your baseline" text={profile.baseline} />
      <IconRow icon="people-outline" title="Against the population" text={profile.population} />
    </SectionCard>
  );
});

const st = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  heroPct: {
    fontFamily: 'Outfit-Regular',
    fontSize: 38,
    color: colors.orangeDark,
    letterSpacing: -1.5,
  },
  heroLine: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.inkMid,
    lineHeight: 18,
    flex: 1,
  },
  subLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  sensList: {
    gap: 9,
    marginBottom: 18,
  },
  sensRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sensRank: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.muted,
    width: 14,
  },
  sensLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.inkMid,
    width: 112,
  },
  sensTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  sensFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.orange,
  },
});
