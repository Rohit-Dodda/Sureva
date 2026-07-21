import React from 'react';
import { View, Dimensions, Animated, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Defs, RadialGradient, Stop } from 'react-native-svg';
import { accentFor } from '../recapAccent';
import { useEnter, usePulse } from './recapVisualBase';

const W = Dimensions.get('window').width - 60;
const H = 200;
const RAYS = 12;

// Opener: a sun rising over a horizon. The whole sun group (disc + rays)
// translates up and fades in; a soft glow pulses behind it. Static SVG
// geometry, animated only as a group — cheap and robust.
export default React.memo(function SunriseVisual({ accent, active }) {
  const a = accentFor(accent);
  const rise = useEnter(active, { duration: 1100 });
  const pulse = usePulse(active, 2600);

  const cx = W / 2;
  const cy = H - 30;
  const r = 40;

  const rays = [];
  for (let i = 0; i < RAYS; i++) {
    const ang = Math.PI + (i / (RAYS - 1)) * Math.PI;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    rays.push(
      <Line
        key={i}
        x1={cx + dx * (r + 10)} y1={cy + dy * (r + 10)}
        x2={cx + dx * (r + 54)} y2={cy + dy * (r + 54)}
        stroke={a.hero} strokeWidth={3} strokeLinecap="round"
      />
    );
  }

  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [70, 0] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.65] });

  return (
    <View style={{ width: W, height: H, alignSelf: 'center' }}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: glowOpacity }]}>
        <Svg width={W} height={H}>
          <Defs>
            <RadialGradient id="sunGlow" cx="50%" cy={`${(cy / H) * 100}%`} r="45%">
              <Stop offset="0" stopColor={a.hero} stopOpacity="0.6" />
              <Stop offset="1" stopColor={a.hero} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={cx} cy={cy} r={r * 2.4} fill="url(#sunGlow)" />
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: rise, transform: [{ translateY }] }]}>
        <Svg width={W} height={H}>
          {rays}
          <Circle cx={cx} cy={cy} r={r} fill={a.hero} />
        </Svg>
      </Animated.View>
      <View style={[st.horizon, { backgroundColor: a.ray, top: cy + r }]} />
    </View>
  );
});

const st = StyleSheet.create({
  horizon: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
  },
});
