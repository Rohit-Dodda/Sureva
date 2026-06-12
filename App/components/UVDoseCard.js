import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Animated, StyleSheet, Dimensions,
} from 'react-native';
import colors from '../constants/colors';

const { width } = Dimensions.get('window');
const CHART_W = width - 64 - 32; // card padding
const BAR_MAX_H = 56;
const TODAY_COLOR = colors.orange;
const PAST_COLOR  = colors.orangeLight;

export default React.memo(function UVDoseCard({ todayPercent, monthlyData }) {
  const [expanded, setExpanded] = useState(false);
  const heightAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(heightAnim, {
        toValue: expanded ? 1 : 0,
        tension: 60,
        friction: 10,
        useNativeDriver: false,
      }),
      Animated.timing(rotateAnim, {
        toValue: expanded ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [expanded]);

  const chartHeight = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, BAR_MAX_H + 32],
  });

  const chevronRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const maxVal = Math.max(...monthlyData.map((d) => d.percent));

  return (
    <TouchableOpacity
      style={st.card}
      onPress={() => setExpanded((v) => !v)}
      activeOpacity={0.85}
    >
      <View style={st.row}>
        <View style={st.left}>
          <Text style={st.label}>Today's UV Dose</Text>
          <Text style={st.value}>{todayPercent}% of your daily limit</Text>
        </View>
        <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
          <ChevronIcon />
        </Animated.View>
      </View>

      <Animated.View style={[st.chartWrap, { height: chartHeight, overflow: 'hidden' }]}>
        <View style={st.chart}>
          {monthlyData.map((d, i) => {
            const isToday = i === monthlyData.length - 1;
            const barH = Math.max(3, Math.round((d.percent / maxVal) * BAR_MAX_H));
            return (
              <View key={d.day} style={[st.bar, { height: barH, backgroundColor: isToday ? TODAY_COLOR : PAST_COLOR }]} />
            );
          })}
        </View>
        <Text style={st.chartLabel}>Last 30 days</Text>
      </Animated.View>
    </TouchableOpacity>
  );
});

function ChevronIcon() {
  return (
    <View style={chevSt.wrap}>
      <View style={chevSt.left} />
      <View style={chevSt.right} />
    </View>
  );
}

const chevSt = StyleSheet.create({
  wrap: { width: 16, height: 10, justifyContent: 'center', alignItems: 'center' },
  left: {
    position: 'absolute',
    width: 9, height: 2,
    borderRadius: 1,
    backgroundColor: colors.muted,
    left: 0,
    transform: [{ rotate: '40deg' }, { translateY: 1 }],
  },
  right: {
    position: 'absolute',
    width: 9, height: 2,
    borderRadius: 1,
    backgroundColor: colors.muted,
    right: 0,
    transform: [{ rotate: '-40deg' }, { translateY: 1 }],
  },
});

const st = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: { flex: 1 },
  label: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 12,
    color: colors.muted,
    marginBottom: 3,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  value: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 15,
    color: colors.ink,
  },
  chartWrap: {
    overflow: 'hidden',
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: BAR_MAX_H,
    gap: 2,
    marginTop: 16,
    width: CHART_W,
  },
  bar: {
    flex: 1,
    borderRadius: 2,
    minHeight: 3,
  },
  chartLabel: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 11,
    color: colors.muted,
    marginTop: 8,
    alignSelf: 'flex-end',
  },
});
