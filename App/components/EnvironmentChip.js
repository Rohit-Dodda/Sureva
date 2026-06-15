import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import PressableScale from './PressableScale';

// Compact pill summarizing the session environment.
// detected=true → "Detected: Beach · tap to change"; false → user-chosen value.
export default React.memo(function EnvironmentChip({ label, detected, pending, onPress }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.96} style={st.chip} disabled={pending}>
      <Ionicons
        name={pending ? 'navigate-outline' : 'location'}
        size={14}
        color={colors.orangeDark}
      />
      <Text style={st.text} numberOfLines={1}>
        {pending ? (
          'Detecting your environment…'
        ) : (
          <>
            {detected ? 'Detected: ' : ''}
            <Text style={st.value}>{label}</Text>
            {' · tap to change'}
          </>
        )}
      </Text>
    </PressableScale>
  );
});

const st = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: colors.orangeWash,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginBottom: 28,
  },
  text: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: colors.inkMid,
  },
  value: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: colors.orangeDark,
  },
});
