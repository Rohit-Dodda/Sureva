import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../../constants/colors';
import PressableScale from '../PressableScale';

// Centered floating card shown when no sessions have location data yet.
export default React.memo(function PassportEmptyCard({ onGoHome }) {
  return (
    <View style={st.wrap} pointerEvents="box-none">
      <View style={st.card}>
        <Text style={st.title}>Your passport is empty</Text>
        <Text style={st.body}>
          Every place you use Sureva gets pinned here. Start your first outdoor session to add
          your first location.
        </Text>
        <PressableScale style={st.button} onPress={onGoHome}>
          <Text style={st.buttonLabel}>Go to Home</Text>
        </PressableScale>
      </View>
    </View>
  );
});

const st = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 22,
    paddingVertical: 24,
    alignItems: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
  title: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 20,
    color: colors.ink,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkMid,
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: colors.orange,
    borderRadius: 22,
    paddingVertical: 13,
    paddingHorizontal: 36,
    alignItems: 'center',
  },
  buttonLabel: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 14,
    color: colors.white,
  },
});
