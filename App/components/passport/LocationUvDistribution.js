import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../../constants/colors';

// Segmented UV-intensity bar for a location, with a legend of colored
// dot + label + percent chips underneath instead of a run-on line of
// comma-free text.
export default React.memo(function LocationUvDistribution({ distribution }) {
  const visible = distribution.filter((d) => d.pct > 0);
  return (
    <View style={st.tile}>
      <Text style={st.heading}>UV intensity distribution</Text>
      <View style={st.bar}>
        {visible.map((d) => (
          <View key={d.label} style={{ flex: d.pct, backgroundColor: d.color }} />
        ))}
      </View>
      <View style={st.legend}>
        {visible.map((d) => (
          <View key={d.label} style={st.legendChip}>
            <View style={[st.dot, { backgroundColor: d.color }]} />
            <Text style={st.legendText}>{d.label} · {d.pct}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

const st = StyleSheet.create({
  tile: {
    flexBasis: '100%',
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 14,
  },
  heading: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 12.5,
    color: colors.ink,
    marginBottom: 10,
    textAlign: 'center',
  },
  bar: {
    flexDirection: 'row',
    height: 9,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendText: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    color: colors.inkMid,
  },
});
