import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';

function iconFor(environment) {
  if (environment === 'Beach / Water') return 'water';
  if (environment === 'Snow / Mountains') return 'snow';
  return 'sunny';
}

// Compact "what's draining you" insight card.
export default React.memo(function DriverCard({ environment, driver }) {
  return (
    <View style={st.card}>
      <View style={st.iconBadge}>
        <Ionicons name={iconFor(environment)} size={18} color={colors.orangeDark} />
      </View>
      <View style={st.textWrap}>
        <Text style={st.eyebrow}>WHAT'S DRAINING YOU</Text>
        <Text style={st.body}>{driver}</Text>
      </View>
    </View>
  );
});

const st = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginHorizontal: 16,
    backgroundColor: colors.orangeWash,
    borderRadius: 20,
    padding: 16,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1 },
  eyebrow: {
    fontFamily: 'Outfit-Regular',
    fontSize: 10,
    color: colors.orangeDark,
    letterSpacing: 1,
    marginBottom: 3,
  },
  body: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13.5,
    color: colors.ink,
    lineHeight: 19,
  },
});
