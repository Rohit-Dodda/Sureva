import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { STREAK_RULES } from '../../services/StreakService';

// Freezes remaining, shown as a row of snowflakes — filled (a banked freeze,
// ready to auto-bridge a single missed day) vs. outlined (an empty slot). The
// stockpile cap comes straight from the streak rules so the row length always
// matches what the engine can actually hold.
function FreezeRow({ available, max = STREAK_RULES.maxFreezes }) {
  return (
    <View style={st.wrap}>
      <View style={st.icons}>
        {Array.from({ length: max }).map((_, i) => {
          const filled = i < available;
          return (
            <Ionicons
              key={i}
              name={filled ? 'snow' : 'snow-outline'}
              size={20}
              color={filled ? colors.bluetooth : colors.muted}
              style={st.flake}
            />
          );
        })}
      </View>
      <Text style={st.label}>
        {available === 0
          ? 'No freezes yet. A full week banks one'
          : `${available} freeze${available === 1 ? '' : 's'} ready`}
      </Text>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { alignItems: 'center' },
  icons: { flexDirection: 'row' },
  flake: { marginHorizontal: 3 },
  label: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.muted,
    marginTop: 6,
  },
});

export default React.memo(FreezeRow);
