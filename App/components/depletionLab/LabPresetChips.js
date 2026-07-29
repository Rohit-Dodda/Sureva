import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';

// Quick-start presets so the setup screen isn't intimidating on first
// open. Selecting one simply replaces the whole config. "Conditions Now"
// is the odd one out — it fetches live weather instead of a fixed config,
// so it's styled apart from the static presets (navy vs. orange).
export const LAB_PRESETS = [
  {
    name: 'Beach day',
    icon: 'sunny',
    config: {
      durationMinutes: 240, uvIndex: 9, temperature: 32, humidity: 65,
      activityLevel: 'moderate', spf: 50, waterResistanceRating: 80,
      reapplicationMinutes: [], waterBreakMinutes: [60, 150], waterBreakType: 'swim',
    },
  },
  {
    name: 'Hike',
    icon: 'trail-sign',
    config: {
      durationMinutes: 180, uvIndex: 7, temperature: 27, humidity: 50,
      activityLevel: 'high', spf: 30, waterResistanceRating: 40,
      reapplicationMinutes: [], waterBreakMinutes: [], waterBreakType: 'splash',
    },
  },
  {
    name: 'Poolside',
    icon: 'water',
    config: {
      durationMinutes: 120, uvIndex: 8, temperature: 30, humidity: 60,
      activityLevel: 'sedentary', spf: 30, waterResistanceRating: 40,
      reapplicationMinutes: [], waterBreakMinutes: [45], waterBreakType: 'swim',
    },
  },
];

const CONDITIONS_NOW_LABEL = {
  idle: 'Conditions Now',
  loading: 'Checking weather…',
  error: 'Couldn’t fetch, tap to retry',
};

export default React.memo(function LabPresetChips({ conditionsState = 'idle', onSelect, onConditionsNow }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.row}>
      <TouchableOpacity
        style={[st.chip, st.liveChip]}
        onPress={onConditionsNow}
        activeOpacity={0.8}
        disabled={conditionsState === 'loading'}
      >
        <Ionicons name="locate" size={14} color={colors.navy} />
        <Text style={[st.chipText, st.liveChipText]}>{CONDITIONS_NOW_LABEL[conditionsState]}</Text>
      </TouchableOpacity>
      {LAB_PRESETS.map((p) => (
        <TouchableOpacity key={p.name} style={st.chip} onPress={() => onSelect(p.config)} activeOpacity={0.8}>
          <Ionicons name={p.icon} size={14} color={colors.orangeDark} />
          <Text style={st.chipText}>{p.name}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
});

const st = StyleSheet.create({
  row: {
    gap: 8,
    paddingVertical: 2,
    paddingRight: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.orangeWash,
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  chipText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.orangeDark,
  },
  liveChip: {
    backgroundColor: colors.navyLight,
  },
  liveChipText: {
    color: colors.navy,
  },
});
