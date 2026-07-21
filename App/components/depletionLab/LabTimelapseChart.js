import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import colors from '../../constants/colors';
import { yForPct } from '../ChartPlot';
import { buildLinePath, polylineLength, xForMinute, pctAtMinute } from '../whatIf/chartGeometry';
import { clockAtMinute } from '../../services/DepletionLabService';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const DOT = 10;

// The Lab's timelapse: both plans draw in left-to-right over a few
// seconds like a fast-forwarded session — a ticking clock readout, the
// live protection %, and event markers popping in as the sweep reaches
// them. One linear progress value drives everything so the clock, the
// lines and the markers can never drift apart.
export default React.memo(function LabTimelapseChart({ lab, runId, width, height = 210, onComplete }) {
  const { yourResult, perfectResult, startTime } = lab;
  const { durationMinutes, alertThreshold } = yourResult;

  const paths = useMemo(() => ({
    your: buildLinePath(yourResult.points, durationMinutes, width, height),
    yourLen: polylineLength(yourResult.points, durationMinutes, width, height),
    perfect: buildLinePath(perfectResult.points, durationMinutes, width, height),
    perfectLen: polylineLength(perfectResult.points, durationMinutes, width, height),
  }), [yourResult.points, perfectResult.points, durationMinutes, width, height]);

  const progress = useRef(new Animated.Value(0)).current;
  const [readout, setReadout] = useState({ clock: clockAtMinute(startTime, 0), pct: 100 });
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const id = progress.addListener(({ value }) => {
      const minute = value * durationMinutes;
      setReadout({
        clock: clockAtMinute(startTime, minute),
        pct: Math.round(pctAtMinute(yourResult.points, minute)),
      });
    });
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: Math.min(6000, 3000 + durationMinutes * 8),
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => finished && onCompleteRef.current?.());
    return () => progress.removeListener(id);
  }, [runId, progress, durationMinutes, startTime, yourResult.points]);

  // Markers pop in the moment the sweep passes their minute.
  const popIn = useCallback((m) => {
    const f = Math.min(1, Math.max(0.001, m / durationMinutes));
    return progress.interpolate({ inputRange: [f - 0.001, f], outputRange: [0, 1], extrapolate: 'clamp' });
  }, [progress, durationMinutes]);

  const dotAt = (m, pct) => ({
    left: xForMinute(m, durationMinutes, width) - DOT / 2,
    top: yForPct(pct, height) - DOT / 2,
  });
  const pctColor = readout.pct > 60 ? colors.protected : readout.pct > 20 ? colors.warning : colors.danger;

  return (
    <View>
      <View style={st.readout}>
        <Text style={st.clock}>{readout.clock}</Text>
        <Text style={[st.pct, { color: pctColor }]}>{readout.pct}% protected</Text>
      </View>
      <View style={{ width, height }}>
        <Svg width={width} height={height}>
          <Line
            x1="0" y1={yForPct(alertThreshold, height)} x2={width} y2={yForPct(alertThreshold, height)}
            stroke={colors.danger} strokeOpacity="0.5" strokeWidth="1" strokeDasharray="5,5"
          />
          <AnimatedPath
            d={paths.perfect} stroke={colors.protected} strokeWidth="2.5" strokeOpacity="0.9" fill="none"
            strokeLinejoin="round" strokeLinecap="round"
            strokeDasharray={`${paths.perfectLen},${paths.perfectLen}`}
            strokeDashoffset={progress.interpolate({ inputRange: [0, 1], outputRange: [paths.perfectLen, 0] })}
          />
          <AnimatedPath
            d={paths.your} stroke={colors.orange} strokeWidth="3" fill="none"
            strokeLinejoin="round" strokeLinecap="round"
            strokeDasharray={`${paths.yourLen},${paths.yourLen}`}
            strokeDashoffset={progress.interpolate({ inputRange: [0, 1], outputRange: [paths.yourLen, 0] })}
          />
        </Svg>
        <Text style={[st.thresholdLabel, { top: yForPct(alertThreshold, height) + 5 }]}>alert {alertThreshold}%</Text>

        {lab.perfectReapps.map((m) => (
          <Animated.View key={`p-${m}`} pointerEvents="none" style={[st.dot, st.perfectDot, { opacity: popIn(m) }, dotAt(m, 100)]} />
        ))}
        {yourResult.reapplications.map((rep) => (
          <Animated.View key={`r-${rep.m}`} pointerEvents="none" style={[st.dot, st.yourReappDot, { opacity: popIn(rep.m) }, dotAt(rep.m, 100)]} />
        ))}
        {yourResult.waterEvents.map((w) => (
          <Animated.View key={`w-${w.m}`} pointerEvents="none" style={[st.dot, st.waterDot, { opacity: popIn(w.m) }, dotAt(w.m, pctAtMinute(yourResult.points, w.m))]} />
        ))}
        {yourResult.firstAlertMinute != null && (
          <Animated.View
            pointerEvents="none"
            style={[st.dot, st.alertDot, { opacity: popIn(yourResult.firstAlertMinute) }, dotAt(yourResult.firstAlertMinute, pctAtMinute(yourResult.points, yourResult.firstAlertMinute))]}
          />
        )}
      </View>
      <View style={st.axis}>
        <Text style={st.axisLabel}>{clockAtMinute(startTime, 0)}</Text>
        <Text style={st.axisLabel}>{clockAtMinute(startTime, durationMinutes)}</Text>
      </View>
      <View style={st.legend}>
        <View style={[st.swatch, { backgroundColor: colors.orange }]} />
        <Text style={st.legendLabel}>Your plan</Text>
        <View style={[st.swatch, { backgroundColor: colors.protected, marginLeft: 14 }]} />
        <Text style={st.legendLabel}>Perfect plan</Text>
      </View>
    </View>
  );
});

const st = StyleSheet.create({
  readout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  clock: {
    fontFamily: 'Outfit-Regular',
    fontSize: 20,
    color: colors.ink,
    letterSpacing: -0.4,
  },
  pct: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
  },
  thresholdLabel: {
    position: 'absolute',
    right: 0,
    fontFamily: 'Outfit-Regular',
    fontSize: 10,
    color: colors.danger,
  },
  dot: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
    backgroundColor: colors.white,
  },
  perfectDot: { borderColor: colors.protected },
  yourReappDot: { borderColor: colors.orange },
  waterDot: { borderColor: colors.navy },
  alertDot: { borderColor: colors.danger },
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
});
