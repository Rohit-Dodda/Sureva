import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, PanResponder, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ChartPlot, { yForPct } from './ChartPlot';
import ChartInfoModal from './ChartInfoModal';
import ChartTooltip, { TOOLTIP_W, FACTOR_COLORS } from './ChartTooltip';
import colors from '../constants/colors';

const CHART_W = Dimensions.get('window').width - 40 - 36; // screen padding + card padding
const H_COMPACT = 160;
const H_EXPANDED = 250;
const TOOLTIP_ZONE_H = 70;
const DOT_R = 7;

function clockLabel(startTime, minuteOffset) {
  const [hm, period] = startTime.split(' ');
  const [h, min] = hm.split(':').map(Number);
  let total = ((h % 12) + (period === 'PM' ? 12 : 0)) * 60 + min + Math.round(minuteOffset);
  total %= 1440;
  const hh = Math.floor(total / 60);
  const mm = String(total % 60).padStart(2, '0');
  return `${hh % 12 || 12}:${mm} ${hh >= 12 ? 'PM' : 'AM'}`;
}

export default React.memo(function DepletionChart({ data, durationMinutes, startTime, endTime }) {
  const [chartH, setChartH] = useState(H_COMPACT);
  const [active, setActive] = useState(null);
  const [infoVisible, setInfoVisible] = useState(false);
  const closeInfo = useCallback(() => setInfoVisible(false), []);
  const openInfo = useCallback(() => setInfoVisible(true), []);
  const expandedRef = useRef(false);
  const plotRef = useRef(null);
  const plotPageX = useRef(0);
  const lastKeyRef = useRef('');
  const geomRef = useRef({});
  geomRef.current = { chartH, data, durationMinutes, startTime };

  const heightAnim = useRef(new Animated.Value(0)).current;
  const tooltipAnim = useRef(new Animated.Value(0)).current;
  const scrubX = useRef(new Animated.Value(0)).current;
  const dotY = useRef(new Animated.Value(0)).current;
  const tooltipX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const id = heightAnim.addListener(({ value }) =>
      setChartH(Math.round(H_COMPACT + value * (H_EXPANDED - H_COMPACT)))
    );
    return () => heightAnim.removeListener(id);
  }, [heightAnim]);

  const moveScrub = useCallback((pageX) => {
    const { chartH: h, data: d, durationMinutes: dur, startTime: st0 } = geomRef.current;
    const x = Math.min(Math.max(pageX - plotPageX.current, 0), CHART_W);
    const m = (x / CHART_W) * dur;
    let i = 0;
    while (i < d.length - 2 && d[i + 1].m < m) i++;
    const a = d[i];
    const b = d[i + 1];
    const t = b.m === a.m ? 0 : Math.min(Math.max((m - a.m) / (b.m - a.m), 0), 1);
    const pct = a.pct + (b.pct - a.pct) * t;
    scrubX.setValue(x);
    dotY.setValue(yForPct(pct, h));
    tooltipX.setValue(Math.min(Math.max(x - TOOLTIP_W / 2, 0), CHART_W - TOOLTIP_W));
    const next = { timeLabel: clockLabel(st0, m), pct: Math.round(pct), factor: b.factor };
    const key = `${next.timeLabel}|${next.pct}|${next.factor}`;
    if (key !== lastKeyRef.current) {
      lastKeyRef.current = key;
      setActive(next);
    }
  }, [scrubX, dotY, tooltipX]);

  const hideScrub = useCallback(() => {
    Animated.timing(tooltipAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start();
  }, [tooltipAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        moveScrub(evt.nativeEvent.pageX);
        Animated.spring(tooltipAnim, { toValue: 1, tension: 140, friction: 14, useNativeDriver: true }).start();
      },
      onPanResponderMove: (evt) => moveScrub(evt.nativeEvent.pageX),
      onPanResponderRelease: (_, { dx, dy }) => {
        hideScrub();
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) {
          expandedRef.current = !expandedRef.current;
          Animated.spring(heightAnim, {
            toValue: expandedRef.current ? 1 : 0,
            tension: 60,
            friction: 11,
            useNativeDriver: false,
          }).start();
        }
      },
      onPanResponderTerminate: hideScrub,
    })
  ).current;

  const onPlotLayout = useCallback(() => {
    plotRef.current?.measureInWindow((x) => { plotPageX.current = x; });
  }, []);

  const dotColor = active ? (FACTOR_COLORS[active.factor] || colors.orange) : colors.orange;

  return (
    <View>
      <TouchableOpacity
        style={st.infoBtn}
        onPress={openInfo}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="information-circle-outline" size={20} color={colors.muted} />
      </TouchableOpacity>
      <ChartInfoModal visible={infoVisible} onClose={closeInfo} />

      <View style={st.tooltipZone}>
        <Animated.Text
          style={[st.hint, { opacity: tooltipAnim.interpolate({ inputRange: [0, 0.4], outputRange: [1, 0], extrapolate: 'clamp' }) }]}
        >
          Drag to inspect  ·  tap to expand
        </Animated.Text>
        <ChartTooltip anim={tooltipAnim} x={tooltipX} active={active} />
      </View>

      <View ref={plotRef} onLayout={onPlotLayout} collapsable={false} {...panResponder.panHandlers}>
        <ChartPlot data={data} durationMinutes={durationMinutes} width={CHART_W} height={chartH} />
        <Animated.View
          pointerEvents="none"
          style={[st.scrubLine, {
            height: chartH,
            opacity: tooltipAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }),
            transform: [{ translateX: scrubX }],
          }]}
        />
        <Animated.View
          pointerEvents="none"
          style={[st.dot, {
            borderColor: dotColor,
            opacity: tooltipAnim,
            transform: [
              { translateX: Animated.subtract(scrubX, DOT_R) },
              { translateY: Animated.subtract(dotY, DOT_R) },
              { scale: tooltipAnim },
            ],
          }]}
        />
      </View>

      <View style={st.axis}>
        <Text style={st.axisLabel}>{startTime}</Text>
        <Text style={st.axisLabel}>{endTime}</Text>
      </View>
    </View>
  );
});

const st = StyleSheet.create({
  infoBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 2,
  },
  tooltipZone: {
    height: TOOLTIP_ZONE_H,
    marginBottom: 6,
    justifyContent: 'center',
  },
  hint: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  scrubLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 1.5,
    backgroundColor: colors.ink,
  },
  dot: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: DOT_R * 2,
    height: DOT_R * 2,
    borderRadius: DOT_R,
    borderWidth: 3,
    backgroundColor: colors.white,
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
});
