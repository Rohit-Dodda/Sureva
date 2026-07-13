import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../../constants/colors';
import { scoreColor } from './passportUtils';

// Compact session card for the location sheet's horizontal list. The
// personal-best session gets an orange left border and a label — the only
// element in the sheet with special treatment.
export default React.memo(function PassportSessionCard({ session, isPersonalBest, onPress }) {
  return (
    <TouchableOpacity
      style={[st.card, isPersonalBest && st.cardBest]}
      onPress={() => onPress(session)}
      activeOpacity={0.75}
    >
      {isPersonalBest && <Text style={st.bestLabel}>PERSONAL BEST</Text>}
      <View style={st.topRow}>
        <Text style={st.date}>{session.date}</Text>
        <Text style={[st.score, { color: scoreColor(session.score) }]}>{session.score}</Text>
      </View>
      <View style={st.metaRow}>
        <Text style={st.meta}>{session.duration}</Text>
        <View style={st.metaDot} />
        <Text style={st.meta}>UV {session.peakUV}</Text>
      </View>
      <Text style={st.conditions} numberOfLines={1}>{session.conditions}</Text>
    </TouchableOpacity>
  );
});

const st = StyleSheet.create({
  card: {
    width: 210,
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginRight: 10,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardBest: {
    borderLeftWidth: 3,
    borderLeftColor: colors.orange,
  },
  bestLabel: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 9,
    letterSpacing: 1,
    color: colors.orangeDark,
    marginBottom: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  date: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 14,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  score: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 18,
    letterSpacing: -0.4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  meta: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.inkMid,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.muted,
    marginHorizontal: 6,
  },
  conditions: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: colors.muted,
  },
});
