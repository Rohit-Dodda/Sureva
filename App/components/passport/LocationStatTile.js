import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../../constants/colors';

// One fact in the stat grid: label above, big value below, optional sub
// caption — a fixed-shape tile instead of a label/value row, so a column
// of very differently-sized numbers still lines up cleanly instead of
// drifting depending on how long each label happens to be.
export default React.memo(function LocationStatTile({ label, value, valueColor, sub, wide }) {
  return (
    <View style={[st.tile, wide && st.tileWide]}>
      <Text style={st.label} numberOfLines={1}>{label}</Text>
      <Text style={[st.value, valueColor && { color: valueColor }]} numberOfLines={1}>{value}</Text>
      {sub ? <Text style={st.sub} numberOfLines={1}>{sub}</Text> : null}
    </View>
  );
});

const st = StyleSheet.create({
  tile: {
    flexBasis: '48%',
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  tileWide: {
    flexBasis: '100%',
  },
  label: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11.5,
    color: colors.muted,
    marginBottom: 5,
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  value: {
    fontFamily: 'Outfit-Regular',
    fontSize: 18,
    color: colors.ink,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  sub: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: colors.muted,
    marginTop: 3,
    textAlign: 'center',
  },
});
