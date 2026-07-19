import React from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Keyboard } from 'react-native';
import colors from '../../constants/colors';

const MAX_CHARS = 300;

// Question 3's free-text field: multiline, 300-char limit with a live
// counter, keyboard dismisses on tap outside the field.
export default React.memo(function CheckInFeedbackInput({ value, onChange }) {
  return (
    <Pressable onPress={Keyboard.dismiss} style={st.wrap}>
      <View style={st.fieldWrap}>
        <TextInput
          style={st.field}
          value={value}
          onChangeText={onChange}
          placeholder="e.g. felt like protection wore off faster than expected, was near very reflective water, used a different sunscreen than usual..."
          placeholderTextColor={colors.muted}
          multiline
          maxLength={MAX_CHARS}
          textAlignVertical="top"
        />
        <Text style={st.counter}>{value.length}/{MAX_CHARS}</Text>
      </View>
    </Pressable>
  );
});

const st = StyleSheet.create({
  wrap: {
    // Renders inside a ScrollView content container — sizes to content,
    // never flex:1 (which collapses to zero height in a scroll view).
    width: '100%',
  },
  fieldWrap: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 26,
  },
  field: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
    minHeight: 88, // ≥ 4 lines
  },
  counter: {
    position: 'absolute',
    right: 12,
    bottom: 8,
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: colors.muted,
  },
});
