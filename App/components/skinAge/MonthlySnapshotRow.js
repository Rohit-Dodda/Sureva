import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../../constants/colors';
import { monthAssessment, beachDayEquivalents } from '../../services/SkinAgeService';

const STATUS_COLORS = {
  green: colors.protected,
  amber: colors.warning,
  red: colors.danger,
};

// Feature 4 — the last 6 months as tappable chips (most recent left).
// Tapping a chip expands that month's summary card below the row.
export default React.memo(function MonthlySnapshotRow({ months }) {
  const [selectedKey, setSelectedKey] = useState(null);
  const toggle = useCallback((key) => setSelectedKey((k) => (k === key ? null : key)), []);

  const selected = months.find((m) => m.key === selectedKey);
  const selectedAssessment = selected ? monthAssessment(selected) : null;

  return (
    <View style={st.card}>
      <Text style={st.title}>Monthly snapshot</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chips}>
        {months.map((m) => {
          const { status } = monthAssessment(m);
          const isSelected = m.key === selectedKey;
          return (
            <TouchableOpacity
              key={m.key}
              style={[st.chip, isSelected && st.chipSelected]}
              onPress={() => toggle(m.key)}
              activeOpacity={0.75}
            >
              <View style={[st.dot, { backgroundColor: STATUS_COLORS[status] }]} />
              <Text style={[st.chipLabel, isSelected && st.chipLabelSelected]}>{m.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {selected && (
        <View style={st.detail}>
          <View style={st.detailRow}>
            <Text style={st.detailStat}>{selected.sessions} sessions</Text>
            <Text style={st.detailDot}>·</Text>
            <Text style={st.detailStat}>
              {Math.round(beachDayEquivalents(selected.uvUnits) * 10) / 10} beach days of UV
            </Text>
            <Text style={st.detailDot}>·</Text>
            <Text style={st.detailStat}>{selected.gapMinutes} gap min</Text>
          </View>
          <Text style={st.verdict}>{selectedAssessment.verdict}</Text>
        </View>
      )}

      {months.length < 2 && (
        <Text style={st.sparseNote}>More history will appear as you keep using Sureva.</Text>
      )}
    </View>
  );
});

const st = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 14,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  title: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 15,
    color: colors.ink,
    letterSpacing: -0.2,
    marginBottom: 12,
  },
  chips: {
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipSelected: {
    backgroundColor: colors.charcoal,
    borderColor: colors.charcoal,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipLabel: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 13,
    color: colors.ink,
  },
  chipLabelSelected: {
    color: colors.white,
  },
  detail: {
    marginTop: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  detailStat: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.inkMid,
  },
  detailDot: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.muted,
    marginHorizontal: 6,
  },
  verdict: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: colors.ink,
  },
  sparseNote: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.muted,
    marginTop: 10,
  },
});
