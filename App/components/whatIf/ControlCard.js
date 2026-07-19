import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../../constants/colors';
import WhatIfInfoButton from './WhatIfInfoButton';

// Wrapper for each What If variable control: label with an optional ⓘ
// explainer, current simulated value on the right, the actual session's
// value in small muted text.
export default React.memo(function ControlCard({ label, value, actualLabel, info, children }) {
  return (
    <View style={st.card}>
      <View style={st.headerRow}>
        <View style={st.labelRow}>
          <Text style={st.label}>{label}</Text>
          {info && <WhatIfInfoButton info={info} />}
        </View>
        {value != null && <Text style={st.value}>{value}</Text>}
      </View>
      <Text style={st.actual}>{actualLabel}</Text>
      {children}
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
    paddingVertical: 16,
    marginBottom: 14,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  value: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.orange,
  },
  actual: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
    marginBottom: 12,
  },
});
