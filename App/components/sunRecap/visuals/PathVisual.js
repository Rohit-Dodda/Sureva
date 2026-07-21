import React from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { accentFor, RECAP_BODY } from '../recapAccent';
import { useEnter, AnimatedPath, AnimatedCircle } from './recapVisualBase';

const W = Dimensions.get('window').width - 60;
const H = 200;

// Places card: a travel route — location nodes along a dashed zig-zag path
// that draws itself in, with each pin lighting up as the line reaches it.
export default React.memo(function PathVisual({ card, accent, active }) {
  const a = accentFor(accent);
  const enter = useEnter(active, { native: false, duration: 1200 });
  const places = (card.places && card.places.length ? card.places : ['Here', 'There', 'Away']).slice(0, 4);
  const n = places.length;

  const nodes = places.map((name, i) => ({
    name,
    x: n === 1 ? W / 2 : 24 + (i / (n - 1)) * (W - 48),
    y: H / 2 - 26 + (i % 2 === 0 ? -34 : 34),
  }));

  let d = `M ${nodes[0].x} ${nodes[0].y}`;
  for (let i = 1; i < nodes.length; i++) {
    const px = (nodes[i - 1].x + nodes[i].x) / 2;
    d += ` C ${px} ${nodes[i - 1].y}, ${px} ${nodes[i].y}, ${nodes[i].x} ${nodes[i].y}`;
  }
  const LEN = 1400;
  const dashoffset = enter.interpolate({ inputRange: [0, 1], outputRange: [LEN, 0] });

  return (
    <View style={{ width: W, height: H + 30, alignSelf: 'center' }}>
      <Svg width={W} height={H}>
        <AnimatedPath
          d={d} stroke={a.hero} strokeWidth={3} fill="none"
          strokeDasharray="2, 9" strokeLinecap="round"
          strokeDashoffset={dashoffset}
        />
        {nodes.map((node, i) => {
          const at = i / Math.max(1, n - 1);
          const r = enter.interpolate({ inputRange: [Math.max(0, at - 0.15), at + 0.02], outputRange: [0, 11], extrapolate: 'clamp' });
          return (
            <React.Fragment key={i}>
              <AnimatedCircle cx={node.x} cy={node.y} r={r} fill={a.hero} />
              <Circle cx={node.x} cy={node.y} r={4} fill={a.gradient[1]} />
            </React.Fragment>
          );
        })}
      </Svg>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {nodes.map((node, i) => (
          <Text
            key={i}
            style={[st.pin, { color: a.body, left: node.x - 50, top: node.y + 16, textAlign: 'center' }]}
            numberOfLines={1}
          >
            {node.name}
          </Text>
        ))}
      </View>
    </View>
  );
});

const st = StyleSheet.create({
  pin: {
    position: 'absolute',
    width: 100,
    fontFamily: RECAP_BODY,
    fontSize: 12,
  },
});
