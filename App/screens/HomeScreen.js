import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  SafeAreaView, Pressable, Animated, Dimensions, Easing, Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import mockData from '../constants/mockData';
import { useAuth } from '../context/AuthContext';
import SessionSetupSheet from '../components/SessionSetupSheet';
import SlideInView from '../components/SlideInView';
import CountUpText from '../components/CountUpText';
import CardHeader from '../components/CardHeader';
import ExpandableCard from '../components/ExpandableCard';
import DeviceGuideModal from '../components/DeviceGuideModal';
import Device3D from '../components/onboarding/Device3D';
import ActiveSessionScreen from './ActiveSessionScreen';
import SettingsScreen from './SettingsScreen';
import SessionDetailScreen from './SessionDetailScreen';
import TrendsScreen from './TrendsScreen';
import { useScrollToTop } from '../context/ScrollToTopContext';

const SCREEN_W = Dimensions.get('window').width;

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
    { icon: 'walk-outline',        label: conditions.activity },
  ];
  const doseColor =
    dosePercent < 50 ? colors.protected :
    dosePercent < 80 ? colors.warning : colors.danger;

  return (
    <ExpandableCard
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
  insightList: {
    gap: 0,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 14,
  },
  insightRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  insightIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.orangeWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.ink,
    lineHeight: 20,
  },
});

// ─── Protection Pattern card ──────────────────────────────────
const ProtectionPatternCard = React.memo(function ProtectionPatternCard({ pattern, patterns, onExplore }) {
  const { totalSessions, reapplyInterval, depletionFasterPct, firstAlertTime } = pattern;
  const THRESHOLD  = 10;
  const isUnlocked = totalSessions >= THRESHOLD;
  const progress   = Math.min(totalSessions / THRESHOLD, 1);

  const insights = [
    { icon: 'timer-outline',         text: `You typically need to reapply every ${reapplyInterval}` },
    { icon: 'trending-up-outline',   text: `Your skin depletes sunscreen ${depletionFasterPct}% faster than average` },
    { icon: 'notifications-outline', text: `You usually get your first alert around ${firstAlertTime} into a session` },
  ];

  return (
    <ExpandableCard
      icon="sparkles"
      title="Your Protection Pattern"
      linkLabel={isUnlocked ? 'Explore All Insights' : undefined}
      onLinkPress={onExplore}
      expandedContent={isUnlocked ? (
        <View>
          <View style={exSt.kvRow}>
            <Text style={exSt.kvLabel}>Critical window</Text>
            <Text style={exSt.kvValue}>{patterns.riskWindow.label}</Text>
          </View>
          <View style={exSt.kvRow}>
            <Text style={exSt.kvLabel}>Alert trigger</Text>
            <Text style={exSt.kvValue}>UV 6+ while active</Text>
          </View>
          <Text style={exSt.note}>{patterns.weakSpot}</Text>
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
        <View style={ppSt.insightList}>
          {insights.map((item, i) => (
            <View key={i} style={[ppSt.insightRow, i < insights.length - 1 && ppSt.insightRowBorder]}>
              <View style={ppSt.insightIconWrap}>
                <Ionicons name={item.icon} size={18} color={colors.orangeDark} />
              </View>
              <Text style={ppSt.insightText}>{item.text}</Text>
            </View>
          ))}
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
const DeviceCard = React.memo(function DeviceCard({ device }) {
  const batColor = device.battery > 30 ? colors.protected : colors.warning;
  const dotColor = device.connected ? colors.protected : colors.danger;
  const [guideVisible, setGuideVisible] = useState(false);
  const openGuide  = useCallback(() => setGuideVisible(true), []);
  const closeGuide = useCallback(() => setGuideVisible(false), []);

  return (
    <View style={devSt.wrap}>
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
        <Device3D gesture={device.connected ? 'connected' : 'intro'} background={colors.white} />
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
export default function HomeScreen({ onSignOut, onNavigateTab }) {
  const { userProfile, profileImage } = useAuth();
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
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef(null);

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

  const slideToSession = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 1, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const slideToHome = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const handleSessionStart = useCallback((params) => {
    setSheetVisible(false);
    setElapsed(0);
    setActiveSession(params);
    slideToSession();
  }, [slideToSession]);

  const handleSessionEnd = useCallback(() => {
    slideToHome();
    // Clear session only after slide-back completes so screen stays mounted during animation
    setTimeout(() => {
      setActiveSession(null);
      setElapsed(0);
    }, 340);
  }, [slideToHome]);

  const openLastDetail  = useCallback(() => setDetailVisible(true), []);
  const closeLastDetail = useCallback(() => setDetailVisible(false), []);
  const openTrends      = useCallback(() => setTrendsVisible(true), []);
  const closeTrends     = useCallback(() => setTrendsVisible(false), []);
  const goInsights      = useCallback(() => onNavigateTab?.('insights'), [onNavigateTab]);

  const homeTranslateX    = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -SCREEN_W] });
  const sessionTranslateX = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_W, 0] });

  return (
    <View style={st.root}>
      {/* ── Home screen (slides left when session is active) ── */}
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: homeTranslateX }] }]}>
        <SafeAreaView style={st.safe}>
          <StatusBar style="dark" />

          <View style={st.topBar}>
            <ProfileAvatar initials={initials} profileImage={profileImage} onPress={() => setSettingsVisible(true)} />
            <View style={st.greetingBlock}>
              <Text style={st.greeting}>{greeting.salutation}</Text>
              <Text style={st.greetingName} numberOfLines={1}>{greeting.name}</Text>
            </View>
            <StartSessionPill
              sessionActive={!!activeSession}
              onPress={activeSession ? slideToSession : () => setSheetVisible(true)}
            />
          </View>

          <ScrollView
            ref={scrollRef}
            style={st.scroll}
            contentContainerStyle={st.scrollContent}
            showsVerticalScrollIndicator={false}
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
              <WeeklySnapshotCard
                snapshot={weeklySnapshot}
                weeklyDose={lastDetail.pattern.weeklyDose}
                onSeeAll={openTrends}
              />
            </SlideInView>
            <SlideInView delay={250}>
              <ProtectionPatternCard
                pattern={protectionPattern}
                patterns={mockData.insights.patterns}
                onExplore={goInsights}
              />
            </SlideInView>
            <SlideInView delay={320}>
              <DeviceCard device={device} />
            </SlideInView>
            <View style={{ height: 40 }} />
          </ScrollView>

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
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: sessionTranslateX }] }]}>
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
    backgroundColor: colors.white,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
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
