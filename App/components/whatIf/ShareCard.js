import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import colors from '../../constants/colors';
import { yForPct } from '../ChartPlot';
import { buildLinePath } from './chartGeometry';

const CARD_W = 340;
const CHART_W = CARD_W - 48;
const CHART_H = 120;

// Static image card for sharing: both lines, the headline insight, and
// the Sureva wordmark. Rendered off-screen and captured with view-shot.
export default React.memo(function ShareCard({ headline, actualResult, simResult }) {
  const actualPath = useMemo(
    () => buildLinePath(actualResult.points, actualResult.durationMinutes, CHART_W, CHART_H),
    [actualResult]
  );
  const simPath = useMemo(
    () => buildLinePath(simResult.points, simResult.durationMinutes, CHART_W, CHART_H),
    [simResult]
  );

  return (
    <View style={st.card}>
      <Text style={st.kicker}>SESSION SIMULATOR</Text>
      <Text style={st.headline}>{headline}</Text>
      <Svg width={CHART_W} height={CHART_H} style={st.chart}>
        <Line
          x1="0" y1={yForPct(simResult.alertThreshold, CHART_H)} x2={CHART_W} y2={yForPct(simResult.alertThreshold, CHART_H)}
          stroke={colors.onDarkMuted} strokeWidth="1" strokeDasharray="4,4"
        />
        <Path d={actualPath} stroke={colors.onDarkMuted} strokeWidth="2" fill="none" strokeLinejoin="round" />
        <Path d={simPath} stroke={colors.orange} strokeWidth="3" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
      <View style={st.legendRow}>
        <View style={[st.swatch, { backgroundColor: colors.onDarkMuted }]} />
        <Text style={st.legendLabel}>Actual</Text>
        <View style={[st.swatch, { backgroundColor: colors.orange, marginLeft: 12 }]} />
        <Text style={st.legendLabel}>What if</Text>
        <View style={st.spacer} />
        <Text style={st.wordmark}>Sureva</Text>
      </View>
    </View>
  );
});

const st = StyleSheet.create({
  card: {
    width: CARD_W,
    backgroundColor: colors.charcoal,
    borderRadius: 28,
    padding: 24,
  },
  kicker: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    letterSpacing: 2,
    color: colors.orange,
    marginBottom: 8,
  },
  headline: {
    fontFamily: 'Outfit-Regular',
    fontSize: 19,
    lineHeight: 25,
    color: colors.onDark,
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  chart: {
    marginBottom: 12,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  swatch: {
    width: 12,
    height: 3,
    borderRadius: 2,
    marginRight: 5,
  },
  legendLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: colors.onDarkMuted,
  },
  spacer: {
    flex: 1,
  },
  wordmark: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    color: colors.orange,
    letterSpacing: -0.3,
  },
});
