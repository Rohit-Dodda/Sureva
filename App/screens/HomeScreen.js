import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  SafeAreaView, Pressable, Animated, Dimensions, Easing, Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import colors from '../constants/colors';
import mockData from '../constants/mockData';
import { useAuth } from '../context/AuthContext';
import SessionSetupSheet from '../components/SessionSetupSheet';
import ActiveSessionScreen from './ActiveSessionScreen';
import SettingsScreen from './SettingsScreen';

const SCREEN_W = Dimensions.get('window').width;

// ─── Helpers ──────────────────────────────────────────────────
function getGreeting(firstName) {
  const h = new Date().getHours();
  const period = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  return `Good ${period}, ${firstName}!`;
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
      <Animated.View style={[st.avatar, { transform: [{ scale }] }]}>
        {profileImage ? (
          <Image source={{ uri: profileImage }} style={st.avatarImage} />
        ) : (
          <Text style={st.avatarText}>{initials}</Text>
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
      <Animated.View style={[st.pill, { transform: [{ scale }] }]}>
        <Text style={st.pillText}>Start Session</Text>
      </Animated.View>
    </Pressable>
  );
});

// ─── Shared press scale hook ──────────────────────────────────
function usePressScale(toValue = 0.98) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn  = () => Animated.spring(scale, { toValue,  useNativeDriver: true, tension: 280, friction: 12 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }).start();
  return { scale, onPressIn, onPressOut };
}

// ─── Today's Protection card ──────────────────────────────────
const ProtectionStatsCard = React.memo(function ProtectionStatsCard({ stats }) {
  const { scale, onPressIn, onPressOut } = usePressScale();
  const tiles = [
    { label: 'Protected',      value: stats.protectedTime          },
    { label: 'Unprotected',    value: stats.unprotectedTime        },
    { label: 'Reapplications', value: String(stats.reapplications) },
    { label: 'Sessions Today', value: String(stats.sessionsToday)  },
  ];

  return (
    <Pressable
      onPress={() => console.log('navigate to protection stats')}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <Animated.View style={[psSt.wrap, { transform: [{ scale }] }]}>
        <View style={psSt.headingRow}>
          <Text style={psSt.heading}>Today's Protection</Text>
          <Text style={psSt.chevron}>›</Text>
        </View>
        <View style={psSt.grid}>
          {tiles.map((tile) => (
            <View key={tile.label} style={psSt.tile}>
              <Text style={psSt.tileVal}>{tile.value}</Text>
              <Text style={psSt.tileLabel}>{tile.label}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </Pressable>
  );
});

// ─── Last Session card ────────────────────────────────────────
const LastSessionCard = React.memo(function LastSessionCard({ session }) {
  const { scale, onPressIn, onPressOut } = usePressScale();

  return (
    <Pressable
      onPress={() => console.log('navigate to session summary')}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <Animated.View style={[lsSt.wrap, { transform: [{ scale }] }]}>
        <View style={lsSt.header}>
          <Text style={lsSt.title}>Last Session</Text>
          <View style={lsSt.headerRight}>
            <Text style={lsSt.date}>{session.date}</Text>
            <Text style={lsSt.chevron}>›</Text>
          </View>
        </View>

        <View style={lsSt.statsRow}>
          <View style={lsSt.stat}>
            <Text style={lsSt.statVal}>{session.duration}</Text>
            <Text style={lsSt.statLabel}>DURATION</Text>
          </View>
          <View style={lsSt.statDivider} />
          <View style={lsSt.stat}>
            <Text style={lsSt.statVal}>{session.score}</Text>
            <Text style={lsSt.statLabel}>SCORE</Text>
          </View>
          <View style={lsSt.statDivider} />
          <View style={lsSt.stat}>
            <Text style={lsSt.statVal}>SPF {session.spf}</Text>
            <Text style={lsSt.statLabel}>{session.environment}</Text>
          </View>
        </View>

        <View style={lsSt.dividerLine} />

        <View style={lsSt.peakRow}>
          <Text style={lsSt.peakLabel}>Peak UV</Text>
          <Text style={lsSt.peakVal}>{session.peakUV.toFixed(1)}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
});

// ─── Weekly Snapshot card ─────────────────────────────────────
const WeeklySnapshotCard = React.memo(function WeeklySnapshotCard({ snapshot }) {
  const { scale, onPressIn, onPressOut } = usePressScale();
  const { days, todayIndex, complianceRate } = snapshot;
  const BAR_MAX_H = 56;
  const pastAndToday = days.filter((_, i) => i <= todayIndex);
  const maxDose = Math.max(...pastAndToday.map((d) => d.uvDose), 0.1);

  return (
    <Pressable
      onPress={() => console.log('navigate to weekly snapshot')}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
    <Animated.View style={[wkSt.wrap, { transform: [{ scale }] }]}>
      <View style={wkSt.headingRow}>
        <Text style={wkSt.heading}>This Week</Text>
        <Text style={wkSt.chevron}>›</Text>
      </View>

      <View style={wkSt.chartRow}>
        {days.map((day, i) => {
          const isPast   = i < todayIndex;
          const isToday  = i === todayIndex;
          const isFuture = i > todayIndex;

          const barH = isFuture
            ? 4
            : Math.max(6, Math.round((day.uvDose / maxDose) * BAR_MAX_H));

          const barBg  = isToday ? colors.orange : isPast ? colors.orangeLight : colors.surface;
          const labelColor = isToday ? colors.ink : colors.muted;

          return (
            <View key={day.label} style={wkSt.col}>
              <View style={[wkSt.barWrap, { height: BAR_MAX_H }]}>
                <View style={[wkSt.bar, { height: barH, backgroundColor: barBg }]} />
              </View>
              <Text style={[wkSt.dayLabel, { color: labelColor, fontFamily: isToday ? 'SFProDisplay-Bold' : 'SFProDisplay-Regular' }]}>
                {day.label}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={wkSt.footer}>
        <View style={wkSt.footerDot} />
        <Text style={wkSt.footerText}>
          Protected <Text style={wkSt.footerBold}>{complianceRate}%</Text> of outdoor time this week
        </Text>
      </View>
    </Animated.View>
    </Pressable>
  );
});

// ─── Protection pattern styles ────────────────────────────────
const ppSt = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 20,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  heading: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 15,
    color: colors.ink,
  },
  chevron: {
    fontSize: 20,
    color: colors.muted,
    lineHeight: 22,
  },
  lockedBody: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  lockWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  lockShackle: {
    width: 20,
    height: 13,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 2.5,
    borderBottomWidth: 0,
    borderColor: colors.muted,
    marginBottom: -1,
  },
  lockBody: {
    width: 30,
    height: 22,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockKeyhole: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.muted,
  },
  lockedTitle: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 14,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 8,
  },
  lockedSub: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    maxWidth: 280,
  },
  progressWrap: {
    width: '100%',
    gap: 6,
    alignItems: 'center',
  },
  progressBg: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.orange,
  },
  progressLabel: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 0.3,
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
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightIcon: {
    fontSize: 16,
  },
  insightText: {
    flex: 1,
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 14,
    color: colors.ink,
    lineHeight: 20,
  },
});

// ─── Protection Pattern card ──────────────────────────────────
function LockIcon() {
  return (
    <View style={ppSt.lockWrap}>
      <View style={ppSt.lockShackle} />
      <View style={ppSt.lockBody}>
        <View style={ppSt.lockKeyhole} />
      </View>
    </View>
  );
}

const ProtectionPatternCard = React.memo(function ProtectionPatternCard({ pattern }) {
  const { totalSessions, reapplyInterval, depletionFasterPct, firstAlertTime } = pattern;
  const THRESHOLD  = 10;
  const isUnlocked = totalSessions >= THRESHOLD;
  const progress   = Math.min(totalSessions / THRESHOLD, 1);

  const insights = [
    { icon: '⏱', text: `You typically need to reapply every ${reapplyInterval}` },
    { icon: '📊', text: `Your skin depletes sunscreen ${depletionFasterPct}% faster than average` },
    { icon: '🔔', text: `You usually get your first alert around ${firstAlertTime} into a session` },
  ];

  const { scale, onPressIn, onPressOut } = usePressScale();

  return (
    <Pressable
      onPress={() => console.log('navigate to protection pattern')}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
    <Animated.View style={[ppSt.wrap, { transform: [{ scale }] }]}>
      <View style={ppSt.headingRow}>
        <Text style={ppSt.heading}>Your Protection Pattern</Text>
        <Text style={ppSt.chevron}>›</Text>
      </View>

      {isUnlocked ? (
        <View style={ppSt.insightList}>
          {insights.map((item, i) => (
            <View key={i} style={[ppSt.insightRow, i < insights.length - 1 && ppSt.insightRowBorder]}>
              <View style={ppSt.insightIconWrap}>
                <Text style={ppSt.insightIcon}>{item.icon}</Text>
              </View>
              <Text style={ppSt.insightText}>{item.text}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={ppSt.lockedBody}>
          <LockIcon />
          <Text style={ppSt.lockedTitle}>Complete 10 sessions to unlock</Text>
          <Text style={ppSt.lockedSub}>
            Your personal protection insights will appear here after 10 sessions. You have {totalSessions} so far.
          </Text>
          <View style={ppSt.progressWrap}>
            <View style={ppSt.progressBg}>
              <View style={[ppSt.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={ppSt.progressLabel}>{totalSessions} / {THRESHOLD}</Text>
          </View>
        </View>
      )}
    </Animated.View>
    </Pressable>
  );
});

// ─── Sureva device illustration ───────────────────────────────
function SurevaIllustration({ connected }) {
  const haloScale   = useRef(new Animated.Value(1)).current;
  const haloOpacity = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (!connected) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(haloScale,   { toValue: 2.6, duration: 900, useNativeDriver: true }),
          Animated.timing(haloOpacity, { toValue: 0,   duration: 900, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(haloScale,   { toValue: 1,   duration: 0, useNativeDriver: true }),
          Animated.timing(haloOpacity, { toValue: 0.7, duration: 0, useNativeDriver: true }),
        ]),
        Animated.delay(400),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [connected]);

  return (
    <View style={illSt.root}>
      <View style={illSt.clipArm} />
      <View style={illSt.body}>
        <View style={illSt.ledContainer}>
          {connected && (
            <Animated.View style={[
              illSt.ledHalo,
              { opacity: haloOpacity, transform: [{ scale: haloScale }] },
            ]} />
          )}
          <View style={illSt.led} />
        </View>
        <View style={illSt.panel} />
        <View style={illSt.btn} />
      </View>
    </View>
  );
}

// ─── Device card ──────────────────────────────────────────────
const DeviceCard = React.memo(function DeviceCard({ device }) {
  const batColor = device.battery > 30 ? colors.protected : colors.warning;
  const dotColor = device.connected ? colors.protected : colors.danger;

  return (
    <View style={devSt.wrap}>
      {/* Centered illustration */}
      <View style={devSt.illustrationArea}>
        <SurevaIllustration connected={device.connected} />
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
  );
});

// ─── Main screen ──────────────────────────────────────────────
export default function HomeScreen({ onSignOut }) {
  const { userProfile, profileImage } = useAuth();
  const { conditions, lastSession, device, todayStats, weeklySnapshot, protectionPattern } = mockData;
  const firstName = userProfile?.firstName || mockData.user.firstName;
  const lastName  = userProfile?.lastName  || mockData.user.lastName;
  const initials  = getInitials(firstName, lastName);
  const greeting  = getGreeting(firstName);
  const uvRounded = Math.round(conditions.uvIndex);

  const [sheetVisible, setSheetVisible]     = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [elapsed, setElapsed]             = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

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

  const homeTranslateX    = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -SCREEN_W] });
  const sessionTranslateX = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_W, 0] });

  const fade0  = useRef(new Animated.Value(0)).current;
  const fade1  = useRef(new Animated.Value(0)).current;
  const fade2  = useRef(new Animated.Value(0)).current;
  const fade3  = useRef(new Animated.Value(0)).current;
  const fade4  = useRef(new Animated.Value(0)).current;
  const slide0 = useRef(new Animated.Value(18)).current;
  const slide1 = useRef(new Animated.Value(18)).current;
  const slide2 = useRef(new Animated.Value(18)).current;
  const slide3 = useRef(new Animated.Value(18)).current;
  const slide4 = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    const fadeAnims  = [fade0,  fade1,  fade2,  fade3,  fade4];
    const slideAnims = [slide0, slide1, slide2, slide3, slide4];

    fadeAnims.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 360,
        delay: 60 + i * 65,
        useNativeDriver: true,
      }).start();
    });
    slideAnims.forEach((anim, i) => {
      Animated.spring(anim, {
        toValue: 0,
        tension: 52,
        friction: 9,
        delay: 60 + i * 65,
        useNativeDriver: true,
      }).start();
    });
  }, []);

  return (
    <View style={st.root}>
      {/* ── Home screen (slides left when session is active) ── */}
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: homeTranslateX }] }]}>
        <SafeAreaView style={st.safe}>
          <StatusBar style="dark" />

          <View style={st.topBar}>
            <ProfileAvatar initials={initials} profileImage={profileImage} onPress={() => setSettingsVisible(true)} />
            <View style={st.greetingBlock}>
              <Text style={st.greeting} numberOfLines={1}>{greeting}</Text>
              <Text style={st.uvSub}>UV index is {uvRounded} right now</Text>
            </View>
            <StartSessionPill
              sessionActive={!!activeSession}
              onPress={activeSession ? slideToSession : () => setSheetVisible(true)}
            />
          </View>

          <ScrollView
            style={st.scroll}
            contentContainerStyle={st.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={{ opacity: fade0, transform: [{ translateY: slide0 }] }}>
              <ProtectionStatsCard stats={todayStats} />
            </Animated.View>
            <Animated.View style={{ opacity: fade1, transform: [{ translateY: slide1 }] }}>
              <LastSessionCard session={lastSession} />
            </Animated.View>
            <Animated.View style={{ opacity: fade2, transform: [{ translateY: slide2 }] }}>
              <WeeklySnapshotCard snapshot={weeklySnapshot} />
            </Animated.View>
            <Animated.View style={{ opacity: fade3, transform: [{ translateY: slide3 }] }}>
              <ProtectionPatternCard pattern={protectionPattern} />
            </Animated.View>
            <Animated.View style={{ opacity: fade4, transform: [{ translateY: slide4 }] }}>
              <DeviceCard device={device} />
            </Animated.View>
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
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarText: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 15,
    color: colors.white,
    letterSpacing: 0.6,
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  greetingBlock: {
    flex: 1,
  },
  greeting: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 16,
    color: colors.ink,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  uvSub: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 12,
    color: colors.muted,
  },
  pill: {
    backgroundColor: colors.orange,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 24,
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 3,
  },
  pillText: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 13,
    color: colors.white,
    letterSpacing: 0.1,
  },
  pillActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 9,
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
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 13,
    color: colors.orange,
    letterSpacing: 0.1,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 120,
    gap: 12,
  },
});

// ─── Protection stats styles ──────────────────────────────────
const psSt = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 20,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  heading: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 15,
    color: colors.ink,
  },
  chevron: {
    fontSize: 20,
    color: colors.muted,
    lineHeight: 22,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: '47.5%',
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 4,
  },
  tileVal: {
    fontFamily: 'SFProDisplay-Black',
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.6,
  },
  tileLabel: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 12,
    color: colors.muted,
  },
});

// ─── Last session styles ──────────────────────────────────────
const lsSt = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 20,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 15,
    color: colors.ink,
  },
  date: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 13,
    color: colors.muted,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chevron: {
    fontSize: 20,
    color: colors.muted,
    lineHeight: 22,
  },
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
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 16,
    color: colors.ink,
  },
  statLabel: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 0.8,
  },
  statDivider: {
    width: 1,
    height: 34,
    backgroundColor: colors.border,
  },
  dividerLine: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: 16,
    marginBottom: 12,
  },
  peakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  peakLabel: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 13,
    color: colors.muted,
  },
  peakVal: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 13,
    color: colors.ink,
  },
});

// ─── Weekly snapshot styles ───────────────────────────────────
const wkSt = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 20,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  heading: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 15,
    color: colors.ink,
  },
  chevron: {
    fontSize: 20,
    color: colors.muted,
    lineHeight: 22,
  },
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
    borderRadius: 5,
  },
  dayLabel: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.orange,
  },
  footerText: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 13,
    color: colors.muted,
    flex: 1,
  },
  footerBold: {
    fontFamily: 'SFProDisplay-Bold',
    color: colors.ink,
  },
});

// ─── Device illustration styles ───────────────────────────────
const illSt = StyleSheet.create({
  root: {
    width: 52,
    height: 96,
    alignItems: 'center',
  },
  clipArm: {
    position: 'absolute',
    top: 0,
    width: 32,
    height: 24,
    borderRadius: 6,
    backgroundColor: colors.inkMid,
    zIndex: 0,
  },
  body: {
    position: 'absolute',
    bottom: 0,
    width: 44,
    height: 80,
    borderRadius: 18,
    backgroundColor: colors.ink,
    alignItems: 'center',
    paddingTop: 16,
    gap: 10,
    zIndex: 1,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  ledContainer: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ledHalo: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.protected,
  },
  led: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.protected,
  },
  panel: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  btn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
});

// ─── Device card styles ───────────────────────────────────────
const devSt = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 20,
    alignItems: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  illustrationArea: {
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
    fontFamily: 'SFProDisplay-Bold',
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
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 13,
  },
  lastSynced: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 11,
    color: colors.muted,
  },
});

