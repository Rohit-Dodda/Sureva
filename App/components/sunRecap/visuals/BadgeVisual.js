import React from 'react';
import { View, Dimensions, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { accentFor } from '../recapAccent';
import { useEnter } from './recapVisualBase';

const W = Dimensions.get('window').width - 60;
const H = 200;
const SIZE = 168;

// Personality card: a spiky sunburst emblem that scales in and slowly spins,
// with a character icon in the middle — a "badge" for who you were this
// chapter.
export default React.memo(function BadgeVisual({ card, accent, active }) {
  const a = accentFor(accent);
  const enter = useEnter(active, { duration: 800 });
  const spin = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!active) return undefined;
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 24000, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [active, spin]);

  const cx = SIZE / 2;
  const N = 16;
  const outer = SIZE / 2;
  const inner = SIZE / 2 - 26;
  let pts = '';
  for (let i = 0; i < N * 2; i++) {
    const ang = (i / (N * 2)) * Math.PI * 2;
    const rad = i % 2 === 0 ? outer : inner;
    pts += `${cx + Math.cos(ang) * rad},${cx + Math.sin(ang) * rad} `;
  }

  const scale = enter.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const icon = card.icon ?? 'person';

  return (
    <View style={{ width: W, height: H, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ opacity: enter, transform: [{ scale }, { rotate }] }}>
        <Svg width={SIZE} height={SIZE}>
          <Polygon points={pts.trim()} fill={a.hero} opacity={0.9} />
        </Svg>
      </Animated.View>
      <Animated.View style={[st.iconWrap, { opacity: enter, transform: [{ scale }] }]}>
        <Ionicons name={icon} size={54} color={a.gradient[1]} />
      </Animated.View>
    </View>
  );
});

const st = StyleSheet.create({
  iconWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
