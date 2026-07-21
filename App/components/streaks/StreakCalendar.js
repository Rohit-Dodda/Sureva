import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import colors from '../../constants/colors';
import { getDayState, dayKey } from '../../services/StreakService';
import StreakDayCell from './StreakDayCell';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Approximate column width, only for scaling the glyph/number inside a cell —
// the actual layout is done with flex + aspectRatio, so alignment never
// depends on this. (screen − screen padding 16·2 − panel 14·2 − card 18·2) / 7
const APPROX_CELL = (Dimensions.get('window').width - 96) / 7;

// A real month grid of circular day-cells. Seven equal flex:1 columns, so day
// letters and every week's circles line up in perfect columns. The month name
// itself is the navigation: previous/next sit faded on either side and step
// the calendar when tapped (no chevron chrome). Borderless — it lives inside
// the Streaks card.
function StreakCalendar({ streak, gradient, accent }) {
  const now = streak?.now ?? Date.now();
  const today = new Date(now);
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });

  const step = useCallback((delta) => {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }, []);

  // Chunked into fixed rows of exactly 7 (leading + trailing blanks padded) so
  // each week is a non-wrapping row of equal columns.
  const weeks = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1).getDay();
    const count = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const out = [];
    for (let i = 0; i < first; i++) out.push({ key: `b${i}`, day: null });
    const todayKey = dayKey(now);
    for (let d = 1; d <= count; d++) {
      const ms = new Date(cursor.year, cursor.month, d, 12, 0, 0, 0).getTime();
      out.push({
        key: `d${d}`,
        day: d,
        state: getDayState(ms, streak, now),
        isToday: dayKey(ms) === todayKey,
      });
    }
    while (out.length % 7 !== 0) out.push({ key: `t${out.length}`, day: null });
    const rows = [];
    for (let i = 0; i < out.length; i += 7) rows.push(out.slice(i, i + 7));
    return rows;
  }, [cursor, streak, now]);

  const prevName = MONTHS[(cursor.month + 11) % 12];
  const nextName = MONTHS[(cursor.month + 1) % 12];

  return (
    <View>
      <View style={st.header}>
        <Pressable onPress={() => step(-1)} hitSlop={10} style={st.side}>
          <Text style={st.sideText} numberOfLines={1}>{prevName}</Text>
        </Pressable>
        <Text style={[st.monthLabel, accent && { color: accent }]}>{MONTHS[cursor.month]}</Text>
        <Pressable onPress={() => step(1)} hitSlop={10} style={[st.side, st.sideRight]}>
          <Text style={st.sideText} numberOfLines={1}>{nextName}</Text>
        </Pressable>
      </View>

      <View style={st.weekRow}>
        {WEEKDAYS.map((w, i) => (
          <View key={i} style={st.headCol}>
            <Text style={st.weekText}>{w}</Text>
          </View>
        ))}
      </View>

      {weeks.map((row, ri) => (
        <View key={ri} style={st.weekLine}>
          {row.map((c) => (
            <View key={c.key} style={st.dayCol}>
              <StreakDayCell day={c.day} state={c.state} isToday={c.isToday} iconSize={APPROX_CELL} gradient={gradient} accent={accent} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  side: { flex: 1 },
  sideRight: { alignItems: 'flex-end' },
  sideText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: colors.muted,
    opacity: 0.7,
  },
  monthLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 24,
    color: colors.orange,
    textAlign: 'center',
  },
  weekRow: { flexDirection: 'row', marginBottom: 8 },
  weekLine: { flexDirection: 'row' },
  // Equal columns shared by the header letters and the day circles, so both
  // centre on the exact same x for every column.
  headCol: { flex: 1, alignItems: 'center' },
  dayCol: { flex: 1, alignItems: 'center', paddingHorizontal: 4, paddingVertical: 5 },
  weekText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.inkMid,
  },
});

export default React.memo(StreakCalendar);
