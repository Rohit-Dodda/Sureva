import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../constants/colors';

export default React.memo(function StatGrid({ stats }) {
  return (
    <View style={st.grid}>
      {stats.map((s) => (
        <View key={s.label} style={st.tile}>
          <Text style={st.value}>{s.value}</Text>
          <Text style={st.label}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
});

const st = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: '47.8%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  value: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 24,
    color: colors.ink,
    letterSpacing: -0.6,
    marginBottom: 3,
  },
  label: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.2,
  },
});
