import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import CountUpText from '../CountUpText';
import { clockAtMinute } from '../../services/DepletionLabService';

// The verdict card: what your plan scores under these conditions vs the
// perfect schedule, and the exact times to reapply to earn the 100.
export default React.memo(function LabResultsSummary({ lab }) {
  const { yourResult, yourScore, perfectScore, perfectReapps, startTime, config } = lab;
  const scoreColor = yourScore >= 80 ? colors.protected : yourScore >= 50 ? colors.warning : colors.danger;

  return (
    <View style={st.card}>
      <View style={st.scoreRow}>
        <View style={st.scoreBlock}>
          <CountUpText value={yourScore} duration={700} format={(v) => `${Math.round(v)}`} style={[st.scoreVal, { color: scoreColor }]} />
          <Text style={st.scoreLabel}>YOUR PLAN</Text>
        </View>
        <View style={st.scoreDivider} />
        <View style={st.scoreBlock}>
          <Text style={[st.scoreVal, { color: colors.protected }]}>{perfectScore}</Text>
          <Text style={st.scoreLabel}>PERFECT PLAN</Text>
        </View>
      </View>

      <Text style={st.alertLine}>
        {yourResult.firstAlertMinute != null
          ? `Your plan's first reapply alert fires at ${clockAtMinute(startTime, yourResult.firstAlertMinute)}.`
          : 'Your plan stays protected the whole session — no alerts.'}
      </Text>

      <View style={st.divider} />

      {perfectReapps.length > 0 ? (
        <>
          <Text style={st.perfectTitle}>
            Reapply {perfectReapps.length === 1 ? 'once' : `${perfectReapps.length} times`} for a perfect score
          </Text>
          <View style={st.timeRow}>
            {perfectReapps.map((m) => (
              <View key={m} style={st.timeChip}>
                <Ionicons name="checkmark-circle" size={13} color={colors.protected} />
                <Text style={st.timeChipText}>{clockAtMinute(startTime, m)}</Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        <Text style={st.perfectTitle}>
          No reapplication needed — SPF {config.spf} holds for this whole session.
        </Text>
      )}

      <Text style={st.medLine}>
        UV dose reaching your skin: {lab.yourResult.medDose} MED
        {lab.perfectResult.medDose < lab.yourResult.medDose
          ? ` → ${lab.perfectResult.medDose} MED on the perfect plan`
          : ''}
      </Text>
    </View>
  );
});

const st = StyleSheet.create({
  card: {
    backgroundColor: colors.charcoal,
    borderRadius: 28,
    padding: 22,
    marginBottom: 14,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  scoreBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  scoreVal: {
    fontFamily: 'Outfit-Regular',
    fontSize: 40,
    letterSpacing: -1.2,
  },
  scoreLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 10,
    color: colors.onDarkMuted,
    letterSpacing: 1.2,
  },
  scoreDivider: {
    width: 1,
    height: 44,
    backgroundColor: colors.charcoalBorder,
  },
  alertLine: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.onDark,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.charcoalBorder,
    marginVertical: 14,
  },
  perfectTitle: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.onDark,
    marginBottom: 10,
    textAlign: 'center',
  },
  timeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.charcoalHigh,
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.charcoalBorder,
  },
  timeChipText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.onDark,
  },
  medLine: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.onDarkMuted,
    textAlign: 'center',
    marginTop: 12,
  },
});
