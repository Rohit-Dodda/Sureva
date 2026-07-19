import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../../constants/colors';
import ActualMiniChart from './ActualMiniChart';
import SimulatedChart from './SimulatedChart';
import WhatIfInfoButton from './WhatIfInfoButton';
import whatIfInfoContent from './whatIfInfoContent';

const ACTUAL_H = 56;
// Fixed vertical chrome around the simulated plot: ACTUAL tag (~21),
// divider (25), axis row (26), legend (28).
const CHROME_H = ACTUAL_H + 21 + 25 + 26 + 28;

// The chart layer: fills whatever space it's given (it is the screen's
// background behind the bottom sheet). Gray actual session collapsed on
// top, the orange simulation as the hero filling the rest. Same data,
// colors and event dots as always — only the sizing is flexible.
export default React.memo(function SimulationCharts({ actualResult, simResult, startTime, endTime }) {
  const [size, setSize] = useState(null);
  const onLayout = useCallback((e) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  }, []);

  const simH = size ? Math.max(120, size.h - CHROME_H) : 0;

  return (
    <View style={st.layer} onLayout={onLayout}>
      {size && (
        <>
          <View style={st.infoBtn}>
            <WhatIfInfoButton info={whatIfInfoContent.charts} />
          </View>
          <ActualMiniChart result={actualResult} width={size.w} height={ACTUAL_H} />
          <View style={st.divider} />
          <SimulatedChart result={simResult} width={size.w} height={simH} />
          <View style={st.axis}>
            <Text style={st.axisLabel}>{startTime}</Text>
            <Text style={st.axisLabel}>{endTime}</Text>
          </View>
          <View style={st.legend}>
            <View style={[st.swatch, { backgroundColor: colors.muted }]} />
            <Text style={st.legendLabel}>Actual</Text>
            <View style={[st.swatch, { backgroundColor: colors.orange, marginLeft: 14 }]} />
            <Text style={st.legendLabel}>What if</Text>
          </View>
        </>
      )}
    </View>
  );
});

const st = StyleSheet.create({
  layer: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  axisLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: colors.muted,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  swatch: {
    width: 14,
    height: 3,
    borderRadius: 2,
    marginRight: 6,
  },
  legendLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: colors.inkMid,
  },
  infoBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 2,
  },
});
