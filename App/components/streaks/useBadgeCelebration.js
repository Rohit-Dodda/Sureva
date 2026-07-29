import { useRef, useState, useEffect, useCallback } from 'react';
import { Animated, Easing } from 'react-native';

const DURATION = 1500;
const RING_FILL_DELAY = 420; // ring starts filling as the lock clears

// The unlock celebration, shared by StreakBadge and AchievementBadge: the lock
// shakes then crumbles, a flash bursts behind the emblem, the rays fan out and
// settle, and the ring fills. Only the interpolations live here — each badge
// renders its own layout with them, since the two cards differ (a streak badge
// has no level pill, an achievement badge does).
//
// `play` is also what a tap calls to replay, and what a LEVEL-UP calls: on an
// achievement, progressing II → III re-runs the same celebration, so advancing
// a tier feels identical to earning the badge in the first place.
export default function useBadgeCelebration(ringTarget, celebrate) {
  const a = useRef(new Animated.Value(celebrate ? 0 : 1)).current;
  const [ringPct, setRingPct] = useState(celebrate ? 0 : ringTarget);
  const timer = useRef(null);

  const play = useCallback(() => {
    a.setValue(0);
    setRingPct(0);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setRingPct(ringTarget), RING_FILL_DELAY);
    Animated.timing(a, {
      toValue: 1,
      duration: DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [a, ringTarget]);

  useEffect(() => {
    if (celebrate) play();
  }, [celebrate, play]);

  // Keep the ring honest if the target changes without a celebration (e.g. the
  // session list reloads and a level recomputes while the card is on screen).
  useEffect(() => {
    if (!celebrate) setRingPct(ringTarget);
  }, [ringTarget, celebrate]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const clamp = 'clamp';
  return {
    play,
    ringPct,
    // Emblem washes in from a dim ghost to full colour as the lock clears.
    emblemOpacity: a.interpolate({ inputRange: [0, 0.5], outputRange: [0.3, 1], extrapolate: clamp }),
    // Lock: shakes, then shrinks, spins, drops and fades.
    lockRotate: a.interpolate({
      inputRange: [0, 0.08, 0.16, 0.24, 0.3, 0.5],
      outputRange: ['0deg', '-9deg', '9deg', '-7deg', '0deg', '55deg'],
      extrapolate: clamp,
    }),
    lockScale: a.interpolate({ inputRange: [0, 0.3, 0.5], outputRange: [1, 1, 0], extrapolate: clamp }),
    lockTranslateY: a.interpolate({ inputRange: [0.3, 0.5], outputRange: [0, 24], extrapolate: clamp }),
    lockOpacity: a.interpolate({ inputRange: [0.3, 0.5], outputRange: [1, 0], extrapolate: clamp }),
    // Flash burst behind the emblem.
    flashOpacity: a.interpolate({ inputRange: [0.35, 0.5, 0.72], outputRange: [0, 0.8, 0], extrapolate: clamp }),
    flashScale: a.interpolate({ inputRange: [0.35, 0.85], outputRange: [0.4, 1.9], extrapolate: clamp }),
    // Rays burst out then settle.
    rayOpacity: a.interpolate({ inputRange: [0.42, 0.62, 1], outputRange: [0, 1, 1], extrapolate: clamp }),
    rayScale: a.interpolate({ inputRange: [0.42, 0.68, 1], outputRange: [0.5, 1.18, 1], extrapolate: clamp }),
    contentOpacity: a.interpolate({ inputRange: [0.5, 0.85], outputRange: [0, 1], extrapolate: clamp }),
    // Card tint fades in with the unlock, so at a=0 the card reads as locked.
    tintOpacity: a,
  };
}
