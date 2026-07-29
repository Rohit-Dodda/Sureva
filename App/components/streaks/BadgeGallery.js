import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { computeGalleryItems, featuredFrom, earnedCount } from '../../services/BadgeGalleryService';
import BadgeTile from './BadgeTile';

const SCREEN_W = Dimensions.get('window').width;
const GAP = 12;
const COL_W = (SCREEN_W - 16 * 2 - GAP) / 2;
const RING = Math.min(126, COL_W - 44);

// The one badge section on the Streaks screen: six of the collection, with
// "More" to the full categorized list. Levels are recomputed from the session
// list on every render rather than stored, so a badge can never disagree with
// the history it was earned from.
// `newlyEarned` is detected by StreaksScreen and passed down — see the note
// there on why it can't be detected here.
function BadgeGallery({ sessions, longestStreak, newlyEarned, onSeeAll }) {
  const items = useMemo(
    () => computeGalleryItems(sessions, longestStreak),
    [sessions, longestStreak]
  );
  const featured = useMemo(() => featuredFrom(items), [items]);
  const earned = earnedCount(items);

  const handleSeeAll = useCallback(() => onSeeAll?.(newlyEarned), [onSeeAll, newlyEarned]);

  return (
    <View style={st.wrap}>
      <View style={st.headingRow}>
        <Text style={st.heading}>Badges &amp; Achievements</Text>
        <Pressable onPress={handleSeeAll} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={st.more}>
          <Text style={st.moreText}>More</Text>
          <Text style={st.moreCount}>{earned}/{items.length}</Text>
          <Ionicons name="chevron-forward" size={15} color={colors.muted} />
        </Pressable>
      </View>

      <View style={st.grid}>
        {featured.map((item, i) => (
          <View key={item.id} style={{ width: COL_W, marginBottom: GAP }}>
            <BadgeTile
              item={item}
              celebrate={!!newlyEarned?.has(item.id)}
              ringSize={RING}
              sheenDelay={i * 260}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { marginTop: 26 },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  heading: {
    flex: 1,
    fontFamily: 'Outfit-Regular',
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.4,
  },
  more: { flexDirection: 'row', alignItems: 'center', paddingLeft: 10 },
  moreText: { fontFamily: 'Outfit-Regular', fontSize: 15, color: colors.ink },
  moreCount: {
    fontFamily: 'Switzer-Bold',
    fontSize: 13,
    color: colors.muted,
    marginLeft: 7,
    marginRight: 1,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
});

export default React.memo(BadgeGallery);
