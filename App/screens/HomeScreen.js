import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, AppState,
  SafeAreaView, Pressable, Animated, Dimensions, Easing, Image, PanResponder,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../constants/colors';
import mockData from '../constants/mockData';
import { useAuth } from '../context/AuthContext';
import SupabaseService from '../services/SupabaseService';
import { onSessionSaved } from '../services/SessionEventsService';
import {
  buildSessionHero, buildSessionDetail, formatDuration, estimateSedFromHero,
} from '../services/SessionDetailMapper';
import { calculatePersonalComparison } from '../../Algorithm/js/depletionEngine.js';
import { engineProfileFor } from '../components/activeSession/sessionMath';
import { getForecast } from '../services/WeatherService';
import SessionSetupSheet from '../components/SessionSetupSheet';
import SlideInView, { IOS_EASE_OUT } from '../components/SlideInView';
import CountUpText from '../components/CountUpText';
import CardHeader from '../components/CardHeader';
import ExpandableCard from '../components/ExpandableCard';
import CleanGlassSurface from '../components/CleanGlassSurface';
import DeviceGuideModal from '../components/DeviceGuideModal';
import Device3D from '../components/onboarding/Device3D';
import ActiveSessionScreen from './ActiveSessionScreen';
import SettingsScreen from './SettingsScreen';
import SessionDetailScreen from './SessionDetailScreen';
import SessionSyncScreen from './SessionSyncScreen';
import CheckInSheet from '../components/postSession/CheckInSheet';
import StreakRevealOverlay from '../components/streaks/StreakRevealOverlay';
import { useStreak } from '../context/StreakContext';
import { setActiveSessionOpener } from '../services/NotificationService';
import TrendsScreen from './TrendsScreen';
import { useScrollToTop } from '../context/ScrollToTopContext';
import { useHideTabBar } from '../context/TabBarVisibilityContext';
import { useTabSwipeLock } from '../context/SwipeNavContext';
import { useQuickSearch, useRegisterOpener } from '../context/QuickSearchContext';
import { useTourTarget, useAutoStartTour, useAppTour, tourDoneKey } from '../context/AppTourContext';
import { WELCOME_TOUR_ID, WELCOME_TOUR_STEPS } from '../constants/tourSteps';

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;
// Active-session overlay slides over a stationary home, exactly like the
// SessionDetailScreen → list transition. Same spring/easing so it feels identical.
const SESSION_SWIPE_THRESHOLD = 80;
const SESSION_SPRING = { stiffness: 210, damping: 32, mass: 1, useNativeDriver: true };
const SESSION_EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

// ─── Helpers ──────────────────────────────────────────────────
function getGreeting(firstName) {
  const h = new Date().getHours();
  const period = h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';
  // Two lines: small salutation label on top, bold first name below.
  return { salutation: `Good ${period},`, name: `${firstName}!` };
}

function getInitials(firstName, lastName) {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

// Same-calendar-day check by local fields — never via toISOString(), which
// shifts a near-midnight session across the UTC boundary into the wrong day.
// Mirrors WeatherService's isSameLocalDay; this codebase already hit that bug.
function isSameLocalDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

// '1h 15min' / '45min' — matches the mock protectionPattern.firstAlertTime shape.
function formatHrMin(mins) {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

// ── Real card derivations (from completed Supabase session rows) ──────
// Each takes the hero-level rows getSessions returns and produces the exact
// shape its mock counterpart in constants/mockData.js has, so swapping is a
// prop source change only. Conservative throughout: missing data reads as
// zero/less exposure surfaced, never inflated.

// Today's Protection card — sessions whose start falls on the local calendar
// day. Protected time is duration minus unprotected (floored at 0 so a bad
// row can't produce negative protected time).
function computeTodayStats(rows) {
  const now = new Date();
  const today = rows.filter((r) => r.start_time && isSameLocalDay(new Date(r.start_time), now));
  let protectedMin = 0;
  let unprotectedMin = 0;
  let reapplications = 0;
  for (const r of today) {
    const duration = r.duration_minutes ?? 0;
    const unprot = r.unprotected_minutes ?? 0;
    unprotectedMin += unprot;
    protectedMin += Math.max(0, duration - unprot);
    reapplications += r.reapplication_count ?? 0;
  }
  return {
    protectedTime: formatDuration(protectedMin),
    unprotectedTime: formatDuration(unprotectedMin),
    reapplications,
    sessionsToday: today.length,
  };
}

// This Week card — Monday-start week, one summed SED dose per day. todayIndex
// is today's 0–6 slot (Mon=0). complianceRate backs the card's "Protected
// outdoor time" bar, so it's protected÷total tracked minutes this week.
function computeWeeklySnapshot(rows) {
  const now = new Date();
  const todayIndex = (now.getDay() + 6) % 7; // getDay(): Sun=0 → Mon=0..Sun=6
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  weekStart.setDate(weekStart.getDate() - todayIndex); // local Monday 00:00

  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const doses = [0, 0, 0, 0, 0, 0, 0];
  let protectedMin = 0;
  let totalMin = 0;
  for (const r of rows) {
    if (!r.start_time) continue;
    const start = new Date(r.start_time);
    const startMid = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const dayDiff = Math.round((startMid - weekStart) / 86400000);
    if (dayDiff < 0 || dayDiff > 6) continue;
    doses[dayDiff] += estimateSedFromHero(r);
    const duration = r.duration_minutes ?? 0;
    totalMin += duration;
    protectedMin += Math.max(0, duration - (r.unprotected_minutes ?? 0));
  }
  return {
    todayIndex,
    complianceRate: totalMin > 0 ? Math.round((protectedMin / totalMin) * 100) : 0,
    days: labels.map((label, i) => ({ label, uvDose: Math.round(doses[i] * 100) / 100 })),
  };
}

// Your Protection Pattern card — totalSessions is the real all-time completed
// count that drives the 10-session unlock gate. The other three fields only
// render once unlocked; they're still computed honestly here.
function computeProtectionPattern(rows) {
  // Average reapply window: each session's duration split evenly across its
  // (reapplications + 1) protected stretches. A no-reapply session counts its
  // whole duration as one window.
  const durationed = rows.filter((r) => (r.duration_minutes ?? 0) > 0);
  const intervals = durationed.map((r) => r.duration_minutes / ((r.reapplication_count ?? 0) + 1));
  const avgInterval = intervals.length
    ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
    : 0;

  // Depletion vs the user's own historical baseline — the same comparison
  // SessionDetailMapper.buildPattern makes (most-recent session against the
  // rest). Only the "faster" direction is surfaced as +%; slower shows 0
  // rather than a negative value the card's "+{n}%" label can't represent.
  const [mostRecent, ...historical] = rows;
  const comparison = calculatePersonalComparison(
    { averageDepletionRate: mostRecent?.average_depletion_rate },
    historical.map((r) => ({ averageDepletionRate: r.average_depletion_rate }))
  );
  const depletionFasterPct = comparison && comparison.direction === 'faster'
    ? Math.round(comparison.percentageDifference)
    : 0;

  // The only stored alert-latency column is the average response time to
  // alerts (minutes), averaged across sessions that fired at least one.
  const responded = rows.filter((r) => r.alert_response_time_avg != null);
  const avgAlertMin = responded.length
    ? responded.reduce((a, r) => a + r.alert_response_time_avg, 0) / responded.length
    : 0;

  return {
    totalSessions: rows.length,
    reapplyInterval: `${avgInterval} minutes`,
    depletionFasterPct,
    firstAlertTime: formatHrMin(avgAlertMin),
  };
}

// Today's UV dose as a % of the day's safe limit (one MED = 100%). Reuses
// buildSessionHero's per-session medDose percent — no new dose formula is
// invented here — summed over today's sessions and capped at 100 (a full
// day past the burn threshold still reads as 100%, never more). Same
// local-calendar-day filter computeTodayStats uses, so the two agree on
// which sessions count as "today".
function computeTodayDosePercent(rows, fitzpatrickType) {
  const now = new Date();
  const today = rows.filter((r) => r.start_time && isSameLocalDay(new Date(r.start_time), now));
  const sum = today.reduce((acc, r) => acc + buildSessionHero(r, fitzpatrickType).uvDosePercent, 0);
  return Math.min(100, Math.round(sum));
}

// Honest zero-state shapes for a signed-in user with no sessions yet — the
// exact prop shapes the cards expect, but with empty/zero values instead of
// fabricated demo mock content. (computeWeeklySnapshot's zero shape is
// date-dependent, so it's built per-render, not here.)
const EMPTY_TODAY_STATS = {
  protectedTime: '—',
  unprotectedTime: '—',
  reapplications: 0,
  sessionsToday: 0,
};
const EMPTY_PROTECTION_PATTERN = {
  totalSessions: 0,
  reapplyInterval: '0 minutes',
  depletionFasterPct: 0,
  firstAlertTime: '0min',
};
const EMPTY_WEEKLY_DOSE = { meds: 0, limit: 3, line: '' };

// ─── ProfileAvatar ────────────────────────────────────────────
const ProfileAvatar = React.memo(function ProfileAvatar({ initials, profileImage, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.90, useNativeDriver: true, tension: 280, friction: 12 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      hitSlop={8}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {profileImage ? (
          <View style={st.avatar}>
            <Image source={{ uri: profileImage }} style={st.avatarImage} />
          </View>
        ) : (
          <LinearGradient
            colors={[colors.gradOrangeStart, colors.gradOrangeEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={st.avatar}
          >
            <Text style={st.avatarText}>{initials}</Text>
          </LinearGradient>
        )}
      </Animated.View>
    </Pressable>
  );
});

// ─── StartSessionPill ─────────────────────────────────────────
const StartSessionPill = React.memo(function StartSessionPill({ onPress, sessionActive }) {
  const scale    = useRef(new Animated.Value(1)).current;
  const dotPulse = useRef(new Animated.Value(1)).current;

  const onPressIn  = () => Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, tension: 280, friction: 12 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, tension: 200, friction: 10 }).start();

  useEffect(() => {
    if (!sessionActive) { dotPulse.setValue(1); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotPulse, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(dotPulse, { toValue: 1,   duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [sessionActive]);

  if (sessionActive) {
    return (
      <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        <Animated.View style={[st.pillActive, { transform: [{ scale }] }]}>
          <Animated.View style={[st.pillDot, { opacity: dotPulse }]} />
          <Text style={st.pillActiveText}>Return</Text>
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[st.pillShadow, { transform: [{ scale }] }]}>
        <LinearGradient
          colors={[colors.gradOrangeStart, colors.gradOrangeEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={st.pill}
        >
          <Ionicons name="flash" size={13} color={colors.white} />
          <Text style={st.pillText}>Start Session</Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
});

// ─── Today's Protection card ──────────────────────────────────
const ProtectionStatsCard = React.memo(function ProtectionStatsCard({ stats, conditions, dosePercent, empty, loading }) {
  // Live weather (conditions) is real regardless of session history, so the
  // chips always render. Only the session-derived tiles + UV dose collapse
  // to an honest empty/zero state when there are no sessions today.
  const hasData = !empty && !loading;
  const tiles = [
    { label: 'Unprotected',    value: stats.unprotectedTime        },
    { label: 'Reapplications', value: String(stats.reapplications) },
    { label: 'Sessions Today', value: String(stats.sessionsToday)  },
  ];
  const chips = [
    { icon: 'sunny-outline',       label: `UV ${conditions.uvIndex}` },
    { icon: 'thermometer-outline', label: `${conditions.temperature}°C` },
    { icon: 'water-outline',       label: `${conditions.humidity}% humidity` },
  ];
  const doseColor =
    dosePercent < 50 ? colors.protected :
    dosePercent < 80 ? colors.warning : colors.danger;

  return (
    <ExpandableCard
      glass
      icon="shield-checkmark"
      title="Today's Protection"
      expandedContent={
        <View>
          <Text style={exSt.sectionLabel}>Conditions right now</Text>
          <View style={exSt.chipRow}>
            {chips.map((chip) => (
              <View key={chip.icon} style={exSt.chip}>
                <Ionicons name={chip.icon} size={13} color={colors.inkMid} />
                <Text style={exSt.chipText}>{chip.label}</Text>
              </View>
            ))}
          </View>
          <View style={exSt.kvRow}>
            <Text style={exSt.kvLabel}>Today's UV dose</Text>
            {hasData ? (
              <Text style={[exSt.kvValue, { color: doseColor }]}>{dosePercent}% of safe limit</Text>
            ) : (
              <Text style={exSt.kvValue}>{loading ? '—' : 'No exposure yet'}</Text>
            )}
          </View>
          <View style={exSt.track}>
            <View style={[exSt.fill, { width: `${hasData ? dosePercent : 0}%`, backgroundColor: doseColor }]} />
          </View>
        </View>
      }
    >
      {hasData ? (
        <View style={psSt.grid}>
          {/* Hero tile — protected time */}
          <LinearGradient
            colors={[colors.gradOrangeStart, colors.gradOrangeEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={psSt.heroTile}
          >
            <Text style={psSt.heroVal}>{stats.protectedTime}</Text>
            <Text style={psSt.heroLabel}>Protected</Text>
          </LinearGradient>
          {tiles.map((tile) => (
            <View key={tile.label} style={psSt.tile}>
              <Text style={psSt.tileVal}>{tile.value}</Text>
              <Text style={psSt.tileLabel}>{tile.label}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={psSt.emptyWrap}>
          <View style={psSt.emptyIconWrap}>
            <Ionicons name="sunny" size={24} color={colors.orange} />
          </View>
          <Text style={psSt.emptyTitle}>
            {loading ? 'Checking today’s protection…' : 'No sessions today'}
          </Text>
          {!loading && (
            <Text style={psSt.emptyMsg}>
              Start a session and we'll track your protection here as the day goes.
            </Text>
          )}
        </View>
      )}
    </ExpandableCard>
  );
});

// ─── Last Session card ────────────────────────────────────────
const LastSessionCard = React.memo(function LastSessionCard({ session, detail, onOpenDetail, loading }) {
  // No real session yet (or still loading) — render an honest empty card
  // instead of fabricated session numbers. No "View Full Report" link since
  // there's nothing to open.
  if (!session || !detail) {
    return (
      <ExpandableCard
        glass
        icon="time"
        title="Last Session"
        expandedContent={
          <Text style={exSt.note}>
            {loading
              ? 'Loading your most recent session…'
              : 'Once you finish a session, its full summary — duration, score, alerts and UV dose — will appear here.'}
          </Text>
        }
      >
        <View style={lsSt.emptyWrap}>
          <View style={lsSt.emptyIconWrap}>
            <Ionicons name="hourglass-outline" size={24} color={colors.orange} />
          </View>
          <Text style={lsSt.emptyTitle}>
            {loading ? 'Checking your sessions…' : 'No sessions yet'}
          </Text>
          {!loading && (
            <Text style={lsSt.emptyMsg}>
              Your most recent session will show up here once you finish one.
            </Text>
          )}
        </View>
      </ExpandableCard>
    );
  }

  const confirmed = detail.alerts.log.filter((a) => a.confirmed).length;

  return (
    <ExpandableCard
      glass
      icon="time"
      title="Last Session"
      subtitle={`${session.date} · ${session.location}`}
      linkLabel="View Full Report"
      onLinkPress={onOpenDetail}
      expandedContent={
        <View>
          <Text style={exSt.verdict}>{detail.verdict}</Text>
          <View style={exSt.kvRow}>
            <Text style={exSt.kvLabel}>Peak UV</Text>
            <View style={lsSt.peakBadge}>
              <Ionicons name="sunny" size={11} color={colors.orangeDark} />
              <Text style={lsSt.peakVal}>{session.peakUV.toFixed(1)}</Text>
            </View>
          </View>
          <View style={exSt.kvRow}>
            <Text style={exSt.kvLabel}>Alerts</Text>
            <Text style={exSt.kvValue}>{detail.alerts.fired} fired · {confirmed} confirmed</Text>
          </View>
          <View style={exSt.kvRow}>
            <Text style={exSt.kvLabel}>Session UV dose</Text>
            <Text style={exSt.kvValue}>{session.uvDosePercent}% of session limit</Text>
          </View>
        </View>
      }
    >
      <View style={lsSt.statsRow}>
        <View style={[lsSt.stat, lsSt.statLeft]}>
          <View style={lsSt.statInner}>
            <Text style={lsSt.statVal}>{session.duration}</Text>
            <Text style={lsSt.statLabel}>DURATION</Text>
          </View>
        </View>
        <View style={[lsSt.statDivider, lsSt.statDividerLeft]} />
        <View style={[lsSt.stat, lsSt.statCenter]}>
          <View style={lsSt.statInner}>
            <Text style={[lsSt.statVal, lsSt.statValAccent]}>{session.score}</Text>
            <Text style={lsSt.statLabel}>SCORE</Text>
          </View>
        </View>
        <View style={[lsSt.statDivider, lsSt.statDividerRight]} />
        <View style={[lsSt.stat, lsSt.statRight]}>
          <View style={lsSt.statInner}>
            <Text style={lsSt.statVal}>SPF {session.spf}</Text>
            <Text style={lsSt.statLabel}>{session.environment}</Text>
          </View>
        </View>
      </View>
    </ExpandableCard>
  );
});

// ─── Weekly Snapshot card ─────────────────────────────────────
const WeekBar = React.memo(function WeekBar({ height, isToday, isPast, delay }) {
  const grow = useRef(new Animated.Value(4)).current;

  useEffect(() => {
    Animated.timing(grow, {
      toValue: height,
      duration: 600,
      delay,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: false,
    }).start();
  }, [height, delay]);

  if (isToday) {
    return (
      <Animated.View style={[wkSt.barClip, { height: grow }]}>
        <LinearGradient
          colors={[colors.gradOrangeStart, colors.gradOrangeEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    );
  }
  return (
    <Animated.View
      style={[
        wkSt.bar,
        { height: grow, backgroundColor: isPast ? colors.orangeWashDark : colors.surface },
      ]}
    />
  );
});

const WeeklySnapshotCard = React.memo(function WeeklySnapshotCard({ snapshot, weeklyDose, onSeeAll, loading }) {
  const { days, todayIndex, complianceRate } = snapshot;
  const BAR_MAX_H = 56;
  const pastAndToday = days.filter((_, i) => i <= todayIndex);
  const maxDose = Math.max(...pastAndToday.map((d) => d.uvDose), 0.1);

  const activeDays = pastAndToday.filter((d) => d.uvDose > 0).length;
  const highestDay = pastAndToday.reduce((a, b) => (b.uvDose > a.uvDose ? b : a));
  const budgetPct = Math.min((weeklyDose.meds / weeklyDose.limit) * 100, 100);
  const budgetColor =
    budgetPct < 50 ? colors.protected :
    budgetPct < 80 ? colors.warning : colors.danger;
  // Nothing tracked this week yet — the empty week still renders its flat
  // bar chart, but the footer becomes an honest prompt instead of a "0%
  // protected" bar, and the expanded budget line stays quiet.
  const isEmpty = !loading && activeDays === 0;

  return (
    <ExpandableCard
      glass
      icon="bar-chart"
      title="This Week"
      linkLabel="View Exposure Trends"
      linkIcon="trending-up"
      onLinkPress={onSeeAll}
      expandedContent={
        <View>
          <View style={exSt.kvRow}>
            <Text style={exSt.kvLabel}>Active days</Text>
            <Text style={exSt.kvValue}>{activeDays} of 7</Text>
          </View>
          <View style={exSt.kvRow}>
            <Text style={exSt.kvLabel}>Highest exposure</Text>
            <Text style={exSt.kvValue}>{highestDay.label}</Text>
          </View>
          <View style={exSt.kvRow}>
            <Text style={exSt.kvLabel}>Weekly UV budget</Text>
            <Text style={[exSt.kvValue, isEmpty ? null : { color: budgetColor }]}>
              {isEmpty ? 'Nothing tracked yet' : `${weeklyDose.meds} of ${weeklyDose.limit} MEDs`}
            </Text>
          </View>
          <View style={exSt.track}>
            <View style={[exSt.fill, { width: `${isEmpty ? 0 : budgetPct}%`, backgroundColor: budgetColor }]} />
          </View>
        </View>
      }
    >
      <View style={wkSt.chartRow}>
        {days.map((day, i) => {
          const isPast   = i < todayIndex;
          const isToday  = i === todayIndex;
          const isFuture = i > todayIndex;

          const barH = isFuture
            ? 4
            : Math.max(6, Math.round((day.uvDose / maxDose) * BAR_MAX_H));

          const labelColor = isToday ? colors.ink : colors.muted;

          return (
            <View key={day.label} style={wkSt.col}>
              <View style={[wkSt.barWrap, { height: BAR_MAX_H }]}>
                <WeekBar height={barH} isToday={isToday} isPast={isPast} delay={i * 50} />
              </View>
              <Text style={[wkSt.dayLabel, { color: labelColor, fontFamily: 'Outfit-Regular' }]}>
                {day.label}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={wkSt.footer}>
        <View style={wkSt.footerTextRow}>
          <Text style={wkSt.footerText}>Protected outdoor time</Text>
          <CountUpText
            value={complianceRate}
            format={(v) => `${Math.round(v)}%`}
            style={wkSt.footerPct}
          />
        </View>
        <View style={wkSt.footerTrack}>
          <View style={[wkSt.footerFill, { width: `${complianceRate}%` }]} />
        </View>
      </View>
    </ExpandableCard>
  );
});

// ─── Expanded-section styles (shared by all expandable cards) ──
const exSt = StyleSheet.create({
  sectionLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  chipText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.inkMid,
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
  },
  kvLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.muted,
  },
  kvValue: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.ink,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    marginTop: 4,
  },
  fill: {
    height: 8,
    borderRadius: 4,
  },
  verdict: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13.5,
    color: colors.inkMid,
    lineHeight: 20,
    marginBottom: 8,
  },
  note: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
    marginTop: 6,
  },
});

// ─── Protection pattern styles ────────────────────────────────
const ppSt = StyleSheet.create({
  lockedBody: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  lockWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  lockedTitle: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 8,
  },
  lockedSub: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    maxWidth: 280,
  },
  progressWrap: {
    width: '100%',
    gap: 8,
    alignItems: 'center',
  },
  progressBg: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.4,
  },
  sectionSpacing: {
    marginTop: 18,
  },
  heroRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  heroTile: {
    flex: 1.2,
    borderRadius: 18,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroVal: {
    fontFamily: 'Outfit-Regular',
    fontSize: 22,
    color: colors.white,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  heroLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.onDarkMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  miniStack: {
    flex: 1,
    gap: 10,
  },
  miniTile: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: colors.surface,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniVal: {
    fontFamily: 'Outfit-Regular',
    fontSize: 16,
    color: colors.ink,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  miniLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
    textAlign: 'center',
  },
  riskBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.redWash,
    borderRadius: 14,
    padding: 12,
  },
  riskIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riskTextWrap: {
    flex: 1,
  },
  riskLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: colors.muted,
  },
  riskValue: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.ink,
    marginTop: 1,
  },
  compareRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 10,
    marginBottom: 10,
    height: 92,
  },
  centerTitle: {
    textAlign: 'center',
  },
  compareCol: {
    alignItems: 'center',
    width: 56,
  },
  compareBarBg: {
    width: 28,
    height: 56,
    borderRadius: 8,
    backgroundColor: colors.surface,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: 6,
  },
  compareBarFill: {
    width: '100%',
    borderRadius: 8,
  },
  compareScore: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.ink,
    textAlign: 'center',
  },
  compareLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
    textAlign: 'center',
  },
});

// ─── Protection Pattern card ──────────────────────────────────
const ProtectionPatternCard = React.memo(function ProtectionPatternCard({ pattern, patterns, onExplore }) {
  const { totalSessions, reapplyInterval, depletionFasterPct, firstAlertTime } = pattern;
  const THRESHOLD  = 10;
  const isUnlocked = totalSessions >= THRESHOLD;
  const progress   = Math.min(totalSessions / THRESHOLD, 1);

  return (
    <ExpandableCard
      glass
      icon="sparkles"
      title="Your Protection Pattern"
      linkLabel={isUnlocked ? 'Explore All Insights' : undefined}
      onLinkPress={onExplore}
      expandedContent={isUnlocked ? (
        <View>
          <Text style={[exSt.sectionLabel, ppSt.centerTitle]}>Critical window</Text>
          <Text style={exSt.note}>{patterns.riskWindow.text}</Text>

          <Text style={[exSt.sectionLabel, ppSt.sectionSpacing, ppSt.centerTitle]}>Where your habits slip</Text>
          <View style={ppSt.compareRow}>
            <View style={ppSt.compareCol}>
              <View style={ppSt.compareBarBg}>
                <View style={[ppSt.compareBarFill, { height: '58%', backgroundColor: colors.warning }]} />
              </View>
              <Text style={ppSt.compareScore}>58</Text>
              <Text style={ppSt.compareLabel}>Beach</Text>
            </View>
            <View style={ppSt.compareCol}>
              <View style={ppSt.compareBarBg}>
                <View style={[ppSt.compareBarFill, { height: '81%', backgroundColor: colors.protected }]} />
              </View>
              <Text style={ppSt.compareScore}>81</Text>
              <Text style={ppSt.compareLabel}>Park</Text>
            </View>
          </View>
          <Text style={exSt.note}>{patterns.weakSpot}</Text>

          <View style={[exSt.kvRow, ppSt.sectionSpacing]}>
            <Text style={exSt.kvLabel}>Top depletion driver</Text>
            <Text style={exSt.kvValue}>UV intensity</Text>
          </View>
          <View style={exSt.kvRow}>
            <Text style={exSt.kvLabel}>Alert trigger</Text>
            <Text style={exSt.kvValue}>UV 6+ while active</Text>
          </View>
        </View>
      ) : (
        <View>
          <Text style={exSt.note}>
            Sureva learns your skin with every session. At {THRESHOLD} sessions you'll unlock:
          </Text>
          {[
            'Your personal reapplication window',
            'Your highest-risk time of day',
            'Your depletion rate vs people like you',
          ].map((item) => (
            <View key={item} style={exSt.kvRow}>
              <Text style={exSt.kvLabel}>{item}</Text>
              <Ionicons name="lock-closed" size={13} color={colors.muted} />
            </View>
          ))}
        </View>
      )}
    >
      {isUnlocked ? (
        <View>
          <View style={ppSt.heroRow}>
            <LinearGradient
              colors={[colors.gradOrangeStart, colors.gradOrangeEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={ppSt.heroTile}
            >
              <Text style={ppSt.heroVal}>{reapplyInterval}</Text>
              <Text style={ppSt.heroLabel}>Reapply Window</Text>
            </LinearGradient>
            <View style={ppSt.miniStack}>
              <View style={ppSt.miniTile}>
                <Text style={ppSt.miniVal}>+{depletionFasterPct}%</Text>
                <Text style={ppSt.miniLabel}>Faster Depletion</Text>
              </View>
              <View style={ppSt.miniTile}>
                <Text style={ppSt.miniVal}>{firstAlertTime}</Text>
                <Text style={ppSt.miniLabel}>First Alert</Text>
              </View>
            </View>
          </View>
          <View style={ppSt.riskBanner}>
            <View style={ppSt.riskIconWrap}>
              <Ionicons name="flame" size={16} color={colors.danger} />
            </View>
            <View style={ppSt.riskTextWrap}>
              <Text style={ppSt.riskLabel}>Highest-risk window</Text>
              <Text style={ppSt.riskValue}>{patterns.riskWindow.label}</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={ppSt.lockedBody}>
          <View style={ppSt.lockWrap}>
            <Ionicons name="lock-closed" size={22} color={colors.muted} />
          </View>
          <Text style={ppSt.lockedTitle}>Complete 10 sessions to unlock</Text>
          <Text style={ppSt.lockedSub}>
            Your personal protection insights will appear here after 10 sessions. You have {totalSessions} so far.
          </Text>
          <View style={ppSt.progressWrap}>
            <View style={ppSt.progressBg}>
              <LinearGradient
                colors={[colors.gradOrangeStart, colors.gradOrangeEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[ppSt.progressFill, { width: `${progress * 100}%` }]}
              />
            </View>
            <Text style={ppSt.progressLabel}>{totalSessions} / {THRESHOLD}</Text>
          </View>
        </View>
      )}
    </ExpandableCard>
  );
});

// ─── Device card ──────────────────────────────────────────────
const DeviceCard = React.memo(function DeviceCard({ device, onDragStart, onDragEnd }) {
  const batColor = device.battery > 30 ? colors.protected : colors.warning;
  const dotColor = device.connected ? colors.protected : colors.danger;
  const [guideVisible, setGuideVisible] = useState(false);
  const openGuide  = useCallback(() => setGuideVisible(true), []);
  const closeGuide = useCallback(() => setGuideVisible(false), []);
  const tourTargetRef = useTourTarget('device');

  return (
    <View style={devSt.wrap} ref={tourTargetRef}>
      <CleanGlassSurface borderRadius={28} />
      <CardHeader
        icon="bluetooth"
        title="My Device"
        subtitle={device.connected ? 'Connected' : 'Disconnected'}
        actionIcon="information-circle-outline"
        onActionPress={openGuide}
      />

      <DeviceGuideModal visible={guideVisible} onClose={closeGuide} />

      <View style={devSt.body}>
      {/* Centered 3D device — gently sways up and down; LED blinks green when connected */}
      <View style={devSt.illustrationArea}>
        <Device3D
          gesture={device.connected ? 'connected' : 'intro'}
          transparent
          draggable
          pressable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
      </View>

      {/* Name + connection */}
      <View style={devSt.nameRow}>
        <View style={[devSt.statusDot, { backgroundColor: dotColor }]} />
        <Text style={devSt.name}>{device.name}</Text>
      </View>

      {/* Battery row */}
      <View style={devSt.batteryRow}>
        <View style={devSt.batOuter}>
          <View style={devSt.batBody}>
            <View style={[devSt.batFill, { width: `${device.battery}%`, backgroundColor: batColor }]} />
          </View>
          <View style={devSt.batNub} />
        </View>
        <Text style={[devSt.batPct, { color: batColor }]}>{device.battery}%</Text>
      </View>

      {/* Last synced */}
      <Text style={devSt.lastSynced}>Last synced {device.lastSynced}</Text>
      </View>
    </View>
  );
});

// ─── Main screen ──────────────────────────────────────────────
export default function HomeScreen({ onSignOut, onNavigateTab, isActiveTab }) {
  const { user, userProfile, profileImage } = useAuth();
  // device stays mock — there's no BLE hardware yet, so no real source for it.
  // conditions (live UV/temp/humidity) now come from the same WeatherService
  // the Forecast tab uses, so the two screens can't show different "right now"
  // numbers; todayStats/weeklySnapshot/protectionPattern below are real,
  // computed from persisted sessions.
  const { device } = mockData;
  // Last session card runs on the full session record so it can deep-link
  // into the same detail view History uses. All the real card data (last
  // session + the three stat cards) comes from one getSessions fetch — null
  // state = still loading (mock shows as placeholder), resolved = real.
  const [realLastSession, setRealLastSession] = useState(null);
  const [realLastDetail, setRealLastDetail] = useState(null);
  const [realTodayStats, setRealTodayStats] = useState(null);
  const [realWeeklySnapshot, setRealWeeklySnapshot] = useState(null);
  const [realProtectionPattern, setRealProtectionPattern] = useState(null);
  const [realTodayDosePercent, setRealTodayDosePercent] = useState(null);
  const loadHomeData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data: rows, error } = await SupabaseService.getSessions(user.id);
      if (error || !rows) return; // fetch failed → keep whatever's already loaded
      const profile = engineProfileFor({}, userProfile);
      // Always computed, even for rows = [] (every helper is safe on an
      // empty array — see their own comments) — a signed-in user always
      // sees real (possibly zero) data, never fabricated mock content. Only
      // the "most recent session" fetch below stays conditional, since
      // there's genuinely nothing to fetch when there are no sessions;
      // realLastSession/realLastDetail staying null is exactly the signal
      // LastSessionCard already checks for its own empty state.
      setRealTodayStats(computeTodayStats(rows));
      setRealWeeklySnapshot(computeWeeklySnapshot(rows));
      setRealProtectionPattern(computeProtectionPattern(rows));
      setRealTodayDosePercent(computeTodayDosePercent(rows, profile.fitzpatrickType));
      if (rows.length) {
        const mostRecent = rows[0];
        setRealLastSession(buildSessionHero(mostRecent, profile.fitzpatrickType));
        const { data: fullRow } = await SupabaseService.getSessionById(mostRecent.id);
        if (fullRow) setRealLastDetail(buildSessionDetail(fullRow, profile, rows.slice(1)));
      }
    } catch {
      // Leave whatever's already loaded in place.
    }
  }, [user, userProfile]);
  useEffect(() => { loadHomeData(); }, [loadHomeData]);
  // The syncing-screen-triggered loadHomeData() call below can fire before
  // the session's actual Supabase writes land (that screen's animation runs
  // on a fixed timer, not tied to the network calls) — this is the
  // guaranteed-correct refresh, timed to when the save actually finishes.
  useEffect(() => onSessionSaved(loadHomeData), [loadHomeData]);

  // Live "Conditions right now" chips — the exact same WeatherService.getForecast
  // call the Forecast tab makes, so the UV/temp/humidity shown here can't drift
  // from what that screen shows. null = still loading (or location denied / fetch
  // failed), in which case the mock conditions stand in so the chips never blank
  // out or crash. Fetched once on mount, mirroring ForecastScreen (which also
  // fetches only on mount and keeps no refresh-on-return trigger of its own).
  const [realConditions, setRealConditions] = useState(null);
  const loadConditions = useCallback(async () => {
    try {
      const profile = engineProfileFor({}, userProfile);
      const result = await getForecast(profile.fitzpatrickType);
      // Location denied or a bad/empty payload → keep the mock fallback.
      if (!result || result.error || !result.today) return;
      const { currentUV, currentTemp, currentHumidity } = result.today;
      if (currentTemp == null || currentHumidity == null) return;
      setRealConditions({ uvIndex: currentUV, temperature: currentTemp, humidity: currentHumidity });
    } catch {
      // Network/API failure → leave the mock conditions in place.
    }
  }, [userProfile]);
  useEffect(() => { loadConditions(); }, [loadConditions]);

  // conditions stays mock-backed (live weather, unrelated to session
  // history — already correct). Everything else below is real-or-honest-
  // empty now: lastFull/lastDetail stay null until a real session exists
  // (the exact signal LastSessionCard checks for); the rest fall back only
  // to the EMPTY_* zero shapes during the brief window before the first
  // fetch resolves, never to fabricated mock demo content.
  const conditions = realConditions ?? mockData.conditions;
  const lastFull   = realLastSession;
  const lastDetail = realLastDetail;
  // Minimal {spf, waterResistance, environment} only — never the full hero
  // object — so SessionSetupSheet's "use same settings" quick-confirm can't
  // leak stale fields (date, score, duration, ...) from the previous
  // session into the new one when handleSessionStart spreads this in.
  const lastSessionParams = lastFull
    ? { spf: lastFull.spf, waterResistance: lastFull.waterResistance, environment: lastFull.environment }
    : null;
  const homeDataLoading   = realTodayStats === null;
  const todayStats        = realTodayStats        ?? EMPTY_TODAY_STATS;
  const weeklySnapshot    = realWeeklySnapshot     ?? computeWeeklySnapshot([]);
  const protectionPattern = realProtectionPattern  ?? EMPTY_PROTECTION_PATTERN;
  const todayDosePercent  = realTodayDosePercent   ?? 0;
  const firstName = userProfile?.firstName || mockData.user.firstName;
  const lastName  = userProfile?.lastName  || mockData.user.lastName;
  const initials  = getInitials(firstName, lastName);
  const greeting  = getGreeting(firstName);
  const [sheetVisible, setSheetVisible]     = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [detailVisible, setDetailVisible]   = useState(false);
  const [trendsVisible, setTrendsVisible]   = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [elapsed, setElapsed]             = useState(0);
  // Real wall-clock anchor for the session, set once at start — the
  // setInterval below just ticks a display counter; this timestamp is
  // what elapsed gets reconciled against on every foreground return, so
  // backgrounding (where JS timers throttle/pause) never leaves the
  // on-screen elapsed time or protection % reading stale or wrong.
  const sessionStartTimestampRef = useRef(null);
  // 0 = session fully open (covering home); SCREEN_W = home visible underneath.
  const sessionX = useRef(new Animated.Value(SCREEN_W)).current;
  const scrollRef = useRef(null);

  // The device card's own PanResponder claims a horizontal drag, but that
  // doesn't stop the ScrollView's separate native scroll recognizer from
  // also starting — locking scrollEnabled for the duration is the reliable
  // fix, same pattern used for the Skin Age scratch card.
  const [deviceDragging, setDeviceDragging] = useState(false);
  const handleDeviceDragStart = useCallback(() => setDeviceDragging(true), []);
  const handleDeviceDragEnd   = useCallback(() => setDeviceDragging(false), []);
  // Same lock the root pager already respects for pushed screens like
  // Passport/Skin Age — reactive here since `active` toggles with the drag
  // instead of being locked for the whole screen's lifetime.
  useTabSwipeLock(deviceDragging);

  const profileBarTourRef = useTourTarget('profileBar');
  const profileButtonTourRef = useTourTarget('profileButton');
  const startSessionTourRef = useTourTarget('startSession');
  // DEBUG: force the welcome tour to replay on every refresh — flip to
  // true only while actively testing the tour itself.
  const FORCE_WELCOME_TOUR_EVERY_TIME = false;
  useEffect(() => {
    if (FORCE_WELCOME_TOUR_EVERY_TIME && user?.id) {
      AsyncStorage.removeItem(tourDoneKey(WELCOME_TOUR_ID, user.id)).catch(() => {});
    }
  }, [user?.id]);
  // Lets the user actually see Home for a couple of seconds before the
  // tour covers it. The tour's first card is a plain welcome message (no
  // spotlight), so this delay is the whole reason it doesn't just appear
  // instantly.
  const [tourReady, setTourReady] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setTourReady(true), 2000);
    return () => clearTimeout(id);
  }, []);
  useAutoStartTour(WELCOME_TOUR_ID, WELCOME_TOUR_STEPS, tourReady && isActiveTab);

  // Now part of the welcome tour itself (see tourSteps.js) instead of a
  // separate milestone — it used to fire as its own coach mark right after
  // the welcome tour finished, since mock data always satisfies "a week of
  // history" from the first launch.
  const trendsLinkTourRef = useTourTarget('trendsLink');

  // Tracks the ScrollView's live offset (no handler was bound to it before)
  // so the tour-scroll effect below can turn a target's on-screen position
  // into an absolute scrollTo offset instead of guessing.
  const scrollOffsetRef = useRef(0);
  const handleHomeScroll = useCallback((e) => {
    scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
  }, []);

  // The welcome tour's "device" step lives near the bottom of this
  // ScrollView, below the fold — scroll it into view as soon as that step
  // becomes active so TourOverlay isn't trying to spotlight something
  // that's still off-screen. "trendsLink" (the This Week card) sits further
  // down than the top of the fold on smaller screens, so it gets measured
  // and nudged into view rather than assumed visible; every earlier target
  // lives in the fixed header above the ScrollView, so scrolling back to
  // the top is enough for those.
  const { activeTour: tourActive, stepIndex: tourStepIndex } = useAppTour();
  useEffect(() => {
    if (tourActive?.id !== WELCOME_TOUR_ID) return;
    const step = tourActive.steps[tourStepIndex];
    if (!step || step.tab !== 'home') return; // only steps that land on Home
    if (step.target === 'device') {
      scrollRef.current?.scrollToEnd({ animated: true });
      return;
    }
    if (step.target === 'trendsLink') {
      const node = trendsLinkTourRef.current;
      if (node?.measureInWindow) {
        node.measureInWindow((x, y, w, h) => {
          // Aim for the card sitting a bit below the top of the visible
          // area (roughly where the spotlight tooltip below it has room),
          // and only move if it's meaningfully off from that already.
          const desiredTop = SCREEN_H * 0.3;
          const delta = y - desiredTop;
          if (Math.abs(delta) > 4) {
            scrollRef.current?.scrollTo({ y: Math.max(0, scrollOffsetRef.current + delta), animated: true });
          }
        });
      }
      return;
    }
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [tourActive, tourStepIndex]);

  const scrollToTop = useCallback(
    () => scrollRef.current?.scrollTo({ y: 0, animated: true }),
    []
  );
  useScrollToTop('home', scrollToTop);

  // DEBUG: compresses session time so depletion (and the Dynamic Island's
  // color transition) is visible in minutes instead of hours. Applied to
  // BOTH the foreground tick and the background wall-clock reconciliation
  // below so backgrounding the app (to actually look at the Island/Lock
  // Screen) doesn't get "corrected" back to real-time pace. Set back to 1
  // once done testing — this doesn't touch the depletion engine itself,
  // just how fast simulated session-seconds accumulate.
  const DEBUG_TIME_SCALE = 1;

  // Timer lives here so it keeps ticking even when home screen is visible
  useEffect(() => {
    if (!activeSession) return;
    const id = setInterval(() => setElapsed((s) => s + DEBUG_TIME_SCALE), 1000);
    return () => clearInterval(id);
  }, [activeSession]);

  // JS intervals throttle or pause entirely while backgrounded, so the
  // counter above silently falls behind real time. Reconciling against
  // the wall-clock start anchor on every return-to-foreground is what
  // keeps elapsed (and everything derived from it — protection %,
  // alert timing) honest instead of just resuming the stale count.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active' || !activeSession || sessionStartTimestampRef.current == null) return;
      const realElapsed = Math.floor(((Date.now() - sessionStartTimestampRef.current) / 1000) * DEBUG_TIME_SCALE);
      setElapsed((prev) => (realElapsed > prev ? realElapsed : prev));
    });
    return () => sub.remove();
  }, [activeSession]);

  // Open: slide the overlay in from the right (matches SessionDetailScreen's enter).
  const slideToSession = useCallback(() => {
    Animated.timing(sessionX, {
      toValue: 0, duration: 460, easing: IOS_EASE_OUT, useNativeDriver: true,
    }).start();
  }, [sessionX]);

  // Lets a tapped reapply notification bring the session screen into view
  // even if the user had navigated back to Home before backgrounding.
  useEffect(() => {
    return setActiveSessionOpener(() => { if (activeSession) slideToSession(); });
  }, [activeSession, slideToSession]);

  // Back button: timed ease-out slide-out, same as SessionDetailScreen's back press.
  const slideToHome = useCallback(() => {
    Animated.timing(sessionX, {
      toValue: SCREEN_W, duration: 260, easing: SESSION_EASE_OUT, useNativeDriver: true,
    }).start();
  }, [sessionX]);

  // Swipe-back release: spring off-screen carrying the flick velocity.
  const dismissSession = useCallback((velocity = 0) => {
    Animated.spring(sessionX, {
      toValue: SCREEN_W, velocity: velocity * 1000, ...SESSION_SPRING,
    }).start();
  }, [sessionX]);

  // Swipe that didn't cross the threshold: spring back to fully open.
  const settleSessionOpen = useCallback((velocity = 0) => {
    Animated.spring(sessionX, {
      toValue: 0, velocity: velocity * 1000, ...SESSION_SPRING,
    }).start();
  }, [sessionX]);

  const handleSessionStart = useCallback((params) => {
    setSheetVisible(false);
    setElapsed(0);
    const startedAt = Date.now();
    sessionStartTimestampRef.current = startedAt;
    // sessionId doubles as the wall-clock anchor — unique enough per
    // session and it's exactly the timestamp notification scheduling
    // needs to anchor off of, no separate uuid required.
    setActiveSession({ ...params, sessionId: startedAt });
    sessionX.setValue(SCREEN_W); // start off-screen, then slide in
    slideToSession();

    // Creates the real Supabase row in the background — the session starts
    // instantly above regardless of network latency. dbSessionId merges in
    // once it resolves; ActiveSessionScreen only needs it by session end
    // (readings/events are batch-written then), which is always well after
    // this resolves. A failure here just means this session never persists
    // (still no crash, no blocked UI) — matches CLAUDE.md's "never block the
    // whole screen" rule.
    if (user?.id) {
      SupabaseService.createSession(user.id, {
        start_time: new Date(startedAt).toISOString(),
        spf: params.spf,
        water_resistance_mins: params.waterResistance,
        placement: null,
        environment: params.environment ?? null,
        latitude: params.latitude ?? null,
        longitude: params.longitude ?? null,
        city: params.city ?? null,
        region: params.region ?? null,
      }).then(({ data, error }) => {
        if (error || !data) return;
        setActiveSession((prev) => (prev && prev.sessionId === startedAt ? { ...prev, dbSessionId: data.id } : prev));
      }).catch(() => {});
    }
  }, [slideToSession, sessionX, user]);

  // End of session → the post-session flow: the sync screen covers
  // everything immediately while the session detail mounts (and runs its
  // entrance) hidden underneath; the sync screen then fades itself out to
  // reveal it, and 1s later the check-in sheet rises.
  const [postFlow, setPostFlow] = useState(null); // null | 'syncing' | 'detail'
  // The just-ended session's real hero fields (from ActiveSessionScreen's
  // onSessionEnd payload) — null when persistence failed or hasn't
  // resolved, in which case the post-session flow falls back to lastFull.
  const [endedSession, setEndedSession] = useState(null);
  // The just-ended session's full joined-row shape (readings + events),
  // already built in memory by ActiveSessionScreen — lets the detail reveal
  // below skip its own getSessionById fetch entirely, so it never races the
  // background persistence write (see handleEndConfirm's comment).
  const [endedSessionRow, setEndedSessionRow] = useState(null);
  const [checkInVisible, setCheckInVisible] = useState(false);
  // The post-check-in streak reveal: { count, tierKey } while showing, else
  // null. Fed from the shared StreakContext, which has already refreshed off
  // the just-saved session by the time the check-in is dismissed.
  const [streakReveal, setStreakReveal] = useState(null);
  const { streak, refresh: refreshStreak } = useStreak();
  // Read the latest streak from a ref inside dismissCheckIn so the callback
  // never captures a stale value without needing streak in its deps.
  const streakRef = useRef(streak);
  streakRef.current = streak;
  // The prior session's Q1 check-in answer, for CheckInSheet's "went out
  // while recovering from irritation" pattern detection. Fetched once the
  // post-session flow starts so it's ready by the time the sheet opens.
  const [previousSkinFeelAfter, setPreviousSkinFeelAfter] = useState(null);
  const checkInTimer = useRef(null);
  useEffect(() => () => clearTimeout(checkInTimer.current), []);
  // The floating tab bar would sit on top of the sync screen and the
  // check-in sheet's buttons — hide it for the whole flow.
  // Also hide it during the streak reveal — the floating bar (rendered above
  // this screen from App.js) would otherwise cover the share sheet.
  useHideTabBar(!!postFlow || !!streakReveal);

  const handleSessionEnd = useCallback((payload) => {
    setActiveSession(null);
    setElapsed(0);
    sessionStartTimestampRef.current = null;
    // Sessions under 5 minutes are discarded (ActiveSessionScreen never
    // saves them) — nothing to sync, review, or check in on, so just
    // drop straight back to the idle Home screen.
    if (payload?.discarded) return;
    const session = payload?.session ?? null;
    setEndedSession(session);
    setEndedSessionRow(payload?.sessionDetailRow ?? null);
    setPostFlow('syncing');
    setPreviousSkinFeelAfter(null);
    if (user?.id) {
      SupabaseService.getLastCompletedCheckIn(user.id, session?.id ?? null)
        .then(({ data }) => setPreviousSkinFeelAfter(data ?? null))
        .catch(() => {});
    }
  }, [user]);

  const handleSyncComplete = useCallback(() => {
    setPostFlow('detail');
    checkInTimer.current = setTimeout(() => setCheckInVisible(true), 1000);
    loadHomeData(); // refresh Last Session + the three stat cards with what just ended
    refreshStreak(); // and the streak, so the reveal below reads the new day
  }, [loadHomeData, refreshStreak]);

  const closePostDetail = useCallback(() => {
    clearTimeout(checkInTimer.current);
    setCheckInVisible(false);
    setPostFlow(null);
  }, []);

  // Both paths out of CheckInSheet (skip and submit) converge here. Extend it
  // — don't fork it — to fire the streak reveal when the just-ended session
  // actually started or extended the streak. sessionsToday <= 1 means this was
  // the streak-defining session today (not a same-day repeat), so a second
  // session on an already-counted day doesn't re-nag.
  const dismissCheckIn = useCallback(() => {
    setCheckInVisible(false);
    const s = streakRef.current;
    if (s && s.todayLogged && s.currentStreak >= 1 && s.sessionsToday <= 1) {
      setStreakReveal({ count: s.currentStreak, tierKey: s.tier });
    }
  }, []);

  // Tapping the reveal (or its auto-advance) lands on the Streaks tab via the
  // app's existing tab-switch handler — a tab switch, not a stack push.
  const onStreakRevealDone = useCallback(() => {
    setStreakReveal(null);
    closePostDetail();
    onNavigateTab?.('streaks');
  }, [closePostDetail, onNavigateTab]);

  const openLastDetail  = useCallback(() => setDetailVisible(true), []);
  const closeLastDetail = useCallback(() => setDetailVisible(false), []);
  const openTrends      = useCallback(() => setTrendsVisible(true), []);
  const closeTrends     = useCallback(() => setTrendsVisible(false), []);
  const openSettings    = useCallback(() => setSettingsVisible(true), []);
  const goInsights      = useCallback(() => onNavigateTab?.('insights'), [onNavigateTab]);

  // Lets Quick Search jump straight to these without knowing this screen
  // owns them — same registry pattern as useScrollToTop. 'lastSession'
  // backs the Session Detail card results (they open the most recent one).
  useRegisterOpener('settings', openSettings);
  useRegisterOpener('trends', openTrends);
  useRegisterOpener('lastSession', openLastDetail);
  // Lets another tab (History's "Start Session" empty-state button) open
  // this screen's session-setup sheet remotely, via navigateTo({ tab:
  // 'home', opener: 'startSession' }) — same registry as the openers above.
  useRegisterOpener('startSession', () => setSheetVisible(true));

  // Swipe-right on the active session drags the overlay back over a stationary
  // home. Same gesture math as SessionDetailScreen; the *Capture handlers claim
  // a clear rightward drag before the inner ScrollView can grab it.
  const isBackSwipe = (dx, dy) => dx > 10 && Math.abs(dx) > Math.abs(dy) * 1.5;
  const sessionSwipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) => isBackSwipe(dx, dy),
      onMoveShouldSetPanResponderCapture: (_, { dx, dy }) => isBackSwipe(dx, dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, { dx }) => {
        if (dx > 0) sessionX.setValue(dx); // track the finger, right-only
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        if (dx > SESSION_SWIPE_THRESHOLD || vx > 0.5) dismissSession(vx);
        else settleSessionOpen(vx);
      },
      onPanResponderTerminate: () => settleSessionOpen(),
    })
  ).current;

  // Swipe-down on the profile bar opens Quick Search, tracking the finger
  // 1:1 like the app's other swipe gestures. Claimed only on a clearly
  // downward drag (onMoveShouldSetPanResponder, not onStart) so a plain tap
  // on the avatar/greeting underneath still reaches their own onPress.
  const quickSearch = useQuickSearch();
  const quickSearchRef = useRef(quickSearch);
  quickSearchRef.current = quickSearch;
  const isDownSwipe = (dx, dy) => dy > 10 && Math.abs(dy) > Math.abs(dx) * 1.5;
  const searchSwipe = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) => isDownSwipe(dx, dy),
      // The avatar/greeting underneath are Pressables that claim the
      // responder on touch-down — without the Capture variant too, a swipe
      // starting on top of them never reaches this at all. Same fix
      // sessionSwipe below already uses for the same reason.
      onMoveShouldSetPanResponderCapture: (_, { dx, dy }) => isDownSwipe(dx, dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => quickSearchRef.current.onGestureStart(),
      onPanResponderMove: (_, { dy }) => quickSearchRef.current.onGestureMove(Math.max(0, dy)),
      onPanResponderRelease: (_, { dy, vy }) => quickSearchRef.current.onGestureEnd(Math.max(0, dy), vy),
      onPanResponderTerminate: (_, { dy, vy }) => quickSearchRef.current.onGestureEnd(Math.max(0, dy), vy),
    })
  ).current;

  return (
    <View style={st.root}>
      {/* ── Home screen (stationary; the session overlay slides over it) ── */}
      <Animated.View style={StyleSheet.absoluteFill}>
        <SafeAreaView style={st.safe}>
          <StatusBar style="dark" />

          <View style={st.topBar} ref={profileBarTourRef} {...searchSwipe.panHandlers}>
            <View style={st.profileGroup} ref={profileButtonTourRef}>
              <ProfileAvatar initials={initials} profileImage={profileImage} onPress={() => setSettingsVisible(true)} />
              <Pressable style={st.greetingBlock} onPress={() => setSettingsVisible(true)} hitSlop={8}>
                <Text style={st.greeting}>{greeting.salutation}</Text>
                <Text style={st.greetingName} numberOfLines={1}>{greeting.name}</Text>
              </Pressable>
            </View>
            <View ref={startSessionTourRef}>
              <StartSessionPill
                sessionActive={!!activeSession}
                onPress={activeSession ? slideToSession : () => setSheetVisible(true)}
              />
            </View>
          </View>

          <Animated.ScrollView
            ref={scrollRef}
            style={st.scroll}
            contentContainerStyle={st.scrollContent}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={handleHomeScroll}
            decelerationRate="normal"
            scrollEnabled={!deviceDragging}
          >
            <SlideInView delay={40}>
              <ProtectionStatsCard
                stats={todayStats}
                conditions={conditions}
                dosePercent={todayDosePercent}
                empty={!homeDataLoading && todayStats.sessionsToday === 0}
                loading={homeDataLoading}
              />
            </SlideInView>
            <SlideInView delay={110}>
              <LastSessionCard
                session={lastFull}
                detail={lastDetail}
                onOpenDetail={openLastDetail}
                loading={homeDataLoading}
              />
            </SlideInView>
            <SlideInView delay={180}>
              <View ref={trendsLinkTourRef}>
                <WeeklySnapshotCard
                  snapshot={weeklySnapshot}
                  weeklyDose={lastDetail?.pattern?.weeklyDose ?? EMPTY_WEEKLY_DOSE}
                  onSeeAll={openTrends}
                  loading={homeDataLoading}
                />
              </View>
            </SlideInView>
            <SlideInView delay={250}>
              <ProtectionPatternCard
                pattern={protectionPattern}
                patterns={mockData.insights.patterns}
                onExplore={goInsights}
              />
            </SlideInView>
            <SlideInView delay={320}>
              <DeviceCard device={device} onDragStart={handleDeviceDragStart} onDragEnd={handleDeviceDragEnd} />
            </SlideInView>
            <View style={{ height: 40 }} />
          </Animated.ScrollView>

          <SessionSetupSheet
            visible={sheetVisible}
            lastSession={lastSessionParams}
            onStart={handleSessionStart}
            onDismiss={() => setSheetVisible(false)}
          />
        </SafeAreaView>
      </Animated.View>

      {/* ── Active session (slides in from right, stays mounted) ── */}
      {activeSession && (
        <Animated.View
          style={[StyleSheet.absoluteFill, { transform: [{ translateX: sessionX }] }]}
          {...sessionSwipe.panHandlers}
        >
          <ActiveSessionScreen
            sessionParams={activeSession}
            elapsed={elapsed}
            onBack={slideToHome}
            onSessionEnd={handleSessionEnd}
          />
        </Animated.View>
      )}

      {/* ── Last session full report (same detail view History uses) ── */}
      {detailVisible && (
        <View style={StyleSheet.absoluteFill}>
          <SessionDetailScreen session={lastFull} onBack={closeLastDetail} scrollKey="home" />
        </View>
      )}

      {/* ── Exposure trends (weeks / months / year charts) ── */}
      {trendsVisible && <TrendsScreen onBack={closeTrends} />}

      {/* ── Settings (slides in from right as modal) ── */}
      <SettingsScreen
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        onSignOut={onSignOut}
      />

      {/* ── Post-session flow: sync → detail reveal → check-in sheet ── */}
      {postFlow && (
        <View style={StyleSheet.absoluteFill}>
          {/* Real just-ended session when persistence succeeded; falls back
              to the latest known session (mock, for a brand-new user with
              no real sessions yet) only if it didn't. */}
          <SessionDetailScreen
            session={endedSession ?? lastFull}
            onBack={closePostDetail}
            scrollKey="home"
            initialRow={endedSession ? endedSessionRow : null}
          />
          {checkInVisible && (
            <CheckInSheet
              session={endedSession ?? lastFull}
              previousSkinFeelAfter={previousSkinFeelAfter}
              onDismiss={dismissCheckIn}
            />
          )}
          {postFlow === 'syncing' && <SessionSyncScreen onComplete={handleSyncComplete} />}
        </View>
      )}

      {/* ── Post-check-in streak reveal (sits above everything) ── */}
      {streakReveal && (
        <StreakRevealOverlay
          count={streakReveal.count}
          tierKey={streakReveal.tierKey}
          onDone={onStreakRevealDone}
        />
      )}
    </View>
  );
}

// ─── Screen styles ────────────────────────────────────────────
const st = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
    overflow: 'hidden',
  },
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
    gap: 12,
    backgroundColor: colors.canvas,
  },
  // Avatar + greeting grouped so the tour can spotlight just the tappable
  // "open Settings" region, separate from the Start Session pill.
  profileGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    alignSelf: 'flex-start',
    marginTop: -2,
  },
  avatarText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 17,
    color: colors.white,
    letterSpacing: 0.6,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  greetingBlock: {
    flex: 1,
  },
  greeting: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.muted,
    letterSpacing: 0.1,
    marginBottom: 1,
  },
  greetingName: {
    fontFamily: 'Outfit-Regular',
    fontSize: 24,
    lineHeight: 28,
    color: colors.ink,
    letterSpacing: -0.6,
  },
  pillShadow: {
    borderRadius: 24,
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
  },
  pillText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.white,
    letterSpacing: 0.1,
  },
  pillActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.protected,
    backgroundColor: colors.white,
  },
  pillDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.protected,
  },
  pillActiveText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.ink,
    letterSpacing: 0.1,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 120,
    gap: 12,
  },
});

// ─── Protection stats styles ──────────────────────────────────
const psSt = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  heroTile: {
    width: '47.5%',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 14,
    gap: 4,
  },
  heroVal: {
    fontFamily: 'Outfit-Regular',
    fontSize: 24,
    color: colors.white,
    letterSpacing: -0.6,
  },
  heroLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
  },
  tile: {
    width: '47.5%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 14,
    gap: 4,
  },
  tileVal: {
    fontFamily: 'Outfit-Regular',
    fontSize: 24,
    color: colors.ink,
    letterSpacing: -0.6,
  },
  tileLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.muted,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.orangeWash,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: 'Outfit-Regular',
    fontSize: 16,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyMsg: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 260,
  },
});

// ─── Last session styles ──────────────────────────────────────
const lsSt = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    position: 'relative',
    paddingHorizontal: 22,
  },
  stat: {
    flex: 1,
    flexBasis: 0,
    justifyContent: 'center',
  },
  statLeft: {
    alignItems: 'flex-start',
  },
  // Absolutely centered across the full row so the score sits at the true
  // card center regardless of the left/right column widths or dividers.
  statCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
  },
  statRight: {
    alignItems: 'flex-end',
  },
  // Value sits centered over its own label word, independent of how the
  // column block is aligned within the row.
  statInner: {
    alignItems: 'center',
  },
  statVal: {
    fontFamily: 'Outfit-Regular',
    fontSize: 18,
    color: colors.ink,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  statValAccent: {
    color: colors.orange,
  },
  statLabel: {
    marginTop: 4,
    fontFamily: 'Outfit-Regular',
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 1,
    textAlign: 'center',
  },
  statDivider: {
    position: 'absolute',
    top: '50%',
    marginTop: -17,
    width: 1,
    height: 34,
    backgroundColor: colors.border,
  },
  // Symmetric separators sitting between the left/center and center/right
  // blocks (the score is absolutely centered, so these are placed by hand).
  statDividerLeft: {
    left: '38%',
  },
  statDividerRight: {
    right: '38%',
  },
  peakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.orangeWash,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  peakVal: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.orangeDark,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.orangeWash,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: 'Outfit-Regular',
    fontSize: 16,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyMsg: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 260,
  },
});

// ─── Weekly snapshot styles ───────────────────────────────────
const wkSt = StyleSheet.create({
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  col: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  barWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: 18,
    borderRadius: 6,
  },
  barClip: {
    width: 18,
    borderRadius: 6,
    overflow: 'hidden',
  },
  dayLabel: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
  footer: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  footerTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.muted,
  },
  footerPct: {
    fontFamily: 'Outfit-Regular',
    fontSize: 16,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  footerTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  footerFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.protected,
  },
});

// ─── Device illustration styles ───────────────────────────────
// ─── Device card styles ───────────────────────────────────────
const devSt = StyleSheet.create({
  wrap: {
    borderRadius: 28,
    padding: 20,
    overflow: 'hidden',
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 3,
  },
  body: {
    alignItems: 'center',
  },
  illustrationArea: {
    width: 130,
    height: 130,
    marginBottom: 18,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  name: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    color: colors.ink,
    letterSpacing: -0.1,
  },
  batteryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  batOuter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  batBody: {
    width: 32,
    height: 14,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.muted,
    padding: 2,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  batFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  batNub: {
    width: 3,
    height: 7,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    backgroundColor: colors.muted,
  },
  batPct: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
  },
  lastSynced: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: colors.muted,
  },
});
