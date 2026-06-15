import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../../constants/colors';
import ProgressRing from '../ProgressRing';
import CountUpText from '../CountUpText';

export default React.memo(function ScoreHero({ score, verdict }) {
  const scoreColor =
    score >= 85 ? colors.protected :
    score >= 65 ? colors.warning : colors.danger;
  const ringGradient =
    score >= 85 ? [colors.gradGreenStart, colors.gradGreenEnd] :
    score >= 65 ? ['#F8B84E', '#EE8C0A'] : ['#F0654D', '#DD3220'];

  return (
    <View style={st.wrap}>
      <ProgressRing
        percent={score}
        size={132}
        strokeWidth={11}
        gradient={ringGradient}
        trackColor={colors.surface}
      >
        <View style={st.ringCenter}>
          <CountUpText
            value={score}
            style={[st.score, { color: scoreColor }]}
          />
          <Text style={st.outOf}>/ 100</Text>
        </View>
      </ProgressRing>
      <View style={st.textCol}>
        <Text style={st.label}>Session Score</Text>
        <Text style={st.verdict}>{verdict}</Text>
      </View>
    </View>
  );
});

const st = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  score: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 38,
    letterSpacing: -1.5,
    lineHeight: 42,
  },
  outOf: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 12,
    color: colors.muted,
  },
  textCol: {
    flex: 1,
  },
  label: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  verdict: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 16,
    color: colors.ink,
    lineHeight: 23,
    letterSpacing: -0.2,
  },
});
