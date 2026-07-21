import React, { useRef, useEffect } from 'react';
import { Animated, View, Dimensions, Easing, StyleSheet } from 'react-native';
import Svg from 'react-native-svg';
import { accentFor } from './recapAccent';
import { useEnter, AnimatedPath } from './visuals/recapVisualBase';

// The recap's signature flourish: a fan of concentric curved ribbons that
// sweep-draw themselves on (stroke by stroke, staggered outward) and, when
// `loop` is set, rotate slowly for ambient life. Used at the deck's open /
// close and at transition boundaries. Colours come entirely from the card's
// accent (hero + ray tint) so the motif re-tints per card.
//
// Two independent drivers: a NON-native value draws the ribbon strokes
// (strokeDashoffset can't run on the native thread), and a native value
// handles the fade + rotate-in and the optional continuous spin.

const DEFAULT_W = Dimensions.get('window').width;
const RIBBONS = 5;

function polar(cx, cy, r, ang) {
  return { x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r };
}

function arcPath(cx, cy, r, a0, a1) {
  const p0 = polar(cx, cy, r, a0);
  const p1 = polar(cx, cy, r, a1);
  const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
  return `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 ${large} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
}

export default React.memo(function RecapMotif({
  accent,
  active,
  width = DEFAULT_W,
  height = 220,
  loop = false,
  spread = 150, // total angular spread of the fan, in degrees
  strokeWidth = 6,
  opacity = 1,
  style,
}) {
  const a = accentFor(accent);
  const draw = useEnter(active, { native: false, duration: 1200, delay: 120 });
  const fade = useEnter(active, { native: true, duration: 700, delay: 0 });

  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active || !loop) { spin.setValue(0); return undefined; }
    const anim = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 16000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [active, loop, spin]);

  const cx = width / 2;
  const cy = height / 2;
  const half = ((spread * Math.PI) / 180) / 2;
  const a0 = -Math.PI / 2 - half; // fan centred on straight up
  const a1 = -Math.PI / 2 + half;

  const baseR = Math.min(width, height) * 0.16;
  const stepR = Math.min(width, height) * 0.062;
  const step = 0.12; // draw-stagger window per ribbon

  const ribbons = [];
  for (let i = 0; i < RIBBONS; i++) {
    const r = baseR + i * stepR;
    const d = arcPath(cx, cy, r, a0, a1);
    const len = r * (a1 - a0);
    const start = i * step;
    const dashoffset = draw.interpolate({
      inputRange: [start, Math.min(1, start + 0.55)],
      outputRange: [len, 0],
      extrapolate: 'clamp',
    });
    const stroke = i % 2 === 0 ? a.hero : a.ray;
    ribbons.push(
      <AnimatedPath
        key={i}
        d={d}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${len.toFixed(2)}, ${len.toFixed(2)}`}
        strokeDashoffset={dashoffset}
        opacity={i % 2 === 0 ? 0.9 : 0.55}
      />,
    );
  }

  const enterRotate = fade.interpolate({ inputRange: [0, 1], outputRange: ['-16deg', '0deg'] });
  const spinRotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const groupOpacity = Animated.multiply(fade, opacity);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        st.wrap,
        { width, height, opacity: groupOpacity, transform: [{ rotate: enterRotate }, { rotate: spinRotate }] },
        style,
      ]}
    >
      <Svg width={width} height={height}>
        {ribbons}
      </Svg>
    </Animated.View>
  );
});

const st = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
