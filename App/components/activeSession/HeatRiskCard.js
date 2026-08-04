import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../../constants/colors';
import CardHeader from '../CardHeader';
import {
  calculateHeatIndex, heatRiskBandFor, HYDRATION_GUIDANCE,
  HEAT_STROKE_WARNING_SIGNS, HEAT_STROKE_ACTION,
} from '../../services/HeatRiskService';

// Green/amber/red reused from the app's non-negotiable protection-status
// tiering, collapsing NWS's 4 named bands (Caution/Extreme Caution/
// Danger/Extreme Danger) onto 3 colors — the band LABEL still carries
// the precise NWS name, color is just the coarse at-a-glance signal.
// Wash + text-color pairing matches the pill convention already used
// elsewhere (WeekForecastStrip, PassportInsightRow, sessionMath's
// statusFor) rather than a flat fill.
function bandTone(key) {
  if (key === 'danger' || key === 'extremeDanger') return { color: colors.danger, wash: colors.redWash };
  if (key === 'caution' || key === 'extremeCaution') return { color: colors.warning, wash: colors.amberWash };
  return { color: colors.protected, wash: colors.greenWash };
}

// Live heat-illness risk, independent of the sunscreen protection ring —
// same live temperature/humidity feed the rest of the session screen
// already reads, run through the civilian NWS Heat Index scale (see
// HeatRiskService.js for why this isn't the engine's WBGT number).
export default React.memo(function HeatRiskCard({ temperature, humidity }) {
  const { heatIndexF } = calculateHeatIndex(temperature, humidity);
  const band = heatRiskBandFor(heatIndexF);
  const tone = bandTone(band.key);
  const severe = band.key === 'danger' || band.key === 'extremeDanger';
  const elevated = severe || band.key === 'caution' || band.key === 'extremeCaution';

  return (
    <View style={st.card}>
      <CardHeader icon="thermometer" title="Heat Risk" />
      <View style={[st.badge, { backgroundColor: tone.wash }]}>
        <View style={[st.dot, { backgroundColor: tone.color }]} />
        <Text style={[st.badgeText, { color: tone.color }]}>{band.label}</Text>
      </View>
      <Text style={st.effect}>{band.effect}</Text>
      {elevated && (
        <View style={st.actionBlock}>
          {severe ? (
            <>
              <Text style={[st.actionTitle, { color: colors.danger }]}>{HEAT_STROKE_ACTION}</Text>
              <View style={st.signsList}>
                {HEAT_STROKE_WARNING_SIGNS.map((sign) => (
                  <Text key={sign} style={st.signText}>{'•'}  {sign}</Text>
                ))}
              </View>
            </>
          ) : (
            <Text style={st.hydration}>{HYDRATION_GUIDANCE}</Text>
          )}
        </View>
      )}
    </View>
  );
});

const st = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginHorizontal: 16,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
  },
  effect: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.muted,
    marginTop: 12,
    lineHeight: 18,
  },
  actionBlock: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 6,
  },
  actionTitle: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    lineHeight: 19,
  },
  signsList: {
    gap: 5,
    marginTop: 2,
  },
  hydration: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.inkMid,
    lineHeight: 19,
  },
  signText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.inkMid,
    lineHeight: 19,
  },
});
