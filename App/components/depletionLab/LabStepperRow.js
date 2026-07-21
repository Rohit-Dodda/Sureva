import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';

// Compact − count + stepper row used by the Lab's reapplication and
// water-break controls to add/remove timeline markers.
export default React.memo(function LabStepperRow({ label, count, min = 0, max, onAdd, onRemove }) {
  const canRemove = count > min;
  const canAdd = count < max;
  return (
    <View style={st.row}>
      <Text style={st.label}>{label}</Text>
      <View style={st.stepper}>
        <TouchableOpacity
          style={[st.btn, !canRemove && st.btnDisabled]}
          onPress={onRemove}
          disabled={!canRemove}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="remove" size={18} color={canRemove ? colors.ink : colors.muted} />
        </TouchableOpacity>
        <Text style={st.count}>{count}</Text>
        <TouchableOpacity
          style={[st.btn, !canAdd && st.btnDisabled]}
          onPress={onAdd}
          disabled={!canAdd}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="add" size={18} color={canAdd ? colors.ink : colors.muted} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const st = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.ink,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  btn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    backgroundColor: colors.surface,
  },
  count: {
    fontFamily: 'Outfit-Regular',
    fontSize: 16,
    color: colors.ink,
    minWidth: 18,
    textAlign: 'center',
  },
});
