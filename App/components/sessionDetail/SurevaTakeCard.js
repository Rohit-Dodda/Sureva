import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';

export default React.memo(function SurevaTakeCard({ take, title = "Sureva's Take" }) {
  return (
    <LinearGradient
      colors={[colors.gradCharcoalStart, colors.gradCharcoalEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={st.card}
    >
      <View style={st.header}>
        <View style={st.iconWrap}>
          <Ionicons name="sparkles" size={14} color={colors.orange} />
        </View>
        <Text style={st.title}>{title}</Text>
      </View>
      <Text style={st.body}>{take}</Text>
    </LinearGradient>
  );
});

const st = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.charcoalBorder,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 14,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 12,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: 'rgba(255,90,31,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.orange,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  body: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.86)',
    lineHeight: 22,
  },
});
