import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { uvEnvironment } from './passportUtils';
import HotspotCard from './HotspotCard';

// Section wrapper for the ranked location list: a header card that always
// shows a one-line "top hotspot" preview, and expands (controlled by the
// screen, so map-pin taps and shortcut chips can force it open) into the
// full set of individually expandable HotspotCards.
export default React.memo(function HotspotRankingsSection({
  clusters,
  maxUv,
  expanded,
  onToggleSection,
  expandedKey,
  onCardToggle,
  onSessionPress,
  onViewDetails,
  extremes,
  onCardLayout,
}) {
  if (!clusters.length) return null;
  const top = clusters[0];
  const topUv = uvEnvironment(top.avgPeakUV);

  return (
    <View>
      <TouchableOpacity style={st.header} onPress={onToggleSection} activeOpacity={0.75}>
        <View style={[st.headerIconWrap, { backgroundColor: topUv.color }]}>
          <Ionicons name="podium" size={18} color={colors.white} />
        </View>
        <View style={st.headerText}>
          <Text style={st.headerTitle}>Hotspot Rankings</Text>
          <Text style={st.headerPreview} numberOfLines={1}>
            {expanded ? `${clusters.length} location${clusters.length === 1 ? '' : 's'}, ranked by UV` : `Highest: ${top.city} · UV ${top.avgPeakUV}`}
          </Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
      </TouchableOpacity>

      {expanded && (
        <View style={st.list}>
          {clusters.map((c, i) => (
            <HotspotCard
              key={c.key}
              cluster={c}
              rank={i + 1}
              maxUv={maxUv}
              expanded={expandedKey === c.key}
              onToggle={onCardToggle}
              onSessionPress={onSessionPress}
              onViewDetails={onViewDetails}
              consistencyTag={
                extremes && c.key === extremes.mostKey ? 'most'
                : extremes && c.key === extremes.leastKey ? 'least'
                : null
              }
              onLayout={(e) => onCardLayout(c.key, e.nativeEvent.layout.y)}
            />
          ))}
        </View>
      )}
    </View>
  );
});

const st = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Outfit-Regular',
    fontSize: 16,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  headerPreview: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },
  list: {
    marginBottom: 8,
  },
});
