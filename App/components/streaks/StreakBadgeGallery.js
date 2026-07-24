import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../../constants/colors';
import { STREAK_BADGES } from '../../constants/streakBadges';
import StreakBadge from './StreakBadge';

const SEEN_KEY = 'sureva_streak_badges_seen';
const SCREEN_W = Dimensions.get('window').width;
const GAP = 12;
const COL_W = (SCREEN_W - 16 * 2 - GAP) / 2;
const RING = Math.min(126, COL_W - 44);

// The badge gallery under the calendar. Each milestone unlocks once the user's
// longest streak ever reaches its threshold; the FIRST time a badge unlocks it
// plays the celebration animation (tracked in AsyncStorage so it only fires
// once). Tapping any earned badge replays that animation.
function StreakBadgeGallery({ longestStreak = 0 }) {
  const [seen, setSeen] = useState(null); // Set of badge keys already celebrated
  const [justKeys, setJustKeys] = useState(null);

  const isUnlocked = (badge) => longestStreak >= badge.days;

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SEEN_KEY);
        setSeen(new Set(raw ? JSON.parse(raw) : []));
      } catch {
        setSeen(new Set());
      }
    })();
  }, []);

  useEffect(() => {
    if (!seen) return;
    const unlockedNow = STREAK_BADGES.filter((b) => isUnlocked(b)).map((b) => b.key);
    const newly = unlockedNow.filter((k) => !seen.has(k));
    if (newly.length) {
      setJustKeys(new Set(newly));
      const merged = new Set([...seen, ...unlockedNow]);
      AsyncStorage.setItem(SEEN_KEY, JSON.stringify([...merged])).catch(() => {});
      setSeen(merged);
    } else {
      setJustKeys(new Set());
    }
  }, [seen, longestStreak]);

  return (
    <View style={st.wrap}>
      <Text style={st.heading}>Badges</Text>
      <View style={st.grid}>
        {STREAK_BADGES.map((badge) => (
          <View key={badge.key} style={{ width: COL_W, marginBottom: GAP }}>
            <StreakBadge
              badge={badge}
              unlocked={isUnlocked(badge)}
              justUnlocked={!!justKeys?.has(badge.key)}
              ringSize={RING}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { marginTop: 26 },
  heading: {
    fontFamily: 'Outfit-Regular',
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.4,
    marginBottom: 14,
    marginLeft: 4,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
});

export default React.memo(StreakBadgeGallery);
