import React, { useRef, useEffect } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { accentFor } from './recapAccent';
import RecapCardFrame from './RecapCardFrame';
import WordBuildText from './WordBuildText';
import { glyphPath, GLYPH_VIEWBOX } from './recapGlyphs';

// Anticipation "bridge" between a stat's icon scene and its number reveal.
// The upcoming card's signature glyph pulses at center while a run-up line
// builds in and three dots march — a short held breath before the payoff.
// Auto-advances quickly (card.durationMs) so it never overstays.
const GLYPH = 132;

export default React.memo(function RecapBridgeCard({ card, active }) {
  const a = accentFor(card.accent);
  const d = glyphPath(card.morphIcon) ?? glyphPath('sun');

  const pulse = useRef(new Animated.Value(0)).current;
  const dots = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) { pulse.setValue(0); dots.setValue(0); return undefined; }
    const p = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    const dd = Animated.loop(
      Animated.timing(dots, { toValue: 3, duration: 1200, easing: Easing.linear, useNativeDriver: true }),
    );
    p.start();
    dd.start();
    return () => { p.stop(); dd.stop(); };
  }, [active, pulse, dots]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.06] });
  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });

  return (
    <RecapCardFrame accent={card.accent} kicker={card.kicker} active={active}>
      <View style={st.center}>
        <Animated.View style={{ opacity: glow, transform: [{ scale }] }}>
          <Svg width={GLYPH} height={GLYPH} viewBox={`0 0 ${GLYPH_VIEWBOX} ${GLYPH_VIEWBOX}`}>
            <Path d={d} fill={a.hero} opacity={0.95} />
          </Svg>
        </Animated.View>

        <WordBuildText
          text={card.teaser ?? 'Coming up…'}
          color={a.hero}
          size={24}
          lineHeight={30}
          display
          align="center"
          active={active}
          delay={220}
          style={st.teaser}
          textStyle={st.teaserWord}
        />

        <View style={st.dotsRow}>
          {[0, 1, 2].map((i) => {
            const o = dots.interpolate({
              inputRange: [i, i + 0.5, i + 1, 3],
              outputRange: [0.25, 1, 0.25, 0.25],
              extrapolate: 'clamp',
            });
            return <Animated.View key={i} style={[st.dot, { backgroundColor: a.hero, opacity: o }]} />;
          })}
        </View>
      </View>
    </RecapCardFrame>
  );
});

const st = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teaser: {
    marginTop: 26,
    paddingHorizontal: 16,
  },
  teaserWord: {
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 22,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
