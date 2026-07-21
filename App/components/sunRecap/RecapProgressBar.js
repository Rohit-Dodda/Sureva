import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';

// Story-style segmented progress. Past segments are full, the active one
// fills its width from a driving Animated.Value (0→1), future ones empty.
export default React.memo(function RecapProgressBar({ count, index, progress }) {
  const activeWidth = progress
    ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'], extrapolate: 'clamp' })
    : '0%';
  return (
    <View style={st.row}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={st.track}>
          {i < index && <View style={[st.fill, { width: '100%' }]} />}
          {i === index && <Animated.View style={[st.fill, { width: activeWidth }]} />}
        </View>
      ))}
    </View>
  );
});

const st = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 5,
  },
  track: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderRadius: 2,
  },
});
