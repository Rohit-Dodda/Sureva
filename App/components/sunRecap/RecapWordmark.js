import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { accentFor, RECAP_DISPLAY } from './recapAccent';
import { useEnter, AnimatedCircle } from './visuals/recapVisualBase';

const SIZE = 96;
const R = 34;
const C = 2 * Math.PI * R;

// The deck's actual signature mark — NOT the generic RecapMotif ribbon-fan
// that decorates every card. A clean sun-ring outline strokes itself on
// (matching the `sun` glyph in recapGlyphs.js, "the recurring hero mark that
// opens and closes the deck"), then the Sureva wordmark fades up beneath it.
// Used only by RecapBookendCard's open/close cards.
export default React.memo(function RecapWordmark({ accent, active }) {
  const a = accentFor(accent);
  const draw = useEnter(active, { native: false, duration: 900, delay: 80 });
  const wordmark = useEnter(active, { native: true, duration: 500, delay: 820 });

  const dashoffset = draw.interpolate({ inputRange: [0, 1], outputRange: [C, 0] });
  const translateY = wordmark.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

  return (
    <View style={st.wrap}>
      <Svg width={SIZE} height={SIZE}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={a.ray} strokeWidth={3} fill="none" />
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          stroke={a.hero}
          strokeWidth={3.5}
          strokeLinecap="round"
          fill="none"
          rotation={-90}
          origin={`${SIZE / 2}, ${SIZE / 2}`}
          strokeDasharray={`${C}, ${C}`}
          strokeDashoffset={dashoffset}
        />
      </Svg>
      <Animated.Text
        style={[
          st.wordmark,
          { color: a.hero, opacity: wordmark, transform: [{ translateY }] },
        ]}
      >
        Sureva
      </Animated.Text>
    </View>
  );
});

const st = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  wordmark: {
    fontFamily: RECAP_DISPLAY,
    fontSize: 22,
    letterSpacing: 1,
    marginTop: 10,
  },
});
