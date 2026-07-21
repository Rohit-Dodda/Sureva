import React from 'react';
import { View, Dimensions } from 'react-native';
import Svg, { Path, Line, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import { accentFor } from '../recapAccent';
import { useEnter, AnimatedPath, AnimatedCircle } from './recapVisualBase';

const W = Dimensions.get('window').width - 60;
const H = 200;

// Riskiest-moment card: a protection curve that starts at 100% and plunges
// through the danger threshold — the line draws itself in and a pulsing
// marker sits at the crash point. The whole story of a bad sun day in one
// falling line.
export default React.memo(function DepletionVisual({ accent, active }) {
  const a = accentFor(accent);
  const enter = useEnter(active, { native: false, duration: 1300 });

  const top = 20;
  const bot = H - 20;
  const threshold = top + (bot - top) * 0.72;

  // A steep depletion: high plateau, then a sharp drop past the threshold.
  const d = `M 0 ${top} L ${W * 0.28} ${top + 12} C ${W * 0.45} ${top + 20}, ${W * 0.5} ${bot - 20}, ${W * 0.72} ${bot - 12} L ${W} ${bot}`;
  const LEN = 900;
  const dashoffset = enter.interpolate({ inputRange: [0, 1], outputRange: [LEN, 0] });
  const crashX = W * 0.6;
  const crashY = bot - 30;
  const haloR = enter.interpolate({ inputRange: [0, 1], outputRange: [0, 15] });

  return (
    <View style={{ width: W, height: H, alignSelf: 'center' }}>
      <Svg width={W} height={H}>
        <Defs>
          <LinearGradient id="depFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={a.hero} stopOpacity="0.28" />
            <Stop offset="1" stopColor={a.hero} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Line x1={0} y1={threshold} x2={W} y2={threshold} stroke={a.hero} strokeWidth={1.5} strokeDasharray="5,5" opacity={0.55} />
        <AnimatedPath
          d={d} stroke={a.hero} strokeWidth={4} fill="none"
          strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray={`${LEN}, ${LEN}`}
          strokeDashoffset={dashoffset}
        />
        <AnimatedCircle cx={crashX} cy={crashY} r={haloR} fill="none" stroke={a.hero} strokeWidth={2} opacity={0.4} />
        <AnimatedCircle cx={crashX} cy={crashY} r={7} fill={a.hero} opacity={enter} />
      </Svg>
    </View>
  );
});
