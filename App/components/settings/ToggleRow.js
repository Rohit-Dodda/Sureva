import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import colors from '../../constants/colors';

// Label + sublabel + Switch, used for the medications/skin-condition
// toggles in the Skin Profile editor.
export default function ToggleRow({ label, sublabel, value, onValueChange }) {
  return (
    <View style={st.row}>
      <View style={st.textGroup}>
        <Text style={st.label}>{label}</Text>
        {!!sublabel && <Text style={st.sublabel}>{sublabel}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.orangeLight }}
        thumbColor={value ? colors.orange : colors.white}
      />
    </View>
  );
}

const st = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  textGroup: {
    flex: 1,
    gap: 2,
    marginRight: 12,
  },
  label: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    color: colors.ink,
  },
  sublabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.muted,
  },
});
