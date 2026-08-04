import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Modal, Animated, ScrollView,
  SafeAreaView, StyleSheet, Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import mockData from '../constants/mockData';
import { useAuth } from '../context/AuthContext';
import SlideInView from '../components/SlideInView';
import SessionHero from '../components/activeSession/SessionHero';
import SessionSparkline from '../components/activeSession/SessionSparkline';
import ExposureBattery from '../components/activeSession/ExposureBattery';
import TodayDoseCard from '../components/activeSession/TodayDoseCard';
import HeatRiskCard from '../components/activeSession/HeatRiskCard';
import VitaminDTracker from '../components/activeSession/VitaminDTracker';
import DriverCard from '../components/activeSession/DriverCard';
import StatStrip from '../components/activeSession/StatStrip';
import SessionActions from '../components/activeSession/SessionActions';
import {
  statusFor, uvIndexColor, keyDriver, formatElapsed, liveConditionsAt, engineProfileFor,
  downsampleCurve, averagedHeatConditions,
} from '../components/activeSession/sessionMath';
import {
  calculateAlertThreshold, evaluateAlertState, updatePersonalFactor,
  calculateCounterfactual, calculateVitaminDSynthesis,
} from '../../Algorithm/js/depletionEngine.js';
import {
  INTERVAL_MS, ALERT_ESCALATION, PERSONAL_FACTOR, VITAMIN_D_CALCULATION,
} from '../../Algorithm/constants/algorithmConstants.js';
import * as SessionEngine from '../../Algorithm/services/SessionService.js';
import SupabaseService from '../services/SupabaseService';
import { notifySessionSaved } from '../services/SessionEventsService';
import { startSessionActivity, updateSessionActivity, endSessionActivity } from '../services/LiveActivityService';
import {
  buildSessionHero, buildSessionUpdateFields, buildSessionReadingRows, buildSessionEventRows,
  computeTodayDosePercentReal,
} from '../services/SessionDetailMapper';
import {
  ensureNotificationPermission, scheduleReapplyAlerts, cancelAllForSession,
} from '../services/NotificationService';
import * as SessionCheckpointStore from '../services/SessionCheckpointStore';
import { startMockReadingSource } from '../services/SessionReadingSource';

const INTERVAL_SECONDS = INTERVAL_MS / 1000;

// A fresh, never-alerted state — used at session start and again after
// every reapplication, since reapplying resets protection to 100%.
function freshAlertState(lastApplicationTime) {
  return { isActive: false, level: 0, firstAlertTime: null, lastApplicationTime, confirmed: false };
}

const TOAST_FOR_LEVEL = {
  1: 'Reapply now, protection is low',
  2: 'Still unconfirmed, please reapply',
  3: 'Final alert, reapply immediately',
};

// Drift tolerance before the scheduled OS notification is worth
// re-anchoring — conditions shift continuously, rescheduling on every
// single tick would just thrash the notification API for no real gain.
const RESCHEDULE_TOLERANCE_MS = 2 * 60 * 1000;

// Sessions shorter than this don't have enough readings to be worth
// saving — ending one early just discards it instead of persisting.
const MIN_SESSION_SECONDS_TO_SAVE = 5 * 60;

const { width: SCREEN_W } = Dimensions.get('window');
const GAUGE_SIZE = Math.round(SCREEN_W * 0.58);

// Same-calendar-day check by local fields, mirroring HomeScreen's own
// isSameLocalDay (deliberately duplicated rather than shared — see that
// file's comment on todaysRows for why "today" filtering stays local to
// each screen in this codebase).
function isSameLocalDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

// ─── End session confirmation modal ──────────────────────────
const EndSessionModal = React.memo(function EndSessionModal({ visible, tooShort, onConfirm, onCancel }) {
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const opacAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 120, friction: 10, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.88);
      opacAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" onRequestClose={onCancel}>
      <Animated.View style={[esSt.backdrop, { opacity: opacAnim }]}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onCancel} />
      </Animated.View>
      <View style={esSt.centerWrap} pointerEvents="box-none">
        <Animated.View style={[esSt.card, { opacity: opacAnim, transform: [{ scale: scaleAnim }] }]}>
          <Text style={esSt.title}>End this session?</Text>
          <Text style={esSt.body}>
            {tooShort
              ? "It's been less than 5 minutes, so there's not enough data to save — this session won't be recorded."
              : "Your session data will be saved and you'll get a summary."}
          </Text>
          <View style={esSt.btnRow}>
            <TouchableOpacity style={esSt.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
              <Text style={esSt.cancelText}>Keep going</Text>
            </TouchableOpacity>
            <TouchableOpacity style={esSt.endBtn} onPress={onConfirm} activeOpacity={0.85}>
              <Text style={esSt.endText}>End session</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
});

// ─── Top bar ──────────────────────────────────────────────────
const SessionTopBar = React.memo(function SessionTopBar({ elapsed, onBack, onEndRequest }) {
  const backScale = useRef(new Animated.Value(1)).current;
  const onIn = () => Animated.spring(backScale, { toValue: 0.88, useNativeDriver: true, tension: 280, friction: 12 }).start();
  const onOut = () => Animated.spring(backScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }).start();

  return (
    <View style={tbSt.bar}>
      <TouchableOpacity onPress={onBack} onPressIn={onIn} onPressOut={onOut} hitSlop={12} activeOpacity={1}>
        <Animated.View style={[tbSt.backBtn, { transform: [{ scale: backScale }] }]}>
          <Ionicons name="chevron-back" size={20} color={colors.ink} />
        </Animated.View>
      </TouchableOpacity>
      <View style={tbSt.timerWrap}>
        <Text style={tbSt.timerText}>{formatElapsed(elapsed)}</Text>
        <View style={tbSt.livePill}>
          <View style={tbSt.liveDot} />
          <Text style={tbSt.liveLabel}>LIVE</Text>
        </View>
      </View>
      <TouchableOpacity onPress={onEndRequest} hitSlop={12} activeOpacity={0.6}>
        <Text style={tbSt.endLink}>End</Text>
      </TouchableOpacity>
    </View>
  );
});

// ─── Main screen ──────────────────────────────────────────────
export default function ActiveSessionScreen({ sessionParams, elapsed, onBack, onSessionEnd }) {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const [showEndModal, setShowEndModal] = useState(false);
  const [snoozed, setSnoozed] = useState(false);
  // If HomeScreen already resumed a checkpointed session before mounting
  // this screen (see its own restore-on-launch effect), the engine's
  // reapplicationLog already has the real history — reapplyEvents (used
  // only for the chart markers and the REAPPLIES stat tile, nothing the
  // engine itself needs) is rebuilt from it so a resumed session doesn't
  // silently forget reapplies that happened before the app was killed.
  const [reapplyEvents, setReapplyEvents] = useState(() => {
    const existing = SessionEngine.getActiveSessionState();
    if (!existing?.reapplicationLog?.length) return [];
    return existing.reapplicationLog.map((r) => Math.round((r.timestamp - existing.startTime) / 1000));
  });
  const [inShade, setInShade] = useState(false);
  // Seeded from the real last-application time (most recent reapply, or
  // session start if none) rather than "now" when resuming a checkpoint
  // — using Date.now() here would make the safety-floor notification
  // math below think a reapply just happened, handing out a fresh
  // 2-hour window instead of the real remaining one.
  const [alertState, setAlertState] = useState(() => {
    const existing = SessionEngine.getActiveSessionState();
    const lastApplicationTime = existing?.reapplicationLog?.length
      ? existing.reapplicationLog[existing.reapplicationLog.length - 1].timestamp
      : (existing?.startTime ?? Date.now());
    return freshAlertState(lastApplicationTime);
  });
  const [hasNotifyPermission, setHasNotifyPermission] = useState(false);
  // The real engine's state (Algorithm/services/SessionService.js) —
  // protectionPercentage + the full readings log — mirrored into React
  // state so protectionPct/curve/dose/vitaminD/heatConditions below can
  // all read it directly instead of each maintaining their own replay of
  // the session from t=0. This IS what gets persisted at session end
  // (buildSessionReadingRows etc. in handleEndConfirm read the same
  // engine), so the screen is now always showing exactly what will be
  // saved, not a numerically-matching-but-separate simulation of it.
  // Lazily seeded from the engine directly (not null) so a resumed
  // session renders its real, already-in-progress numbers on the very
  // first frame instead of flashing a fresh 100%/empty state first.
  const [engineSession, setEngineSession] = useState(() => SessionEngine.getActiveSessionState());
  // Real dose from today's PRIOR completed sessions only (this one in
  // progress isn't in Supabase yet) — combined with the live `dose` below
  // for the total shown on TodayDoseCard. Fetched once per mount since
  // prior sessions can't change mid-session; null while loading so the
  // card doesn't flash "0%" then jump once the fetch resolves.
  const [priorTodayDosePct, setPriorTodayDosePct] = useState(null);

  const btnScale = useRef(new Animated.Value(1)).current;
  const confirmOpac = useRef(new Animated.Value(0)).current;
  const confirmSlide = useRef(new Animated.Value(6)).current;
  const toastMsg = useRef('Protection reset, clock restarted');
  const [, forceTick] = useState(0);

  const alertStateRef = useRef(alertState);
  alertStateRef.current = alertState;

  // Writes the current engine state to disk so an accidental app kill
  // (not just backgrounding — see HomeScreen's AppState wall-clock
  // reconciliation for that) doesn't lose the session outright. Called
  // after every processed reading and every reapply; cleared in
  // handleEndConfirm once the session actually ends.
  const saveCheckpoint = useCallback((latestEngineState) => {
    if (!latestEngineState) return;
    SessionCheckpointStore.saveCheckpoint({
      userId: user?.id ?? null,
      sessionParams,
      engineState: latestEngineState,
      engineProfile: engineProfileFor(sessionParams, userProfile),
    });
  }, [sessionParams, userProfile, user?.id]);

  // The ONE place a reading — mock or, eventually, real — turns into an
  // engine update. Nothing upstream of this loops over elapsed time or
  // counts ticks anymore; it just reacts to whatever arrives.
  const handleIncomingReading = useCallback((reading) => {
    const latest = SessionEngine.processInterval(reading);
    if (latest) {
      setEngineSession(latest);
      saveCheckpoint(latest);
    }
  }, [saveCheckpoint]);

  // Kept current every render so the mount-only effect below (which
  // registers a stable callback with the reading source once and never
  // re-subscribes) always calls the latest version — same pattern as
  // alertStateRef above — rather than closing over sessionParams/
  // userProfile as they were at the very first mount.
  const handleIncomingReadingRef = useRef(handleIncomingReading);
  handleIncomingReadingRef.current = handleIncomingReading;

  // Starts the real engine session (Algorithm/services/SessionService.js)
  // and the reading source that feeds it — this IS the session; there's
  // no separate visual replay anymore. Started once per mount, matching
  // this screen's one-session lifecycle (a new ActiveSessionScreen mounts
  // per session) — UNLESS HomeScreen already called
  // SessionEngine.resumeSession(...) before mounting this screen (see its
  // restore-on-launch effect), in which case the engine already has a
  // live session and starting a fresh one would wipe the recovered
  // history; the reading source picks up numbering from where the
  // resumed readings log left off instead of replaying it.
  //
  // startMockReadingSource is the single seam real hardware integration
  // replaces (see that file's header) — everything else in this screen
  // reacts to whatever readings arrive through handleIncomingReading,
  // regardless of source.
  const engineStartedRef = useRef(false);
  useEffect(() => {
    if (engineStartedRef.current) return;
    engineStartedRef.current = true;

    let session = SessionEngine.getActiveSessionState();
    if (!session) {
      const engineProfile = engineProfileFor(sessionParams, userProfile);
      SessionEngine.startSession(engineProfile, {
        spf: sessionParams.spf,
        waterResistanceRating: sessionParams.waterResistance,
        placement: engineProfile.devicePlacement,
      });
      session = SessionEngine.getActiveSessionState();
      setEngineSession(session);
    }

    const source = startMockReadingSource({
      startTime: session.startTime,
      alreadyEmittedCount: session.readings.length,
      onReading: (reading) => handleIncomingReadingRef.current(reading),
    });
    return () => source.stop();
  }, []);
  // The last level-1 crossing time we actually scheduled a notification
  // for — compared against the freshly-estimated one each tick so we only
  // reschedule when the estimate has drifted enough to matter (or been
  // reset, e.g. by a reapplication).
  const lastScheduledLevel1Ref = useRef(null);
  const notificationIdsRef = useRef({});
  // The last (rounded) protection % the Live Activity was refreshed with —
  // see the drift-check effect below for why this has to be tracked
  // separately from lastScheduledLevel1Ref.
  const lastActivityPctRef = useRef(null);

  // Straight off the real engine state — no separate "time to zero"
  // formula. protectionPct defaults to 100 before the engine's first tick
  // lands (fresh session); minsRemaining projects forward from the most
  // recent real interval's depletion rate, same as before, just reading
  // it from the actual last reading instead of a replayed one.
  const protectionPct = engineSession?.protectionPercentage ?? 100;
  const lastEngineReading = engineSession?.readings?.length
    ? engineSession.readings[engineSession.readings.length - 1]
    : null;
  const minsRemaining = useMemo(() => {
    const rate = lastEngineReading?.depletionRatePerInterval ?? 0;
    return rate > 0
      ? Math.max(0, Math.round((protectionPct / rate) * (INTERVAL_SECONDS / 60)))
      : 0;
  }, [protectionPct, lastEngineReading]);

  const alertThreshold = useMemo(
    () => calculateAlertThreshold(engineProfileFor(sessionParams, userProfile)),
    [sessionParams, userProfile]
  );

  // Estimated wall-clock time protection will cross alertThreshold, from
  // the CURRENT instantaneous depletion rate (protectionPct/minsRemaining
  // already describe that rate as "time to zero"; scaling down to "time
  // to threshold" keeps this a live projection, not a fixed guess).
  // null once already at/below threshold — evaluateAlertState below fires
  // level 1 immediately in that case, nothing left to schedule ahead of.
  const estimatedLevel1Date = useMemo(() => {
    if (protectionPct <= alertThreshold || minsRemaining <= 0) return null;
    const minsToThreshold = ((protectionPct - alertThreshold) / protectionPct) * minsRemaining;
    return new Date(Date.now() + minsToThreshold * 60000);
  }, [protectionPct, alertThreshold, minsRemaining]);

  // What SessionHero's "Reapply in ~X min" countdown actually shows — the
  // real next alert, whichever fires first. estimatedLevel1Date above only
  // projects protection crossing alertThreshold (a live rate-based guess);
  // it ignores the 2-hour safety-floor notification that
  // scheduleReapplyAlerts always schedules independently (fires regardless
  // of protection %, see ALERT_ESCALATION.safetyFloorMs). Without this, a
  // mild-conditions session could show something like "~198 min" even
  // though a real alert is guaranteed by 120 min — this reconciles the two
  // so the on-screen number is never later than what will actually happen.
  const minsUntilReapplyNeeded = useMemo(() => {
    const safetyFloorMs = alertState.lastApplicationTime != null
      ? (alertState.lastApplicationTime + ALERT_ESCALATION.safetyFloorMs) - Date.now()
      : Infinity;
    const safetyFloorMins = Math.max(0, safetyFloorMs / 60000);
    if (protectionPct <= alertThreshold) return 0; // already due
    const minsToThreshold = minsRemaining > 0
      ? ((protectionPct - alertThreshold) / protectionPct) * minsRemaining
      : safetyFloorMins; // depletion effectively flat — the safety floor is the only real driver left
    return Math.round(Math.max(0, Math.min(minsToThreshold, safetyFloorMins)));
  }, [protectionPct, alertThreshold, minsRemaining, alertState.lastApplicationTime]);

  // Same number SessionHero shows, just as an absolute date — what the
  // Dynamic Island / Lock Screen Live Activity's native countdown timer
  // counts down to.
  const nextAlertDate = useMemo(
    () => new Date(Date.now() + minsUntilReapplyNeeded * 60000),
    [minsUntilReapplyNeeded]
  );

  // Started once per mount (see the engine-start effect above for why —
  // same one-session-per-mount lifecycle). id is null on Android, iOS
  // <16.2, or before the native module exists (prebuild hasn't run yet) —
  // every call below already treats that as "unavailable," not an error.
  const liveActivityIdRef = useRef(null);
  useEffect(() => {
    liveActivityIdRef.current = startSessionActivity(protectionPct, nextAlertDate);
  }, []);

  // {t, pct} points straight from the engine's real readings log (t = secs
  // since session start), prefixed with the 100%-at-start point and, if the
  // clock has ticked past the last recorded reading, a trailing point that
  // holds the current value — same shape the chart always expected, now
  // sourced from what actually happened instead of a replay.
  const curve = useMemo(() => {
    const readings = engineSession?.readings ?? [];
    const startTime = engineSession?.startTime ?? Date.now();
    const series = [{ t: 0, pct: 100 }];
    let lastT = 0;
    for (const r of readings) {
      lastT = Math.round((r.timestamp - startTime) / 1000);
      series.push({ t: lastT, pct: r.protectionPercentage });
    }
    if (lastT < elapsed) series.push({ t: elapsed, pct: protectionPct });
    return downsampleCurve(series, elapsed, 40);
  }, [engineSession, elapsed, protectionPct]);

  // Live conditions drift over the session (BLE/weather seam). The chart's
  // factor meters and the condition tiles both read from this so they move
  // together as the session evolves.
  const liveConditions = useMemo(() => liveConditionsAt(mockData.conditions, elapsed), [elapsed]);

  // Protection-discounted burn dose so far, computed the same way
  // Session Detail's Burn Tracker and Home's daily dose bar are
  // (calculateCounterfactual's actualMEDDose on the real readings log) —
  // one calculation used everywhere a "how much dose has this session
  // actually delivered" number is needed, live or post-hoc.
  const dose = useMemo(() => {
    const readings = engineSession?.readings ?? [];
    if (!readings.length) return 0;
    const profile = engineProfileFor(sessionParams, userProfile);
    const { actualMEDDose } = calculateCounterfactual(
      { readings, spf: sessionParams.spf },
      { fitzpatrickType: profile.fitzpatrickType, spf: sessionParams.spf }
    );
    return Math.max(0, Math.min(1, actualMEDDose));
  }, [engineSession, sessionParams, userProfile]);

  const heatConditions = useMemo(
    () => averagedHeatConditions(engineSession?.readings ?? []),
    [engineSession]
  );

  const vitaminD = useMemo(() => {
    const targetIU = VITAMIN_D_CALCULATION.dailyTargetIU;
    const readings = engineSession?.readings ?? [];
    if (!readings.length) return { estimateIU: 0, lowIU: 0, highIU: 0, targetIU, targetPct: 0 };
    const profile = engineProfileFor(sessionParams, userProfile);
    const { estimateIU, lowIU, highIU } = calculateVitaminDSynthesis(readings, {
      fitzpatrickType: profile.fitzpatrickType,
    });
    return { estimateIU, lowIU, highIU, targetIU, targetPct: Math.round((estimateIU / targetIU) * 100) };
  }, [engineSession, sessionParams, userProfile]);
  const driver = useMemo(
    () => keyDriver(liveConditions.uvIndex, sessionParams.environment),
    [liveConditions.uvIndex, sessionParams.environment]
  );

  const status = statusFor(protectionPct);
  const { uvIndex, temperature, humidity } = liveConditions;
  const peakUv = mockData.conditions.uvIndex;

  const showToast = useCallback((msg) => {
    toastMsg.current = msg;
    forceTick((n) => n + 1);
    confirmSlide.setValue(6);
    confirmOpac.setValue(0);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(confirmOpac, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(confirmSlide, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]),
      Animated.delay(1600),
      Animated.timing(confirmOpac, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [confirmOpac, confirmSlide]);

  // Retrofits the real 3-level escalation state machine (previously only
  // used for post-session mock stats) into live tracking — evaluated on
  // real Date.now() rather than the elapsed-seconds counter, so escalation
  // timing stays correct across any backgrounding drift.
  useEffect(() => {
    const { alertState: next, newAlertShouldFire } = evaluateAlertState(
      protectionPct, alertThreshold, alertStateRef.current, Date.now()
    );
    const changed = next.level !== alertStateRef.current.level
      || next.isActive !== alertStateRef.current.isActive
      || next.confirmed !== alertStateRef.current.confirmed
      || next.firstAlertTime !== alertStateRef.current.firstAlertTime;
    if (changed) setAlertState(next);
    if (newAlertShouldFire) showToast(TOAST_FOR_LEVEL[next.level] ?? 'Reapply now, protection is low');
  }, [protectionPct, alertThreshold, showToast]);

  // Requested once per session, not blocking — a denial just means this
  // session runs exactly like it always has (in-app toast only).
  useEffect(() => {
    let cancelled = false;
    ensureNotificationPermission().then((granted) => { if (!cancelled) setHasNotifyPermission(granted); });
    return () => { cancelled = true; };
  }, []);

  // Today's prior sessions' real dose, for TodayDoseCard's running total.
  // A failed fetch just leaves the card showing this session's dose alone
  // (treats prior as 0) rather than blocking the screen — same
  // never-block-the-whole-screen convention as everywhere else here.
  useEffect(() => {
    if (!user?.id) { setPriorTodayDosePct(0); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data: rows } = await SupabaseService.getSessions(user.id);
        const now = new Date();
        const todayRows = (rows ?? []).filter((r) => r.start_time && isSameLocalDay(new Date(r.start_time), now));
        if (!todayRows.length) { if (!cancelled) setPriorTodayDosePct(0); return; }
        const fullToday = await Promise.all(todayRows.map((r) => SupabaseService.getSessionById(r.id)));
        const engineProfile = engineProfileFor(sessionParams, userProfile);
        const readingsProfile = {
          devicePlacement: engineProfile.devicePlacement,
          skinType: userProfile?.skinType ?? 'normal',
          personalFactor: userProfile?.personalFactor ?? 1,
        };
        const realPct = computeTodayDosePercentReal(
          fullToday.map((r) => r.data).filter(Boolean),
          engineProfile.fitzpatrickType,
          readingsProfile
        );
        if (!cancelled) setPriorTodayDosePct(realPct);
      } catch {
        if (!cancelled) setPriorTodayDosePct(0);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Prior completed sessions today + this session's live running dose,
  // capped at 100% same as Home's daily bar.
  const todayDoseTotalPct = useMemo(() => {
    const prior = priorTodayDosePct ?? 0;
    return Math.min(100, prior + Math.round(dose * 100));
  }, [priorTodayDosePct, dose]);

  // Keeps the scheduled OS notifications AND the Live Activity anchored to
  // the live estimate. Levels 2/3/safety-floor are fixed offsets the
  // notification service derives from level-1 and lastApplicationTime —
  // this effect only ever needs to decide whether level-1's estimate has
  // moved enough to bother rescheduling/updating. Notification permission
  // only gates whether OS notifications get (re)scheduled — Live Activities
  // are a separate iOS feature with no such permission, so they update
  // here regardless of hasNotifyPermission; only the drift check itself is
  // shared between the two.
  useEffect(() => {
    // Refreshes the Live Activity whenever the live percentage has actually
    // moved — deliberately NOT gated on the `drifted`/estimatedLevel1Date
    // check below. estimatedLevel1Date permanently goes (and stays) null
    // once protection is at/below alertThreshold (see its definition
    // above), which would otherwise silently freeze the Dynamic Island the
    // moment "Reapply Now" is reached: both the previous and current value
    // would be null forever after, so that drift check alone never fires
    // again even as protection keeps depleting toward 0%. ActivityKit
    // updates are cheap (unlike scheduling OS notifications), so this just
    // tracks the rounded percentage directly instead.
    const roundedPct = Math.round(protectionPct);
    if (lastActivityPctRef.current !== roundedPct) {
      lastActivityPctRef.current = roundedPct;
      updateSessionActivity(liveActivityIdRef.current, protectionPct, nextAlertDate);
    }

    const prevMs = lastScheduledLevel1Ref.current;
    const nextMs = estimatedLevel1Date ? estimatedLevel1Date.getTime() : null;
    const drifted = prevMs == null
      ? nextMs != null
      : Math.abs((nextMs ?? 0) - prevMs) > RESCHEDULE_TOLERANCE_MS;
    if (!drifted) return;
    lastScheduledLevel1Ref.current = nextMs;

    if (sessionParams.sessionId && hasNotifyPermission) {
      scheduleReapplyAlerts({
        estimatedLevel1Date,
        lastApplicationTime: alertState.lastApplicationTime,
        sessionId: sessionParams.sessionId,
      }).then((ids) => { notificationIdsRef.current = ids; });
    }
  }, [estimatedLevel1Date, sessionParams.sessionId, alertState.lastApplicationTime, hasNotifyPermission, protectionPct, nextAlertDate]);

  const handleReapply = useCallback(() => {
    setReapplyEvents((prev) => [...prev, elapsed]);
    setSnoozed(false);
    setAlertState(freshAlertState(Date.now()));
    // Pushed into engineSession immediately (not left to the next tick,
    // up to 30s away) so protectionPct/curve/dose reflect the reset the
    // instant the button is pressed, matching what the engine itself
    // already did synchronously.
    const resumed = SessionEngine.handleReapplication();
    setEngineSession(resumed);
    saveCheckpoint(resumed);
    // Forces the scheduling effect above to re-anchor from the reset
    // 100%-protection starting point on its next run, rather than
    // comparing against the pre-reapply estimate.
    lastScheduledLevel1Ref.current = null;
    Animated.sequence([
      Animated.spring(btnScale, { toValue: 1.05, tension: 200, friction: 6, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, tension: 180, friction: 8, useNativeDriver: true }),
    ]).start();
    showToast('Protection reset, clock restarted');
  }, [elapsed, btnScale, showToast, saveCheckpoint]);

  const handleSnooze = useCallback(() => {
    setSnoozed((s) => {
      const next = !s;
      showToast(next ? 'Reapply alert snoozed 15 min' : 'Alert un-snoozed');
      // Snoozing genuinely pushes the real scheduled notification out by
      // 15 min too, not just the in-app toast — un-snoozing doesn't need
      // its own branch, the drift check above naturally re-syncs back to
      // the real estimate (which is earlier than the snoozed time) on the
      // next tick.
      if (next && sessionParams.sessionId && hasNotifyPermission) {
        const base = estimatedLevel1Date && estimatedLevel1Date.getTime() > Date.now()
          ? estimatedLevel1Date
          : new Date();
        const snoozedDate = new Date(base.getTime() + 15 * 60 * 1000);
        lastScheduledLevel1Ref.current = snoozedDate.getTime();
        scheduleReapplyAlerts({
          estimatedLevel1Date: snoozedDate,
          lastApplicationTime: alertState.lastApplicationTime,
          sessionId: sessionParams.sessionId,
        }).then((ids) => { notificationIdsRef.current = ids; });
      }
      return next;
    });
  }, [showToast, estimatedLevel1Date, sessionParams.sessionId, alertState.lastApplicationTime, hasNotifyPermission]);

  const handleShade = useCallback(() => {
    setInShade((s) => {
      showToast(s ? 'Back in the sun' : "In the shade, you're covered");
      return !s;
    });
  }, [showToast]);

  const handleEndConfirm = useCallback(() => {
    setShowEndModal(false);
    if (sessionParams.sessionId) cancelAllForSession(sessionParams.sessionId);
    endSessionActivity(liveActivityIdRef.current, protectionPct);
    // The session is ending one way or another below (saved or
    // discarded) — either way there's no longer an in-progress session
    // to recover, so the checkpoint would otherwise be stale leftover
    // data from here on.
    SessionCheckpointStore.clearCheckpoint();

    const completedSession = SessionEngine.endSession();
    const tooShortToSave = elapsed < MIN_SESSION_SECONDS_TO_SAVE;
    let heroSession = null;
    let sessionDetailRow = null;
    if (completedSession && !tooShortToSave) {
      const updateFields = buildSessionUpdateFields(completedSession);
      // Reuses buildSessionHero's date/duration/location formatting by
      // shaping this exactly like the DB row it's about to become — the
      // real row (dbSessionId) may still be resolving in the background,
      // so this doesn't wait on it.
      const mergedRow = {
        id: sessionParams.dbSessionId ?? sessionParams.sessionId,
        start_time: new Date(sessionParams.sessionId).toISOString(),
        spf: sessionParams.spf,
        water_resistance_mins: sessionParams.waterResistance,
        location_name: null,
        city: sessionParams.city ?? null,
        region: sessionParams.region ?? null,
        environment: sessionParams.environment ?? null,
        ...updateFields,
      };
      const fitzpatrickType = engineProfileFor(sessionParams, userProfile).fitzpatrickType;
      heroSession = buildSessionHero(mergedRow, fitzpatrickType);
      // The full joined-row shape SessionDetailScreen would otherwise only
      // get from a getSessionById round-trip — built here from data already
      // in memory so the very first detail reveal never has to race the
      // background persistence below. Without this, a slow network means
      // the detail screen's own fetch can run before updateSession/
      // insertSessionReadings have landed, finding an incomplete row (no
      // readings joined yet) and showing "no details available" until the
      // user backs out and back in, by which point the write has finished.
      sessionDetailRow = {
        ...mergedRow,
        session_readings: buildSessionReadingRows(completedSession),
        session_events: buildSessionEventRows(completedSession),
      };

      // Persist in the background — the post-session flow (sync screen →
      // detail reveal) proceeds immediately below regardless of network
      // latency. A failure here just means this session never saved: no
      // crash, no blocked screen (CLAUDE.md: never block the whole screen).
      if (sessionParams.dbSessionId) {
        (async () => {
          try {
            await SupabaseService.updateSession(sessionParams.dbSessionId, updateFields);
            await SupabaseService.insertSessionReadings(sessionParams.dbSessionId, buildSessionReadingRows(completedSession));
            await SupabaseService.insertSessionEvents(sessionParams.dbSessionId, buildSessionEventRows(completedSession));
            // Home/History both mount once and stay alive for the app's whole
            // lifetime (TabPager keeps every tab mounted), so neither would
            // otherwise learn a session just finished saving — this is what
            // tells them to refetch, timed to when the row is actually
            // queryable (end_time set), not a fixed "syncing" animation
            // length that could finish before this network chain does.
            notifySessionSaved();
          } catch {
            // Swallowed — this session simply won't appear in history/Passport/Skin Age.
            return;
          }

          // Personal-learning update (updatePersonalFactor in
          // depletionEngine.js) — deliberately its OWN try/catch, run only
          // after the session itself is confirmed saved, so a failure here
          // (most likely: the personal_factor column migration hasn't been
          // applied yet) can never affect whether the session saved or
          // shows up in history/Passport/Skin Age.
          try {
            if (user?.id) {
              const actualRate = completedSession.averageDepletionRate;
              const currentFactor = userProfile?.personalFactor ?? PERSONAL_FACTOR.initial;
              if (actualRate) {
                // Isolates what this session's rate would have been at a
                // neutral (1.0) personal factor — algebraically undoing the
                // multiplier that was already baked into actualRate, since
                // personalFactor is constant for the whole session.
                const predictedRate = actualRate / currentFactor;
                const { data: rows } = await SupabaseService.getSessions(user.id);
                // Prior completed sessions, not counting this one — same
                // "historical" convention calculatePersonalComparison already
                // uses elsewhere in the engine.
                const priorSessionCount = Math.max(0, (rows?.length ?? 1) - 1);
                const nextFactor = updatePersonalFactor(predictedRate, actualRate, currentFactor, priorSessionCount);
                if (nextFactor !== currentFactor) {
                  await SupabaseService.savePersonalFactor(user.id, nextFactor);
                  await refreshUserProfile();
                }
              }
            }
          } catch {
            // Best-effort — a missed update just means personalFactor
            // doesn't adjust this session; it'll try again next time.
          }
        })();
      }
    }

    onSessionEnd({ elapsed, sessionParams, reapplyEvents, session: heroSession, sessionDetailRow, discarded: tooShortToSave });
  }, [elapsed, sessionParams, reapplyEvents, onSessionEnd, userProfile, protectionPct]);

  const statTiles = [
    { label: 'ELAPSED', value: formatElapsed(elapsed) },
    { label: 'REAPPLIES', value: String(reapplyEvents.length) },
    { label: 'PEAK UV', value: peakUv.toFixed(1), color: uvIndexColor(peakUv) },
  ];
  const condTiles = [
    { label: 'UV INDEX', value: uvIndex.toFixed(1), color: uvIndexColor(uvIndex) },
    { label: 'TEMP', value: `${temperature}°` },
    { label: 'HUMIDITY', value: `${humidity}%` },
    { label: 'SHADE', value: inShade ? 'Yes' : 'No', color: inShade ? colors.protected : colors.ink },
  ];

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar style="dark" />
      <SessionTopBar elapsed={elapsed} onBack={onBack} onEndRequest={() => setShowEndModal(true)} />

      <ScrollView
        style={st.scroll}
        contentContainerStyle={st.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <SlideInView delay={0}>
          <SessionHero percent={protectionPct} minsRemaining={minsUntilReapplyNeeded} size={GAUGE_SIZE} />
        </SlideInView>

        <SlideInView delay={60} style={st.gap}>
          <DriverCard environment={sessionParams.environment} driver={driver} />
        </SlideInView>

        <SlideInView delay={110} style={st.gap}>
          <SessionActions
            snoozed={snoozed}
            inShade={inShade}
            onSnooze={handleSnooze}
            onShade={handleShade}
          />
        </SlideInView>

        <SlideInView delay={160} style={st.gap}>
          <SessionSparkline
            curve={curve}
            reapplyEvents={reapplyEvents}
            elapsed={elapsed}
            conditions={liveConditions}
            environment={sessionParams.environment}
          />
        </SlideInView>

        <SlideInView delay={210} style={st.gap}>
          <ExposureBattery fraction={dose} />
        </SlideInView>

        <SlideInView delay={222} style={st.gap}>
          <TodayDoseCard pct={todayDoseTotalPct} />
        </SlideInView>

        <SlideInView delay={235} style={st.gap}>
          <HeatRiskCard temperature={heatConditions.temperature} humidity={heatConditions.humidity} />
        </SlideInView>

        <SlideInView delay={260} style={st.gap}>
          <VitaminDTracker vitaminD={vitaminD} />
        </SlideInView>

        <SlideInView delay={285} style={st.gap}>
          <StatStrip tiles={statTiles} />
        </SlideInView>

        <SlideInView delay={325} style={st.gap}>
          <StatStrip tiles={condTiles} />
        </SlideInView>
      </ScrollView>

      {/* Pinned reapply action */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(247,244,239,0)', colors.canvas]}
        style={st.fade}
      />
      <View style={st.buttonArea}>
        <Animated.Text style={[st.confirmText, { opacity: confirmOpac, transform: [{ translateY: confirmSlide }] }]}>
          {toastMsg.current}
        </Animated.Text>
        <TouchableOpacity onPress={handleReapply} activeOpacity={0.88}>
          <Animated.View style={[st.reapplyShadow, { transform: [{ scale: btnScale }] }]}>
            <LinearGradient
              colors={[colors.gradOrangeStart, colors.gradOrangeEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={st.reapplyBtn}
            >
              <Ionicons name="water" size={18} color={colors.white} />
              <Text style={st.reapplyBtnText}>Applied Sunscreen</Text>
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
      </View>

      <EndSessionModal
        visible={showEndModal}
        tooShort={elapsed < MIN_SESSION_SECONDS_TO_SAVE}
        onConfirm={handleEndConfirm}
        onCancel={() => setShowEndModal(false)}
      />
    </SafeAreaView>
  );
}

// ─── Top bar styles ───────────────────────────────────────────
const tbSt = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 14,
    backgroundColor: colors.canvas,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  timerWrap: { flex: 1, alignItems: 'center', gap: 4 },
  timerText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 22, color: colors.ink,
    letterSpacing: -0.5, fontVariant: ['tabular-nums'],
  },
  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.greenWash,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  liveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.protected },
  liveLabel: {
    fontFamily: 'Outfit-Regular', fontSize: 10,
    color: colors.protected, letterSpacing: 1.2,
  },
  endLink: {
    fontFamily: 'Outfit-Regular', fontSize: 14,
    color: colors.danger, width: 38, textAlign: 'right',
  },
});

// ─── Confirmation modal styles ────────────────────────────────
const esSt = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  centerWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32,
  },
  card: {
    width: '100%', backgroundColor: colors.white, borderRadius: 22, padding: 24,
    shadowColor: colors.ink, shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14, shadowRadius: 28, elevation: 8,
  },
  title: {
    fontFamily: 'Outfit-Regular', fontSize: 20, color: colors.ink,
    letterSpacing: -0.4, marginBottom: 8,
  },
  body: {
    fontFamily: 'Outfit-Regular', fontSize: 14, color: colors.muted,
    lineHeight: 21, marginBottom: 24,
  },
  btnRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: 24, borderWidth: 1.5,
    borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  cancelText: { fontFamily: 'Outfit-Regular', fontSize: 15, color: colors.ink },
  endBtn: {
    flex: 1, height: 48, borderRadius: 24, backgroundColor: colors.danger,
    alignItems: 'center', justifyContent: 'center',
  },
  endText: { fontFamily: 'Outfit-Regular', fontSize: 15, color: colors.white },
});

// ─── Screen styles ─────────────────────────────────────────────
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 4, paddingBottom: 190 },
  fade: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    height: 220,
  },
  gap: { marginTop: 14 },
  buttonArea: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    paddingHorizontal: 20, paddingBottom: 104, paddingTop: 12,
    backgroundColor: 'transparent',
  },
  confirmText: {
    fontFamily: 'Outfit-Regular', fontSize: 13,
    color: colors.orange, textAlign: 'center', marginBottom: 10,
  },
  reapplyShadow: {
    borderRadius: 31, shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.32,
    shadowRadius: 16, elevation: 6,
  },
  reapplyBtn: {
    height: 62, borderRadius: 31, flexDirection: 'row', gap: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  reapplyBtnText: {
    fontFamily: 'Outfit-Regular', fontSize: 17,
    color: colors.white, letterSpacing: 0.1,
  },
});
