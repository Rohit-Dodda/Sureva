import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../constants/colors';
import { useStreak } from '../context/StreakContext';
import { useAutoStartTour } from '../context/AppTourContext';
import { MILESTONE_TOURS } from '../constants/tourSteps';
import { getDayState } from '../services/StreakService';
import { tierFor } from '../constants/streakTiers';
import StreakCalendar from '../components/streaks/StreakCalendar';
import FreezeRow from '../components/streaks/FreezeRow';
import SlideInView from '../components/SlideInView';

// Days in the CURRENT real month, up to today, with no logged session — the
// "No Activity" stat. Derived, never stored.
function missedThisMonth(streak, now) {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = d.getMonth();
  const today = d.getDate();
  let n = 0;
  for (let day = 1; day <= today; day++) {
    const ms = new Date(y, m, day, 12, 0, 0, 0).getTime();
    if (getDayState(ms, streak, now) === 'missed') n += 1;
  }
  return n;
}

const pad = (n) => String(n).padStart(2, '0');

// The Streaks tab. A standard page title, then a full-width flame calendar
// resting on a soft orange panel, with a three-stat footer. Everything is
// derived from session history via StreakContext — logging consistency only,
// never exposure.
export default function StreaksScreen({ isActiveTab }) {
  const { streak } = useStreak();
  const { currentStreak, longestStreak, freezes, now } = streak;
  const noActivity = useMemo(() => missedThisMonth(streak, now), [streak, now]);
  const tier = tierFor(streak.tier);

  // First time this tab is opened, spotlight the tab icon via the existing
  // milestone-tour system (same as Passport).
  const [tourReady, setTourReady] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setTourReady(true), 500);
    return () => clearTimeout(id);
  }, []);
  const milestone = MILESTONE_TOURS.streaksFirstVisit;
  useAutoStartTour(milestone.id, milestone.steps, tourReady && isActiveTab);

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar style="dark" />

      <View style={st.topBar}>
        <Text style={st.title}>Streaks</Text>
      </View>

      <ScrollView
        style={st.scroll}
        contentContainerStyle={st.content}
        showsVerticalScrollIndicator={false}
      >
        <SlideInView delay={40}>
          <LinearGradient
            colors={tier.gradient}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={st.panel}
          >
            <View style={st.card}>
              <StreakCalendar streak={streak} gradient={tier.gradient} accent={tier.flame} />

              <View style={st.divider} />

              <View style={st.statsRow}>
                <Stat label="Active Streak" value={pad(currentStreak)} />
                <Stat label="Longest Streak" value={pad(longestStreak)} unit="Days" />
                <Stat label="No Activity" value={pad(noActivity)} unit="Days" />
              </View>

              <View style={st.freezeStrip}>
                <FreezeRow available={freezes} />
              </View>
            </View>
          </LinearGradient>
        </SlideInView>

        <View style={{ height: 130 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, unit }) {
  return (
    <View style={st.stat}>
      <Text style={st.statLabel} numberOfLines={1}>{label}</Text>
      <View style={st.statValueRow}>
        <Text style={st.statValue}>{value}</Text>
        {unit ? <Text style={st.statUnit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  title: {
    fontFamily: 'Outfit-Regular',
    fontSize: 32,
    color: colors.ink,
    letterSpacing: -1,
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8 },
  panel: {
    borderRadius: 32,
    padding: 14,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 18,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: 18,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  statLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12.5,
    color: colors.inkMid,
    marginBottom: 6,
    textAlign: 'center',
  },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  statValue: {
    fontFamily: 'Outfit-Regular',
    fontSize: 30,
    color: colors.ink,
  },
  statUnit: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: colors.muted,
    marginLeft: 4,
  },
  freezeStrip: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
