import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import colors from '../constants/colors';

export const FACTOR_COLORS = {
  'UV intensity': colors.warning,
  'Heat & humidity': colors.orangeDark,
  'Water immersion': colors.navy,
  'Water splash': colors.navy,
  'Activity': colors.inkMid,
  'Reapplied': colors.protected,
};

export default React.memo(function ChartTooltip({ anim, x, active }) {
  if (!active) return null;
  const factorColor = FACTOR_COLORS[active.factor] || colors.orange;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        st.card,
        {
          opacity: anim,
          transform: [
            { translateX: x },
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) },
            { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
          ],
        },
      ]}
    >
      <Text style={st.time}>{active.timeLabel}</Text>
      <Text style={st.pct}>{active.pct}%</Text>
      <View style={st.factorRow}>
        <View style={[st.factorDot, { backgroundColor: factorColor }]} />
        <Text style={st.factorText}>{active.factor}</Text>
      </View>
    </Animated.View>
  );
});

export const TOOLTIP_W = 124;

const st = StyleSheet.create({
  card: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: TOOLTIP_W,
    backgroundColor: colors.ink,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    shadowColor: colors.ink,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  time: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 11,
    color: colors.surface,
    letterSpacing: 0.3,
    marginBottom: 1,
  },
  pct: {
    fontFamily: 'SFProDisplay-Black',
    fontSize: 22,
    color: colors.white,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  factorDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  factorText: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 11,
    color: colors.white,
    flex: 1,
  },
});
