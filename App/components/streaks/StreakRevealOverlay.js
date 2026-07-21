import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import {
  Animated, View, Text, StyleSheet, Pressable, StatusBar, Share,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import colors from '../../constants/colors';
import { tierFor } from '../../constants/streakTiers';
import { useStreak } from '../../context/StreakContext';
import { useAuth } from '../../context/AuthContext';
import { getDayState, startOfDay, addDays, dayKey } from '../../services/StreakService';
import StreakAuroraBackground from './StreakAuroraBackground';
import StreakFlame from './StreakFlame';
import StreakCountFill from './StreakCountFill';
import StreakWeekDay from './StreakWeekDay';
import StreakShareSheet from './StreakShareSheet';

const SHARE_DELAY_MS = 1400; // rises shortly after the light-up begins to settle
const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// The post-check-in celebration, shaped like a card floating on a flowing
// orange "aurora" background: a lit flame igniting over the streak count that
// fills with the tier gradient, this week's progress with the earned day
// morphing into its badge, a stat panel, and — once the animation settles — a
// "Share Your Streak" sheet rising from the bottom. `count`/`tierKey` are the
// celebrated values; the week row and stats come from the shared StreakContext.
function StreakRevealOverlay({ count, tierKey, onDone, persist = false }) {
  const { streak, sessions } = useStreak();
  const { userProfile } = useAuth();
  const tier = tierFor(tierKey);
  const firstName = userProfile?.firstName;

  const fade = useRef(new Animated.Value(0)).current;
  const cardRef = useRef(null);
  const done = useRef(false);

  // Capture the badge card to a PNG and share it as an image (falls back to a
  // text share if capture or the share dialog isn't available).
  const handleShare = useCallback(async () => {
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your streak' });
      } else {
        await Share.share({ url: uri });
      }
    } catch {
      try {
        await Share.share({ message: `I'm on a ${count}-day sun protection streak with Sureva ☀️🔥` });
      } catch {
        // Nothing to surface on a cancelled/failed share.
      }
    }
  }, [count]);
  // Bumped to remount the flame / count-fill / earned-day so their light-up
  // animations replay from the start — used by tap-to-replay in preview mode.
  const [replay, setReplay] = useState(0);
  const [showShare, setShowShare] = useState(false);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    Animated.timing(fade, { toValue: 0, duration: 260, useNativeDriver: true })
      .start(() => onDone?.());
  }, [fade, onDone]);

  // In persist/preview mode a tap replays the animation; in normal mode the
  // card isn't tap-to-dismiss — the share sheet's Continue (or a drag-down)
  // advances, so an accidental tap can't skip the moment.
  const replayAnim = useCallback(() => setReplay((r) => r + 1), []);
  const onPress = persist ? replayAnim : undefined;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [fade]);

  // The share sheet rises once the reveal animation has played; resets and
  // re-arms on replay.
  useEffect(() => {
    setShowShare(false);
    const id = setTimeout(() => setShowShare(true), SHARE_DELAY_MS);
    return () => clearTimeout(id);
  }, [replay]);

  // This week (Mon–Sun) with each day's logged/frozen state.
  const week = useMemo(() => {
    const now = streak?.now ?? Date.now();
    const base = startOfDay(now);
    const dow = new Date(base).getDay(); // 0 Sun … 6 Sat
    const monday = addDays(base, -((dow + 6) % 7));
    const todayKey = dayKey(now);
    return LETTERS.map((letter, i) => {
      const ms = addDays(monday, i);
      const state = getDayState(ms, streak, now);
      return {
        letter,
        date: new Date(ms).getDate(),
        state,
        isToday: dayKey(ms) === todayKey,
        filled: state === 'logged' || state === 'freeze-covered',
        frozen: state === 'freeze-covered',
      };
    });
  }, [streak]);

  const totalMinutes = useMemo(
    () => Math.round((sessions || []).reduce((a, s) => a + (s.duration_minutes ?? 0), 0)),
    [sessions]
  );

  return (
    <Animated.View style={[StyleSheet.absoluteFill, st.root, { opacity: fade }]}>
      <StatusBar barStyle="dark-content" />
      <StreakAuroraBackground palette={[...tier.gradient, tier.glow]} />

      <View style={st.cardWrap}>
        <View style={st.card} ref={cardRef} collapsable={false}>
          <Pressable style={st.press} onPress={onPress}>
            {/* Flame: empty outline → ignites → burns. key remounts on replay. */}
            <View style={st.flameRing}>
              <StreakFlame key={replay} gradient={tier.gradient} size={88} />
            </View>

            {/* Gradient number that fills up from the bottom, centered between
                the flame ring and the title. */}
            <View style={st.countWrap}>
              <StreakCountFill key={replay} value={count} gradient={tier.gradient} size={80} />
            </View>
            <Text style={st.streakTitle}>Day Streak</Text>
            <Text style={st.subtitle}>
              {firstName ? `You're doing really great, ${firstName}!` : "You're doing really great!"}
            </Text>

            {/* This week's progress — the earned day morphs into its badge. */}
            <View style={st.week}>
              {week.map((d, i) => (
                <View key={i} style={st.weekCol}>
                  <Text style={[st.weekLetter, d.isToday && st.weekLetterToday]}>{d.letter}</Text>
                  <StreakWeekDay
                    key={`${i}-${replay}`}
                    date={d.date}
                    isToday={d.isToday}
                    filled={d.filled}
                    frozen={d.frozen}
                    earned={d.isToday && d.filled}
                    gradient={tier.gradient}
                  />
                </View>
              ))}
            </View>

            {/* Stat panel. */}
            <View style={st.statsCard}>
              <Text style={st.statsHeading}>Your Stats</Text>
              <View style={st.statsRow}>
                <StatCol label="Days" value={count} />
                <StatCol label="Sessions" value={(sessions || []).length} />
                <StatCol label="Longest" value={streak?.longestStreak ?? 0} />
                <StatCol label="Minutes" value={totalMinutes} last />
              </View>
            </View>
          </Pressable>
        </View>
      </View>

      {/* Continue sits UNDER the share sheet — swiping the sheet down uncovers
          it, and tapping it advances to the Streaks tab. */}
      <Pressable style={[st.continueBtn, { backgroundColor: tier.flame }]} onPress={finish}>
        <Text style={st.continueText}>Continue</Text>
      </Pressable>

      <StreakShareSheet visible={showShare} onShare={handleShare} />
    </Animated.View>
  );
}

function StatCol({ label, value, last }) {
  return (
    <View style={[st.statCol, !last && st.statColBorder]}>
      <Text style={st.statLabel}>{label}</Text>
      <Text style={st.statValue}>{value}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  root: { zIndex: 100, elevation: 100 },
  cardWrap: {
    ...StyleSheet.absoluteFillObject,
    paddingTop: 56,
    paddingHorizontal: 14,
    paddingBottom: 18,
  },
  card: {
    flex: 1,
    borderRadius: 34,
    backgroundColor: colors.white,
    overflow: 'hidden',
    shadowColor: colors.orangeDark,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 30,
    elevation: 10,
  },
  press: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 20,
  },
  flameRing: {
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countWrap: { marginTop: 10, marginBottom: 2 },
  streakTitle: {
    fontFamily: 'Outfit-Regular',
    fontSize: 30,
    color: colors.ink,
    letterSpacing: -0.5,
    marginTop: 8,
  },
  subtitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 14.5,
    color: colors.muted,
    marginTop: 8,
    textAlign: 'center',
  },
  week: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  weekCol: { alignItems: 'center', marginHorizontal: 6 },
  weekLetter: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: colors.muted,
    marginBottom: 8,
  },
  weekLetterToday: { color: colors.ink, fontFamily: 'Inter-SemiBold' },
  statsCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginTop: 26,
  },
  statsHeading: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 12,
  },
  statsRow: { flexDirection: 'row' },
  statCol: { flex: 1, alignItems: 'center' },
  statColBorder: { borderRightWidth: 1, borderRightColor: colors.border },
  statLabel: { fontFamily: 'Inter-Medium', fontSize: 12.5, color: colors.muted, marginBottom: 4 },
  statValue: { fontFamily: 'Outfit-Regular', fontSize: 24, color: colors.ink },
  continueBtn: {
    position: 'absolute',
    left: 40,
    right: 40,
    bottom: 46,
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: { fontFamily: 'Outfit-Regular', fontSize: 17, color: colors.white },
});

export default React.memo(StreakRevealOverlay);
