import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SectionCard from '../SectionCard';
import ProgressRing from '../ProgressRing';
import colors from '../../constants/colors';

const RING_SIZE = 130;
const RING_STROKE = 12;

// Same non-negotiable protection-status tiering used everywhere else in
// the app, inverted: for burn dose HIGHER is worse, so green/amber/red
// climb the opposite direction from ProtectionGauge's "remaining"
// framing. Gradient pairs match the ones already used by ExposureBattery
// and ProtectionGauge, not reinvented.
function burnColor(pct) {
  if (pct >= 100) return colors.danger;
  if (pct >= 60) return colors.warning;
  return colors.protected;
}
function burnGradient(pct) {
  if (pct >= 100) return ['#F0654D', '#DD3220'];
  if (pct >= 60) return ['#F8B84E', '#EE8C0A'];
  return [colors.gradGreenStart, colors.gradGreenEnd];
}

const BurnRing = React.memo(function BurnRing({ label, pct }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const color = burnColor(clamped);
  return (
    <View style={st.ringWrap}>
      <ProgressRing
        percent={clamped}
        size={RING_SIZE}
        strokeWidth={RING_STROKE}
        color={color}
        gradient={burnGradient(clamped)}
        trackColor={colors.surface}
      >
        <Text style={[st.ringPct, { color }]}>{Math.round(clamped)}%</Text>
      </ProgressRing>
      <Text style={st.ringLabel}>{label}</Text>
    </View>
  );
});

// Weekly budget moved to Home's "Today's Protection" card, gated on a
// real week of history — see HomeScreen's computeWeeklyBurnDose. Session
// Detail only ever describes one already-finished session, so a
// same-session "this week" number never made sense here anyway.
export default React.memo(function BurnTrackerCard({ med, burnPeak }) {
  if (!med) return null;
  const todayPct = Math.min(100, (med.accumulated / med.threshold) * 100);

  return (
    <SectionCard icon="flame-outline" title="Burn Tracker">
      <View style={st.ringsRow}>
        <BurnRing label="Today" pct={todayPct} />
      </View>

      <View style={st.notes}>
        <Text style={st.doseNote}>{med.line}</Text>
      </View>

      {burnPeak ? (
        <View style={st.peakRow}>
          <Ionicons name="sunny-outline" size={16} color={colors.orangeDark} style={st.peakIcon} />
          <Text style={st.peakText}>{burnPeak.line}</Text>
        </View>
      ) : null}
    </SectionCard>
  );
});

const st = StyleSheet.create({
  ringsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 18,
  },
  ringWrap: {
    alignItems: 'center',
  },
  ringPct: {
    fontFamily: 'Outfit-Regular',
    fontSize: 28,
    letterSpacing: -0.5,
  },
  ringLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 10,
  },
  notes: {
    gap: 6,
    marginBottom: 14,
  },
  doseNote: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.inkMid,
    lineHeight: 19,
  },
  peakRow: {
    flexDirection: 'row',
    gap: 10,
  },
  peakIcon: {
    marginTop: 2,
  },
  peakText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.inkMid,
    lineHeight: 19,
    flex: 1,
  },
});
