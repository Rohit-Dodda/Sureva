import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Modal, View, Text, StyleSheet, Dimensions, TouchableOpacity, Animated, Easing, Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import { sunPosition, sampleDayArc } from '../services/SunPositionService';
import { buildStamp, TIER_LABELS } from '../services/SunStampService';
import { artFor } from '../constants/sunStamps';
import SkyScoutView from '../components/sunStamps/SkyScoutView';
import { aimAtSun } from '../components/sunStamps/skyProjection';
import StampRevealCard from '../components/sunStamps/StampRevealCard';
import useSkyPointing from '../components/sunStamps/useSkyPointing';
import PressableScale from '../components/PressableScale';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

// The capture ritual. Camera passthrough with today's sun path drawn over the
// real sky, a live rarity readout, and a shutter.
//
// Deliberately session-independent: this opens any time, needs no wearable
// and no active session, and never shows UV, protection, or time-remaining.
export default function SunScoutScreen({
  visible, location, history = [], weather, onClose, onCaptured,
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [captured, setCaptured] = useState(null);
  const [now, setNow] = useState(() => new Date());

  const pointing = useSkyPointing(visible && !captured);
  const flashAnim = useRef(new Animated.Value(0)).current;
  const revealAnim = useRef(new Animated.Value(0)).current;

  // The sun moves ~0.25°/minute, so a 20-second tick keeps the marker honest
  // without re-running the astronomy on every frame.
  useEffect(() => {
    if (!visible || captured) return undefined;
    const id = setInterval(() => setNow(new Date()), 20000);
    return () => clearInterval(id);
  }, [visible, captured]);

  const lat = location?.latitude ?? null;
  const lon = location?.longitude ?? null;
  const hasFix = typeof lat === 'number' && typeof lon === 'number';

  const currentSun = useMemo(
    () => (hasFix ? sunPosition(now, lat, lon) : null),
    [now, lat, lon, hasFix]
  );

  const arc = useMemo(
    () => (hasFix ? sampleDayArc(now, lat, lon, 10) : []),
    [now, lat, lon, hasFix]
  );

  // What this capture would earn right now. Recomputed as the clock ticks so
  // the readout climbs on its own as golden hour arrives — the thing that
  // makes this scouting rather than snapping.
  const preview = useMemo(() => {
    if (!hasFix) return null;
    return buildStamp({
      date: now,
      latitude: lat,
      longitude: lon,
      altitudeM: location?.altitude ?? null,
      placeName: location?.placeName ?? null,
      cloudCoverPct: weather?.cloudCoverPct,
      typicalCloudPct: weather?.typicalCloudPct,
    }, history);
  }, [now, lat, lon, hasFix, location, weather, history]);

  // Whether the phone is actually aimed at the sun, and if not, which way to
  // turn. This is what makes it scouting rather than a button: you have to
  // find the sun before you can keep it.
  const aim = useMemo(
    () => aimAtSun(currentSun, pointing.heading, pointing.elevation),
    [currentSun, pointing.heading, pointing.elevation]
  );

  // Ghosts of past captures at this place, at their true historical sun
  // positions — only for stamps caught near here, since a marker from another
  // city would be meaningless in this sky.
  const ghosts = useMemo(() => {
    if (!hasFix) return [];
    return history
      .filter((h) => typeof h.latitude === 'number'
        && Math.abs(h.latitude - lat) < 0.5
        && Math.abs(h.longitude - lon) < 0.5)
      .map((h) => ({ altitude: h.altitude, azimuth: h.azimuth }));
  }, [history, lat, lon, hasFix]);

  const handleCapture = useCallback(() => {
    if (!preview || !aim.locked) return;
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();


    setCaptured(preview);
    revealAnim.setValue(0);
    Animated.timing(revealAnim, {
      toValue: 1, duration: 480, easing: EASE_OUT, useNativeDriver: true,
    }).start();
  }, [preview, aim.locked, flashAnim, revealAnim]);

  // Committing is what actually persists the stamp — the reveal is shown
  // first so the moment lands before the bookkeeping.
  const handleCommit = useCallback(() => {
    const stamp = captured;
    setCaptured(null);
    onCaptured?.(stamp);
  }, [captured, onCaptured]);

  const handleClose = useCallback(() => {
    setCaptured(null);
    onClose?.();
  }, [onClose]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={handleClose}>
      <View style={st.root}>
        <StatusBar style="light" />

        {permission?.granted ? (
          <CameraView style={StyleSheet.absoluteFill} facing="back" />
        ) : (
          <View style={[StyleSheet.absoluteFill, st.permissionWrap]}>
            <Ionicons name="camera-outline" size={40} color={colors.onDarkMuted} />
            <Text style={st.permissionTitle}>See the sky</Text>
            <Text style={st.permissionBody}>
              Sureva uses your camera to catch what the sky looks like right now.
              Nothing is recorded or shared unless you choose to keep it.
            </Text>
            <PressableScale style={st.permissionBtn} onPress={requestPermission}>
              <Text style={st.permissionBtnLabel}>Allow camera</Text>
            </PressableScale>
          </View>
        )}

        {permission?.granted && hasFix ? (
          <SkyScoutView
            arc={arc}
            sunPosition={currentSun}
            ghosts={ghosts}
            heading={pointing.heading}
            elevation={pointing.elevation}
            width={SCREEN_W}
            height={SCREEN_H}
          />
        ) : null}

        {/* Live rarity readout. Sits on a solid scrim, not bare over the sky —
            this is the one piece of UI read outdoors in glare. */}
        {permission?.granted && preview && !captured ? (
          <View style={st.rarityPill}>
            <View style={[st.rarityDot, { backgroundColor: artFor(preview.tier).accent }]} />
            <Text style={st.rarityLabel}>{TIER_LABELS[preview.tier]}</Text>
          </View>
        ) : null}

        {/* Directional hint — the whole scouting loop lives here. Sits on a
            scrim because it's read outdoors in glare. */}
        {permission?.granted && !captured && aim.hint ? (
          <View style={st.hintWrap}>
            <Text style={st.hintText}>{aim.hint}</Text>
          </View>
        ) : null}

        {permission?.granted && !captured ? (
          <View style={st.shutterRow}>
            <TouchableOpacity
              style={[st.shutter, !aim.locked && st.shutterLocked]}
              onPress={handleCapture}
              disabled={!preview || !aim.locked}
              accessibilityLabel={aim.locked ? 'Capture stamp' : 'Find the sun to capture'}
              accessibilityState={{ disabled: !aim.locked }}
            >
              <View style={[st.shutterInner, !aim.locked && st.shutterInnerLocked]} />
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity
          style={st.closeBtn}
          onPress={handleClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={26} color={colors.white} />
        </TouchableOpacity>

        <Animated.View style={[st.flash, { opacity: flashAnim }]} pointerEvents="none" />

        {/* Reveal — the payoff. Heavy scrim buys back the contrast the card's
            richness costs when it appears outdoors. */}
        {captured ? (
          <Animated.View style={[StyleSheet.absoluteFill, st.reveal, { opacity: revealAnim }]}>
            <Pressable style={st.revealPress} onPress={handleCommit}>
              <Animated.View
                style={{
                  transform: [
                    { scale: revealAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
                    { translateY: revealAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
                  ],
                }}
              >
                <StampRevealCard stamp={captured} width={Math.min(300, SCREEN_W * 0.72)} />
              </Animated.View>

              <View style={st.revealCaption}>
                <Text style={st.revealTier}>{TIER_LABELS[captured.tier]}</Text>
                <Text style={st.revealWhy}>{captured.reason}</Text>
                <Text style={st.revealTap}>Tap to add it to your Atlas</Text>
              </View>
            </Pressable>
          </Animated.View>
        ) : null}
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.charcoal },
  permissionWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    backgroundColor: colors.charcoal,
  },
  permissionTitle: {
    fontFamily: 'Outfit-Regular',
    fontSize: 24,
    color: colors.white,
    marginTop: 16,
    marginBottom: 8,
  },
  permissionBody: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: colors.onDarkMuted,
    textAlign: 'center',
    marginBottom: 26,
  },
  permissionBtn: {
    backgroundColor: colors.orange,
    paddingHorizontal: 26,
    paddingVertical: 14,
    borderRadius: 24,
  },
  permissionBtnLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    color: colors.white,
  },
  rarityPill: {
    position: 'absolute',
    top: 62,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(10,8,4,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  rarityDot: { width: 9, height: 9, borderRadius: 4.5 },
  rarityLabel: {
    fontFamily: 'Switzer-Bold',
    fontSize: 14,
    color: colors.white,
    letterSpacing: 0.2,
  },
  closeBtn: {
    position: 'absolute',
    top: 58,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,8,4,0.5)',
  },
  hintWrap: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 148,
    alignItems: 'center',
  },
  hintText: {
    fontFamily: 'Switzer-Bold',
    fontSize: 14,
    color: colors.white,
    textAlign: 'center',
    backgroundColor: 'rgba(10,8,4,0.62)',
    overflow: 'hidden',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  shutterRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 48,
    alignItems: 'center',
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3.5,
    borderColor: colors.white,
    padding: 4,
  },
  // Hollow and dimmed until the sun is in frame, so "you can't shoot yet"
  // reads instantly without needing the hint text.
  shutterLocked: {
    borderColor: 'rgba(255,255,255,0.45)',
  },
  shutterInner: {
    flex: 1,
    borderRadius: 30,
    backgroundColor: colors.white,
  },
  shutterInnerLocked: {
    backgroundColor: 'transparent',
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.white,
  },
  reveal: { backgroundColor: 'rgba(8,6,3,0.82)' },
  revealPress: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  revealCaption: { marginTop: 22, alignItems: 'center', maxWidth: 290 },
  revealTier: {
    fontFamily: 'Switzer-Bold',
    fontSize: 12.5,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.stampSealLight,
    marginBottom: 7,
  },
  revealWhy: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15.5,
    lineHeight: 22,
    color: colors.white,
    textAlign: 'center',
  },
  revealTap: {
    fontFamily: 'Switzer-Medium',
    fontSize: 11.5,
    color: colors.onDarkMuted,
    marginTop: 18,
  },
});
