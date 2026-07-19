import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { uvEnvironment } from './passportUtils';
import HotspotCardDetail from './HotspotCardDetail';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// One location's ranking row, expandable in place into its full detail —
// replaces the old separate bottom-sheet flow, so every location's
// summary is visible at once and tapping one just opens it inline.
export default React.memo(function HotspotCard({
  cluster,
  rank,
  maxUv,
  expanded,
  onToggle,
  onSessionPress,
  onViewDetails,
  consistencyTag,
  onLayout,
}) {
  const uv = uvEnvironment(cluster.avgPeakUV);
  const barWidth = Math.max(10, (cluster.avgPeakUV / maxUv) * 100);

  const handleToggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle(cluster.key);
  }, [onToggle, cluster.key]);

  return (
    <View style={st.card} onLayout={onLayout}>
      <TouchableOpacity style={st.row} onPress={handleToggle} activeOpacity={0.75}>
        <Text style={st.rank}>{rank}</Text>
        <View style={st.rowMain}>
          <View style={st.rowTop}>
            <Text style={st.name} numberOfLines={1}>{cluster.city}</Text>
            <View style={[st.uvBadge, { backgroundColor: uv.color }]}>
              <Text style={st.uvBadgeText}>UV {cluster.avgPeakUV}</Text>
            </View>
          </View>
          <Text style={st.region} numberOfLines={1}>
            {cluster.region} · {cluster.sessions.length} session{cluster.sessions.length === 1 ? '' : 's'}
          </Text>
          <View style={st.barTrack}>
            <View style={[st.barFill, { width: `${barWidth}%`, backgroundColor: uv.color }]} />
          </View>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} style={st.chevron} />
      </TouchableOpacity>

      {expanded && (
        <HotspotCardDetail
          cluster={cluster}
          uv={uv}
          consistencyTag={consistencyTag}
          onSessionPress={onSessionPress}
          onViewDetails={onViewDetails}
        />
      )}
    </View>
  );
});

const st = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  rank: {
    width: 22,
    fontFamily: 'Outfit-Regular',
    fontSize: 16,
    color: colors.orange,
  },
  rowMain: {
    flex: 1,
    gap: 6,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    flex: 1,
    fontFamily: 'Outfit-Regular',
    fontSize: 16,
    color: colors.ink,
    letterSpacing: -0.2,
    marginRight: 8,
  },
  region: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.muted,
  },
  uvBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  uvBadgeText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: colors.white,
  },
  barTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    marginTop: 2,
  },
  barFill: {
    height: 5,
    borderRadius: 3,
  },
  chevron: {
    marginLeft: 2,
  },
});
