import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';

// Full-width session card used by the History list and the Location
// Detail screen's "All Sessions Here" list — same card, same data shape,
// same tap-through to SessionDetailScreen wherever it's used.
export default React.memo(function SessionCard({ session, onPress }) {
  return (
    <TouchableOpacity style={st.card} onPress={() => onPress(session)} activeOpacity={0.75}>
      <View style={st.cardTop}>
        <Text style={st.envTag}>{session.environment}</Text>
        <Text style={st.cardDate}>{session.date}</Text>
      </View>
      <Text style={st.cardLocation}>{session.location}</Text>
      <View style={st.cardBottom}>
        <View style={st.pill}>
          <Ionicons name="time-outline" size={13} color={colors.muted} />
          <Text style={st.pillText}>{session.startTime} – {session.endTime}</Text>
        </View>
        <View style={st.pill}>
          <Ionicons name="hourglass-outline" size={13} color={colors.muted} />
          <Text style={st.pillText}>{session.duration}</Text>
        </View>
        <View style={[st.scoreDot, {
          backgroundColor:
            session.score >= 85 ? colors.protected :
            session.score >= 65 ? colors.warning : colors.danger,
        }]}>
          <Text style={st.scoreText}>{session.score}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const st = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  envTag: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 10,
    color: colors.orangeDark,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    backgroundColor: colors.orangeWash,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  cardDate: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.muted,
  },
  cardLocation: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 20,
    color: colors.ink,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  pillText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.muted,
  },
  scoreDot: {
    marginLeft: 'auto',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 12,
    color: colors.white,
  },
});
