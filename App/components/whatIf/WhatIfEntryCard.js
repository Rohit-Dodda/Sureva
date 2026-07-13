import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../../constants/colors';
import PressableScale from '../PressableScale';

// Entry point at the bottom of the session detail screen. Deliberately
// darker than the rest of the detail cards to signal it's interactive.
export default React.memo(function WhatIfEntryCard({ onPress }) {
  return (
    <View style={st.card}>
      <Text style={st.headline}>Session Simulator</Text>
      <Text style={st.description}>
        Replay this session with different choices and watch how your protection would have changed.
      </Text>
      <PressableScale style={st.button} onPress={onPress}>
        <Text style={st.buttonLabel}>Open the simulator</Text>
      </PressableScale>
    </View>
  );
});

const st = StyleSheet.create({
  card: {
    backgroundColor: colors.charcoal,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 22,
    marginBottom: 14,
  },
  headline: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 24,
    color: colors.orange,
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  description: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: colors.onDarkMuted,
    marginBottom: 16,
  },
  button: {
    backgroundColor: colors.orange,
    borderRadius: 24,
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonLabel: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 15,
    color: colors.white,
  },
});
