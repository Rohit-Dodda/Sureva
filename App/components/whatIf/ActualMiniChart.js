import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import colors from '../../constants/colors';
import { yForPct } from '../ChartPlot';
import { buildLinePath, xForMinute, pctAtMinute } from './chartGeometry';

const DOT = 7;

// The read-only reference: the real session in muted gray. Never changes.
export default React.memo(function ActualMiniChart({ result, width, height }) {
  const { points, durationMinutes, alertThreshold } = result;
  const pathD = useMemo(
    () => buildLinePath(points, durationMinutes, width, height),
    [points, durationMinutes, width, height]
  );

  return (
    <View style={{ width }}>
      {/* Tag lives above the plot, in flow — inside it, the line at 100%
          protection starts right where the label sits and intersects it. */}
      <Text style={st.tag}>ACTUAL</Text>
      <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Line
          x1="0" y1={yForPct(alertThreshold, height)} x2={width} y2={yForPct(alertThreshold, height)}
          stroke={colors.muted} strokeOpacity="0.35" strokeWidth="1" strokeDasharray="4,4"
        />
        <Path d={pathD} stroke={colors.muted} strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
      {result.reapplications.map((rep) => (
        <View key={`rep-${rep.m}`} style={[st.dot, dotAt(rep.m, 100, durationMinutes, width, height)]} />
      ))}
      {result.waterEvents.map((w) => (
        <View key={`water-${w.m}`} style={[st.dot, dotAt(w.m, pctAtMinute(points, w.m), durationMinutes, width, height)]} />
      ))}
      {result.firstAlertMinute != null && (
        <View
          style={[st.dot, st.alertDot, dotAt(result.firstAlertMinute, pctAtMinute(points, result.firstAlertMinute), durationMinutes, width, height)]}
        />
      )}
      </View>
    </View>
  );
});

function dotAt(m, pct, durationMinutes, width, height) {
  return {
    left: xForMinute(m, durationMinutes, width) - DOT / 2,
    top: yForPct(pct, height) - DOT / 2,
  };
}

const st = StyleSheet.create({
  tag: {
    fontFamily: 'Outfit-Regular',
    fontSize: 9,
    letterSpacing: 1,
    color: colors.muted,
    marginBottom: 6,
  },
  dot: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 1.5,
    borderColor: colors.muted,
    backgroundColor: colors.white,
  },
  alertDot: { borderColor: colors.danger },
});
