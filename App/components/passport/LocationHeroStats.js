import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../../constants/colors';

// The three always-visible headline stats at the top of Location Detail,
// unified into one card instead of three separate chips — a shared
// baseline (big number, label below, divided by hairlines) is what
// actually keeps numbers of very different widths looking aligned.
export default React.memo(function LocationHeroStats({ stats }) {
  return (
    <View style={st.card}>
      <View style={st.row}>
        {stats.map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 && <View style={st.divider} />}
            <View style={st.col}>
              <Text style={[st.value, s.valueColor && { color: s.valueColor }]} numberOfLines={1}>{s.value}</Text>
              <Text style={st.label}>{s.label}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
});

const st = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 8,
  },
  col: {
    flex: 1,
    alignItems: 'center',
  },
  value: {
    fontFamily: 'Outfit-Regular',
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  label: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11.5,
    color: colors.muted,
    marginTop: 4,
    textAlign: 'center',
  },
  divider: {
    width: 1,
    height: 34,
    backgroundColor: colors.border,
  },
});
