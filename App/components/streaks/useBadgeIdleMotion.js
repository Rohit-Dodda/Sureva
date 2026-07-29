import { useRef, useEffect, useMemo } from 'react';
import { Animated, Easing } from 'react-native';
import { BADGE_MOTION, GRADIENT_DRIFT } from '../../constants/badgeMotion';

// Drives an earned emblem's two idle loops: the illustration's own motion (see
// BADGE_MOTION) and a slow drift of the shape's gradient toward its reverse, so
// the badge reads as catching changing light. Both are transform/opacity only,
// so both run on the native driver.
//
// `active` is false for locked badges — a locked emblem must stay perfectly
// still, and mounting the loops anyway would burn frames for 12 badges the user
// hasn't earned.
export default function useBadgeIdleMotion(icon, active, delay = 0) {
  const motion = BADGE_MOTION[icon];
  const t = useRef(new Animated.Value(0)).current;
  const g = useRef(new Animated.Value(0)).current;

  // Illustration motion. A spin runs one-way and linear; everything else eases
  // back and forth, so it breathes rather than ticks.
  useEffect(() => {
    if (!active || !motion) return undefined;
    const spin = motion.type === 'spin';
    const loop = Animated.loop(
      spin
        ? Animated.timing(t, { toValue: 1, duration: motion.dur, easing: Easing.linear, useNativeDriver: true })
        : Animated.sequence([
          Animated.delay(delay),
          Animated.timing(t, { toValue: 1, duration: motion.dur / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(t, { toValue: 0, duration: motion.dur / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
    );
    loop.start();
    return () => loop.stop();
  }, [t, active, motion, delay]);

  // Gradient drift.
  useEffect(() => {
    if (!active) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(g, { toValue: 1, duration: GRADIENT_DRIFT.dur / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(g, { toValue: 0, duration: GRADIENT_DRIFT.dur / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [g, active, delay]);

  const iconTransform = useMemo(() => {
    if (!active || !motion) return [];
    switch (motion.type) {
      case 'spin':
        return [{ rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }];
      case 'pulse':
        return [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1 + motion.amount] }) }];
      case 'bob':
        return [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [motion.dist, -motion.dist] }) }];
      case 'drift':
        return [{ translateX: t.interpolate({ inputRange: [0, 1], outputRange: [-motion.dist, motion.dist] }) }];
      case 'sway':
        return [{ rotate: t.interpolate({ inputRange: [0, 1], outputRange: [`-${motion.deg}deg`, `${motion.deg}deg`] }) }];
      default:
        return [];
    }
  }, [t, active, motion]);

  const gradientOpacity = useMemo(
    () => (active ? g.interpolate({ inputRange: [0, 1], outputRange: [0, GRADIENT_DRIFT.peak] }) : 0),
    [g, active]
  );

  return { iconTransform, gradientOpacity };
}
