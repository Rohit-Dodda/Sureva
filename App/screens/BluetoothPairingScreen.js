import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
  ActivityIndicator,
  Linking,
  Easing,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';

const MOCK_DEVICE = { id: '1', name: 'Sureva Device', rssi: -52 };

const STAGGER = 110;
const ENTER_DURATION = 520;
const ENTER_OFFSET = 36;

function useEntranceAnim(delay) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(ENTER_OFFSET)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: ENTER_DURATION,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay,
        tension: 60,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return { opacity, transform: [{ translateY }] };
}

// ─── Signal strength icon ─────────────────────────────────────
const SignalIcon = React.memo(function SignalIcon({ rssi }) {
  const strength = rssi > -60 ? 3 : rssi > -75 ? 2 : 1;
  return (
    <View style={sigStyles.wrap}>
      {[1, 2, 3].map((lvl) => (
        <View
          key={lvl}
          style={[
            sigStyles.bar,
            { height: 4 + lvl * 4 },
            lvl <= strength ? sigStyles.barOn : sigStyles.barOff,
          ]}
        />
      ))}
    </View>
  );
});

// ─── Button illustration (instructions state) ─────────────────
function ButtonIllustration() {
  const pressY   = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pressY,   { toValue: 1, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 1, duration: 250, useNativeDriver: false }),
        Animated.delay(900),
        Animated.timing(glowAnim, { toValue: 0, duration: 300, useNativeDriver: false }),
        Animated.timing(pressY,   { toValue: 0, duration: 400, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.delay(700),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const fingerDY = pressY.interpolate({ inputRange: [0, 1], outputRange: [0, 10] });
  const btnBg    = glowAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['rgba(255,255,255,0.20)', 'rgba(255,255,255,0.92)'],
  });
  const btnShadowR = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 12] });

  return (
    <View style={illustStyles.root}>
      {/* Finger */}
      <Animated.View style={[illustStyles.finger, { transform: [{ translateY: fingerDY }] }]}>
        <View style={illustStyles.fingerShaft} />
        <View style={illustStyles.fingerTip} />
      </Animated.View>

      {/* Device */}
      <View style={illustStyles.device}>
        <View style={illustStyles.ledRow}>
          <View style={illustStyles.led} />
        </View>
        <View style={illustStyles.screen} />
        <View style={illustStyles.btnArea}>
          <Animated.View style={[illustStyles.btn, {
            backgroundColor: btnBg,
            shadowRadius: btnShadowR,
            shadowOpacity: glowAnim,
          }]} />
        </View>
      </View>
    </View>
  );
}

// ─── Radar / ripple animation (scanning + deviceFound) ────────
function RadarAnimation() {
  const ring0 = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const runRing = (anim, delay) => {
      setTimeout(() => {
        Animated.loop(
          Animated.timing(anim, {
            toValue: 1,
            duration: 2400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          })
        ).start();
      }, delay);
    };
    runRing(ring0, 0);
    runRing(ring1, 800);
    runRing(ring2, 1600);
  }, []);

  const makeRingStyle = (anim) => ({
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }) }],
    opacity:           anim.interpolate({ inputRange: [0, 0.12, 0.75, 1], outputRange: [0, 0.5, 0.2, 0] }),
  });

  return (
    <View style={radarStyles.root}>
      <Animated.View style={[radarStyles.ring, makeRingStyle(ring0)]} />
      <Animated.View style={[radarStyles.ring, makeRingStyle(ring1)]} />
      <Animated.View style={[radarStyles.ring, makeRingStyle(ring2)]} />
      <View style={radarStyles.core}>
        <View style={radarStyles.dot} />
      </View>
    </View>
  );
}

// ─── Checkmark animation (connected state) ────────────────────
function CheckmarkAnimation() {
  const circleScale  = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(circleScale, { toValue: 1, tension: 80, friction: 7, useNativeDriver: true }),
      Animated.timing(checkOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[checkStyles.circle, { transform: [{ scale: circleScale }] }]}>
      <Animated.View style={{ opacity: checkOpacity }}>
        <Ionicons name="checkmark" size={48} color={colors.white} />
      </Animated.View>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────
export default function BluetoothPairingScreen({ onComplete }) {
  const [pairingState,   setPairingState  ] = useState('instructions');
  const [selectedDevice, setSelectedDevice] = useState(null);
  const scanTimeoutRef       = useRef(null);
  const transitionTimeoutRef = useRef(null);

  const illustAnim  = useEntranceAnim(STAGGER);
  const headingAnim = useEntranceAnim(STAGGER * 2);
  const subAnim     = useEntranceAnim(STAGGER * 3);
  const btnAnim     = useEntranceAnim(STAGGER * 4);

  const clearTimers = useCallback(() => {
    clearTimeout(scanTimeoutRef.current);
    clearTimeout(transitionTimeoutRef.current);
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const startScanning = useCallback(() => {
    clearTimers();
    setPairingState('scanning');
    transitionTimeoutRef.current = setTimeout(() => setPairingState('deviceFound'), 3000);
    scanTimeoutRef.current       = setTimeout(() => setPairingState('error'), 30000);
  }, [clearTimers]);

  const handleDeviceTap = useCallback((device) => {
    setSelectedDevice(device);
  }, []);

  const handleConnectSelected = useCallback(() => {
    if (!selectedDevice) return;
    clearTimers();
    setPairingState('connecting');
    transitionTimeoutRef.current = setTimeout(() => setPairingState('connected'), 2000);
  }, [selectedDevice, clearTimers]);

  const handleTryAgain = useCallback(() => startScanning(), [startScanning]);

  const handleOpenSettings = useCallback(() => {
    Linking.openURL('App-Prefs:root=Bluetooth').catch(() => Linking.openURL('app-settings:'));
  }, []);

  const handleGetStarted = useCallback(() => {
    onComplete && onComplete({ connected: true });
  }, [onComplete]);

  // ── Content ─────────────────────────────────────────────────
  const renderContent = () => {
    switch (pairingState) {
      case 'instructions':
        return (
          <View style={styles.content}>
            <Animated.View style={[styles.illustrationWrap, illustAnim]}>
              <ButtonIllustration />
            </Animated.View>
            <Animated.Text style={[styles.heading, headingAnim]}>
              Let's connect{'\n'}your Sureva
            </Animated.Text>
            <Animated.Text style={[styles.sub, subAnim]}>
              Hold the button on your device for 5 seconds until the light pulses white.
            </Animated.Text>
          </View>
        );

      case 'scanning':
        return (
          <View style={styles.contentCentered}>
            <View style={styles.radarWrap}><RadarAnimation /></View>
            <Text style={styles.scanLabel}>Looking for your Sureva...</Text>
          </View>
        );

      case 'deviceFound': {
        const isSelected = selectedDevice?.id === MOCK_DEVICE.id;
        return (
          <View style={styles.contentCentered}>
            <View style={styles.radarWrap}><RadarAnimation /></View>
            <Text style={styles.scanLabel}>Device found nearby</Text>
            <TouchableOpacity
              style={[styles.deviceCard, isSelected && styles.deviceCardSelected]}
              onPress={() => handleDeviceTap(MOCK_DEVICE)}
              activeOpacity={0.75}
            >
              <View style={[styles.deviceIconWrap, isSelected && styles.deviceIconWrapSelected]}>
                <View style={[styles.deviceIconDot, isSelected && styles.deviceIconDotSelected]} />
              </View>
              <Text style={[styles.deviceName, isSelected && styles.deviceNameSelected]}>
                {MOCK_DEVICE.name}
              </Text>
              <SignalIcon rssi={MOCK_DEVICE.rssi} />
            </TouchableOpacity>
          </View>
        );
      }

      case 'connecting':
        return (
          <View style={styles.contentCentered}>
            <ActivityIndicator size="large" color={colors.orange} style={styles.spinner} />
            <Text style={styles.heading}>Connecting to{'\n'}Sureva...</Text>
          </View>
        );

      case 'connected':
        return (
          <View style={styles.contentCentered}>
            <View style={styles.checkWrap}><CheckmarkAnimation /></View>
            <Text style={styles.heading}>You're all set.</Text>
            <Text style={styles.sub}>
              Your Sureva is connected and ready to protect you.
            </Text>
          </View>
        );

      case 'error':
        return (
          <View style={styles.content}>
            <View style={styles.statusIconWrap}>
              <View style={[styles.statusIcon, styles.statusIconWarning]}>
                <Text style={[styles.statusIconGlyph, styles.statusGlyphWarning]}>!</Text>
              </View>
            </View>
            <Text style={styles.heading}>No devices found.</Text>
            <Text style={styles.sub}>
              Make sure your device is nearby and hold the button for 5 seconds to activate pairing mode.
            </Text>
          </View>
        );

      case 'bluetoothOff':
        return (
          <View style={styles.content}>
            <View style={styles.statusIconWrap}>
              <View style={[styles.statusIcon, styles.statusIconMuted]}>
                <Text style={[styles.statusIconGlyph, styles.statusGlyphMuted]}>⌀</Text>
              </View>
            </View>
            <Text style={styles.heading}>Bluetooth is off.</Text>
            <Text style={styles.sub}>
              Enable Bluetooth to connect your Sureva device.
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  // ── Footer ──────────────────────────────────────────────────
  const renderFooter = () => {
    switch (pairingState) {
      case 'instructions':
        return (
          <Animated.View style={[styles.footer, btnAnim]}>
            <TouchableOpacity style={styles.primaryBtn} onPress={startScanning} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Start Scanning</Text>
            </TouchableOpacity>
          </Animated.View>
        );
      case 'deviceFound':
        return selectedDevice ? (
          <View style={styles.footer}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleConnectSelected} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Connect to Sureva</Text>
            </TouchableOpacity>
          </View>
        ) : <View style={styles.footerSpacer} />;
      case 'connected':
        return (
          <View style={styles.footer}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleGetStarted} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        );
      case 'error':
        return (
          <View style={styles.footer}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleTryAgain} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        );
      case 'bluetoothOff':
        return (
          <View style={styles.footer}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleOpenSettings} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Open Settings</Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return <View style={styles.footerSpacer} />;
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      {renderContent()}
      {renderFooter()}
    </SafeAreaView>
  );
}

// ─── Signal icon styles ───────────────────────────────────────
const sigStyles = StyleSheet.create({
  wrap:   { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  bar:    { width: 4, borderRadius: 2 },
  barOn:  { backgroundColor: colors.orange },
  barOff: { backgroundColor: colors.border },
});

// ─── Illustration styles ──────────────────────────────────────
const illustStyles = StyleSheet.create({
  root: {
    width: 100,
    height: 196,
    alignItems: 'center',
  },
  finger: {
    alignItems: 'center',
    position: 'absolute',
    top: 14,
    zIndex: 2,
  },
  fingerShaft: {
    width: 22,
    height: 38,
    backgroundColor: '#D4956A',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  fingerTip: {
    width: 28,
    height: 22,
    backgroundColor: '#D4956A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BF7A40',
    marginTop: -2,
  },
  device: {
    position: 'absolute',
    bottom: 0,
    width: 72,
    height: 120,
    borderRadius: 20,
    backgroundColor: colors.inkMid,
    alignItems: 'center',
  },
  ledRow: {
    marginTop: 10,
    alignItems: 'center',
  },
  led: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.orangeLight,
    opacity: 0.7,
  },
  screen: {
    width: 46,
    height: 52,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    marginTop: 10,
  },
  btnArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
});

// ─── Radar styles ─────────────────────────────────────────────
const RADAR_D = 220;
const radarStyles = StyleSheet.create({
  root: {
    width: RADAR_D,
    height: RADAR_D,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: RADAR_D,
    height: RADAR_D,
    borderRadius: RADAR_D / 2,
    borderWidth: 1.5,
    borderColor: colors.orange,
  },
  core: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.orangeLight + '55',
    borderWidth: 2,
    borderColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.orange,
  },
});

// ─── Checkmark styles ─────────────────────────────────────────
const checkStyles = StyleSheet.create({
  circle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.protected,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.protected,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.38,
    shadowRadius: 18,
    elevation: 6,
  },
});

// ─── Screen styles ────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 56,
    alignItems: 'center',
  },
  contentCentered: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: 'center',
    paddingTop: 56,
  },
  illustrationWrap: {
    alignItems: 'center',
    marginBottom: 48,
  },
  radarWrap: {
    marginBottom: 28,
  },
  heading: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 36,
    color: colors.ink,
    letterSpacing: -1.1,
    lineHeight: 43,
    marginBottom: 16,
    textAlign: 'center',
  },
  sub: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.muted,
    lineHeight: 25,
    maxWidth: 290,
    textAlign: 'center',
  },
  scanLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: colors.muted,
    marginBottom: 32,
    textAlign: 'center',
  },
  deviceCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  deviceIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.orangeLight + '50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceIconDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.orange,
  },
  deviceName: {
    flex: 1,
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 15,
    color: colors.ink,
  },
  deviceCardSelected: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  deviceIconWrapSelected: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  deviceIconDotSelected: {
    backgroundColor: colors.orangeLight,
  },
  deviceNameSelected: {
    color: colors.white,
  },
  spinner: {
    marginBottom: 36,
  },
  checkWrap: {
    marginBottom: 36,
  },
  statusIconWrap: {
    marginBottom: 44,
  },
  statusIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconWarning: {
    backgroundColor: colors.warning + '18',
    borderColor: colors.warning,
  },
  statusIconMuted: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  statusIconGlyph: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 30,
  },
  statusGlyphWarning: {
    color: colors.warning,
  },
  statusGlyphMuted: {
    color: colors.muted,
    fontSize: 26,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 40,
    paddingTop: 8,
    gap: 10,
  },
  footerSpacer: {
    height: 50,
  },
  primaryBtn: {
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.orange,
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 5,
  },
  primaryBtnText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 17,
    color: colors.white,
    letterSpacing: 0.2,
  },
  ghostBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.muted,
    letterSpacing: 0.1,
  },
});
