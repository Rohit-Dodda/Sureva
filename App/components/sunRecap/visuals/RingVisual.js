import React from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import Svg, { Circle, Polygon, G } from 'react-native-svg';
import { accentFor, RECAP_DISPLAY, RECAP_BODY } from '../recapAccent';
import { useEnter, AnimatedCircle } from './recapVisualBase';
import RecapBigValue from '../RecapBigValue';

const W = Dimensions.get('window').width - 60;
const SIZE = 200;
const STROKE = 14;
const R = (SIZE - STROKE) / 2 - 8;
const C = 2 * Math.PI * R;

// Score cards: a circular gauge that sweeps to the value with the number
// counting up in the center. `burst` adds a spiky sunburst behind it for the
// finale badge moment.
export default React.memo(function RingVisual({ card, accent, active, burst }) {
  const a = accentFor(accent);
  const pct = Math.max(0, Math.min(100, parseFloat(card.bigValue) || 0));
  const enter = useEnter(active, { native: false, duration: 1100 });
  const cx = SIZE / 2;
  const cy = SIZE / 2;

  const dashoffset = enter.interpolate({ inputRange: [0, 1], outputRange: [C, C * (1 - pct / 100)] });
  const trackColor = a.onDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)';

  const spikes = [];
  if (burst) {
    const N = 24;
    const outer = SIZE / 2 + 14;
    const inner = SIZE / 2 - 2;
    let pts = '';
    for (let i = 0; i < N * 2; i++) {
      const ang = (i / (N * 2)) * Math.PI * 2;
      const rad = i % 2 === 0 ? outer : inner;
      pts += `${cx + Math.cos(ang) * rad},${cy + Math.sin(ang) * rad} `;
    }
    spikes.push(<Polygon key="b" points={pts.trim()} fill={a.hero} opacity={0.22} />);
  }

  return (
    <View style={{ width: W, height: SIZE, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={SIZE} height={SIZE}>
        {spikes}
        <Circle cx={cx} cy={cy} r={R} stroke={trackColor} strokeWidth={STROKE} fill="none" />
        <G rotation="-90" origin={`${cx}, ${cy}`}>
          <AnimatedCircle
            cx={cx} cy={cy} r={R}
            stroke={a.hero} strokeWidth={STROKE} fill="none"
            strokeLinecap="round"
            strokeDasharray={`${C}, ${C}`}
            strokeDashoffset={dashoffset}
          />
        </G>
      </Svg>
      <View style={st.center} pointerEvents="none">
        <RecapBigValue value={String(Math.round(pct))} color={a.hero} size={58} active={active} />
        {card.bigLabel ? <Text style={[st.label, { color: a.body }]}>{card.bigLabel}</Text> : null}
      </View>
    </View>
  );
});

const st = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: RECAP_BODY,
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
    maxWidth: 120,
  },
});
