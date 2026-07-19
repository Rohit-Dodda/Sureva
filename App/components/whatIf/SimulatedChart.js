import React, { useRef, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Path, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { yForPct } from '../ChartPlot';
import { buildLinePath, polylineLength, xForMinute, pctAtMinute } from './chartGeometry';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const REPLAY_MS = 600; // full fast-forward replay on every control change
const DOT = 10;

// The hero chart: the simulated (orange) line. Every time the result
// changes, the line re-draws from the start of the session — a replay,
// not a jump. The alert dot slides to its new position; when the alert
// never fires, a green checkmark fades in at the end of the line instead.
export default React.memo(function SimulatedChart({ result, width, height }) {
  const { points, durationMinutes, alertThreshold } = result;

  const { pathD, pathLen } = useMemo(
    () => ({
      pathD: buildLinePath(points, durationMinutes, width, height),
      pathLen: polylineLength(points, durationMinutes, width, height),
    }),
    [points, durationMinutes, width, height]
  );

  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: REPLAY_MS, useNativeDriver: false }).start();
  }, [pathD, progress]);
  const dashOffset = progress.interpolate({ inputRange: [0, 1], outputRange: [pathLen, 0] });

  // Alert dot slides along the timeline; checkmark cross-fades with it.
  const alertPos = useRef(new Animated.ValueXY({ x: -DOT, y: 0 })).current;
  const alertOpacity = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const fired = result.firstAlertMinute != null;
    if (fired) {
      const x = xForMinute(result.firstAlertMinute, durationMinutes, width);
      const y = yForPct(pctAtMinute(points, result.firstAlertMinute), height);
      Animated.parallel([
        Animated.timing(alertPos, { toValue: { x, y }, duration: 300, useNativeDriver: true }),
        Animated.timing(alertOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(checkOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(alertOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(checkOpacity, { toValue: 1, duration: 300, delay: REPLAY_MS, useNativeDriver: true }),
      ]).start();
    }
  }, [result.firstAlertMinute, durationMinutes, points, width, height, alertPos, alertOpacity, checkOpacity]);

  const endX = xForMinute(durationMinutes, durationMinutes, width);
  const endY = yForPct(points.length ? points[points.length - 1].pct : 0, height);
  const markerOpacity = progress.interpolate({ inputRange: [0.6, 1], outputRange: [0, 1], extrapolate: 'clamp' });

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="whatIfFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.orange} stopOpacity="0.18" />
            <Stop offset="1" stopColor={colors.orange} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>
        <Line
          x1="0" y1={yForPct(alertThreshold, height)} x2={width} y2={yForPct(alertThreshold, height)}
          stroke={colors.danger} strokeOpacity="0.5" strokeWidth="1" strokeDasharray="5,5"
        />
        <Path d={`${pathD} L ${width} ${height} L 0 ${height} Z`} fill="url(#whatIfFill)" />
        <AnimatedPath
          d={pathD}
          stroke={colors.orange}
          strokeWidth="3"
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray={`${pathLen},${pathLen}`}
          strokeDashoffset={dashOffset}
        />
      </Svg>
      <Text style={[st.thresholdLabel, { top: yForPct(alertThreshold, height) + 5 }]}>
        alert {alertThreshold}%
      </Text>

      {result.applicationMinute > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[st.dot, st.applicationDot, { opacity: markerOpacity }, dotAt(result.applicationMinute, 100, durationMinutes, width, height)]}
        />
      )}
      {result.reapplications.map((rep) => (
        <Animated.View
          key={`rep-${rep.m}`}
          pointerEvents="none"
          style={[st.dot, st.reapplyDot, { opacity: markerOpacity }, dotAt(rep.m, 100, durationMinutes, width, height)]}
        />
      ))}
      {result.waterEvents.map((w) => (
        <Animated.View
          key={`water-${w.m}`}
          pointerEvents="none"
          style={[st.dot, st.waterDot, { opacity: markerOpacity }, dotAt(w.m, pctAtMinute(points, w.m), durationMinutes, width, height)]}
        />
      ))}
      <Animated.View
        pointerEvents="none"
        style={[st.dot, st.alertDot, {
          opacity: alertOpacity,
          transform: [
            { translateX: Animated.subtract(alertPos.x, DOT / 2) },
            { translateY: Animated.subtract(alertPos.y, DOT / 2) },
          ],
        }]}
      />
      {/* Centered exactly on the line's endpoint (icon is 22px square). */}
      <Animated.View
        pointerEvents="none"
        style={[st.check, { opacity: checkOpacity, left: endX - 11, top: endY - 11 }]}
      >
        <Ionicons name="checkmark-circle" size={22} color={colors.protected} />
      </Animated.View>
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
  applicationDot: { borderColor: colors.orange },
  reapplyDot: { borderColor: colors.protected },
  waterDot: { borderColor: colors.navy },
  alertDot: { borderColor: colors.danger, top: 0, left: 0 },
  check: { position: 'absolute' },
});
