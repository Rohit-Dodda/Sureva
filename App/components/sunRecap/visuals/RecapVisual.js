import React from 'react';
import SunriseVisual from './SunriseVisual';
import RingVisual from './RingVisual';
import BarsVisual from './BarsVisual';
import PathVisual from './PathVisual';
import UVScaleVisual from './UVScaleVisual';
import DepletionVisual from './DepletionVisual';
import BadgeVisual from './BadgeVisual';
import WavesVisual from './WavesVisual';
import ScatterVisual from './ScatterVisual';
import MeterVisual from './MeterVisual';

// Visuals that render the hero number themselves (so the card text should
// NOT also print card.bigValue).
export const VISUAL_OWNS_VALUE = new Set(['ring', 'finale', 'gauge', 'meter', 'percentile', 'uvscale']);

// Dispatches a card to its bespoke animated diagram. Each stat type gets its
// own character; unknown/absent visuals render nothing (the card falls back
// to plain text).
export default React.memo(function RecapVisual({ card, active }) {
  if (!card?.visual) return null;
  const p = { card, accent: card.accent, active };
  switch (card.visual) {
    case 'sunrise': return <SunriseVisual {...p} />;
    case 'ring': return <RingVisual {...p} />;
    case 'gauge': return <RingVisual {...p} />;
    case 'finale': return <RingVisual {...p} burst />;
    case 'bars': return <BarsVisual {...p} />;
    case 'compare': return <BarsVisual {...p} />;
    case 'path': return <PathVisual {...p} />;
    case 'uvscale': return <UVScaleVisual {...p} />;
    case 'depletion': return <DepletionVisual {...p} />;
    case 'badge': return <BadgeVisual {...p} />;
    case 'waves': return <WavesVisual {...p} />;
    case 'scatter': return <ScatterVisual {...p} />;
    case 'meter': return <MeterVisual {...p} />;
    case 'percentile': return <MeterVisual {...p} />;
    default: return null;
  }
});
