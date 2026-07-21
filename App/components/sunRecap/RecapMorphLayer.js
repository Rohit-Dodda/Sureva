import React, { useRef, useEffect } from 'react';
import { Animated, Dimensions, StyleSheet } from 'react-native';
import Svg from 'react-native-svg';
import { accentFor } from './recapAccent';
import { MorphPath } from './visuals/morph';
import { glyphPath, GLYPH_VIEWBOX } from './recapGlyphs';

// Transition flourish: at a card change, the outgoing card's signature glyph
// reshapes into the incoming card's glyph on a shared timeline, then fades —
// so icons appear to carry over and transform rather than hard-cut. Mounted
// keyed by index in the player, so it plays once per transition. Purely
// decorative and non-interactive.
const { height: SCREEN_H } = Dimensions.get('window');
const SIZE = 96;

export default React.memo(function RecapMorphLayer({ from, to }) {
  const fromName = from?.morphIcon;
  const toName = to?.morphIcon;
  const fromD = glyphPath(fromName);
  const toD = glyphPath(toName);

  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!fromD || !toD || fromName === toName) return undefined;
    t.setValue(0);
    const anim = Animated.timing(t, {
      toValue: 1,
      duration: 560,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [fromD, toD, fromName, toName, t]);

  // Nothing to morph between (deck edge, or the glyph didn't change).
  if (!fromD || !toD || fromName === toName) return null;

  const fill = accentFor(to?.accent).hero;
  const opacity = t.interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 1, 1, 0] });
  const scale = t.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1.08] });

  return (
    <Animated.View pointerEvents="none" style={[st.wrap, { opacity, transform: [{ scale }] }]}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${GLYPH_VIEWBOX} ${GLYPH_VIEWBOX}`}>
        <MorphPath from={fromD} to={toD} progress={t} fill={fill} />
      </Svg>
    </Animated.View>
  );
});

const st = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: SCREEN_H * 0.16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
