import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import SectionCard from '../SectionCard';
import IconRow from '../IconRow';
import StatGrid from '../StatGrid';
import colors from '../../constants/colors';

const SessionExtreme = React.memo(function SessionExtreme({ kind, score, text }) {
  const isBest = kind === 'best';
  const color = isBest ? colors.protected : colors.danger;
  return (
    <View style={st.extreme}>
      <View style={[st.extremeScore, { backgroundColor: color + '1A' }]}>
        <Text style={[st.extremeScoreText, { color }]}>{score}</Text>
      </View>
      <View style={st.extremeBody}>
        <Text style={st.extremeLabel}>{isBest ? 'Best session ever' : 'Worst session ever'}</Text>
        <Text style={st.extremeText}>{text}</Text>
      </View>
    </View>
  );
});

export default React.memo(function HistoryCard({ history }) {
  return (
    <SectionCard icon="albums-outline" title="Your Protection History">
      <StatGrid stats={history.stats} />
      <Text style={st.medContext}>{history.medContext}</Text>

      <SessionExtreme kind="best" score={history.best.score} text={history.best.text} />
      <SessionExtreme kind="worst" score={history.worst.score} text={history.worst.text} />

      <View style={st.divider} />
      <IconRow icon="trending-up-outline" title="Score trend" text={history.trend} />
      <IconRow icon="notifications-outline" title="Alerts & compliance" text={history.alerts} />
      <IconRow icon="water-outline" title="Water events" text={history.water} />
    </SectionCard>
  );
});

const st = StyleSheet.create({
  medContext: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.inkMid,
    lineHeight: 19,
    marginTop: 12,
    marginBottom: 16,
  },
  extreme: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  extremeScore: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extremeScoreText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 19,
    letterSpacing: -0.5,
  },
  extremeBody: {
    flex: 1,
  },
  extremeLabel: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 13,
    color: colors.ink,
    marginBottom: 2,
  },
  extremeText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.inkMid,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surface,
    marginVertical: 14,
  },
});
