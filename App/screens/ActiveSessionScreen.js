import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, Modal, Animated, ScrollView,
  SafeAreaView, StyleSheet, Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import mockData from '../constants/mockData';
import SlideInView from '../components/SlideInView';
import SessionHero from '../components/activeSession/SessionHero';
import SessionSparkline from '../components/activeSession/SessionSparkline';
import ExposureBattery from '../components/activeSession/ExposureBattery';
import DriverCard from '../components/activeSession/DriverCard';
import StatStrip from '../components/activeSession/StatStrip';
import SessionActions from '../components/activeSession/SessionActions';
import {
  protectionAt, buildCurve, uvDoseFraction, statusFor,
  uvIndexColor, keyDriver, formatElapsed, liveConditionsAt,
} from '../components/activeSession/sessionMath';

const { width: SCREEN_W } = Dimensions.get('window');
const GAUGE_SIZE = Math.round(SCREEN_W * 0.58);

// ─── End session confirmation modal ──────────────────────────
const EndSessionModal = React.memo(function EndSessionModal({ visible, onConfirm, onCancel }) {
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
          <Text style={esSt.body}>Your session data will be saved and you'll get a summary.</Text>
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
  const [showEndModal, setShowEndModal] = useState(false);
  const [snoozed, setSnoozed] = useState(false);
  const [reapplyEvents, setReapplyEvents] = useState([]); // seconds since session start
  const [inShade, setInShade] = useState(false);

  const btnScale = useRef(new Animated.Value(1)).current;
  const confirmOpac = useRef(new Animated.Value(0)).current;
  const confirmSlide = useRef(new Animated.Value(6)).current;
  const toastMsg = useRef('Protection reset — clock restarted');
  const [, forceTick] = useState(0);

  const lastReapply = reapplyEvents.length ? reapplyEvents[reapplyEvents.length - 1] : 0;
  const elapsedSinceReapply = elapsed - lastReapply;

  const { protectionPct, minsRemaining } = useMemo(
    () => protectionAt(elapsedSinceReapply, sessionParams),
    [elapsedSinceReapply, sessionParams]
  );

  const curve = useMemo(
    () => buildCurve(elapsed, reapplyEvents, sessionParams),
    [elapsed, reapplyEvents, sessionParams]
  );

  // Live conditions drift over the session (BLE/weather seam). The chart's
  // factor meters and the condition tiles both read from this so they move
  // together as the session evolves.
  const liveConditions = useMemo(() => liveConditionsAt(mockData.conditions, elapsed), [elapsed]);

  const dose = useMemo(() => uvDoseFraction(elapsed), [elapsed]);
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

  const handleReapply = useCallback(() => {
    setReapplyEvents((prev) => [...prev, elapsed]);
    setSnoozed(false);
    Animated.sequence([
      Animated.spring(btnScale, { toValue: 1.05, tension: 200, friction: 6, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, tension: 180, friction: 8, useNativeDriver: true }),
    ]).start();
    showToast('Protection reset — clock restarted');
  }, [elapsed, btnScale, showToast]);

  const handleSnooze = useCallback(() => {
    setSnoozed((s) => {
      showToast(s ? 'Alert un-snoozed' : 'Reapply alert snoozed 15 min');
      return !s;
    });
  }, [showToast]);

  const handleShade = useCallback(() => {
    setInShade((s) => {
      showToast(s ? 'Back in the sun' : "In the shade — you're covered");
      return !s;
    });
  }, [showToast]);

  const handleEndConfirm = useCallback(() => {
    setShowEndModal(false);
    onSessionEnd({ elapsed, sessionParams, reapplyEvents });
  }, [elapsed, sessionParams, reapplyEvents, onSessionEnd]);

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
          <SessionHero percent={protectionPct} minsRemaining={minsRemaining} size={GAUGE_SIZE} />
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
          <View style={st.rowGap}>
            <ExposureBattery fraction={dose} />
          </View>
        </SlideInView>

        <SlideInView delay={260} style={st.gap}>
          <StatStrip tiles={statTiles} />
        </SlideInView>

        <SlideInView delay={300} style={st.gap}>
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
    fontFamily: 'SpaceGrotesk-Bold',
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
    fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 10,
    color: colors.protected, letterSpacing: 1.2,
  },
  endLink: {
    fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 14,
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
    fontFamily: 'SpaceGrotesk-Bold', fontSize: 20, color: colors.ink,
    letterSpacing: -0.4, marginBottom: 8,
  },
  body: {
    fontFamily: 'Inter-Regular', fontSize: 14, color: colors.muted,
    lineHeight: 21, marginBottom: 24,
  },
  btnRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: 24, borderWidth: 1.5,
    borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  cancelText: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15, color: colors.ink },
  endBtn: {
    flex: 1, height: 48, borderRadius: 24, backgroundColor: colors.danger,
    alignItems: 'center', justifyContent: 'center',
  },
  endText: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15, color: colors.white },
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
  rowGap: { flexDirection: 'row', marginHorizontal: 16, gap: 12 },
  buttonArea: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    paddingHorizontal: 20, paddingBottom: 104, paddingTop: 12,
    backgroundColor: 'transparent',
  },
  confirmText: {
    fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 13,
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
    fontFamily: 'SpaceGrotesk-Bold', fontSize: 17,
    color: colors.white, letterSpacing: 0.1,
  },
});
