import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, Animated,
  ScrollView, PanResponder, StyleSheet, Keyboard, Dimensions,
} from 'react-native';
import colors from '../constants/colors';

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_H = SCREEN_H;
const ENVIRONMENTS = [
  { label: 'Beach / Water',    icon: '🏖️' },
  { label: 'Snow / Mountains', icon: '⛷️' },
  { label: 'General Outdoors', icon: '🌲' },
  { label: 'Other',            icon: '📍' },
];

// ─── Full setup sheet ─────────────────────────────────────────
function FullSetupSheet({ onStart, onCancel }) {
  const [spf, setSpf]               = useState('');
  const [water, setWater]           = useState('');
  const [env, setEnv]               = useState(null);

  const canStart = spf.length > 0 && water.length > 0;

  const handleStart = useCallback(() => {
    if (!canStart) return;
    onStart({
      spf: parseInt(spf, 10),
      waterResistance: parseInt(water, 10),
      environment: env ?? ENVIRONMENTS[2].label,
    });
  }, [spf, water, env, canStart, onStart]);

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
        placeholderTextColor={colors.border}
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
        placeholderTextColor={colors.border}
        keyboardType="number-pad"
        value={water}
        onChangeText={setWater}
        returnKeyType="done"
      />
      <Text style={fst.helper}>Check your sunscreen bottle for this number. If unsure enter 40.</Text>

      <Text style={[fst.fieldLabel, { marginTop: 20 }]}>Environment</Text>
      <View style={fst.envGrid}>
        {ENVIRONMENTS.map(({ label, icon }) => (
          <TouchableOpacity
            key={label}
            style={[fst.envTile, env === label && fst.envTileSelected]}
            onPress={() => setEnv((prev) => (prev === label ? null : label))}
            activeOpacity={0.8}
          >
            <Text style={fst.envIcon}>{icon}</Text>
            <Text style={[fst.envLabel, env === label && fst.envLabelSelected]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[fst.startBtn, !canStart && fst.startBtnDisabled]}
        onPress={handleStart}
        activeOpacity={canStart ? 0.85 : 1}
      >
        <Text style={[fst.startBtnText, !canStart && fst.startBtnTextDisabled]}>Start Session</Text>
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
      <TouchableOpacity style={qst.yesBtn} onPress={onConfirm} activeOpacity={0.85}>
        <Text style={qst.yesBtnText}>Yes, Start Session</Text>
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
  const slideAnim = useRef(new Animated.Value(SHEET_H)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const dragY     = useRef(new Animated.Value(0)).current;
  const dragYVal  = useRef(0);

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
            <FullSetupSheet onStart={onStart} onCancel={close} />
          ) : (
            <QuickConfirmSheet
              lastSession={lastSession}
              onConfirm={() => onStart(lastSession)}
              onChange={() => setShowFull(true)}
              onCancel={close}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Full setup styles ────────────────────────────────────────
const fst = StyleSheet.create({
  scroll:       { paddingHorizontal: 4 },
  heading: {
    fontFamily: 'SFProDisplay-Black',
    fontSize: 26,
    color: colors.ink,
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  sub: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 14,
    color: colors.muted,
    lineHeight: 21,
    marginBottom: 24,
  },
  fieldLabel: {
    fontFamily: 'SFProDisplay-Bold',
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
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 16,
    color: colors.ink,
  },
  helper: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 12,
    color: colors.muted,
    marginTop: 6,
  },
  envGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 28,
  },
  envTile: {
    width: '47%',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  envTileSelected: {
    borderColor: colors.orange,
    backgroundColor: colors.orangeLight + '30',
  },
  envIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  envLabel: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 13,
    color: colors.muted,
  },
  envLabelSelected: {
    color: colors.orange,
  },
  startBtn: {
    height: 56,
    borderRadius: 17,
    backgroundColor: colors.orange,
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
    fontFamily: 'SFProDisplay-Bold',
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
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 14,
    color: colors.muted,
  },
});

// ─── Quick confirm styles ─────────────────────────────────────
const qst = StyleSheet.create({
  heading: {
    fontFamily: 'SFProDisplay-Black',
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
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 15,
    color: colors.muted,
    lineHeight: 22,
  },
  summaryBold: {
    fontFamily: 'SFProDisplay-Bold',
    color: colors.ink,
  },
  summaryQ: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 15,
    color: colors.ink,
    marginTop: 10,
  },
  yesBtn: {
    height: 56,
    borderRadius: 17,
    backgroundColor: colors.orange,
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
    fontFamily: 'SFProDisplay-Bold',
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
    fontFamily: 'SFProDisplay-Regular',
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
    fontFamily: 'SFProDisplay-Regular',
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
