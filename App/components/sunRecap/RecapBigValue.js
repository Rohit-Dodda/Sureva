import React, { useRef, useEffect } from 'react';
import { Animated } from 'react-native';
import { RECAP_DISPLAY } from './recapAccent';
import SlotNumberReveal from './SlotNumberReveal';

// A recap's hero number. Any value containing a digit ("80%", "UV 11",
// "19.8", "3h 25m") flips up on a slot-machine reel via SlotNumberReveal.
// Pure-text values (a badge name, a tier) spring in whole instead.
const HAS_DIGIT = /\d/;

export default React.memo(function RecapBigValue({ value, color, size = 88, active }) {
  const text = typeof value === 'string' ? value : String(value ?? '');
  const numeric = HAS_DIGIT.test(text);

  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active || numeric) return undefined;
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, tension: 90, friction: 8, useNativeDriver: true }).start();
    return undefined;
  }, [active, numeric, pop, value]);

  if (numeric) {
    // Reels don't auto-shrink, so ease the glyph size down for longer strings
    // ("3h 25m") to keep the row inside the card.
    const eff = text.length <= 4 ? size : Math.max(44, Math.round((size * 4.5) / text.length));
    return <SlotNumberReveal value={text} color={color} size={eff} active={active} />;
  }

  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
  return (
    <Animated.Text
      style={{
        fontFamily: RECAP_DISPLAY,
        fontSize: size,
        lineHeight: size * 1.02,
        color,
        letterSpacing: -1.5,
        opacity: pop,
        transform: [{ scale }],
      }}
      numberOfLines={1}
      adjustsFontSizeToFit
    >
      {text}
    </Animated.Text>
  );
});
