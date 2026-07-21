import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressableScale from '../PressableScale';
import { accentFor, RECAP_DISPLAY, RECAP_BODY } from './recapAccent';
import RecapCardFrame from './RecapCardFrame';
import RecapStagger from './RecapStagger';
import RecapVisual from './visuals/RecapVisual';

// Guess-about-yourself. Pick before the truth shows; a wrong pick is a
// playful reveal, never a scolding. The chosen option animates to its
// correct/incorrect state and the answer springs in.
export default React.memo(function RecapQuizCard({ card, active, onAnswered }) {
  const a = accentFor(card.accent);
  const [picked, setPicked] = useState(null);
  const reveal = useRef(new Animated.Value(0)).current;

  const choose = useCallback((value) => {
    if (picked != null) return;
    setPicked(value);
    onAnswered?.();
    Animated.spring(reveal, { toValue: 1, tension: 80, friction: 9, useNativeDriver: true }).start();
  }, [picked, onAnswered, reveal]);

  useEffect(() => { if (!active) { setPicked(null); reveal.setValue(0); } }, [active, reveal]);

  const answered = picked != null;
  const correct = answered && picked === card.correctValue;
  const revealScale = reveal.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });

  const textDim = a.onDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.10)';
  const textBorder = a.onDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.18)';

  return (
    <RecapCardFrame accent={card.accent} kicker={card.kicker} active={active}>
      <RecapStagger index={1} active={active}>
        <Text style={[st.question, { color: a.onDark ? '#fff' : a.hero }]}>{card.question}</Text>
      </RecapStagger>

      {!answered ? (
        <View style={st.options}>
          {card.options.map((opt, i) => (
            <RecapStagger key={opt.value} index={2 + i} active={active}>
              <PressableScale
                style={[st.option, { backgroundColor: textDim, borderColor: textBorder }]}
                scaleTo={0.97}
                onPress={() => choose(opt.value)}
              >
                <Text style={[st.optionText, { color: a.onDark ? '#fff' : a.hero }]}>{opt.label}</Text>
              </PressableScale>
            </RecapStagger>
          ))}
        </View>
      ) : (
        <Animated.View style={{ opacity: reveal, transform: [{ scale: revealScale }] }}>
          {card.visual ? <RecapVisual card={card} active={answered} /> : null}
          <View style={st.resultRow}>
            <View style={[st.badge, { backgroundColor: a.hero }]}>
              <Ionicons name={correct ? 'checkmark' : 'sparkles'} size={20} color={a.gradient[1]} />
            </View>
            <Text style={[st.resultTitle, { color: a.onDark ? '#fff' : a.hero }]}>
              {correct ? 'Nailed it' : 'Not quite'}
            </Text>
          </View>
          <Text style={[st.revealText, { color: a.body }]}>{card.revealText}</Text>
        </Animated.View>
      )}
    </RecapCardFrame>
  );
});

const st = StyleSheet.create({
  question: {
    fontFamily: RECAP_DISPLAY,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.6,
    marginBottom: 26,
  },
  options: {
    gap: 12,
  },
  option: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  optionText: {
    fontFamily: RECAP_BODY,
    fontSize: 18,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTitle: {
    fontFamily: RECAP_DISPLAY,
    fontSize: 28,
    letterSpacing: -0.5,
  },
  revealText: {
    fontFamily: RECAP_BODY,
    fontSize: 18,
    lineHeight: 25,
  },
});
