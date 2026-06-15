import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, Animated,
  ScrollView, PanResponder, StyleSheet, Keyboard, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../constants/colors';
import EnvironmentChip from './EnvironmentChip';
import EnvironmentTileGrid from './EnvironmentTileGrid';
import ConfirmDialog from './ConfirmDialog';
import { detectEnvironment } from '../services/LocationService';

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_H = SCREEN_H;

// ─── Full setup sheet ─────────────────────────────────────────
// `detection` is null while location lookup is in flight, then
// { status: 'granted' | 'denied' | 'error', environment } from LocationService.
function FullSetupSheet({ detection, onStart, onCancel }) {
  const [spf, setSpf]                   = useState('');
  const [water, setWater]               = useState('');
  const [envSelection, setEnvSelection] = useState(null); // category label or 'Custom'
  const [customText, setCustomText]     = useState('');
  const [selectorOpen, setSelectorOpen] = useState(false);

  const detecting = detection === null;
  const detected  = detection?.status === 'granted' ? detection.environment : null;
  // Permission denied or lookup failed → manual grid is the primary input
  const showGrid  = (!detecting && !detected) || selectorOpen;

  const environment = envSelection === 'Custom'
    ? (customText.trim() || detected || 'Other')
    : (envSelection ?? detected ?? 'Other');

  const canStart = spf.length > 0 && water.length > 0;

  const handleStart = useCallback(() => {
    if (!canStart) return;
    onStart({
      spf: parseInt(spf, 10),
      waterResistance: parseInt(water, 10),
      environment,
    });
  }, [spf, water, environment, canStart, onStart]);

  const handleSelectEnv = useCallback((label) => {
    if (label === 'Custom') {
      setEnvSelection('Custom');
      return; // keep selector open so the text input is visible
    }
    setEnvSelection(label);
    setSelectorOpen(false);
    if (detected && label !== detected) {
      console.log('environment override', { detected, selected: label, customText: null });
    }
  }, [detected]);

  const handleCustomCommit = useCallback(() => {
    const text = customText.trim();
    if (detected && text) {
      console.log('environment override', { detected, selected: 'Custom', customText: text });
    }
  }, [customText, detected]);

  const openSelector = useCallback(() => setSelectorOpen(true), []);

  const chipLabel = envSelection === 'Custom'
    ? (customText.trim() || 'Custom')
    : (envSelection ?? detected);

  return (
    <ScrollView
      style={fst.scroll}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      automaticallyAdjustKeyboardInsets
    >
      <Text style={fst.heading}>Set up your session</Text>
      <Text style={fst.sub}>We'll use this to calculate your protection accurately</Text>

      <Text style={fst.fieldLabel}>SPF</Text>
      <TextInput
        style={fst.input}
        placeholder="e.g. 30, 50, 100"
        placeholderTextColor={colors.muted}
        keyboardType="number-pad"
        value={spf}
        onChangeText={setSpf}
        returnKeyType="done"
      />
      <Text style={fst.helper}>Check your sunscreen bottle</Text>

      <Text style={[fst.fieldLabel, { marginTop: 16 }]}>Water Resistance (minutes)</Text>
      <TextInput
        style={fst.input}
        placeholder="e.g. 40, 80"
        placeholderTextColor={colors.muted}
        keyboardType="number-pad"
        value={water}
        onChangeText={setWater}
        returnKeyType="done"
      />
      <Text style={fst.helper}>Check your sunscreen bottle for this number. If unsure enter 40.</Text>

      <Text style={[fst.fieldLabel, { marginTop: 20 }]}>Environment</Text>
      {showGrid ? (
        <View style={fst.envGridWrap}>
          <EnvironmentTileGrid
            selection={envSelection ?? detected}
            onSelect={handleSelectEnv}
            customText={customText}
            onCustomTextChange={setCustomText}
            onCustomTextCommit={handleCustomCommit}
          />
        </View>
      ) : (
        <EnvironmentChip
          label={chipLabel}
          detected={!envSelection}
          pending={detecting}
          onPress={openSelector}
        />
      )}

      <TouchableOpacity onPress={handleStart} activeOpacity={canStart ? 0.85 : 1}>
        {canStart ? (
          <LinearGradient
            colors={[colors.gradOrangeStart, colors.gradOrangeEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={fst.startBtn}
          >
            <Text style={fst.startBtnText}>Start Session</Text>
          </LinearGradient>
        ) : (
          <View style={[fst.startBtn, fst.startBtnDisabled]}>
            <Text style={[fst.startBtnText, fst.startBtnTextDisabled]}>Start Session</Text>
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity style={fst.cancelBtn} onPress={onCancel} activeOpacity={0.6}>
        <Text style={fst.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Quick confirm sheet ──────────────────────────────────────
function QuickConfirmSheet({ lastSession, onConfirm, onChange, onCancel }) {
  return (
    <View>
      <Text style={qst.heading}>Start session</Text>
      <View style={qst.summaryCard}>
        <Text style={qst.summaryText}>
          Last time:{' '}
          <Text style={qst.summaryBold}>SPF {lastSession.spf}</Text>
          {' · '}
          <Text style={qst.summaryBold}>{lastSession.waterResistance} min rated</Text>
          {' · '}
          <Text style={qst.summaryBold}>{lastSession.environment}</Text>
        </Text>
        <Text style={qst.summaryQ}>Use the same settings?</Text>
      </View>
      <TouchableOpacity onPress={onConfirm} activeOpacity={0.85}>
        <LinearGradient
          colors={[colors.gradOrangeStart, colors.gradOrangeEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={qst.yesBtn}
        >
          <Text style={qst.yesBtnText}>Yes, Start Session</Text>
        </LinearGradient>
      </TouchableOpacity>
      <TouchableOpacity style={qst.changeBtn} onPress={onChange} activeOpacity={0.6}>
        <Text style={qst.changeBtnText}>Change settings</Text>
      </TouchableOpacity>
      <TouchableOpacity style={qst.cancelBtn} onPress={onCancel} activeOpacity={0.6}>
        <Text style={qst.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Outer sheet wrapper (handles slide + swipe dismiss) ──────
export default function SessionSetupSheet({ visible, lastSession, onStart, onDismiss }) {
  const [showFull, setShowFull] = useState(!lastSession);
  const [detection, setDetection] = useState(null);
  const [pendingParams, setPendingParams] = useState(null); // params awaiting confirmation
  const slideAnim = useRef(new Animated.Value(SHEET_H)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const dragY     = useRef(new Animated.Value(0)).current;
  const dragYVal  = useRef(0);

  // Detect environment as soon as setup starts (first-time or returning),
  // so the result is ready by the time the full sheet is shown.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setDetection(null);
    detectEnvironment().then((result) => {
      if (!cancelled) setDetection(result);
    });
    return () => { cancelled = true; };
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setShowFull(!lastSession);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const close = useCallback(() => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(dragY,     { toValue: SHEET_H, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      dragY.setValue(0);
      slideAnim.setValue(SHEET_H);
      onDismiss();
    });
  }, [onDismiss]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  (_, g) => g.dy > 0,
      onPanResponderGrant: () => { dragYVal.current = 0; },
      onPanResponderMove: (_, g) => {
        if (g.dy < 0) return;
        dragYVal.current = g.dy;
        dragY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (dragYVal.current > 100 || g.vy > 0.6) {
          close();
        } else {
          Animated.spring(dragY, { toValue: 0, tension: 140, friction: 10, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  // Both "Start Session" buttons funnel here — confirm before locking in,
  // since settings can't be changed once the session is running.
  const requestStart = useCallback((params) => {
    Keyboard.dismiss();
    setPendingParams(params);
  }, []);

  const confirmStart = useCallback(() => {
    const params = pendingParams;
    setPendingParams(null);
    onStart(params);
  }, [pendingParams, onStart]);

  const sheetTranslate = Animated.add(slideAnim, dragY);
  const overlayOpacity = Animated.multiply(
    fadeAnim,
    dragY.interpolate({ inputRange: [0, 200], outputRange: [1, 0], extrapolate: 'clamp' })
  );

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" onRequestClose={close}>
      <Animated.View style={[wst.overlay, { opacity: overlayOpacity }]}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={close} />
      </Animated.View>
      <View style={wst.positioner} pointerEvents="box-none">
        <Animated.View style={[wst.sheet, { transform: [{ translateY: sheetTranslate }] }]}>
          <View style={wst.handleWrap} {...panResponder.panHandlers}>
            <View style={wst.handle} />
          </View>
          {showFull ? (
            <FullSetupSheet detection={detection} onStart={requestStart} onCancel={close} />
          ) : (
            <QuickConfirmSheet
              lastSession={lastSession}
              onConfirm={() => requestStart(lastSession)}
              onChange={() => setShowFull(true)}
              onCancel={close}
            />
          )}
        </Animated.View>
      </View>

      <ConfirmDialog
        visible={pendingParams !== null}
        title="Lock in your settings?"
        message="Once your session starts, your SPF, water resistance, and environment can't be changed. End the session if you need to adjust them."
        confirmLabel="Start session"
        cancelLabel="Go back"
        onConfirm={confirmStart}
        onCancel={() => setPendingParams(null)}
      />
    </Modal>
  );
}

// ─── Full setup styles ────────────────────────────────────────
const fst = StyleSheet.create({
  scroll:       { paddingHorizontal: 4, flexShrink: 1 },
  heading: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 26,
    color: colors.ink,
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  sub: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.muted,
    lineHeight: 21,
    marginBottom: 24,
  },
  fieldLabel: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 13,
    color: colors.inkMid,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  input: {
    height: 50,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.ink,
  },
  helper: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.muted,
    marginTop: 6,
  },
  envGridWrap: {
    marginBottom: 28,
  },
  startBtn: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 5,
  },
  startBtnDisabled: {
    backgroundColor: colors.surface,
    shadowOpacity: 0,
    elevation: 0,
  },
  startBtnText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 17,
    color: colors.white,
    letterSpacing: 0.2,
  },
  startBtnTextDisabled: {
    color: colors.muted,
  },
  cancelBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  cancelText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.muted,
  },
});

// ─── Quick confirm styles ─────────────────────────────────────
const qst = StyleSheet.create({
  heading: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 26,
    color: colors.ink,
    letterSpacing: -0.8,
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 24,
  },
  summaryText: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: colors.muted,
    lineHeight: 22,
  },
  summaryBold: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: colors.ink,
  },
  summaryQ: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 15,
    color: colors.ink,
    marginTop: 10,
  },
  yesBtn: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 5,
    marginBottom: 10,
  },
  yesBtnText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 17,
    color: colors.white,
    letterSpacing: 0.2,
  },
  changeBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeBtnText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.inkMid,
  },
  cancelBtn: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  cancelText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.muted,
  },
});

// ─── Wrapper sheet styles ─────────────────────────────────────
const wst = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  positioner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 24,
    paddingBottom: 52,
    minHeight: SCREEN_H * 0.78,
    maxHeight: SCREEN_H * 0.92, // bound the inner ScrollView so it can scroll
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
});
