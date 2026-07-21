import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { accentFor, RECAP_BODY } from './recapAccent';
import RecapDecor from './RecapDecor';
import RecapWordmark from './RecapWordmark';
import RecapStagger from './RecapStagger';
import WordBuildText from './WordBuildText';
import RecapBigValue from './RecapBigValue';

// The deck's bookends. The signature mark draws itself in, a title card lands
// word by word, then a personalized line. The `close` variant mirrors the
// `open` variant and adds the chapter's average score on a slot reel — the
// same mark opening and closing the story.
export default React.memo(function RecapBookendCard({ card, active }) {
  const a = accentFor(card.accent);
  const isClose = card.kind === 'close';

  return (
    <View style={st.fill}>
      <LinearGradient colors={a.gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      <RecapDecor ray={a.ray} active={active} />

      <View style={st.content}>
        {card.kicker ? (
          <RecapStagger index={0} active={active}>
            <Text style={[st.kicker, { color: a.kicker }]}>{card.kicker}</Text>
          </RecapStagger>
        ) : null}

        <View style={st.center}>
          <RecapWordmark accent={card.accent} active={active} />

          {card.title ? (
            <WordBuildText
              text={card.title}
              color={a.hero}
              size={40}
              lineHeight={44}
              display
              align="center"
              active={active}
              delay={1400}
              style={st.title}
              textStyle={st.titleWord}
            />
          ) : null}

          {isClose && card.bigValue ? (
            <RecapStagger index={15} active={active} style={st.score}>
              <RecapBigValue value={card.bigValue} color={a.hero} active={active} />
              {card.bigLabel ? <Text style={[st.bigLabel, { color: a.body }]}>{card.bigLabel}</Text> : null}
            </RecapStagger>
          ) : null}

          {card.headline ? (
            <WordBuildText
              text={card.headline}
              color={isClose ? a.hero : a.body}
              size={isClose ? 26 : 22}
              lineHeight={isClose ? 30 : 28}
              display={isClose}
              align="center"
              active={active}
              delay={2000}
              style={st.headline}
            />
          ) : null}

          {card.subtext ? (
            <WordBuildText
              text={card.subtext}
              color={a.body}
              size={15}
              lineHeight={22}
              align="center"
              active={active}
              delay={2250}
              style={st.subtext}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
});

const st = StyleSheet.create({
  fill: {
    flex: 1,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 108,
    paddingBottom: 120,
  },
  kicker: {
    fontFamily: RECAP_BODY,
    fontSize: 13,
    letterSpacing: 3,
    textAlign: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 8,
    paddingHorizontal: 10,
  },
  titleWord: {
    letterSpacing: -1,
    textAlign: 'center',
  },
  score: {
    alignItems: 'center',
    marginTop: 14,
  },
  bigLabel: {
    fontFamily: RECAP_BODY,
    fontSize: 15,
    marginTop: 2,
    textAlign: 'center',
  },
  headline: {
    marginTop: 12,
    paddingHorizontal: 10,
  },
  subtext: {
    marginTop: 12,
    paddingHorizontal: 20,
  },
});
