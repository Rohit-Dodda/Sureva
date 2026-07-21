import React from 'react';
import RecapRevealCard from './RecapRevealCard';
import RecapQuizCard from './RecapQuizCard';
import RecapScratchCard from './RecapScratchCard';
import RecapShakeCard from './RecapShakeCard';
import RecapBookendCard from './RecapBookendCard';
import RecapBridgeCard from './RecapBridgeCard';

// Dispatches a card to its mechanic component. The recap data model tags
// each card with a `mechanic`; the interaction implementation lives here so
// the deck orchestrator stays mechanic-agnostic.
export default React.memo(function RecapCard({ card, active, onAnswered }) {
  switch (card.mechanic) {
    case 'quiz':
      return <RecapQuizCard card={card} active={active} onAnswered={onAnswered} />;
    case 'scratch':
      return <RecapScratchCard card={card} active={active} onAnswered={onAnswered} />;
    case 'shake':
      return <RecapShakeCard card={card} active={active} onAnswered={onAnswered} />;
    case 'bookend':
      return <RecapBookendCard card={card} active={active} />;
    case 'bridge':
      return <RecapBridgeCard card={card} active={active} />;
    default:
      return <RecapRevealCard card={card} active={active} />;
  }
});
