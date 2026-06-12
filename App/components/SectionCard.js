import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';

export default React.memo(function SectionCard({ icon, title, children, style }) {
  return (
    <View style={[st.card, style]}>
      <View style={st.titleRow}>
        {icon ? <Ionicons name={icon} size={15} color={colors.orange} /> : null}
        <Text style={st.title}>{title}</Text>
      </View>
      {children}
    </View>
  );
});

const st = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 14,
  },
  title: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
