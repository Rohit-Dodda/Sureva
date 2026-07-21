import React, { useMemo, useEffect } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { RECAP_DISPLAY, RECAP_BODY } from './recapAccent';

// Text that builds in one word at a time: each word fades up from slightly
// below on a staggered delay, so a headline or caption assembles itself
// rather than appearing all at once. Words wrap naturally; spacing between
// them is preserved by trailing each word with a space.
//
// `display` swaps the body font (Outfit) for the big display face
// (SpaceGrotesk) for punchy short lines.

export default React.memo(function WordBuildText({
  text,
  color,
  size = 20,
  active,
  display = false,
  weight = '400',
  lineHeight,
  align = 'center',
  delay = 120,
  stagger = 70,
  duration = 420,
  rise = 12,
  style,
  textStyle,
}) {
  const words = useMemo(() => String(text ?? '').split(/\s+/).filter(Boolean), [text]);

  const anims = useMemo(
    () => words.map(() => new Animated.Value(active ? 1 : 0)),
    [words], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    if (!active) {
      anims.forEach((v) => v.setValue(0));
      return undefined;
    }
    anims.forEach((v) => v.setValue(0));
    const group = Animated.stagger(
      stagger,
      anims.map((v) =>
        Animated.timing(v, {
          toValue: 1,
          duration,
          delay,
          useNativeDriver: true,
        }),
      ),
    );
    group.start();
    return () => group.stop();
  }, [active, anims, stagger, duration, delay]);

  const justify =
    align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';

  return (
    <View style={[st.row, { justifyContent: justify }, style]}>
      {words.map((w, i) => {
        const translateY = anims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [rise, 0],
        });
        return (
          <Animated.Text
            key={`${w}-${i}`}
            style={[
              {
                fontFamily: display ? RECAP_DISPLAY : RECAP_BODY,
                fontWeight: weight,
                fontSize: size,
                lineHeight: lineHeight ?? Math.round(size * 1.3),
                color,
                opacity: anims[i],
                transform: [{ translateY }],
              },
              textStyle,
            ]}
          >
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </Animated.Text>
        );
      })}
    </View>
  );
});

const st = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
});
