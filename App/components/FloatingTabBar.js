import React, { useRef, useCallback, useEffect } from 'react';
import {
  Pressable, View, Text, Animated, StyleSheet, Dimensions, Platform, Easing, PanResponder,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import { useTabBarHidden } from '../context/TabBarVisibilityContext';
import { useTourTarget } from '../context/AppTourContext';
import { useStreak } from '../context/StreakContext';
import { tierFor } from '../constants/streakTiers';

const SCREEN_WIDTH = Dimensions.get('window').width;

const TABS = [
  { key: 'home',     iconDefault: 'home-outline',      iconActive: 'home' },
  { key: 'forecast', iconDefault: 'partly-sunny-outline', iconActive: 'partly-sunny' },
  { key: 'history',  iconDefault: 'time-outline',       iconActive: 'time' },
  { key: 'insights', iconDefault: 'bar-chart-outline',  iconActive: 'bar-chart' },
  { key: 'streaks',  iconDefault: 'flame-outline',      iconActive: 'flame' },
];

// Anti-fuzz rules, absolute: a rasterized layer shown at any scale other
// than 1.0 samples its pixels and reads as blur on fine detail. So:
//  • Icons live in a layer that is NEVER scaled. Their own animations only
//    dip BELOW 1 transiently (press, landing bounce) — never above.
//  • The hold-grow / rubber-band stretch apply ONLY to the glass shell
//    behind them (blur + tint), which has no fine detail to blur.
//  • The lean's sideways shift is pure translation — translation never
//    resamples.
const ICON_SIZE = 25;

const TabItem = React.memo(function TabItem({ tab, isActive, onPress, badge, badgeColor, tourRef }) {
  const scale = useRef(new Animated.Value(1)).current;

  // Landing bounce: dip down fast, then spring back up to exactly 1.0 —
  // all the life of the Instagram pop, with the glyph never upscaled.
  const prevActive = useRef(isActive);
  useEffect(() => {
    if (isActive && !prevActive.current) {
      scale.stopAnimation();
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 0.82,
          duration: 70,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 380,
          friction: 7,
          overshootClamping: true,
          useNativeDriver: true,
        }),
      ]).start();
    }
    prevActive.current = isActive;
  }, [isActive, scale]);

  const onPressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.88,
      useNativeDriver: true,
      tension: 320,
      friction: 10,
    }).start();
  }, [scale]);

  const onPressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 220,
      friction: 9,
      overshootClamping: true,
    }).start();
  }, [scale]);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      hitSlop={10}
      style={st.tabBtn}
    >
      <Animated.View ref={tourRef} style={[st.iconWrap, { transform: [{ scale }] }]}>
        <Ionicons
          name={isActive ? tab.iconActive : tab.iconDefault}
          size={ICON_SIZE}
          color={isActive ? '#FFFFFF' : 'rgba(255,255,255,0.70)'}
        />
        {/* Standard "unread count on a tab" badge — flame + current streak. */}
        {badge > 0 && (
          <View style={[st.badge, badgeColor && { backgroundColor: badgeColor, borderColor: badgeColor }]}>
            <Ionicons name="flame" size={9} color={colors.white} style={st.badgeFlame} />
            <Text style={st.badgeText} numberOfLines={1}>{badge}</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
});

export default function FloatingTabBar({ activeTab, onTabPress }) {
  const glowOpacity = useRef(new Animated.Value(0)).current;

  // Full-screen flows (post-session check-in etc.) hide the bar so it
  // can't sit on top of their controls. Slides down + fades, and stops
  // accepting touches while hidden.
  const hidden = useTabBarHidden();
  const hiddenAnim = useRef(new Animated.Value(0)).current;
  const tourTargetRef = useTourTarget('tabBar');
  // The streak count that rides the Streaks tab icon as a notification badge.
  const { streak } = useStreak();
  const streakCount = streak?.currentStreak ?? 0;
  const streakAccent = tierFor(streak?.tier).flame;
  // Spotlight target for the Streaks first-visit milestone tour — the tab icon
  // itself (registered here, consumed by MILESTONE_TOURS.streaksFirstVisit).
  const streaksTabRef = useTourTarget('streaksTab');
  useEffect(() => {
    Animated.timing(hiddenAnim, {
      toValue: hidden ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [hidden, hiddenAnim]);

  // The glass highlight is one shared pill that glides between tab slots
  // instead of appearing on the active icon. Slot geometry comes from the
  // measured bar width (minus its horizontal padding).
  const [innerW, setInnerW] = React.useState(0);
  const slotW = TABS.length ? innerW / TABS.length : 0;
  const activeIndex = Math.max(0, TABS.findIndex((t) => t.key === activeTab));
  const indicatorX = useRef(new Animated.Value(0)).current;
  // Shell-only grow, touch-driven: the glass swells on finger-down, HOLDS
  // for as long as the touch lasts, and springs back on release. The icon
  // layer stays untransformed, so nothing sharp ever blurs.
  const shellScale = useRef(new Animated.Value(1)).current;
  // Glass lightens while held (Instagram-style) — rises with the grow on
  // finger-down, holds, and fades back out on release.
  const barLight = useRef(new Animated.Value(0)).current;

  const onBarTouchStart = useCallback(() => {
    shellScale.stopAnimation();
    barLight.stopAnimation();
    Animated.parallel([
      Animated.timing(shellScale, {
        toValue: 1.06,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(barLight, {
        toValue: 1,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [shellScale, barLight]);

  const onBarTouchEnd = useCallback(() => {
    shellScale.stopAnimation();
    barLight.stopAnimation();
    Animated.spring(shellScale, {
      toValue: 1,
      tension: 300,
      friction: 9,
      useNativeDriver: true,
    }).start();
    Animated.timing(barLight, {
      toValue: 0,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [shellScale, barLight]);

  const onBarLayout = useCallback((e) => {
    setInnerW(e.nativeEvent.layout.width - 16); // paddingHorizontal 8 × 2
  }, []);

  React.useEffect(() => {
    if (slotW <= 0) return;
    Animated.spring(indicatorX, {
      toValue: activeIndex * slotW,
      stiffness: 220,
      damping: 26,
      mass: 1,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, slotW, indicatorX]);

  const handleTabPress = useCallback((key) => {
    onTabPress(key);

    // Brief glow flash on the pill
    glowOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(glowOpacity, {
        toValue: 1,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(glowOpacity, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start();
  }, [onTabPress, glowOpacity]);

  // ── Draggable indicator ─────────────────────────────────────────
  // Horizontal drags anywhere on the bar grab the glass pill: it rides
  // the finger 1:1 (clamped to the bar), and on release snaps to the
  // nearest tab slot and navigates there. Plain taps still hit the icons
  // — the drag only claims the gesture after clear horizontal movement.
  const indicatorXVal = useRef(0);
  React.useEffect(() => {
    const id = indicatorX.addListener(({ value }) => { indicatorXVal.current = value; });
    return () => indicatorX.removeListener(id);
  }, [indicatorX]);

  const geom = useRef({ slotW: 0, innerW: 0 });
  geom.current = { slotW, innerW };
  const handleTabPressRef = useRef(handleTabPress);
  handleTabPressRef.current = handleTabPress;
  const dragStart = useRef(0);

  // Rubber-band lean: only when the pill is pinned at either end and the
  // finger keeps pulling, the bar shifts (pure translation — never blurs)
  // and the glass shell stretches toward that direction. Gliding inside
  // the track never triggers it.
  const barShiftX = useRef(new Animated.Value(0)).current;
  const shellStretchX = useRef(new Animated.Value(1)).current;
  const OVERPULL_MAX = 70; // px of overpull at which the lean saturates

  const releaseLean = useCallback(() => {
    Animated.spring(barShiftX, { toValue: 0, tension: 300, friction: 10, useNativeDriver: true }).start();
    Animated.spring(shellStretchX, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }).start();
  }, [barShiftX, shellStretchX]);

  const settleDrag = useCallback(() => {
    const { slotW: s } = geom.current;
    releaseLean();
    if (s <= 0) return;
    const idx = Math.min(TABS.length - 1, Math.max(0, Math.round(indicatorXVal.current / s)));
    Animated.spring(indicatorX, {
      toValue: idx * s,
      stiffness: 220,
      damping: 26,
      mass: 1,
      useNativeDriver: true,
    }).start();
    handleTabPressRef.current(TABS[idx].key);
  }, [indicatorX, releaseLean]);

  const dragPan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, { dx, dy }) =>
        Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy) * 1.5,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        indicatorX.stopAnimation();
        dragStart.current = indicatorXVal.current;
      },
      onPanResponderMove: (_, { dx }) => {
        const { slotW: s, innerW: w } = geom.current;
        if (s <= 0) return;
        const desired = dragStart.current + dx;
        const clamped = Math.min(Math.max(desired, 0), w - s);
        indicatorX.setValue(clamped);
        // Overpull past the track ends drives the lean, with diminishing
        // returns: up to ~12px shift and ~5% shell stretch at saturation.
        const over = desired - clamped;
        const t = Math.min(Math.abs(over), OVERPULL_MAX) / OVERPULL_MAX;
        barShiftX.setValue(Math.sign(over) * t * 12);
        shellStretchX.setValue(1 + t * 0.05);
      },
      onPanResponderRelease: settleDrag,
      onPanResponderTerminate: settleDrag,
    })
  ).current;

  return (
    <Animated.View
      ref={tourTargetRef}
      style={[st.pillWrap, {
        opacity: hiddenAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
        transform: [{ translateY: hiddenAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 140] }) }],
      }]}
      pointerEvents={hidden ? 'none' : 'auto'}
      onLayout={onBarLayout}
      onTouchStart={onBarTouchStart}
      onTouchEnd={onBarTouchEnd}
      onTouchCancel={onBarTouchEnd}
      {...dragPan.panHandlers}
    >
      {/* Glass shell — the ONLY layer that scales/stretches. Blur + tint
          carry no fine detail, so transforming them never reads as blur. */}
      <Animated.View
        pointerEvents="none"
        style={[st.shell, {
          transform: [
            { translateX: barShiftX },
            { scale: shellScale },
            { scaleX: shellStretchX },
          ],
        }]}
      >
        <BlurView
          intensity={Platform.OS === 'android' ? 30 : 22}
          tint="light"
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={st.tint} />
        <Animated.View style={[st.glowOverlay, { opacity: glowOpacity }]} pointerEvents="none" />
        <Animated.View style={[st.lightenOverlay, { opacity: barLight }]} pointerEvents="none" />
      </Animated.View>

      {/* Content layer — indicator + icons. Only ever TRANSLATED (the
          lean shift); never scaled, so it stays pixel-sharp always. */}
      <Animated.View style={[st.row, { transform: [{ translateX: barShiftX }] }]}>
        {slotW > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[st.indicator, { width: slotW, transform: [{ translateX: indicatorX }] }]}
          >
            <BlurView
              intensity={18}
              tint="light"
              experimentalBlurMethod="dimezisBlurView"
              style={[StyleSheet.absoluteFill, st.indicatorBlur]}
            />
            <View style={st.indicatorGlass} />
          </Animated.View>
        )}

        {TABS.map((tab) => (
          <TabItem
            key={tab.key}
            tab={tab}
            isActive={activeTab === tab.key}
            onPress={() => handleTabPress(tab.key)}
            badge={tab.key === 'streaks' ? streakCount : 0}
            badgeColor={tab.key === 'streaks' ? streakAccent : undefined}
            tourRef={tab.key === 'streaks' ? streaksTabRef : undefined}
          />
        ))}
      </Animated.View>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  pillWrap: {
    position: 'absolute',
    bottom: 40,
    zIndex: 10,
    alignSelf: 'center',
    width: SCREEN_WIDTH * 0.9,
  },
  shell: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
    overflow: 'hidden',
    shadowColor: colors.orangeDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.40,
    shadowRadius: 24,
    elevation: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(178,58,12,0.42)',
  },
  glowOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 50,
  },
  lightenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 50,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  iconWrap: {
    height: 46,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    left: '52%',
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 20,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.orange,
    borderWidth: 1.5,
    borderColor: colors.orangeDark,
    justifyContent: 'center',
  },
  badgeFlame: {
    marginRight: 1,
  },
  badgeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    color: colors.white,
  },
  // The traveling glass highlight. Sits behind the icons, sized to one
  // tab slot, and springs between slots on tab change.
  indicator: {
    position: 'absolute',
    left: 8,
    top: 5,
    height: 46,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.40)',
    overflow: 'hidden',
  },
  indicatorBlur: {
    borderRadius: 28,
  },
  indicatorGlass: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 28,
  },
});
