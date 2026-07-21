import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accentFor, RECAP_BODY } from './recapAccent';
import RecapCardFrame from './RecapCardFrame';
import RecapStagger from './RecapStagger';
import RecapBigValue from './RecapBigValue';
import RecapVisual, { VISUAL_OWNS_VALUE } from './visuals/RecapVisual';

// Shake-to-reveal without a native accelerometer (expo-sensors isn't
// installed): the user "shakes" by moving a finger rapidly back and forth.
// We count horizontal direction reversals with real amplitude; a handful
// triggers the reveal and the prompt wiggles as live feedback.
// TODO: upgrade to true device-shake via expo-sensors once available.
const REVERSALS_TO_REVEAL = 5;
const MIN_AMPLITUDE = 14;

export default React.memo(function RecapShakeCard({ card, active, onAnswered }) {
  const a = accentFor(card.accent);
  const [revealed, setRevealed] = useState(false);
  const wiggle = useRef(new Animated.Value(0)).current;
  const dir = useRef(0);
  const lastX = useRef(null);
  const pivotX = useRef(null);
  const reversals = useRef(0);

  useEffect(() => {
    if (!active) { setRevealed(false); reversals.current = 0; }
  }, [active]);

  const doReveal = useCallback(() => {
    if (revealed) return;
    setRevealed(true);
    onAnswered?.();
  }, [revealed, onAnswered]);

  const bump = useCallback((sign) => {
    Animated.sequence([
      Animated.timing(wiggle, { toValue: sign * 9, duration: 55, useNativeDriver: true }),
      Animated.timing(wiggle, { toValue: 0, duration: 85, useNativeDriver: true }),
    ]).start();
  }, [wiggle]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => { lastX.current = e.nativeEvent.pageX; pivotX.current = e.nativeEvent.pageX; dir.current = 0; },
      onPanResponderMove: (e) => {
        if (revealed) return;
        const x = e.nativeEvent.pageX;
        if (lastX.current == null) { lastX.current = x; return; }
        const d = x - lastX.current;
        const nd = d > 0 ? 1 : d < 0 ? -1 : dir.current;
        if (nd !== 0 && dir.current !== 0 && nd !== dir.current) {
          if (Math.abs(x - (pivotX.current ?? x)) >= MIN_AMPLITUDE) {
            reversals.current += 1;
            pivotX.current = x;
            bump(nd);
            if (reversals.current >= REVERSALS_TO_REVEAL) doReveal();
          }
        }
        dir.current = nd;
        lastX.current = x;
      },
      onPanResponderRelease: () => { lastX.current = null; },
    })
  ).current;

  const coverBg = a.onDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)';

  return (
    <RecapCardFrame accent={card.accent} kicker={card.kicker} active={active}>
      <View style={st.stage}>
        {!revealed ? (
          <Animated.View
            style={[st.prompt, { backgroundColor: coverBg, transform: [{ translateX: wiggle }] }]}
            {...pan.panHandlers}
          >
            <Ionicons name="hand-left" size={34} color={a.body} />
            <RecapStagger index={1} active={active}>
              <Text style={[st.promptLabel, { color: a.onDark ? '#fff' : a.hero }]}>{card.coveredLabel ?? 'Shake to reveal'}</Text>
            </RecapStagger>
            <Text style={[st.promptHint, { color: a.body }]}>Swipe back and forth, fast</Text>
          </Animated.View>
        ) : (
          <View>
            {card.visual && VISUAL_OWNS_VALUE.has(card.visual) ? (
              <RecapVisual card={card} active={active} />
            ) : (
              <>
                <RecapBigValue value={card.bigValue} color={a.hero} active={active} />
                {card.bigLabel ? <Text style={[st.bigLabel, { color: a.body }]}>{card.bigLabel}</Text> : null}
              </>
            )}
            {card.subtext ? <Text style={[st.subtext, { color: a.body }]}>{card.subtext}</Text> : null}
          </View>
        )}
      </View>
    </RecapCardFrame>
  );
});

const st = StyleSheet.create({
  stage: {
    minHeight: 230,
    justifyContent: 'center',
  },
  prompt: {
    borderRadius: 24,
    paddingVertical: 44,
    alignItems: 'center',
    gap: 12,
  },
  promptLabel: {
    fontFamily: RECAP_BODY,
    fontSize: 17,
  },
  promptHint: {
    fontFamily: RECAP_BODY,
    fontSize: 13,
    opacity: 0.9,
  },
  bigLabel: {
    fontFamily: RECAP_BODY,
    fontSize: 17,
    marginTop: 2,
  },
  subtext: {
    fontFamily: RECAP_BODY,
    fontSize: 17,
    lineHeight: 24,
    marginTop: 18,
  },
});
