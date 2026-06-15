import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../../constants/colors';

// Risk level → colour. Grey = safe, amber = moderate, orange/red = high.
// These map to a user-specific risk band, not a generic UV scale.
const LEVEL = {
  low: { dot: colors.muted, track: colors.surface, label: 'Low' },
  moderate: { dot: colors.warning, track: colors.amberWash, label: 'Moderate' },
  high: { dot: colors.danger, track: colors.redWash, label: 'High' },
};

const BAR_MAX = 64;
const UV_CEIL = 11;

export default React.memo(function WeekForecastStrip({ week }) {
  return (
    <View style={st.row}>
      {week.map((d) => {
        const tone = LEVEL[d.level];
        const h = Math.max(8, Math.round((d.peakUV / UV_CEIL) * BAR_MAX));
        return (
          <View key={d.label} style={st.col}>
            <Text style={[st.uv, { color: tone.dot }]}>{d.peakUV}</Text>
            <View style={[st.barWrap, { height: BAR_MAX }]}>
              <View
                style={[
                  st.bar,
                  { height: h, backgroundColor: tone.dot },
                  d.isToday && st.barToday,
                ]}
              />
            </View>
            <Text style={[st.day, d.isToday && st.dayToday]}>{d.label}</Text>
            <Text style={[st.date, d.isToday && st.dateToday]}>{d.date}</Text>
          </View>
        );
      })}
    </View>
  );
});

const st = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  col: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  uv: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13,
    letterSpacing: -0.3,
  },
  barWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: 9,
    borderRadius: 5,
  },
  barToday: {
    width: 13,
  },
  day: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  dayToday: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: colors.ink,
  },
  date: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    color: colors.muted,
  },
  dateToday: {
    color: colors.orange,
    fontFamily: 'SpaceGrotesk-SemiBold',
  },
});
