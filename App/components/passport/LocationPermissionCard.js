import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import PressableScale from '../PressableScale';

// Pre-permission explainer shown once before the system location prompt.
// The passport works fully without permission (pins come from stored
// session coordinates) — this only enables centering on the user.
export default React.memo(function LocationPermissionCard({ onAllow, onDismiss }) {
  return (
    <View style={st.wrap} pointerEvents="box-none">
      <View style={st.card}>
        <View style={st.iconWrap}>
          <Ionicons name="location-outline" size={22} color={colors.orange} />
        </View>
        <Text style={st.title}>See yourself on the map</Text>
        <Text style={st.body}>
          Sureva pins your sessions to the map so you can see everywhere you’ve been protected.
          Allowing location lets your passport center on where you are now.
        </Text>
        <PressableScale style={st.button} onPress={onAllow}>
          <Text style={st.buttonLabel}>Allow location</Text>
        </PressableScale>
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={st.dismiss}>Not now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const st = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 22,
    paddingVertical: 22,
    alignItems: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 8,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.orangeWash,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    fontFamily: 'Outfit-Regular',
    fontSize: 18,
    color: colors.ink,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  body: {
    fontFamily: 'Outfit-Regular',
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
    marginBottom: 12,
  },
  buttonLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.white,
  },
  dismiss: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.muted,
  },
});
