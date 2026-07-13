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
import {
  calculateSkinAge,
  calculateWithoutSureva,
  buildImprovementLevers,
} from '../services/SkinAgeService';
// MOCK: profile, aggregates, trend history and months until real Supabase
// data is wired. TODO: replace with session aggregates + skin_age_snapshots
// reads via SupabaseService.
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
import SkinAgeComparisonCards from '../components/skinAge/SkinAgeComparisonCards';
import MonthlySnapshotRow from '../components/skinAge/MonthlySnapshotRow';
import ImprovementLevers from '../components/skinAge/ImprovementLevers';
import SlideInView from '../components/SlideInView';

const SCREEN_W = Dimensions.get('window').width;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const LAST_CALC_KEY = 'sureva_skinage_last_calc';

function formatDateLabel(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Pushed full-screen from the "Reveal Skin Age" button on Insights.
export default function SkinAgeScreen({ onBack }) {
  const { user } = useAuth();
  useTabSwipeLock();

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

  const profile = mockSkinAgeProfile;
  const agg = mockSkinAgeAggregates;
  const { skinAge, modifiers } = useMemo(() => calculateSkinAge(profile, agg), [profile, agg]);
  const withoutSureva = useMemo(() => calculateWithoutSureva(profile, agg), [profile, agg]);
  const levers = useMemo(() => buildImprovementLevers(profile, agg, modifiers), [profile, agg, modifiers]);

  // Today's calculation appended to the stored history for the chart.
  const trendPoints = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const stored = mockSkinAgeTrendPoints;
    if (stored.length && stored[stored.length - 1].date === today) return stored;
    return [...stored, { date: today, age: skinAge }];
  }, [skinAge]);

  // Persist today's data point at most once per day, so the trend line
  // accumulates history. Failures are silent — the screen never blocks.
  useEffect(() => {
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
  }, [user, skinAge]);

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
                <SkinAgeComparisonCards
                  withoutSureva={withoutSureva}
                  skinAge={skinAge}
                  startDateLabel={startDateLabel}
                />
              </SlideInView>
              <SlideInView delay={140}>
                <MonthlySnapshotRow months={mockSkinAgeMonths} />
              </SlideInView>
              <SlideInView delay={210}>
                <ImprovementLevers levers={levers} />
              </SlideInView>
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
    fontFamily: 'SpaceGrotesk-SemiBold',
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
