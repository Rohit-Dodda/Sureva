import React, { useMemo, useEffect } from 'react';
import { Animated, View, StyleSheet, Easing } from 'react-native';
import { RECAP_DISPLAY } from './recapAccent';

// A slot-machine-style number reveal. Each digit of `value` is its own reel
// that spins through a run of random digits before snapping onto its real
// value; reels land left-to-right on a per-column stagger. Non-digit glyphs
// (%, commas, decimal points, prefixes) render as static single-tile columns
// so mixed strings like "1,280", "80%" or "3.5h" stay aligned.
//
// While inactive each reel rests on its final glyph, so the true number shows
// even if the entrance animation never runs (graceful degradation).

function makeReel(target, spins) {
  const glyphs = [];
  for (let i = 0; i < spins; i++) glyphs.push(String(Math.floor(Math.random() * 10)));
  glyphs.push(String(target));
  return glyphs;
}

export default React.memo(function SlotNumberReveal({
  value,
  color,
  size = 72,
  active,
  spins = 12,
  duration = 900,
  stagger = 90,
  delay = 0,
  style,
}) {
  const text = String(value ?? '');
  const tileH = Math.round(size * 1.12);
  const digitW = Math.round(size * 0.62);
  const punctW = Math.round(size * 0.34);

  // One column descriptor per character. Digits get a spinning reel; every
  // other glyph is a single-tile "reel" so the same transform maths applies.
  const columns = useMemo(() => {
    const chars = text.split('');
    // Later digits spin a touch longer for a cascading slot-reel feel.
    let digitSeen = 0;
    return chars.map((ch) => {
      const isDigit = ch >= '0' && ch <= '9';
      if (isDigit) {
        const glyphs = makeReel(ch, spins + digitSeen * 3);
        digitSeen += 1;
        return { ch, isDigit: true, glyphs, width: digitW };
      }
      return { ch, isDigit: false, glyphs: [ch], width: punctW };
    });
  }, [text, spins, digitW, punctW]);

  // A stable Animated.Value per column (0 = top/random, 1 = landed on target).
  const anims = useMemo(
    () => columns.map(() => new Animated.Value(active ? 1 : 0)),
    [columns], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    if (!active) {
      anims.forEach((v) => v.setValue(1));
      return undefined;
    }
    let col = 0;
    const runs = columns.map((c, i) => {
      anims[i].setValue(0);
      if (!c.isDigit) return null; // static glyph, nothing to spin
      const d = delay + col * stagger;
      col += 1;
      return Animated.timing(anims[i], {
        toValue: 1,
        duration,
        delay: d,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
    }).filter(Boolean);
    const group = Animated.parallel(runs);
    group.start();
    return () => group.stop();
  }, [active, columns, anims, duration, stagger, delay]);

  return (
    <View style={[st.row, style]}>
      {columns.map((c, i) => {
        const translateY = anims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [0, -(c.glyphs.length - 1) * tileH],
        });
        return (
          <View key={i} style={{ width: c.width, height: tileH, overflow: 'hidden' }}>
            <Animated.View style={{ transform: [{ translateY }] }}>
              {c.glyphs.map((g, gi) => (
                <Animated.Text
                  key={gi}
                  style={[
                    st.glyph,
                    { color, fontSize: size, height: tileH, lineHeight: tileH },
                  ]}
                >
                  {g}
                </Animated.Text>
              ))}
            </Animated.View>
          </View>
        );
      })}
    </View>
  );
});

const st = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  glyph: {
    fontFamily: RECAP_DISPLAY,
    textAlign: 'center',
    letterSpacing: -1,
  },
});
