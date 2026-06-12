import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../../constants/colors';

export default React.memo(function ScoreHero({ score, verdict }) {
  const scoreColor =
    score >= 85 ? colors.protected :
    score >= 65 ? colors.warning : colors.danger;

  return (
    <View style={st.wrap}>
      <View style={st.scoreRow}>
        <Text style={[st.score, { color: scoreColor }]}>{score}</Text>
        <View style={st.scaleWrap}>
          <Text style={st.outOf}>/ 100</Text>
          <Text style={st.label}>Session Score</Text>
        </View>
      </View>
      <View style={st.track}>
        <View style={[st.trackFill, { width: `${score}%`, backgroundColor: scoreColor }]} />
      </View>
      <Text style={st.verdict}>{verdict}</Text>
    </View>
  );
});

const st = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 14,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginBottom: 14,
  },
  score: {
    fontFamily: 'SFProDisplay-Black',
    fontSize: 64,
    letterSpacing: -3,
    lineHeight: 64,
  },
  scaleWrap: {
    paddingBottom: 8,
  },
  outOf: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 16,
    color: colors.muted,
  },
  label: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    marginBottom: 14,
  },
  trackFill: {
    height: 6,
    borderRadius: 3,
  },
  verdict: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 15,
    color: colors.ink,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
});
