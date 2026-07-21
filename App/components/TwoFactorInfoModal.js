import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';

const InfoRow = React.memo(function InfoRow({ icon, title, body }) {
  return (
    <View style={st.row}>
      <View style={st.rowIconWrap}>
        <Ionicons name={icon} size={17} color={colors.orange} />
      </View>
      <View style={st.rowBody}>
        <Text style={st.rowTitle}>{title}</Text>
        <Text style={st.rowText}>{body}</Text>
      </View>
    </View>
  );
});

// Reached from the "i" button on TwoFactorAuthModal's QR step — walks
// through both the scan path and the manual-entry fallback, since not
// every authenticator app makes the "type it in instead" option obvious.
export default React.memo(function TwoFactorInfoModal({ visible, onClose }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(anim, { toValue: 1, tension: 70, friction: 12, useNativeDriver: true }).start();
    }
  }, [visible, anim]);

  const dismiss = useCallback(() => {
    Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setMounted(false);
      onClose();
    });
  }, [anim, onClose]);

  if (!mounted) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={dismiss}>
      <Animated.View style={[st.backdrop, { opacity: anim }]}>
        <TouchableOpacity style={st.backdropTouch} activeOpacity={1} onPress={dismiss} />
      </Animated.View>
      <View style={st.center} pointerEvents="box-none">
        <Animated.View
          style={[st.card, {
            opacity: anim,
            transform: [
              { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
              { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
            ],
          }]}
        >
          <Text style={st.title}>Setting up your authenticator</Text>

          <InfoRow
            icon="qr-code-outline"
            title="Scan the QR code"
            body="Open Google Authenticator, Authy, or your Passwords app, choose “Scan QR Code,” and point your camera at the code on screen."
          />
          <InfoRow
            icon="key-outline"
            title="Or enter the code manually"
            body="Can't scan it? Tap the text under the QR code to copy it, then choose “Enter a setup key” (or similar) in your authenticator app and paste it in."
          />
          <InfoRow
            icon="time-outline"
            title="Enter today's code"
            body="Your authenticator app will show a 6-digit code that refreshes every 30 seconds. Type the current one into the box below to finish."
          />

          <TouchableOpacity style={st.button} onPress={dismiss} activeOpacity={0.85}>
            <Text style={st.buttonText}>Got it</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
});

const st = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.ink + '73',
  },
  backdropTouch: {
    flex: 1,
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  title: {
    fontFamily: 'Outfit-Regular',
    fontSize: 19,
    color: colors.ink,
    letterSpacing: -0.4,
    marginBottom: 18,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  rowIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.orangeWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.ink,
    marginBottom: 2,
  },
  rowText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.inkMid,
    lineHeight: 18,
  },
  button: {
    backgroundColor: colors.ink,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    color: colors.white,
  },
});
