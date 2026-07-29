import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, SafeAreaView, StyleSheet,
  Animated, Dimensions, Easing, PanResponder,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import {
  computeGalleryItems, groupIntoSections, earnedCount,
} from '../services/BadgeGalleryService';
import BadgeTile from '../components/streaks/BadgeTile';
import { useTabSwipeLock } from '../context/SwipeNavContext';

const SCREEN_W = Dimensions.get('window').width;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const SWIPE_THRESHOLD = 80;
// Same spring the root TabPager uses, so swipe-back feels identical to tab paging.
const SPRING = { stiffness: 210, damping: 32, mass: 1, useNativeDriver: true };
const GAP = 12;
const COL_W = (SCREEN_W - 16 * 2 - GAP) / 2;
const RING = Math.min(126, COL_W - 44);

// Every badge — streak milestones and achievements — grouped into sections.
// Pushed from the Streaks screen's "More". Items are recomputed here rather
// than passed down, so this screen and the six-badge preview can never
// disagree about what's earned.
export default function BadgesScreen({ sessions, longestStreak, celebrateIds, onBack }) {
  const translateX = useRef(new Animated.Value(SCREEN_W)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  // Gates the swipe-back gesture until the entrance animation finishes, so a
  // swipe mid-entrance can't fight it.
  const readyRef = useRef(false);
  const arm = useCallback(() => { readyRef.current = true; }, []);
  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, { toValue: 0, duration: 380, easing: EASE_OUT, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 260, easing: EASE_OUT, useNativeDriver: true }),
    ]).start(arm);
  }, [translateX, opacity, arm]);

  // Own the back gesture while this screen is open so the root tab-swipe
  // can't fire underneath it (a swipe here would otherwise jump tabs instead
  // of going back to Streaks).
  useTabSwipeLock();

  const handleBack = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateX, { toValue: SCREEN_W, duration: 260, easing: EASE_OUT, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, easing: EASE_OUT, useNativeDriver: true }),
    ]).start(onBack);
  }, [translateX, opacity, onBack]);

  // Swipe-back: drags right, follows the finger, and either finishes the
  // dismiss (past the threshold or a fast flick) or springs back to open.
  const dismissBySwipe = useCallback((velocity = 0) => {
    Animated.spring(translateX, {
      toValue: SCREEN_W,
      velocity: velocity * 1000, // gesture vx is px/ms; spring wants px/s
      ...SPRING,
    }).start(onBack);
  }, [onBack, translateX]);

  const settleOpen = useCallback((velocity = 0) => {
    Animated.spring(translateX, { toValue: 0, velocity: velocity * 1000, ...SPRING }).start();
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
          dismissBySwipe(vx);
        } else {
          settleOpen(vx);
        }
      },
      onPanResponderTerminate: () => settleOpen(),
    })
  ).current;

  const items = useMemo(
    () => computeGalleryItems(sessions, longestStreak),
    [sessions, longestStreak]
  );
  const sections = useMemo(() => groupIntoSections(items), [items]);
  const earned = earnedCount(items);

  return (
    <Animated.View
      style={[st.flex, { opacity, transform: [{ translateX }] }]}
      {...panResponder.panHandlers}
    >
      <SafeAreaView style={st.safe}>
        <StatusBar style="dark" />

        <View style={st.header}>
          <TouchableOpacity onPress={handleBack} style={st.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={26} color={colors.ink} />
          </TouchableOpacity>
          <Text style={st.headerTitle} numberOfLines={1}>Badges &amp; Achievements</Text>
          <View style={st.backBtn} />
        </View>

        <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
          <Text style={st.tally}>
            <Text style={st.tallyNum}>{earned}</Text>
            <Text> of {items.length} earned</Text>
          </Text>

          {sections.map((section) => (
            <View key={section.key} style={st.section}>
              <View style={st.sectionHead}>
                <Text style={st.sectionTitle}>{section.title}</Text>
                <Text style={st.sectionCount}>
                  {section.items.filter((i) => i.level > 0).length}/{section.items.length}
                </Text>
              </View>
              <Text style={st.sectionBlurb}>{section.blurb}</Text>
              <View style={st.grid}>
                {section.items.map((item, i) => (
                  <View key={item.id} style={{ width: COL_W, marginBottom: GAP }}>
                    <BadgeTile
                      item={item}
                      celebrate={!!celebrateIds?.has(item.id)}
                      ringSize={RING}
                      sheenDelay={i * 260}
                    />
                  </View>
                ))}
              </View>
            </View>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Outfit-Regular',
    fontSize: 19,
    color: colors.ink,
    letterSpacing: -0.4,
  },
  scroll: { paddingHorizontal: 16, paddingTop: 4 },
  tally: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    color: colors.muted,
    marginLeft: 4,
    marginBottom: 22,
  },
  tallyNum: { fontFamily: 'Switzer-Bold', fontSize: 17, color: colors.ink },
  section: { marginBottom: 22 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4 },
  sectionTitle: {
    fontFamily: 'Outfit-Regular',
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.4,
  },
  sectionCount: { fontFamily: 'Switzer-Bold', fontSize: 13, color: colors.muted },
  sectionBlurb: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13.5,
    color: colors.muted,
    marginLeft: 4,
    marginTop: 2,
    marginBottom: 14,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
});
