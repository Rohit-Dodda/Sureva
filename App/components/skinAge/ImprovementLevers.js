import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../../constants/colors';

// Feature 5 — exactly three lever cards, computed from the user's actual
// weakest factors (never generic tips). Content comes pre-built from
// SkinAgeService.buildImprovementLevers.
export default React.memo(function ImprovementLevers({ levers }) {
  return (
    <View style={st.wrap}>
      <Text style={st.sectionTitle}>How to lower your score</Text>
      {levers.map((lever) => (
        <View key={lever.title} style={st.card}>
          <Text style={st.cardTitle}>{lever.title}</Text>
          <Text style={st.cardBody}>{lever.body}</Text>
        </View>
      ))}
    </View>
  );
});

const st = StyleSheet.create({
  wrap: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: 'Outfit-Regular',
    fontSize: 19,
    color: colors.ink,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.orange,
    paddingHorizontal: 18,
    paddingVertical: 15,
    marginBottom: 10,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    color: colors.ink,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  cardBody: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkMid,
  },
});
