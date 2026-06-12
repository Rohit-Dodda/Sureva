import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import colors from '../constants/colors';

export const PAD_TOP = 8;

export function yForPct(pct, height) {
  return PAD_TOP + (1 - pct / 100) * (height - PAD_TOP);
}

export default React.memo(function ChartPlot({ data, durationMinutes, width, height }) {
  const { line, fill } = useMemo(() => {
    const x = (m) => (m / durationMinutes) * width;
    let d = `M ${x(data[0].m)} ${yForPct(data[0].pct, height)}`;
    for (let i = 1; i < data.length; i++) {
      d += ` L ${x(data[i].m)} ${yForPct(data[i].pct, height)}`;
    }
    return { line: d, fill: `${d} L ${width} ${height} L 0 ${height} Z` };
  }, [data, durationMinutes, width, height]);

  return (
    <View>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.orange} stopOpacity="0.22" />
            <Stop offset="1" stopColor={colors.orange} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>
        <Line x1="0" y1={yForPct(60, height)} x2={width} y2={yForPct(60, height)} stroke={colors.warning} strokeOpacity="0.45" strokeWidth="1" strokeDasharray="5,5" />
        <Line x1="0" y1={yForPct(20, height)} x2={width} y2={yForPct(20, height)} stroke={colors.danger} strokeOpacity="0.5" strokeWidth="1" strokeDasharray="5,5" />
        <Path d={fill} fill="url(#fillGrad)" />
        <Path d={line} stroke={colors.orange} strokeWidth="2.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
      <Text style={[st.threshold, { top: yForPct(60, height) - 16, color: colors.warning }]}>60%</Text>
      <Text style={[st.threshold, { top: yForPct(20, height) - 16, color: colors.danger }]}>20%</Text>
    </View>
  );
});

const st = StyleSheet.create({
  threshold: {
    position: 'absolute',
    right: 0,
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 10,
  },
});
