import React from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import PressableScale from './PressableScale';

// Round bordered icon button used in card headers (e.g. "…", "↗").
export default React.memo(function CircleIconButton({ icon, onPress, size = 34, style }) {
  const dim = { width: size, height: size, borderRadius: size / 2 };
  return (
    <PressableScale onPress={onPress} scaleTo={0.9} hitSlop={6} style={[st.btn, dim, style]}>
      <Ionicons name={icon} size={15} color={colors.ink} />
    </PressableScale>
  );
});

const st = StyleSheet.create({
  btn: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
