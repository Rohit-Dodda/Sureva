import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet,
  SafeAreaView, Pressable, Animated, Dimensions, Easing, Image, PanResponder,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../constants/colors';
import mockData from '../constants/mockData';
import { useAuth } from '../context/AuthContext';
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
import TrendsScreen from './TrendsScreen';
import { useScrollToTop } from '../context/ScrollToTopContext';
import { useHideTabBar } from '../context/TabBarVisibilityContext';
import { useTabSwipeLock } from '../context/SwipeNavContext';
import { useQuickSearch, useRegisterOpener } from '../context/QuickSearchContext';
import { useTourTarget, useAutoStartTour, useAppTour, tourDoneKey } from '../context/AppTourContext';
import { WELCOME_TOUR_ID, WELCOME_TOUR_STEPS } from '../constants/tourSteps';

const SCREEN_W = Dimensions.get('window').width;
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
const ProtectionStatsCard = React.memo(function ProtectionStatsCard({ stats, conditions, dosePercent }) {
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
            <Text style={[exSt.kvValue, { color: doseColor }]}>{dosePercent}% of safe limit</Text>
          </View>
          <View style={exSt.track}>
            <View style={[exSt.fill, { width: `${dosePercent}%`, backgroundColor: doseColor }]} />
          </View>
        </View>
      }
    >
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
    </ExpandableCard>
  );
});

// ─── Last Session card ────────────────────────────────────────
const LastSessionCard = React.memo(function LastSessionCard({ session, detail, onOpenDetail }) {
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
          <Text style={exSt.verdict}>“{detail.verdict}”</Text>
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
        <View style={lsSt.stat}>
          <Text style={lsSt.statVal}>{session.duration}</Text>
          <Text style={lsSt.statLabel}>DURATION</Text>
        </View>
        <View style={lsSt.statDivider} />
        <View style={lsSt.stat}>
          <Text style={[lsSt.statVal, lsSt.statValAccent]}>{session.score}</Text>
          <Text style={lsSt.statLabel}>SCORE</Text>
        </View>
        <View style={lsSt.statDivider} />
        <View style={lsSt.stat}>
          <Text style={lsSt.statVal}>SPF {session.spf}</Text>
          <Text style={lsSt.statLabel}>{session.environment}</Text>
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

const WeeklySnapshotCard = React.memo(function WeeklySnapshotCard({ snapshot, weeklyDose, onSeeAll }) {
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
            <Text style={[exSt.kvValue, { color: budgetColor }]}>
              {weeklyDose.meds} of {weeklyDose.limit} MEDs
            </Text>
          </View>
          <View style={exSt.track}>
            <View style={[exSt.fill, { width: `${budgetPct}%`, backgroundColor: budgetColor }]} />
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
              <Text style={[wkSt.dayLabel, { color: labelColor, fontFamily: isToday ? 'SpaceGrotesk-SemiBold' : 'Inter-Regular' }]}>
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
    fontFamily: 'SpaceGrotesk-SemiBold',
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
    fontFamily: 'SpaceGrotesk-SemiBold',
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
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.muted,
  },
  kvValue: {
    fontFamily: 'SpaceGrotesk-SemiBold',
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
    fontFamily: 'Inter-Medium',
    fontSize: 13.5,
    color: colors.inkMid,
    lineHeight: 20,
    marginBottom: 8,
  },
  note: {
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 15,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 8,
  },
  lockedSub: {
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'SpaceGrotesk-SemiBold',
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
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 22,
    color: colors.white,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  heroLabel: {
    fontFamily: 'Inter-Medium',
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
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 16,
    color: colors.ink,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  miniLabel: {
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: colors.muted,
  },
  riskValue: {
    fontFamily: 'SpaceGrotesk-SemiBold',
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
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 14,
    color: colors.ink,
    textAlign: 'center',
  },
  compareLabel: {
    fontFamily: 'Inter-Regular',
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
  const { conditions, lastSession, device, todayStats, weeklySnapshot, protectionPattern } = mockData;
  // Last session card runs on the full session record so it can deep-link
  // into the same detail view History uses
  const lastFull   = mockData.sessions[0];
  const lastDetail = mockData.sessionDetails[lastFull.id];
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

  // The welcome tour's "device" step lives near the bottom of this
  // ScrollView, below the fold — scroll it into view as soon as that step
  // becomes active so TourOverlay isn't trying to spotlight something
  // that's still off-screen. Earlier steps all live above the fold, so
  // scroll back to the top for those.
  const { activeTour: tourActive, stepIndex: tourStepIndex } = useAppTour();
  useEffect(() => {
    if (tourActive?.id !== WELCOME_TOUR_ID) return;
    const step = tourActive.steps[tourStepIndex];
    if (!step || step.tab !== 'home') return; // only steps that land on Home
    if (step.target === 'device') {
      scrollRef.current?.scrollToEnd({ animated: true });
    } else {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [tourActive, tourStepIndex]);

  const scrollToTop = useCallback(
    () => scrollRef.current?.scrollTo({ y: 0, animated: true }),
    []
  );
  useScrollToTop('home', scrollToTop);

  // Timer lives here so it keeps ticking even when home screen is visible
  useEffect(() => {
    if (!activeSession) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [activeSession]);

  // Open: slide the overlay in from the right (matches SessionDetailScreen's enter).
  const slideToSession = useCallback(() => {
    Animated.timing(sessionX, {
      toValue: 0, duration: 460, easing: IOS_EASE_OUT, useNativeDriver: true,
    }).start();
  }, [sessionX]);

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
    setActiveSession(params);
    sessionX.setValue(SCREEN_W); // start off-screen, then slide in
    slideToSession();
  }, [slideToSession, sessionX]);

  // End of session → the post-session flow: the sync screen covers
  // everything immediately while the session detail mounts (and runs its
  // entrance) hidden underneath; the sync screen then fades itself out to
  // reveal it, and 1s later the check-in sheet rises.
  const [postFlow, setPostFlow] = useState(null); // null | 'syncing' | 'detail'
  const [checkInVisible, setCheckInVisible] = useState(false);
  const checkInTimer = useRef(null);
  useEffect(() => () => clearTimeout(checkInTimer.current), []);
  // The floating tab bar would sit on top of the sync screen and the
  // check-in sheet's buttons — hide it for the whole flow.
  useHideTabBar(!!postFlow);

  const handleSessionEnd = useCallback(() => {
    setActiveSession(null);
    setElapsed(0);
    setPostFlow('syncing');
  }, []);

  const handleSyncComplete = useCallback(() => {
    setPostFlow('detail');
    checkInTimer.current = setTimeout(() => setCheckInVisible(true), 1000);
  }, []);

  const closePostDetail = useCallback(() => {
    clearTimeout(checkInTimer.current);
    setCheckInVisible(false);
    setPostFlow(null);
  }, []);

  const dismissCheckIn = useCallback(() => setCheckInVisible(false), []);

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
            decelerationRate="normal"
            scrollEnabled={!deviceDragging}
          >
            <SlideInView delay={40}>
              <ProtectionStatsCard
                stats={todayStats}
                conditions={conditions}
                dosePercent={mockData.uvDose.todayPercent}
              />
            </SlideInView>
            <SlideInView delay={110}>
              <LastSessionCard session={lastFull} detail={lastDetail} onOpenDetail={openLastDetail} />
            </SlideInView>
            <SlideInView delay={180}>
              <View ref={trendsLinkTourRef}>
                <WeeklySnapshotCard
                  snapshot={weeklySnapshot}
                  weeklyDose={lastDetail.pattern.weeklyDose}
                  onSeeAll={openTrends}
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
            lastSession={lastSession}
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
          {/* MOCK: the completed session reuses the latest mock session so
              the flow is always demonstrable. TODO: pass the real ended
              session's computed summary once live sessions are wired. */}
          <SessionDetailScreen session={lastFull} onBack={closePostDetail} scrollKey="home" />
          {checkInVisible && (
            <CheckInSheet
              session={lastFull}
              // TODO: read the actual previous session's postSession answer.
              previousSkinFeelAfter={null}
              onDismiss={dismissCheckIn}
            />
          )}
          {postFlow === 'syncing' && <SessionSyncScreen onComplete={handleSyncComplete} />}
        </View>
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
    fontFamily: 'SpaceGrotesk-SemiBold',
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
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: colors.muted,
    letterSpacing: 0.1,
    marginBottom: 1,
  },
  greetingName: {
    fontFamily: 'SpaceGrotesk-Bold',
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
    fontFamily: 'SpaceGrotesk-SemiBold',
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
    fontFamily: 'SpaceGrotesk-SemiBold',
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
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 24,
    color: colors.white,
    letterSpacing: -0.6,
  },
  heroLabel: {
    fontFamily: 'Inter-Medium',
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
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 24,
    color: colors.ink,
    letterSpacing: -0.6,
  },
  tileLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.muted,
  },
});

// ─── Last session styles ──────────────────────────────────────
const lsSt = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statVal: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 18,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  statValAccent: {
    color: colors.orange,
  },
  statLabel: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 1,
  },
  statDivider: {
    width: 1,
    height: 34,
    backgroundColor: colors.border,
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
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 13,
    color: colors.orangeDark,
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
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.muted,
  },
  footerPct: {
    fontFamily: 'SpaceGrotesk-Bold',
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
    fontFamily: 'SpaceGrotesk-SemiBold',
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
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 13,
  },
  lastSynced: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: colors.muted,
  },
});
