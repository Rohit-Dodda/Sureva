import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import PressableScale from '../PressableScale';

function scoreColor(score) {
  if (score >= 80) return colors.protected;
  if (score >= 50) return colors.warning;
  return colors.danger;
}

// Past Session mode's entry point: pick a real completed session to
// replay with different choices. Presentational only — the screen owns
// fetching the list and loading the picked session's full data.
export default React.memo(function LabSessionPicker({ sessions, loading, onSelect }) {
  if (loading) {
    return (
      <View style={st.emptyWrap}>
        <ActivityIndicator color={colors.orange} />
        <Text style={st.emptyText}>Loading your sessions…</Text>
      </View>
    );
  }

  if (!sessions.length) {
    return (
      <View style={st.emptyWrap}>
        <Ionicons name="flask-outline" size={28} color={colors.muted} />
        <Text style={st.emptyText}>
          Complete a session first — then come back here to replay it with different choices.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={st.hint}>Pick a past session to replay with different choices.</Text>
      {sessions.map((session) => (
        <PressableScale key={session.id} style={st.row} onPress={() => onSelect(session)}>
          <View style={st.rowText}>
            <Text style={st.location} numberOfLines={1}>{session.location}</Text>
            <Text style={st.meta}>{session.date} · {session.duration}</Text>
          </View>
          <View style={[st.scoreBadge, { backgroundColor: scoreColor(session.score) }]}>
            <Text style={st.scoreText}>{session.score}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </PressableScale>
      ))}
    </View>
  );
});

const st = StyleSheet.create({
  hint: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.muted,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  rowText: {
    flex: 1,
  },
  location: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    color: colors.ink,
  },
  meta: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  scoreBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.white,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    paddingHorizontal: 30,
    lineHeight: 19,
  },
});
