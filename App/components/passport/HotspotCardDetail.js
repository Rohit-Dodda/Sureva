import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import PassportSessionCard from './PassportSessionCard';
import { progressStats } from './passportUtils';

// The expanded content of a HotspotCard: stat chips, the UV environment
// read, first-vs-recent progress (when there's enough history), the
// horizontal list of sessions recorded at this location, and a link into
// the full Location Detail screen.
export default React.memo(function HotspotCardDetail({ cluster, uv, consistencyTag, onSessionPress, onViewDetails }) {
  const sessions = cluster.sessions;
  const bestId = sessions.reduce((a, b) => (b.score > a.score ? b : a)).id;
  const progress = progressStats(cluster);

  return (
    <View style={st.wrap}>
      {consistencyTag && (
        <View style={[st.consistencyChip, consistencyTag === 'most' ? st.consistencyMost : st.consistencyLeast]}>
          <Text style={st.consistencyText}>
            {consistencyTag === 'most' ? 'Most consistent location' : 'Most variable location'}
          </Text>
        </View>
      )}

      <View style={st.chipRow}>
        <View style={st.chip}>
          <Text style={st.chipValue}>{sessions.length}</Text>
          <Text style={st.chipLabel}>sessions</Text>
        </View>
        <View style={st.chip}>
          <Text style={st.chipValue}>{cluster.bestScore}</Text>
          <Text style={st.chipLabel}>best score</Text>
        </View>
        <View style={st.chip}>
          <Text style={st.chipValue}>{uv.label}</Text>
          <Text style={st.chipLabel}>UV environment</Text>
        </View>
      </View>

      {progress && (
        <View style={st.progressRow}>
          <Text style={st.progressLabel}>Your progress here</Text>
          <View style={st.progressStats}>
            <Text style={st.progressStat}>First visits avg: {progress.firstAvg}</Text>
            <View style={st.progressDelta}>
              <Ionicons
                name={progress.delta >= 0 ? 'arrow-up' : 'arrow-down'}
                size={12}
                color={progress.delta >= 0 ? colors.protected : colors.danger}
              />
              <Text style={[st.progressDeltaText, { color: progress.delta >= 0 ? colors.protected : colors.danger }]}>
                {Math.abs(progress.delta)}
              </Text>
            </View>
            <Text style={st.progressStat}>Recent avg: {progress.recentAvg}</Text>
          </View>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.cards}>
        {sessions.map((s) => (
          <PassportSessionCard
            key={s.id}
            session={s}
            isPersonalBest={sessions.length > 1 && s.id === bestId}
            onPress={onSessionPress}
          />
        ))}
      </ScrollView>

      <TouchableOpacity style={st.viewDetailsBtn} onPress={() => onViewDetails(cluster)} activeOpacity={0.7}>
        <Text style={st.viewDetailsText}>View Full Details →</Text>
      </TouchableOpacity>
    </View>
  );
});

const st = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    marginBottom: 12,
  },
  chip: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  chipValue: {
    fontFamily: 'Outfit-Regular',
    fontSize: 16,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  chipLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  consistencyChip: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 12,
  },
  consistencyMost: {
    backgroundColor: colors.protected,
  },
  consistencyLeast: {
    backgroundColor: colors.warning,
  },
  consistencyText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.white,
  },
  progressRow: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  progressLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.ink,
    marginBottom: 6,
  },
  progressStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressStat: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.inkMid,
  },
  progressDelta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  progressDeltaText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
  },
  cards: {
    paddingRight: 10,
  },
  viewDetailsBtn: {
    alignItems: 'center',
    paddingTop: 14,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  viewDetailsText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.orange,
  },
});
