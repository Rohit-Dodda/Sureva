import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../../constants/colors';

// A single white card holding evenly divided stat tiles.
// `tiles`: [{ label, value, color? }]
export default React.memo(function StatStrip({ tiles }) {
  return (
    <View style={st.row}>
      {tiles.map((tile, i) => (
        <View
          key={tile.label}
          style={[st.tile, i < tiles.length - 1 && st.divider]}
        >
          <Text style={[st.val, { color: tile.color || colors.ink }]}>
            {tile.value}
          </Text>
          <Text style={st.label}>{tile.label}</Text>
        </View>
      ))}
    </View>
  );
});

const st = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
    gap: 3,
  },
  divider: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  val: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 17,
    letterSpacing: -0.4,
  },
  label: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 0.3,
  },
});
