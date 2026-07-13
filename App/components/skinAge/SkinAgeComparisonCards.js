import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';

// Feature 3 — "Without Sureva" vs "Your Sureva impact", side by side.
export default React.memo(function SkinAgeComparisonCards({ withoutSureva, skinAge, startDateLabel }) {
  const impact = Math.round((withoutSureva - skinAge) * 10) / 10;

  return (
    <View style={st.wrap}>
      <View style={st.row}>
        <View style={[st.card, st.cardRed]}>
          <Text style={st.cardTitle}>Without Sureva</Text>
          <Text style={[st.cardNumber, { color: colors.danger }]}>{withoutSureva}</Text>
          <Text style={st.cardCaption}>Estimated skin age with no protection.</Text>
        </View>
        <View style={[st.card, st.cardGreen]}>
          <Text style={st.cardTitle}>Your Sureva impact</Text>
          <View style={st.impactRow}>
            <Ionicons name="arrow-down" size={20} color={colors.protected} />
            <Text style={[st.cardNumber, { color: colors.protected }]}>{impact}</Text>
          </View>
          <Text style={st.cardCaption}>Years protected by Sureva.</Text>
        </View>
      </View>
      <Text style={st.footnote}>
        Based on your recorded UV exposure since {startDateLabel}. Estimates use published UV
        photoaging benchmarks.
      </Text>
    </View>
  );
});

const st = StyleSheet.create({
  wrap: {
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  card: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  cardRed: {
    backgroundColor: 'rgba(231, 76, 60, 0.08)', // colors.danger @ 8%
  },
  cardGreen: {
    backgroundColor: 'rgba(46, 204, 113, 0.08)', // colors.protected @ 8%
  },
  cardTitle: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 13,
    color: colors.ink,
    marginBottom: 6,
  },
  cardNumber: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 34,
    letterSpacing: -1,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  cardCaption: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    lineHeight: 15,
    color: colors.inkMid,
    marginTop: 4,
  },
  footnote: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    lineHeight: 15,
    color: colors.muted,
    marginTop: 10,
    textAlign: 'center',
  },
});
