import React, { useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, PanResponder } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import colors from '../../constants/colors';
import { trendDirection } from '../../services/SkinAgeService';

const CHART_W = Dimensions.get('window').width - 40 - 36; // screen + card padding
const CHART_H = 150;
const PAD_TOP = 10;
const PAD_BOTTOM = 10;
const DOT_R = 6;

function scrubLabel(point) {
  const d = new Date(point.date);
  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${dateStr}  ·  skin age ${point.age}`;
}

// Feature 2 — skin age over time, orange line against a dashed gray line
// at the user's real age. Drag anywhere on the plot to inspect the stored
// value for any day.
export default React.memo(function SkinAgeTrendChart({ points, realAge, startDateLabel }) {
  const trend = trendDirection(points);
  const [active, setActive] = useState(null);

  const geom = useMemo(() => {
    if (!points.length) return { pathD: '', refY: CHART_H / 2, startX: 0, yFor: () => 0, xFor: () => 0 };
    const ages = points.map((p) => p.age);
    const lo = Math.min(...ages, realAge) - 0.5;
    const hi = Math.max(...ages, realAge) + 0.5;
    const yFor = (age) => PAD_TOP + (1 - (age - lo) / (hi - lo)) * (CHART_H - PAD_TOP - PAD_BOTTOM);
    const xFor = (i) => (points.length > 1 ? (i / (points.length - 1)) * CHART_W : 0);
    let d = `M ${xFor(0)} ${yFor(points[0].age)}`;
    for (let i = 1; i < points.length; i++) d += ` L ${xFor(i)} ${yFor(points[i].age)}`;
    return {
      pathD: d,
      refY: yFor(realAge),
      startX: xFor(0) + 1,
      yFor,
      xFor,
    };
  }, [points, realAge]);

  // Scrub state — same pattern as DepletionChart: pageX against the
  // measured plot origin, Animated line/dot, throttled label updates.
  const plotRef = useRef(null);
  const plotPageX = useRef(0);
  const lastKey = useRef('');
  const scrubX = useRef(new Animated.Value(0)).current;
  const dotY = useRef(new Animated.Value(0)).current;
  const scrubAnim = useRef(new Animated.Value(0)).current;
  const geomRef = useRef(geom);
  geomRef.current = geom;
  const pointsRef = useRef(points);
  pointsRef.current = points;

  const onPlotLayout = useCallback(() => {
    plotRef.current?.measureInWindow((x) => { plotPageX.current = x; });
  }, []);

  const moveScrub = useCallback((pageX) => {
    const pts = pointsRef.current;
    if (pts.length < 2) return;
    const x = Math.min(Math.max(pageX - plotPageX.current, 0), CHART_W);
    const i = Math.round((x / CHART_W) * (pts.length - 1));
    const g = geomRef.current;
    scrubX.setValue(g.xFor(i));
    dotY.setValue(g.yFor(pts[i].age));
    const key = pts[i].date;
    if (key !== lastKey.current) {
      lastKey.current = key;
      setActive(pts[i]);
    }
  }, [scrubX, dotY]);

  const hideScrub = useCallback(() => {
    Animated.timing(scrubAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start();
  }, [scrubAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        plotRef.current?.measureInWindow((x) => { plotPageX.current = x; });
        moveScrub(e.nativeEvent.pageX);
        Animated.spring(scrubAnim, { toValue: 1, tension: 140, friction: 14, useNativeDriver: true }).start();
      },
      onPanResponderMove: (e) => moveScrub(e.nativeEvent.pageX),
      onPanResponderRelease: hideScrub,
      onPanResponderTerminate: hideScrub,
    })
  ).current;

  return (
    <View style={st.card}>
      <View style={st.headerRow}>
        <Text style={st.title}>Skin age over time</Text>
        {trend === 'improving' && (
          <Text style={[st.trendTag, { color: colors.protected }]}>Improving</Text>
        )}
        {trend === 'increasing' && (
          <Text style={[st.trendTag, { color: colors.warning }]}>Increasing</Text>
        )}
      </View>

      <View style={st.readoutZone}>
        <Animated.Text
          style={[st.hint, { opacity: scrubAnim.interpolate({ inputRange: [0, 0.4], outputRange: [1, 0], extrapolate: 'clamp' }) }]}
        >
          Drag to inspect
        </Animated.Text>
        {active && (
          <Animated.Text style={[st.readout, { opacity: scrubAnim }]}>
            {scrubLabel(active)}
          </Animated.Text>
        )}
      </View>

      <View
        ref={plotRef}
        onLayout={onPlotLayout}
        collapsable={false}
        style={{ width: CHART_W, height: CHART_H }}
        {...panResponder.panHandlers}
      >
        <Svg width={CHART_W} height={CHART_H}>
          <Line
            x1="0" y1={geom.refY} x2={CHART_W} y2={geom.refY}
            stroke={colors.muted} strokeOpacity="0.6" strokeWidth="1" strokeDasharray="5,5"
          />
          <Line
            x1={geom.startX} y1={PAD_TOP} x2={geom.startX} y2={CHART_H - PAD_BOTTOM}
            stroke={colors.muted} strokeOpacity="0.45" strokeWidth="1" strokeDasharray="3,4"
          />
          {!!geom.pathD && (
            <Path d={geom.pathD} stroke={colors.orange} strokeWidth="2.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
          )}
        </Svg>
        <Text style={[st.refLabel, { top: geom.refY - 15 }]}>Your age</Text>
        <Animated.View
          pointerEvents="none"
          style={[st.scrubLine, {
            opacity: scrubAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }),
            transform: [{ translateX: scrubX }],
          }]}
        />
        <Animated.View
          pointerEvents="none"
          style={[st.dot, {
            opacity: scrubAnim,
            transform: [
              { translateX: Animated.subtract(scrubX, DOT_R) },
              { translateY: Animated.subtract(dotY, DOT_R) },
              { scale: scrubAnim },
            ],
          }]}
        />
      </View>

      <View style={st.axisRow}>
        <Text style={st.startLabel}>Started Sureva · {startDateLabel}</Text>
        <Text style={st.axisLabel}>Today</Text>
      </View>

      {points.length < 7 && (
        <Text style={st.sparseNote}>Your trend will become clearer after more sessions.</Text>
      )}
    </View>
  );
});

const st = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 14,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  trendTag: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
  },
  readoutZone: {
    height: 22,
    justifyContent: 'center',
    marginBottom: 6,
  },
  hint: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
  },
  readout: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.ink,
    textAlign: 'center',
  },
  scrubLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 1.5,
    height: CHART_H,
    backgroundColor: colors.ink,
  },
  dot: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: DOT_R * 2,
    height: DOT_R * 2,
    borderRadius: DOT_R,
    borderWidth: 2.5,
    borderColor: colors.orange,
    backgroundColor: colors.white,
  },
  refLabel: {
    position: 'absolute',
    right: 0,
    fontFamily: 'Outfit-Regular',
    fontSize: 10,
    color: colors.muted,
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  startLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: colors.muted,
  },
  axisLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: colors.muted,
  },
  sparseNote: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.muted,
    marginTop: 10,
    textAlign: 'center',
  },
});
