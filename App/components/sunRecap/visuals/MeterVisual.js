import React from 'react';
import { View, Text, Dimensions, Animated, StyleSheet } from 'react-native';
import { accentFor, RECAP_DISPLAY, RECAP_BODY } from '../recapAccent';
import { useEnter } from './recapVisualBase';
import RecapBigValue from '../RecapBigValue';

const W = Dimensions.get('window').width - 60;

// Time / percentile cards: a big counting value over a chunky horizontal
// meter that fills to a proportion. Segment ticks give it a gauge feel.
export default React.memo(function MeterVisual({ card, accent, active }) {
  const a = accentFor(accent);
  const enter = useEnter(active, { native: false, duration: 1000 });
  const frac = clampFrac(card.meterFrac);
  const fillW = enter.interpolate({ inputRange: [0, 1], outputRange: ['4%', `${Math.max(6, frac * 100)}%`] });
  const trackBg = a.onDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)';

  return (
    <View style={{ width: W, alignSelf: 'center', paddingVertical: 8 }}>
      <RecapBigValue value={card.bigValue} color={a.hero} active={active} size={72} />
      {card.bigLabel ? <Text style={[st.label, { color: a.body }]}>{card.bigLabel}</Text> : null}
      <View style={[st.track, { backgroundColor: trackBg }]}>
        <Animated.View style={[st.fill, { width: fillW, backgroundColor: a.hero }]} />
        <View style={st.ticks} pointerEvents="none">
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={[st.tick, { backgroundColor: a.gradient[1], opacity: 0.25 }]} />
          ))}
        </View>
      </View>
    </View>
  );
});

function clampFrac(f) {
  if (typeof f !== 'number' || Number.isNaN(f)) return 0.6;
  return Math.max(0, Math.min(1, f));
}

const st = StyleSheet.create({
  label: {
    fontFamily: RECAP_BODY,
    fontSize: 17,
    marginTop: 2,
    marginBottom: 18,
  },
  track: {
    height: 26,
    borderRadius: 13,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    right: undefined,
    borderRadius: 13,
  },
  ticks: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  tick: {
    width: 2,
    height: 12,
    borderRadius: 1,
  },
});
