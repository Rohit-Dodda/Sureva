import React, { useRef, useEffect } from 'react';
import {
  Animated, View, Text, StyleSheet, Pressable, PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';

const HIDDEN_Y = 420;

const APPS = [
  { key: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp', bg: colors.brandWhatsapp },
  { key: 'telegram', label: 'Telegram', icon: 'paper-plane', bg: colors.brandTelegram },
  { key: 'x', label: 'x.com', text: 'X', bg: colors.brandX },
  { key: 'instagram', label: 'Instagram', icon: 'logo-instagram', gradient: [colors.brandInstaStart, colors.brandInstaMid, colors.brandInstaEnd] },
  { key: 'linkedin', label: 'LinkedIn', icon: 'logo-linkedin', bg: colors.brandLinkedin },
];

// The "Share Your Streak" sheet. Opened deliberately from the Share link under
// Continue — it no longer rises on a timer over the primary action, so nobody
// has to dismiss a sheet to get past the celebration. Dismiss by swiping down
// or tapping the dimmed backdrop; taps on an app icon open the system share
// sheet. Visibility is owned by the parent so the reveal can close it on replay.
function StreakShareSheet({ visible, onShare, onClose }) {
  const y = useRef(new Animated.Value(HIDDEN_Y)).current;
  const dim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(y, { toValue: visible ? 0 : HIDDEN_Y, friction: 11, tension: 64, useNativeDriver: true }),
      Animated.timing(dim, { toValue: visible ? 1 : 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [visible, y, dim]);

  // Held in a ref so the PanResponder — created once — always calls the current
  // handler rather than the one captured on first render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderGrant: () => y.stopAnimation(),
      onPanResponderMove: (_, g) => { if (g.dy > 0) y.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.5) {
          onCloseRef.current?.();
        } else {
          Animated.spring(y, { toValue: 0, friction: 9, tension: 64, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  return (
    <>
      <Animated.View
        style={[StyleSheet.absoluteFill, st.backdrop, { opacity: dim }]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close share sheet" />
      </Animated.View>

      <Animated.View
        style={[st.sheet, { transform: [{ translateY: y }] }]}
        pointerEvents={visible ? 'auto' : 'none'}
        {...pan.panHandlers}
      >
        <View style={st.handle} />
        <View style={st.titleRow}>
          <Ionicons name="link" size={17} color={colors.orange} />
          <Text style={st.title}>Share Your Streak</Text>
        </View>

        <View style={st.apps}>
          {APPS.map((app) => (
            <Pressable key={app.key} style={st.app} onPress={onShare} hitSlop={6}>
              {app.gradient ? (
                <LinearGradient colors={app.gradient} start={{ x: 0.1, y: 0.1 }} end={{ x: 0.9, y: 0.9 }} style={st.iconBox}>
                  <Ionicons name={app.icon} size={26} color={colors.white} />
                </LinearGradient>
              ) : (
                <View style={[st.iconBox, { backgroundColor: app.bg }]}>
                  {app.text ? <Text style={st.xGlyph}>{app.text}</Text> : <Ionicons name={app.icon} size={26} color={colors.white} />}
                </View>
              )}
              <Text style={st.appLabel}>{app.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={st.swipeHint}>Swipe down to close</Text>
      </Animated.View>
    </>
  );
}

const st = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(23,20,14,0.34)' },
  sheet: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 24,
    backgroundColor: colors.white,
    borderRadius: 28,
    paddingTop: 10,
    paddingBottom: 16,
    paddingHorizontal: 16,
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 16,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: { fontFamily: 'Outfit-Regular', fontSize: 19, color: colors.ink },
  apps: { flexDirection: 'row', justifyContent: 'space-between' },
  app: { alignItems: 'center', flex: 1 },
  iconBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
  xGlyph: { fontFamily: 'Outfit-Regular', fontSize: 26, color: colors.white },
  appLabel: { fontFamily: 'Inter-Medium', fontSize: 11, color: colors.muted },
  swipeHint: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 14,
  },
});

export default React.memo(StreakShareSheet);
