import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, Modal, Animated,
  SafeAreaView, StyleSheet, Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import colors from '../constants/colors';
import mockData from '../constants/mockData';
import ProtectionGauge, { gaugeColor } from '../components/ProtectionGauge';

const { width: SCREEN_W } = Dimensions.get('window');
const GAUGE_SIZE = Math.round(SCREEN_W * 0.76);

// ─── Helpers ──────────────────────────────────────────────────
function formatElapsed(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// ─── Depletion helpers ────────────────────────────────────────
const UV_BASELINE = 7;

function computeSession(elapsedSinceReapply, sessionParams) {
  const { waterResistance, spf } = sessionParams;
  const uvIndex    = mockData.conditions.uvIndex;
  const spfBonus   = spf >= 50 ? 1.15 : 1.0;
  const totalMins  = (waterResistance * (UV_BASELINE / uvIndex)) * spfBonus;
  const elapsedMins    = elapsedSinceReapply / 60;
  const protectionPct  = Math.max(0, 100 - (elapsedMins / totalMins) * 100);
  const minsRemaining  = Math.max(0, Math.round(totalMins - elapsedMins));
  return { protectionPct, minsRemaining };
}

function uvIndexColor(uvi) {
  if (uvi >= 8) return colors.danger;
  if (uvi >= 3) return colors.warning;
  return colors.protected;
}

function getKeyDriver(uvIndex, environment) {
  if (environment === 'Beach / Water') return 'Water activity is your main depletion factor';
  if (environment === 'Snow / Mountains') return 'Snow reflection is amplifying your UV exposure';
  if (uvIndex >= 8) return 'High UV is your main depletion factor right now';
  if (uvIndex >= 5) return 'Moderate UV is the primary driver of depletion';
  return 'Low UV — your protection is holding well';
}

// ─── Conditions strip ─────────────────────────────────────────
const ConditionsStrip = React.memo(function ConditionsStrip() {
  const { uvIndex, temperature, humidity, activity } = mockData.conditions;
  const tiles = [
    { label: 'UV Index',  value: uvIndex.toFixed(1), color: uvIndexColor(uvIndex) },
    { label: 'Temp',      value: `${temperature}°`,  color: colors.ink },
    { label: 'Humidity',  value: `${humidity}%`,     color: colors.ink },
    { label: 'Activity',  value: activity,            color: colors.ink },
  ];
  return (
    <View style={cndSt.row}>
      {tiles.map((tile, i) => (
        <View key={tile.label} style={[cndSt.tile, i < tiles.length - 1 && cndSt.tileDivider]}>
          <Text style={[cndSt.val, { color: tile.color }]}>{tile.value}</Text>
          <Text style={cndSt.label}>{tile.label}</Text>
        </View>
      ))}
    </View>
  );
});

// ─── Gauge center content ─────────────────────────────────────
const GaugeCenter = React.memo(function GaugeCenter({ percent, minsRemaining, keyDriver }) {
  const color = gaugeColor(percent);
  return (
    <View style={gcSt.wrap}>
      <Text style={[gcSt.pct, { color }]}>{Math.round(percent)}%</Text>
      <Text style={gcSt.sub}>Protection remaining</Text>
      <Text style={[gcSt.time, { color }]}>~{minsRemaining} min until reapplication</Text>
      <Text style={gcSt.driver} numberOfLines={2}>{keyDriver}</Text>
    </View>
  );
});

// ─── End session confirmation modal ──────────────────────────
const EndSessionModal = React.memo(function EndSessionModal({ visible, onConfirm, onCancel }) {
  const scaleAnim  = useRef(new Animated.Value(0.88)).current;
  const opacAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacAnim,  { toValue: 1,    duration: 180, useNativeDriver: true }),
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
            Your session data will be saved and you'll get a summary.
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

  const onBackPressIn  = () => Animated.spring(backScale, { toValue: 0.88, useNativeDriver: true, tension: 280, friction: 12 }).start();
  const onBackPressOut = () => Animated.spring(backScale, { toValue: 1,    useNativeDriver: true, tension: 200, friction: 10 }).start();

  return (
    <View style={tbSt.bar}>
      {/* Back arrow */}
      <TouchableOpacity
        onPress={onBack}
        onPressIn={onBackPressIn}
        onPressOut={onBackPressOut}
        hitSlop={12}
        activeOpacity={1}
      >
        <Animated.View style={[tbSt.backBtn, { transform: [{ scale: backScale }] }]}>
          <View style={tbSt.arrowShaft} />
          <View style={tbSt.arrowHeadTop} />
          <View style={tbSt.arrowHeadBottom} />
        </Animated.View>
      </TouchableOpacity>

      {/* Live timer */}
      <View style={tbSt.timerWrap}>
        <Text style={tbSt.timerText}>{formatElapsed(elapsed)}</Text>
        <View style={tbSt.livePill}>
          <View style={tbSt.liveDot} />
          <Text style={tbSt.liveLabel}>LIVE</Text>
        </View>
      </View>

      {/* End session */}
      <TouchableOpacity onPress={onEndRequest} hitSlop={12} activeOpacity={0.6}>
        <Text style={tbSt.endLink}>End</Text>
      </TouchableOpacity>
    </View>
  );
});

// ─── Main screen ──────────────────────────────────────────────
export default function ActiveSessionScreen({ sessionParams, elapsed, onBack, onSessionEnd }) {
  const [showEndModal,  setShowEndModal]  = useState(false);
  const [reapplyBasis,  setReapplyBasis]  = useState(0);

  // Animation refs for the reapply button
  const btnScale      = useRef(new Animated.Value(1)).current;
  const confirmOpac   = useRef(new Animated.Value(0)).current;
  const confirmSlide  = useRef(new Animated.Value(6)).current;

  const elapsedSinceReapply = elapsed - reapplyBasis;

  const { protectionPct, minsRemaining } = useMemo(
    () => computeSession(elapsedSinceReapply, sessionParams),
    [elapsedSinceReapply, sessionParams]
  );

  const keyDriver = useMemo(
    () => getKeyDriver(mockData.conditions.uvIndex, sessionParams.environment),
    [sessionParams.environment]
  );

  const handleReapply = useCallback(() => {
    setReapplyBasis(elapsed);

    // Button pulse
    Animated.sequence([
      Animated.spring(btnScale, { toValue: 1.05, tension: 200, friction: 6,  useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1,    tension: 180, friction: 8,  useNativeDriver: true }),
    ]).start();

    // Confirmation toast: slide up + fade in, hold, fade out
    confirmSlide.setValue(6);
    confirmOpac.setValue(0);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(confirmOpac,  { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(confirmSlide, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]),
      Animated.delay(1600),
      Animated.timing(confirmOpac, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [elapsed, btnScale, confirmOpac, confirmSlide]);

  const handleEndConfirm = useCallback(() => {
    setShowEndModal(false);
    onSessionEnd({ elapsed, sessionParams });
  }, [elapsed, sessionParams, onSessionEnd]);

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar style="dark" />

      <SessionTopBar
        elapsed={elapsed}
        onBack={onBack}
        onEndRequest={() => setShowEndModal(true)}
      />

      {/* Hero gauge */}
      <View style={st.heroWrap}>
        <ProtectionGauge percent={protectionPct} size={GAUGE_SIZE} pulsing>
          <GaugeCenter
            percent={protectionPct}
            minsRemaining={minsRemaining}
            keyDriver={keyDriver}
          />
        </ProtectionGauge>
      </View>

      {/* Live conditions */}
      <ConditionsStrip />

      {/* Flexible body for future content */}
      <View style={st.body} />

      {/* Reapply button area — always at bottom, never scrolled away */}
      <View style={st.buttonArea}>
        <Animated.Text style={[st.confirmText, { opacity: confirmOpac, transform: [{ translateY: confirmSlide }] }]}>
          Protection reset — clock restarted
        </Animated.Text>
        <TouchableOpacity onPress={handleReapply} activeOpacity={0.88}>
          <Animated.View style={[st.reapplyBtn, { transform: [{ scale: btnScale }] }]}>
            <Text style={st.reapplyBtnText}>Applied Sunscreen</Text>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Custom arrow — shaft + two diagonal lines for the head
  arrowShaft: {
    position: 'absolute',
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.ink,
    right: 6,
  },
  arrowHeadTop: {
    position: 'absolute',
    width: 8,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.ink,
    left: 6,
    top: 11,
    transform: [{ rotate: '-45deg' }],
  },
  arrowHeadBottom: {
    position: 'absolute',
    width: 8,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.ink,
    left: 6,
    bottom: 11,
    transform: [{ rotate: '45deg' }],
  },
  timerWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  timerText: {
    fontFamily: 'SFProDisplay-Black',
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.protected,
  },
  liveLabel: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 10,
    color: colors.protected,
    letterSpacing: 1.2,
  },
  endLink: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 14,
    color: colors.danger,
    width: 32,
    textAlign: 'right',
  },
});

// ─── Confirmation modal styles ────────────────────────────────
const esSt = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  centerWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 24,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 8,
  },
  title: {
    fontFamily: 'SFProDisplay-Black',
    fontSize: 20,
    color: colors.ink,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  body: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 14,
    color: colors.muted,
    lineHeight: 21,
    marginBottom: 24,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 15,
    color: colors.ink,
  },
  endBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endText: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 15,
    color: colors.white,
  },
});

// ─── Gauge center styles ──────────────────────────────────────
const gcSt = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  pct: {
    fontFamily: 'SFProDisplay-Black',
    fontSize: 66,
    letterSpacing: -3,
    lineHeight: 72,
  },
  sub: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
    textAlign: 'center',
  },
  time: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  driver: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 11,
    color: colors.muted,
    marginTop: 5,
    textAlign: 'center',
    lineHeight: 15,
  },
});

// ─── Conditions strip styles ──────────────────────────────────
const cndSt = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    gap: 3,
  },
  tileDivider: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  val: {
    fontFamily: 'SFProDisplay-Black',
    fontSize: 17,
    letterSpacing: -0.4,
  },
  label: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 0.3,
  },
});

// ─── Screen styles ─────────────────────────────────────────────
const st = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  heroWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  body: {
    flex: 1,
  },
  buttonArea: {
    paddingHorizontal: 20,
    paddingBottom: 104,
    paddingTop: 8,
    backgroundColor: colors.white,
  },
  confirmText: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 13,
    color: colors.orange,
    textAlign: 'center',
    marginBottom: 10,
  },
  reapplyBtn: {
    height: 62,
    borderRadius: 18,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 16,
    elevation: 6,
  },
  reapplyBtnText: {
    fontFamily: 'SFProDisplay-Black',
    fontSize: 17,
    color: colors.white,
    letterSpacing: 0.1,
  },
});
