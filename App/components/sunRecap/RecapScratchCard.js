import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accentFor, RECAP_BODY } from './recapAccent';
import RecapCardFrame from './RecapCardFrame';
import RecapStagger from './RecapStagger';
import RecapBigValue from './RecapBigValue';
import RecapVisual, { VISUAL_OWNS_VALUE } from './visuals/RecapVisual';

// The revealed value sits underneath a scratch cover. Dragging across the
// cover accumulates distance; enough of it fades the cover away and the
// number counts up. Not a per-pixel mask — a distance-threshold reveal that
// reads as scratching, with a subtle live fade as you go.
const SCRATCH_TARGET = 850;

export default React.memo(function RecapScratchCard({ card, active, onAnswered }) {
  const a = accentFor(card.accent);
  const coverOpacity = useRef(new Animated.Value(1)).current;
  const [revealed, setRevealed] = useState(false);
  const distance = useRef(0);
  const last = useRef(null);

  useEffect(() => {
    if (!active) { setRevealed(false); distance.current = 0; coverOpacity.setValue(1); }
  }, [active, coverOpacity]);

  const finish = useCallback(() => {
    if (revealed) return;
    setRevealed(true);
    onAnswered?.();
    Animated.timing(coverOpacity, { toValue: 0, duration: 340, useNativeDriver: true }).start();
  }, [revealed, coverOpacity, onAnswered]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => { last.current = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY }; },
      onPanResponderMove: (e) => {
        const { locationX: x, locationY: y } = e.nativeEvent;
        if (last.current) {
          distance.current += Math.hypot(x - last.current.x, y - last.current.y);
          coverOpacity.setValue(1 - Math.min(1, distance.current / SCRATCH_TARGET) * 0.85);
          if (distance.current >= SCRATCH_TARGET) finish();
        }
        last.current = { x, y };
      },
      onPanResponderRelease: () => {
        last.current = null;
        if (distance.current >= SCRATCH_TARGET * 0.55) finish();
        else Animated.timing(coverOpacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      },
    })
  ).current;

  const coverBg = a.onDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)';

  return (
    <RecapCardFrame accent={card.accent} kicker={card.kicker} active={active}>
      <View style={st.stage}>
        <View style={st.revealLayer} pointerEvents="none">
          {card.visual && VISUAL_OWNS_VALUE.has(card.visual) ? (
            <RecapVisual card={card} active={active && revealed} />
          ) : (
            <>
              <RecapBigValue value={card.bigValue} color={a.hero} active={active && revealed} />
              {card.bigLabel ? <Text style={[st.bigLabel, { color: a.body }]}>{card.bigLabel}</Text> : null}
            </>
          )}
          {revealed && card.subtext ? <Text style={[st.subtext, { color: a.body }]}>{card.subtext}</Text> : null}
        </View>
        {!revealed && (
          <Animated.View style={[st.cover, { opacity: coverOpacity, backgroundColor: coverBg }]} {...pan.panHandlers}>
            <Ionicons name="finger-print" size={30} color={a.body} />
            <RecapStagger index={1} active={active}>
              <Text style={[st.coverLabel, { color: a.body }]}>{card.coveredLabel ?? 'Scratch to reveal'}</Text>
            </RecapStagger>
          </Animated.View>
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
  revealLayer: { justifyContent: 'center' },
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
  cover: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  coverLabel: {
    fontFamily: RECAP_BODY,
    fontSize: 15,
  },
});
