import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';

export default React.memo(function SurevaTakeCard({ take, title = "Sureva's Take" }) {
  return (
    <View style={st.card}>
      <View style={st.header}>
        <Ionicons name="sparkles" size={16} color={colors.orange} />
        <Text style={st.title}>{title}</Text>
      </View>
      <Text style={st.body}>{take}</Text>
    </View>
  );
});

const st = StyleSheet.create({
  card: {
    backgroundColor: colors.orangeLight + '30',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.orangeLight,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
  },
  title: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 12,
    color: colors.orange,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  body: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 14,
    color: colors.inkMid,
    lineHeight: 22,
  },
});
