import React from 'react';
import { View, Text, Dimensions, Animated, StyleSheet } from 'react-native';
import Svg, { Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { accentFor, RECAP_DISPLAY, RECAP_BODY } from '../recapAccent';
import { useEnter } from './recapVisualBase';
import colors from '../../../constants/colors';

const W = Dimensions.get('window').width - 60;
const BAR_H = 22;

// UV cards: a green→amber→red UV scale with a pointer that slides up to the
// peak index reached, and the big UV number counting alongside.
export default React.memo(function UVScaleVisual({ card, accent, active }) {
  const a = accentFor(accent);
  const uv = card.uvValue ?? (parseFloat((card.headline || card.bigValue || '').replace(/[^\d.]/g, '')) || 6);
  const frac = Math.max(0, Math.min(1, uv / 11));
  const enter = useEnter(active, { native: false, duration: 1000 });

  const markerLeft = enter.interpolate({ inputRange: [0, 1], outputRange: [0, frac * (W - 22)] });

  return (
    <View style={{ width: W, alignSelf: 'center', paddingVertical: 20 }}>
      <View style={st.numRow}>
        <Text style={[st.uvBig, { color: a.hero }]}>UV {Math.round(uv)}</Text>
      </View>
      <View style={{ height: 26, justifyContent: 'flex-end' }}>
        <Animated.View style={[st.marker, { transform: [{ translateX: markerLeft }] }]}>
          <View style={[st.markerDot, { backgroundColor: a.hero }]} />
          <View style={[st.markerStem, { backgroundColor: a.hero }]} />
        </Animated.View>
      </View>
      <Svg width={W} height={BAR_H}>
        <Defs>
          <LinearGradient id="uvBar" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={colors.protected} />
            <Stop offset="0.45" stopColor={colors.warning} />
            <Stop offset="1" stopColor={colors.danger} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={W} height={BAR_H} rx={BAR_H / 2} fill="url(#uvBar)" />
      </Svg>
      <View style={st.scaleRow}>
        <Text style={[st.tick, { color: a.body }]}>0</Text>
        <Text style={[st.tick, { color: a.body }]}>Low</Text>
        <Text style={[st.tick, { color: a.body }]}>High</Text>
        <Text style={[st.tick, { color: a.body }]}>11+</Text>
      </View>
    </View>
  );
});

const st = StyleSheet.create({
  numRow: { alignItems: 'center', marginBottom: 8 },
  uvBig: {
    fontFamily: RECAP_DISPLAY,
    fontSize: 52,
    letterSpacing: -1,
  },
  marker: { width: 22, alignItems: 'center' },
  markerDot: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 3, borderColor: '#fff',
  },
  markerStem: { width: 3, height: 6 },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  tick: { fontFamily: RECAP_BODY, fontSize: 11, opacity: 0.8 },
});
