import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';

// Single-select answer cards. Each card carries a lettered badge (A, B, …)
// like the reference's "A) …" prefix; the selected card tints orange with
// a filled check.
export default React.memo(function CheckInOptionList({ options, selected, onSelect }) {
  return (
    <View style={st.list}>
      {options.map((option, i) => {
        const isSelected = option === selected;
        const letter = String.fromCharCode(65 + i);
        return (
          <TouchableOpacity
            key={option}
            style={[st.card, isSelected && st.cardSelected]}
            onPress={() => onSelect(option)}
            activeOpacity={0.8}
          >
            <View style={[st.badge, isSelected && st.badgeSelected]}>
              <Text style={[st.badgeText, isSelected && st.badgeTextSelected]}>{letter}</Text>
            </View>
            <Text style={[st.label, isSelected && st.labelSelected]}>{option}</Text>
            {isSelected && (
              <Ionicons name="checkmark-circle" size={20} color={colors.orange} style={st.check} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

const st = StyleSheet.create({
  list: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 14,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardSelected: {
    backgroundColor: 'rgba(255, 90, 31, 0.08)', // colors.orange @ 8%
    borderColor: colors.orange,
  },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  badgeSelected: {
    backgroundColor: colors.orange,
  },
  badgeText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.muted,
  },
  badgeTextSelected: {
    color: colors.white,
  },
  label: {
    flex: 1,
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.ink,
  },
  labelSelected: {
    color: colors.orangeDark,
  },
  check: {
    marginLeft: 8,
  },
});
