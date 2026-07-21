import React from 'react';
import { View, Dimensions, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { accentFor } from '../recapAccent';
import { useEnter } from './recapVisualBase';

const W = Dimensions.get('window').width - 60;
const H = 200;
const WIDE = W * 2; // draw wide so sideways drift never reveals an edge

// Water card: layered waves rise to a level and drift sideways forever — the
// fluid counterpart to the harder-edged stat cards.
export default React.memo(function WavesVisual({ accent, active }) {
  const a = accentFor(accent);
  const rise = useEnter(active, { duration: 1100 });
  const drift = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!active) return undefined;
    const loop = Animated.loop(
      Animated.timing(drift, { toValue: 1, duration: 4600, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [active, drift]);

  // One full sine period every W/2 so tiling across WIDE looks continuous.
  const wavePath = (amp, y) => {
    const period = W / 2;
    let d = `M 0 ${y}`;
    for (let x = 0; x <= WIDE; x += period) {
      d += ` q ${period / 4} ${-amp} ${period / 2} 0 q ${period / 4} ${amp} ${period / 2} 0`;
    }
    return `${d} L ${WIDE} ${H} L 0 ${H} Z`;
  };

  const layers = [
    { amp: 15, y: H * 0.5, opacity: 0.32, dist: W * 0.5 },
    { amp: 20, y: H * 0.58, opacity: 0.5, dist: -W * 0.5 },
    { amp: 13, y: H * 0.66, opacity: 0.85, dist: W * 0.5 },
  ];

  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [H * 0.5, 0] });

  return (
    <View style={[st.wrap, { width: W, height: H }]}>
      <Animated.View style={{ flex: 1, transform: [{ translateY }] }}>
        {layers.map((l, i) => {
          const tx = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -l.dist] });
          return (
            <Animated.View key={i} style={[st.layer, { transform: [{ translateX: tx }] }]}>
              <Svg width={WIDE} height={H}>
                <Path d={wavePath(l.amp, l.y)} fill={a.hero} opacity={l.opacity} />
              </Svg>
            </Animated.View>
          );
        })}
      </Animated.View>
    </View>
  );
});

const st = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    borderRadius: 24,
    overflow: 'hidden',
  },
  layer: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
