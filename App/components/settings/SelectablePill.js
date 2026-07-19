import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import colors from '../../constants/colors';

// A single tappable pill used for short, single-line choices (age range,
// skin type, burn rate) in the Skin Profile editor.
export default function SelectablePill({ label, sublabel, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[st.pill, selected && st.pillSelected]}
    >
      <Text style={[st.label, selected && st.labelSelected]}>{label}</Text>
      {!!sublabel && (
        <Text style={[st.sublabel, selected && st.sublabelSelected]}>{sublabel}</Text>
      )}
    </Pressable>
  );
}

const st = StyleSheet.create({
  pill: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  pillSelected: {
    borderColor: colors.orange,
    backgroundColor: colors.orangeWash,
  },
  label: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.ink,
  },
  labelSelected: {
    color: colors.orangeDark,
  },
  sublabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  sublabelSelected: {
    color: colors.orangeDark,
  },
});
