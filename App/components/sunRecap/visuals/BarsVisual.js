import React from 'react';
import { View, Text, Dimensions, Animated, StyleSheet } from 'react-native';
import { accentFor, RECAP_BODY } from '../recapAccent';
import { useEnter } from './recapVisualBase';

const W = Dimensions.get('window').width - 60;
const H = 210;

// Factor / comparison cards: a row of bars that grow from the baseline, the
// dominant one tallest and in the hero color. Data comes from card.bars
// ([{ label, value(0..1), highlight }]); falls back to a sensible demo set.
export default React.memo(function BarsVisual({ card, accent, active }) {
  const a = accentFor(accent);
  const enter = useEnter(active, { native: false, duration: 950 });
  const bars = card.bars && card.bars.length
    ? card.bars
    : [{ label: 'UV', value: 1 }, { label: 'Heat', value: 0.6 }, { label: 'Water', value: 0.4 }, { label: 'Activity', value: 0.3 }];

  const barW = Math.min(58, (W - (bars.length - 1) * 16) / bars.length);
  const maxH = H - 40;
  const dim = a.onDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.16)';
  const anyHighlight = bars.some((b) => b.highlight);

  return (
    <View style={{ width: W, height: H, alignSelf: 'center' }}>
      <View style={st.row}>
        {bars.map((b, i) => {
          const h = enter.interpolate({ inputRange: [0, 1], outputRange: [4, Math.max(8, b.value * maxH)] });
          return (
            <View key={b.label} style={st.col}>
              <Animated.View
                style={{
                  width: barW,
                  height: h,
                  borderRadius: 12,
                  backgroundColor: (anyHighlight ? b.highlight : i === 0) ? a.hero : dim,
                }}
              />
              <Text style={[st.label, { color: a.body }]} numberOfLines={1}>{b.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
});

const st = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  col: {
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontFamily: RECAP_BODY,
    fontSize: 13,
  },
});
