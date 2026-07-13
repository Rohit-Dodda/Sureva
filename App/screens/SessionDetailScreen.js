import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Easing,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import mockData from '../constants/mockData';
import SectionCard from '../components/SectionCard';
import DepletionChart from '../components/DepletionChart';
import ScoreHero from '../components/sessionDetail/ScoreHero';
import DriversCard from '../components/sessionDetail/DriversCard';
import SkinTodayCard from '../components/sessionDetail/SkinTodayCard';
import MomentsCard from '../components/sessionDetail/MomentsCard';
import AlertComplianceCard from '../components/sessionDetail/AlertComplianceCard';
import PatternCard from '../components/sessionDetail/PatternCard';
import PreventedCard from '../components/sessionDetail/PreventedCard';
import SurevaTakeCard from '../components/sessionDetail/SurevaTakeCard';
import WhatIfEntryCard from '../components/whatIf/WhatIfEntryCard';
import WhatIfSimulatorScreen from './WhatIfSimulatorScreen';
// MOCK: raw 30-second readings are synthesized until Week 6 BLE
// integration; real sessions will carry them on the session document.
import { getSimDataForSession } from '../constants/mockSessionReadings';
import SlideInView, { IOS_EASE_OUT } from '../components/SlideInView';
import { useTabSwipeLock } from '../context/SwipeNavContext';
import { useScrollToTop } from '../context/ScrollToTopContext';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 80;
// Same spring the root TabPager uses, so swipe-back feels identical to tab paging.
const SPRING = { stiffness: 210, damping: 32, mass: 1, useNativeDriver: true };
// Matches the Settings screen's back-button slide-out (timed ease-out, not a spring).
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

export default function SessionDetailScreen({ session, onBack, scrollKey }) {
  const translateX = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  // The whole screen ignores touches until the entrance finishes, so the
  // opening tap's release (mounted under the finger) can't reach the swipe-back
  // and be misread as a dismiss. Both the ref (read synchronously by the pan
  // responder) and the state (drives pointerEvents) flip together.
  const readyRef = useRef(false);
  const [interactive, setInteractive] = useState(false);
  const [whatIfVisible, setWhatIfVisible] = useState(false);
  const openWhatIf = useCallback(() => setWhatIfVisible(true), []);
  const closeWhatIf = useCallback(() => setWhatIfVisible(false), []);
  const detail = mockData.sessionDetails[session.id];
  const whatIfData = getSimDataForSession(session.id);

  // Own the back gesture while open so the root tab-swipe can't fire underneath
  // (a rightward swipe on a tab would otherwise jump to the previous tab).
  useTabSwipeLock();

  // While open, this overlay handles double-tap-to-top for its parent tab.
  const scrollRef = useRef(null);
  const scrollToTop = useCallback(
    () => scrollRef.current?.scrollTo({ y: 0, animated: true }),
    []
  );
  useScrollToTop(scrollKey, scrollToTop);

  // Start the slide-in when the view is first laid out. onLayout guarantees the
  // native view exists; a mount-time start can silently no-op on the very first
  // mount (the freshly mounted native view isn't ready), which is why it used to
  // take a second tap. enteredRef keeps it to a single run.
  const enteredRef = useRef(false);
  const arm = useCallback(() => { readyRef.current = true; setInteractive(true); }, []);
  const runEnter = useCallback(() => {
    if (enteredRef.current) return;
    enteredRef.current = true;
    Animated.timing(translateX, {
      toValue: 0,
      duration: 460,
      easing: IOS_EASE_OUT,
      useNativeDriver: true,
    }).start(arm);
  }, [translateX, arm]);

  // Safety net: enter + arm even if onLayout is somehow delayed.
  useEffect(() => {
    const t1 = setTimeout(runEnter, 80);
    const t2 = setTimeout(arm, 550);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [runEnter, arm]);

  const dismiss = useCallback((velocity = 0) => {
    Animated.spring(translateX, {
      toValue: SCREEN_WIDTH,
      velocity: velocity * 1000, // gesture vx is px/ms; spring wants px/s
      ...SPRING,
    }).start(onBack);
  }, [onBack, translateX]);

  // Back-button close: same timed ease-out slide-out as the Settings screen.
  const handleBackPress = useCallback(() => {
    Animated.timing(translateX, {
      toValue: SCREEN_WIDTH,
      duration: 260,
      easing: EASE_OUT,
      useNativeDriver: true,
    }).start(onBack);
  }, [onBack, translateX]);

  const settleOpen = useCallback((velocity = 0) => {
    Animated.spring(translateX, {
      toValue: 0,
      velocity: velocity * 1000,
      ...SPRING,
    }).start();
  }, [translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        readyRef.current && dx > 8 && Math.abs(dx) > Math.abs(dy),
      onPanResponderMove: (_, { dx }) => {
        if (dx > 0) translateX.setValue(dx);
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        if (dx > SWIPE_THRESHOLD || vx > 0.5) {
          dismiss(vx);
        } else {
          settleOpen(vx);
        }
      },
      onPanResponderTerminate: () => settleOpen(),
    })
  ).current;

  return (
    <Animated.View
      style={[st.flex, { transform: [{ translateX }] }]}
      pointerEvents={interactive ? 'auto' : 'none'}
      onLayout={runEnter}
      {...panResponder.panHandlers}
    >
      <SafeAreaView style={st.safe}>
        <StatusBar style="dark" />

        <View style={st.header}>
          <TouchableOpacity onPress={handleBackPress} style={st.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={26} color={colors.ink} />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Session Details</Text>
          <View style={st.backBtn} />
        </View>

        <ScrollView ref={scrollRef} contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
          <SlideInView delay={140}>
            <View style={st.hero}>
              <Text style={st.location}>{session.location}</Text>
              <Text style={st.envTag}>{session.environment}</Text>
              <Text style={st.dateStr}>{session.date}  ·  {session.startTime} – {session.endTime}  ·  {session.duration}</Text>
            </View>
          </SlideInView>

          {detail ? (
            <>
              <SlideInView delay={180}>
                <ScoreHero score={session.score} verdict={detail.verdict} />
              </SlideInView>

              <SlideInView delay={230}>
                <SectionCard icon="pulse-outline" title="Protection Timeline">
                  <DepletionChart
                    data={detail.timeline}
                    durationMinutes={session.durationMinutes}
                    startTime={session.startTime}
                    endTime={session.endTime}
                  />
                </SectionCard>
              </SlideInView>

              <SlideInView delay={280}><DriversCard drivers={detail.drivers} /></SlideInView>
              <SlideInView delay={330}><SkinTodayCard skin={detail.skin} /></SlideInView>
              <SlideInView delay={380}><MomentsCard moments={detail.moments} /></SlideInView>
              <SlideInView delay={430}><AlertComplianceCard alerts={detail.alerts} /></SlideInView>
              <SlideInView delay={480}><PatternCard pattern={detail.pattern} /></SlideInView>
              <SlideInView delay={530}><PreventedCard prevented={detail.prevented} /></SlideInView>
              <SlideInView delay={580}><SurevaTakeCard take={detail.aiTake} /></SlideInView>
              {whatIfData && (
                <SlideInView delay={630}><WhatIfEntryCard onPress={openWhatIf} /></SlideInView>
              )}
            </>
          ) : (
            <Text style={st.empty}>Detailed breakdown isn't available for this session.</Text>
          )}
        </ScrollView>

        {whatIfData && whatIfVisible && (
          <WhatIfSimulatorScreen
            visible={whatIfVisible}
            onClose={closeWhatIf}
            session={session}
            simData={whatIfData}
          />
        )}
      </SafeAreaView>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  flex: {
    flex: 1,
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
    backgroundColor: colors.canvas,
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
    paddingTop: 24,
    paddingBottom: 48,
  },
  hero: {
    marginBottom: 20,
  },
  location: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 28,
    color: colors.ink,
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  envTag: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 11,
    color: colors.orangeDark,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    backgroundColor: colors.orangeWash,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 6,
  },
  dateStr: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.muted,
  },
  empty: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 40,
  },
});
