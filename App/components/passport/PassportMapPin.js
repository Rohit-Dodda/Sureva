import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../../constants/colors';
import PassportPin from './PassportPin';
import StampBurst from './StampBurst';
import { uvEnvironment } from './passportUtils';

const LABEL_H = 30;
const GAP = 6;
const PIN_WRAP_H = 44; // matches PassportPin's own wrap size

// Reserve the label's space in the marker's layout at all times (only its
// opacity/content toggles) so the pin's map anchor point never shifts —
// otherwise pins would visibly jump when the map expands/collapses.
const TOTAL_H = LABEL_H + GAP + PIN_WRAP_H;
export const MAP_PIN_ANCHOR_X = 0.5;
export const MAP_PIN_ANCHOR_Y = (LABEL_H + GAP + PIN_WRAP_H / 2) / TOTAL_H;

// Marker content for the passport map: the pin dot always, plus — only
// while the map is expanded — a small label card above it naming the
// place, so expanding the map surfaces "little cards on each place" at a
// glance instead of requiring a tap per pin.
export default React.memo(function PassportMapPin({ cluster, count, hasBestSession, expanded, stamping, onStampDone }) {
  const uv = uvEnvironment(cluster.avgPeakUV);
  return (
    <View style={st.wrap}>
      <View style={st.labelSlot}>
        {expanded && (
          <View style={st.label}>
            <Text style={st.labelCity} numberOfLines={1}>{cluster.city}</Text>
            <View style={[st.labelUv, { backgroundColor: uv.color }]}>
              <Text style={st.labelUvText}>{cluster.avgPeakUV}</Text>
            </View>
          </View>
        )}
      </View>
      <View style={st.pinSlot}>
        {stamping && <StampBurst onDone={onStampDone} />}
        <PassportPin count={count} hasBestSession={hasBestSession} />
      </View>
    </View>
  );
});

const st = StyleSheet.create({
  wrap: {
    width: 150,
    alignItems: 'center',
  },
  labelSlot: {
    height: LABEL_H,
    justifyContent: 'center',
    marginBottom: GAP,
  },
  pinSlot: {
    // Sized to PassportPin's own 44×44 wrap, so StampBurst (also 44×44,
    // no explicit offsets) lands exactly over the pin.
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 9,
    paddingVertical: 5,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  labelCity: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 12,
    color: colors.ink,
    maxWidth: 92,
  },
  labelUv: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  labelUvText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 10,
    color: colors.white,
  },
});
