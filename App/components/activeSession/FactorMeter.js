import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { IOS_EASE_OUT } from '../SlideInView';

// One labeled meter in the factor breakdown. The fill sweeps out from the left
// on mount (movement, not fade) to the factor's share of total depletion.
export default React.memo(function FactorMeter({ label, icon, color, share, delay = 0 }) {
  // Holds the actual fill fraction (0–1) so it can glide to a new share as live
  // conditions shift, not just sweep out once on mount.
  const fill = useRef(new Animated.Value(0)).current;
  const firstRun = useRef(true);
  const pct = Math.round(share * 100);

  useEffect(() => {
    Animated.timing(fill, {
      toValue: Math.max(0.02, share),
      // Staggered slow sweep on first reveal; quick glide on live updates.
      duration: firstRun.current ? 640 : 420,
      delay: firstRun.current ? delay : 0,
      easing: IOS_EASE_OUT,
      useNativeDriver: false,
    }).start();
    firstRun.current = false;
  }, [fill, delay, share]);

  const width = fill.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={st.row}>
      <View style={st.labelRow}>
        <Ionicons name={icon} size={13} color={color} style={st.icon} />
        <Text style={st.label} numberOfLines={1}>{label}</Text>
        <Text style={[st.value, { color }]}>{pct}%</Text>
      </View>
      <View style={st.track}>
        <Animated.View style={[st.fill, { width, backgroundColor: color }]} />
      </View>
    </View>
  );
});

const st = StyleSheet.create({
  row: {
    marginBottom: 12,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  icon: {
    marginRight: 6,
  },
  label: {
    flex: 1,
    fontFamily: 'Outfit-Regular',
    fontSize: 12.5,
    color: colors.ink,
  },
  value: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12.5,
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
