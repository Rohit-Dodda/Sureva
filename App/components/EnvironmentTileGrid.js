import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import { ENVIRONMENTS, CUSTOM_ENVIRONMENT } from '../constants/environments';

// Tile picker for all environment categories + a "Custom" tile that reveals
// a free-text input. `selection` is a category label or 'Custom'.
export default React.memo(function EnvironmentTileGrid({
  selection,
  onSelect,
  customText,
  onCustomTextChange,
  onCustomTextCommit,
}) {
  const tiles = [...ENVIRONMENTS, CUSTOM_ENVIRONMENT];
  return (
    <View>
      <View style={st.grid}>
        {tiles.map(({ label, icon }) => {
          const active = selection === label;
          return (
            <TouchableOpacity
              key={label}
              style={[st.tile, active && st.tileSelected]}
              onPress={() => onSelect(label)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={icon}
                size={20}
                color={active ? colors.orange : colors.muted}
                style={st.icon}
              />
              <Text style={[st.label, active && st.labelSelected]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {selection === 'Custom' && (
        <View style={st.customWrap}>
          <Text style={st.customLabel}>Describe where you are</Text>
          <TextInput
            style={st.customInput}
            placeholder="e.g. Rooftop, Greenhouse, Stadium"
            placeholderTextColor={colors.muted}
            value={customText}
            onChangeText={onCustomTextChange}
            onEndEditing={onCustomTextCommit}
            returnKeyType="done"
            autoFocus
          />
        </View>
      )}
    </View>
  );
});

const st = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: '47%',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  tileSelected: {
    borderColor: colors.orange,
    backgroundColor: colors.orangeLight + '30',
  },
  icon: {
    marginBottom: 6,
  },
  label: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 13,
    color: colors.muted,
  },
  labelSelected: {
    color: colors.orange,
  },
  customWrap: {
    marginTop: 14,
  },
  customLabel: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 13,
    color: colors.inkMid,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  customInput: {
    height: 50,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.ink,
  },
});
