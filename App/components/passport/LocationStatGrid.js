import React from 'react';
import { View, StyleSheet } from 'react-native';

// Wraps a set of LocationStatTiles (or any wide row) in a 2-column,
// wrapping flex grid with consistent gutters.
export default React.memo(function LocationStatGrid({ children, style }) {
  return <View style={[st.grid, style]}>{children}</View>;
});

const st = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
