import React from 'react';
import { View, Dimensions } from 'react-native';
import Svg, { Line, Circle } from 'react-native-svg';
import { accentFor } from '../recapAccent';
import { useEnter, AnimatedCircle, AnimatedLine } from './recapVisualBase';

const W = Dimensions.get('window').width - 60;
const H = 200;

// Correlation card: a scatter of your sessions on a UV × score field with a
// downward trend line drawing through them — the "higher UV, lower scores"
// pattern made literal. Points pop in staggered along the trend.
export default React.memo(function ScatterVisual({ card, accent, active }) {
  const a = accentFor(accent);
  const enter = useEnter(active, { native: false, duration: 1100 });

  const pad = 16;
  const x0 = pad;
  const x1 = W - pad;
  const y0 = pad;
  const y1 = H - pad;

  // Synthetic but plausible downward-trending cloud (UV up → score down).
  const pts = card.points && card.points.length ? card.points : [
    [0.1, 0.2], [0.22, 0.32], [0.35, 0.28], [0.48, 0.5], [0.55, 0.46],
    [0.66, 0.62], [0.74, 0.7], [0.82, 0.66], [0.9, 0.82], [0.95, 0.78],
  ];

  const px = (fx) => x0 + fx * (x1 - x0);
  const py = (fy) => y0 + fy * (y1 - y0); // fy: 0 top(high score) .. 1 bottom

  const lineOffset = enter.interpolate({ inputRange: [0, 1], outputRange: [W, 0] });

  return (
    <View style={{ width: W, height: H, alignSelf: 'center' }}>
      <Svg width={W} height={H}>
        <Line x1={x0} y1={y1} x2={x1} y2={y1} stroke={a.ray} strokeWidth={1.5} />
        <Line x1={x0} y1={y0} x2={x0} y2={y1} stroke={a.ray} strokeWidth={1.5} />
        <AnimatedLine
          x1={px(0.05)} y1={py(0.18)} x2={px(0.95)} y2={py(0.82)}
          stroke={a.hero} strokeWidth={3} strokeLinecap="round"
          strokeDasharray={`${W}, ${W}`} strokeDashoffset={lineOffset}
        />
        {pts.map(([fx, fy], i) => {
          const at = i / pts.length;
          const r = enter.interpolate({ inputRange: [at, Math.min(1, at + 0.12)], outputRange: [0, 6], extrapolate: 'clamp' });
          return <AnimatedCircle key={i} cx={px(fx)} cy={py(fy)} r={r} fill={a.hero} opacity={0.85} />;
        })}
      </Svg>
    </View>
  );
});
