import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { accentFor, RECAP_BODY } from './recapAccent';
import RecapCardFrame from './RecapCardFrame';
import RecapStagger from './RecapStagger';
import RecapBigValue from './RecapBigValue';
import WordBuildText from './WordBuildText';
import RecapVisual, { VISUAL_OWNS_VALUE } from './visuals/RecapVisual';

// Narrative card: a bespoke animated diagram up top (unique per stat type),
// then the headline / value / supporting line. The headline and caption build
// in word by word; the value flips up on a slot reel. When the visual renders
// the number itself (ring, meter, uv scale), the text below skips it.
export default React.memo(function RecapRevealCard({ card, active }) {
  const a = accentFor(card.accent);
  const ownsValue = VISUAL_OWNS_VALUE.has(card.visual);
  const hasVisual = !!card.visual;
  let beat = 1;

  return (
    <RecapCardFrame accent={card.accent} kicker={card.kicker} active={active} align={hasVisual ? 'top' : 'center'}>
      {hasVisual ? (
        <RecapStagger index={beat++} active={active} style={st.visual}>
          <RecapVisual card={card} active={active} />
        </RecapStagger>
      ) : null}

      {card.headline ? (
        <WordBuildText
          text={card.headline}
          color={ownsValue ? a.body : a.hero}
          size={34}
          lineHeight={39}
          display
          align="left"
          active={active}
          delay={120 + (beat++) * 130}
          style={st.headline}
          textStyle={st.headlineWord}
        />
      ) : null}

      {!ownsValue && card.bigValue ? (
        <RecapStagger index={beat++} active={active}>
          <RecapBigValue value={card.bigValue} color={a.hero} active={active} />
        </RecapStagger>
      ) : null}

      {!ownsValue && card.bigLabel ? (
        <RecapStagger index={beat++} active={active}>
          <Text style={[st.bigLabel, { color: a.body }]}>{card.bigLabel}</Text>
        </RecapStagger>
      ) : null}

      {card.subtext ? (
        <WordBuildText
          text={card.subtext}
          color={a.body}
          size={16}
          lineHeight={23}
          align="left"
          active={active}
          delay={120 + (beat++) * 130}
          style={st.subtext}
        />
      ) : null}
    </RecapCardFrame>
  );
});

const st = StyleSheet.create({
  visual: {
    marginBottom: 22,
  },
  headline: {
    marginBottom: 4,
  },
  headlineWord: {
    letterSpacing: -0.8,
  },
  bigLabel: {
    fontFamily: RECAP_BODY,
    fontSize: 17,
    marginTop: 2,
  },
  subtext: {
    marginTop: 16,
  },
});
