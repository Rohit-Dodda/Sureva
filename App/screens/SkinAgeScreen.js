import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, SafeAreaView, StyleSheet,
  Animated, Dimensions, Easing, PanResponder,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../constants/colors';
import SupabaseService from '../services/SupabaseService';
import { useAuth } from '../context/AuthContext';
import { useTabSwipeLock } from '../context/SwipeNavContext';
import { engineProfileFor } from '../components/activeSession/sessionMath';
import { estimateSedFromHero } from '../services/SessionDetailMapper';
import {
  calculateSkinAge,
  buildImprovementLevers,
} from '../services/SkinAgeService';
// Fallback only while the real fetch below is in flight, or for a
// brand-new user with zero recorded sessions yet.
import {
  mockSkinAgeProfile,
  mockSkinAgeAggregates,
  mockSkinAgeTrendPoints,
  mockSkinAgeMonths,
} from '../constants/mockSkinAgeData';
import { SKIN_AGE_SCRATCHED_KEY } from '../constants/skinAgeStorage';
import SkinAgeHero from '../components/skinAge/SkinAgeHero';
import SkinAgeScratchCard from '../components/skinAge/SkinAgeScratchCard';
import SkinAgeExplainerModal from '../components/skinAge/SkinAgeExplainerModal';
import SkinAgeTrendChart from '../components/skinAge/SkinAgeTrendChart';
import MonthlySnapshotRow from '../components/skinAge/MonthlySnapshotRow';
import ImprovementLevers from '../components/skinAge/ImprovementLevers';
import SlideInView from '../components/SlideInView';
import SessionLockCard from '../components/SessionLockCard';

const SCREEN_W = Dimensions.get('window').width;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const LAST_CALC_KEY = 'sureva_skinage_last_calc';

// age_range is a coarse onboarding bucket (see onboardingOptions.js); this
// is only a stand-in for realAge until a user fills in the exact-age field
// added to onboarding/EditSkinProfileScreen. Once they do, exactAge always
// wins below.
const AGE_RANGE_MIDPOINTS = { 0: 10, 1: 31, 2: 57, 3: 70 };
function fallbackRealAge(profile) {
  if (profile?.exactAge != null) return profile.exactAge;
  return AGE_RANGE_MIDPOINTS[profile?.ageRange] ?? 30;
}

// All-time aggregates across every recorded session — see
// SkinAgeService.calculateSkinAge for what each field feeds into.
function buildRealAggregates(sessions) {
  const totalUVUnits = sessions.reduce((a, s) => a + estimateSedFromHero(s), 0);
  const totalGapMinutes = sessions.reduce((a, s) => a + (s.unprotected_minutes ?? 0), 0);
  const avgSessionScore = sessions.reduce((a, s) => a + (s.protection_score ?? 0), 0) / sessions.length;
  const responseTimes = sessions.map((s) => s.alert_response_time_avg).filter((v) => v != null);
  const avgAlertResponseMinutes = responseTimes.length
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : null;

  // Streak = consecutive calendar days with at least one session.
  const days = [...new Set(sessions.map((s) => new Date(s.start_time).toISOString().slice(0, 10)))].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const gapDays = Math.round((new Date(days[i]) - new Date(days[i - 1])) / 86400000);
    run = gapDays === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  const daysSinceLast = Math.round((Date.now() - new Date(days[days.length - 1])) / 86400000);
  const currentStreakDays = daysSinceLast <= 1 ? run : 0;

  return {
    totalUVUnits: Math.round(totalUVUnits * 100) / 100,
    totalGapMinutes: Math.round(totalGapMinutes),
    avgSessionScore: Math.round(avgSessionScore),
    avgAlertResponseMinutes: avgAlertResponseMinutes != null ? Math.round(avgAlertResponseMinutes * 10) / 10 : null,
    currentStreakDays,
    longestStreakDays: longest,
  };
}

// Last several calendar months, most recent first — replaces mockSkinAgeMonths.
function buildRealMonths(sessions) {
  const byMonth = new Map();
  for (const s of sessions) {
    const key = new Date(s.start_time).toISOString().slice(0, 7); // YYYY-MM
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key).push(s);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([key, group]) => ({
      key,
      label: new Date(`${key}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short' }),
      sessions: group.length,
      uvUnits: Math.round(group.reduce((a, s) => a + estimateSedFromHero(s), 0)),
      gapMinutes: Math.round(group.reduce((a, s) => a + (s.unprotected_minutes ?? 0), 0)),
      avgScore: Math.round(group.reduce((a, s) => a + (s.protection_score ?? 0), 0) / group.length),
    }));
}

function formatDateLabel(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Pushed full-screen from the "Reveal Skin Age" button on Insights.
export default function SkinAgeScreen({ onBack }) {
  const { user, userProfile } = useAuth();
  useTabSwipeLock();

  // null = still loading (mock is the placeholder); a resolved array —
  // even an empty one — is the real, honest answer. Snapshots are fetched
  // alongside since they back the trend chart below.
  const [realSessions, setRealSessions] = useState(null);
  const [realSnapshots, setRealSnapshots] = useState(null);
  useEffect(() => {
    if (!user?.id) { setRealSessions([]); setRealSnapshots([]); return; }
    let cancelled = false;
    Promise.all([
      SupabaseService.getSessions(user.id),
      SupabaseService.getSkinAgeSnapshots(user.id),
    ]).then(([sessionsRes, snapshotsRes]) => {
      if (cancelled) return;
      setRealSessions(sessionsRes.data ?? []);
      setRealSnapshots(snapshotsRes.data ?? []);
    }).catch(() => {
      if (!cancelled) { setRealSessions([]); setRealSnapshots([]); }
    });
    return () => { cancelled = true; };
  }, [user]);
  // `realSessions` is the raw getSessions row array, so its length is the
  // same all-time completed-session count Home and Insights count — the two
  // screens' locks report identical numbers and unlock together. null while
  // still loading; a resolved count under 10 shows the lock (below), 10+
  // reveals the real Skin Age. Same 10-session threshold as Insights/Home.
  const SESSION_THRESHOLD = 10;
  const totalSessions = realSessions === null ? null : realSessions.length;
  const isUnlocked = totalSessions !== null && totalSessions >= SESSION_THRESHOLD;
  const isLocked = totalSessions !== null && totalSessions < SESSION_THRESHOLD;

  // Push-style entrance, matching the app's other pushed screens.
  const translateX = useRef(new Animated.Value(SCREEN_W)).current;
  useEffect(() => {
    Animated.timing(translateX, { toValue: 0, duration: 380, easing: EASE_OUT, useNativeDriver: true }).start();
  }, [translateX]);
  const handleBack = useCallback(() => {
    Animated.timing(translateX, { toValue: SCREEN_W, duration: 260, easing: EASE_OUT, useNativeDriver: true }).start(onBack);
  }, [translateX, onBack]);

  // Swipe-back: a rightward drag pulls the screen with the finger; past
  // the threshold (or a flick) it dismisses back to Insights, otherwise
  // it springs back into place. Same spring the root pager uses.
  const swipePan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) => dx > 12 && Math.abs(dx) > Math.abs(dy) * 1.5,
      onPanResponderMove: (_, { dx }) => { if (dx > 0) translateX.setValue(dx); },
      onPanResponderRelease: (_, { dx, vx }) => {
        if (dx > 80 || vx > 0.5) {
          Animated.spring(translateX, {
            toValue: SCREEN_W,
            velocity: vx * 1000,
            stiffness: 210, damping: 32, mass: 1,
            useNativeDriver: true,
          }).start(onBack);
        } else {
          Animated.spring(translateX, {
            toValue: 0, stiffness: 210, damping: 32, mass: 1, useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0, stiffness: 210, damping: 32, mass: 1, useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const profile = useMemo(() => {
    if (!isUnlocked) return mockSkinAgeProfile;
    const firstSessionDate = realSessions.reduce(
      (min, s) => (s.start_time < min ? s.start_time : min),
      realSessions[0].start_time
    );
    return {
      realAge: fallbackRealAge(userProfile),
      fitzpatrickType: engineProfileFor({}, userProfile).fitzpatrickType,
      firstSessionDate,
    };
  }, [isUnlocked, realSessions, userProfile]);
  const agg = useMemo(
    () => (isUnlocked ? buildRealAggregates(realSessions) : mockSkinAgeAggregates),
    [isUnlocked, realSessions]
  );
  const months = useMemo(
    () => (isUnlocked ? buildRealMonths(realSessions) : mockSkinAgeMonths),
    [isUnlocked, realSessions]
  );
  const { skinAge, modifiers } = useMemo(() => calculateSkinAge(profile, agg), [profile, agg]);
  const levers = useMemo(() => buildImprovementLevers(profile, agg, modifiers), [profile, agg, modifiers]);

  // Today's calculation appended to the stored history for the chart.
  const trendPoints = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const stored = (realSnapshots && realSnapshots.length)
      ? [...realSnapshots]
        .map((s) => ({ date: new Date(s.calculated_at).toISOString().slice(0, 10), age: s.skin_age }))
        .sort((a, b) => (a.date < b.date ? -1 : 1))
      : mockSkinAgeTrendPoints;
    if (stored.length && stored[stored.length - 1].date === today) return stored;
    return [...stored, { date: today, age: skinAge }];
  }, [skinAge, realSnapshots]);

  // Persist today's data point at most once per day, so the trend line
  // accumulates history. Failures are silent — the screen never blocks.
  useEffect(() => {
    // Only persist a real, unlocked skin age — never the mock value shown
    // while loading or behind the 10-session lock.
    if (!isUnlocked) return;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      try {
        const last = await AsyncStorage.getItem(LAST_CALC_KEY);
        if (last === today) return;
        const { error } = await SupabaseService.saveSkinAgeSnapshot(user?.id, skinAge);
        if (error) throw error;
        await AsyncStorage.setItem(LAST_CALC_KEY, today);
      } catch {
        // Offline or signed-out — recorded next time it succeeds.
      }
    })();
  }, [user, skinAge, isUnlocked]);

  // First visit ever: the hero is covered by a scratch-off layer and the
  // rest of the page stays unmounted until it's cleared, so the sections
  // below pop in exactly at the reveal moment. Every visit after that,
  // skip straight to the revealed state — a scratch card doesn't reset.
  const [hasScratchedBefore, setHasScratchedBefore] = useState(null); // null = still checking
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(SKIN_AGE_SCRATCHED_KEY);
        const already = stored === '1';
        setHasScratchedBefore(already);
        if (already) setRevealed(true);
      } catch {
        // Can't confirm either way — default to letting them scratch it.
        setHasScratchedBefore(false);
      }
    })();
  }, []);
  // The explainer only ever fires from an actual scratch completion (this
  // callback), never for a returning user whose `revealed` gets set
  // directly from storage — so it naturally only shows the first time.
  // A short delay lets the paint-fade and the first section or two start
  // flowing in before it appears on top, instead of cutting them off.
  const [showExplainer, setShowExplainer] = useState(false);
  const explainerTimer = useRef(null);
  useEffect(() => () => clearTimeout(explainerTimer.current), []);
  const handleRevealed = useCallback(() => {
    setRevealed(true);
    AsyncStorage.setItem(SKIN_AGE_SCRATCHED_KEY, '1').catch(() => {});
    explainerTimer.current = setTimeout(() => setShowExplainer(true), 500);
  }, []);
  const dismissExplainer = useCallback(() => setShowExplainer(false), []);

  // The scratch gesture claims the responder, but a ScrollView's own
  // native scroll recognizer can still start a scroll before that
  // negotiation finishes — locking scrollEnabled for the duration is the
  // reliable fix, not just something the PanResponder should already do.
  const [scratching, setScratching] = useState(false);
  const handleScratchStart = useCallback(() => setScratching(true), []);
  const handleScratchEnd = useCallback(() => setScratching(false), []);

  const startDateLabel = formatDateLabel(profile.firstSessionDate);

  return (
    <Animated.View style={[st.flex, { transform: [{ translateX }] }]} {...swipePan.panHandlers}>
      <SafeAreaView style={st.safe}>
        <StatusBar style="dark" />
        <View style={st.header}>
          <TouchableOpacity onPress={handleBack} style={st.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={26} color={colors.ink} />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Skin Age</Text>
          <View style={st.backBtn} />
        </View>

        <ScrollView
          contentContainerStyle={st.scroll}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!scratching}
        >
          {isLocked ? (
            // Resolved, under 10 sessions: the whole real-content path
            // (scratch card + revealed sections) is gated behind the same
            // 10-session lock Insights and Home use, so a 0-9 session user
            // sees the lock instead of the scratch card or mock content.
            <SessionLockCard
              totalSessions={totalSessions}
              threshold={SESSION_THRESHOLD}
              title={`Complete ${SESSION_THRESHOLD} sessions to unlock your Skin Age`}
              description={`Sureva estimates your skin age from your sun history. It unlocks after ${SESSION_THRESHOLD} sessions, together with your Insights. You have ${totalSessions} so far.`}
            />
          ) : (
            <>
              {hasScratchedBefore !== null && (
                // Always mounted — the card's tilt + glow-follow interaction
                // stays alive after the reveal too, not just during scratching.
                // The paint layer is just a sub-layer, shown only pre-reveal.
                <SkinAgeScratchCard
                  showPaint={hasScratchedBefore === false && !revealed}
                  onRevealed={handleRevealed}
                  onScratchStart={handleScratchStart}
                  onScratchEnd={handleScratchEnd}
                >
                  <SkinAgeHero
                    skinAge={skinAge}
                    realAge={profile.realAge}
                    lastUpdatedLabel="Last updated today"
                    glass
                    style={st.heroNoMargin}
                  />
                </SkinAgeScratchCard>
              )}

              {revealed && (
                <>
                  <SlideInView delay={0}>
                    <SkinAgeTrendChart
                      points={trendPoints}
                      realAge={profile.realAge}
                      startDateLabel={startDateLabel}
                    />
                  </SlideInView>
                  <SlideInView delay={70}>
                    <MonthlySnapshotRow months={months} />
                  </SlideInView>
                  <SlideInView delay={140}>
                    <ImprovementLevers levers={levers} />
                  </SlideInView>
                </>
              )}
            </>
          )}
        </ScrollView>

        {showExplainer && <SkinAgeExplainerModal onDismiss={dismissExplainer} />}
      </SafeAreaView>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontFamily: 'Outfit-Regular',
    fontSize: 17,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 48,
  },
  // Zeroes SkinAgeHero's own trailing margin while it's wrapped by the
  // scratch card — that spacing gets re-added on the wrapper itself
  // instead, so the scratch overlay's bounds exactly match the card.
  heroNoMargin: {
    marginBottom: 0,
  },
});
