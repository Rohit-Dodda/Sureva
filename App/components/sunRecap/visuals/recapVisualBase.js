import { useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';
import { Path, Circle, Rect, Line, Polygon, G } from 'react-native-svg';

// Shared entrance driver for every bespoke card visual: a 0→1 Animated.Value
// that runs (with a small delay so it follows the card's text stagger) each
// time the card becomes active.
export function useEnter(active, { delay = 260, duration = 900, native = true } = {}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) { v.setValue(0); return undefined; }
    v.setValue(0);
    const a = Animated.timing(v, {
      toValue: 1, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: native,
    });
    a.start();
    return () => a.stop();
  }, [active, v, delay, duration, native]);
  return v;
}

// A looping 0→1→0 pulse for ambient life (glows, bobbing markers).
export function usePulse(active, period = 2200) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) return undefined;
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: period / 2, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: period / 2, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    a.start();
    return () => a.stop();
  }, [active, v, period]);
  return v;
}

export const AnimatedPath = Animated.createAnimatedComponent(Path);
export const AnimatedCircle = Animated.createAnimatedComponent(Circle);
export const AnimatedRect = Animated.createAnimatedComponent(Rect);
export const AnimatedLine = Animated.createAnimatedComponent(Line);
export const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);
export const AnimatedG = Animated.createAnimatedComponent(G);
