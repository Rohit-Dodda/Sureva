import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, SafeAreaView, StyleSheet,
  Animated, Dimensions, Easing, PanResponder, Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import { buildAtlas, atlasProgress, TIER_LABELS } from '../services/SunStampService';
import { useTabSwipeLock } from '../context/SwipeNavContext';
import AtlasRow from '../components/sunStamps/AtlasRow';
import StampRevealCard from '../components/sunStamps/StampRevealCard';
import SlideInView from '../components/SlideInView';

const SCREEN_W = Dimensions.get('window').width;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const SWIPE_THRESHOLD = 80;
const SPRING = { stiffness: 210, damping: 32, mass: 1, useNativeDriver: true };

const AXES = ['place', 'latitude', 'altitude', 'season'];

// The collection board. Derived from the stamp list on every render rather
// than stored — same rule the rest of the app follows for anything computable
// from its source, so the board can never disagree with the stamps behind it.
export default function SunAtlasScreen({ stamps = [], latitude = 0, onBack }) {
  const translateX = useRef(new Animated.Value(SCREEN_W)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const readyRef = useRef(false);
  const arm = useCallback(() => { readyRef.current = true; }, []);

  // Tapping a filled chip opens that stamp full-size — the collection is
  // meant to be looked at, not just counted.
  const [viewing, setViewing] = useState(null);
  const viewerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, { toValue: 0, duration: 380, easing: EASE_OUT, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 260, easing: EASE_OUT, useNativeDriver: true }),
    ]).start(arm);
  }, [translateX, opacity, arm]);

  // Own the back gesture while open so the root tab-swipe can't fire
  // underneath and jump tabs instead of going back.
  useTabSwipeLock();

  const board = useMemo(() => buildAtlas(stamps, latitude), [stamps, latitude]);
  const progress = useMemo(() => atlasProgress(board), [board]);

  const handleBack = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateX, { toValue: SCREEN_W, duration: 260, easing: EASE_OUT, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, easing: EASE_OUT, useNativeDriver: true }),
    ]).start(onBack);
  }, [translateX, opacity, onBack]);

  const dismissBySwipe = useCallback((velocity = 0) => {
    Animated.spring(translateX, { toValue: SCREEN_W, velocity: velocity * 1000, ...SPRING }).start(onBack);
  }, [onBack, translateX]);

  const settleOpen = useCallback((velocity = 0) => {
    Animated.spring(translateX, { toValue: 0, velocity: velocity * 1000, ...SPRING }).start();
  }, [translateX]);

  const panResponder = useRef(
    PanResponder.create({
      // Only claims a clearly-horizontal drag, so the rows' own horizontal
      // scrolling and the page's vertical scrolling both still work.
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        readyRef.current && dx > 12 && Math.abs(dx) > Math.abs(dy) * 2,
      onPanResponderMove: (_, { dx }) => {
        if (dx > 0) translateX.setValue(dx);
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        if (dx > SWIPE_THRESHOLD || vx > 0.5) dismissBySwipe(vx);
        else settleOpen(vx);
      },
      onPanResponderTerminate: () => settleOpen(),
    })
  ).current;

  const openStamp = useCallback((slot) => {
    if (!slot.stamp) return;
    setViewing(slot.stamp);
    viewerAnim.setValue(0);
    Animated.timing(viewerAnim, { toValue: 1, duration: 320, easing: EASE_OUT, useNativeDriver: true }).start();
  }, [viewerAnim]);

  const closeStamp = useCallback(() => {
    Animated.timing(viewerAnim, { toValue: 0, duration: 220, easing: EASE_OUT, useNativeDriver: true })
      .start(() => setViewing(null));
  }, [viewerAnim]);

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
          <Text style={st.headerTitle} numberOfLines={1}>Your Atlas</Text>
          <View style={st.backBtn} />
        </View>

        <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
          <Text style={st.tally}>
            <Text style={st.tallyNum}>{progress.filled}</Text>
            <Text> of {progress.total} slots filled</Text>
          </Text>

          {stamps.length === 0 ? (
            <View style={st.emptyState}>
              <Text style={st.emptyTitle}>No stamps yet</Text>
              <Text style={st.emptyBody}>
                Step outside and catch the light. Every sky you keep lands here.
              </Text>
            </View>
          ) : null}

          {AXES.map((axis, i) => (
            <SlideInView key={axis} delay={40 + i * 60}>
              <AtlasRow row={board[axis]} onSelectStamp={openStamp} />
            </SlideInView>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Single-stamp viewer, pushed over the board. */}
      {viewing ? (
        <Animated.View style={[st.viewer, { opacity: viewerAnim }]}>
          <Pressable style={st.viewerBackdrop} onPress={closeStamp}>
            <Animated.View
              style={{
                transform: [{
                  scale: viewerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }),
                }],
              }}
            >
              <StampRevealCard stamp={viewing} width={Math.min(300, SCREEN_W * 0.72)} />
            </Animated.View>
            <View style={st.viewerCaption}>
              <Text style={st.viewerTier}>{TIER_LABELS[viewing.tier]}</Text>
              <Text style={st.viewerWhy}>{viewing.reason}</Text>
            </View>
          </Pressable>
        </Animated.View>
      ) : null}
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
  scroll: { paddingTop: 4 },
  tally: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    color: colors.muted,
    paddingHorizontal: 20,
    marginBottom: 22,
  },
  tallyNum: { fontFamily: 'Switzer-Bold', fontSize: 17, color: colors.ink },
  emptyState: {
    paddingHorizontal: 20,
    paddingBottom: 26,
  },
  emptyTitle: {
    fontFamily: 'Outfit-Regular',
    fontSize: 18,
    color: colors.ink,
    marginBottom: 4,
  },
  emptyBody: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  viewer: { ...StyleSheet.absoluteFillObject },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(8,6,3,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  viewerCaption: {
    marginTop: 22,
    alignItems: 'center',
    maxWidth: 280,
  },
  viewerTier: {
    fontFamily: 'Switzer-Bold',
    fontSize: 12.5,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.stampSealLight,
    marginBottom: 7,
  },
  viewerWhy: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15.5,
    lineHeight: 22,
    color: colors.white,
    textAlign: 'center',
  },
});
