import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';

// The four button gestures, mirroring the device onboarding walkthrough.
const GESTURES = [
  {
    pattern: '1 PRESS',
    title: 'Reapplied',
    body: 'When an alert is buzzing, a single press confirms you reapplied. Protection resets to 100% and the light and buzz stop instantly.',
  },
  {
    pattern: '2 PRESSES',
    title: 'Topped up early',
    body: 'With no alert active, double-press to log a proactive reapplication. The light pulses for 5 seconds, press once more to confirm.',
  },
  {
    pattern: '3 PRESSES',
    title: 'End the session',
    body: 'During a session, three presses ends it. The light flashes green three times to confirm your session was saved.',
  },
  {
    pattern: 'HOLD 5S',
    title: 'Reconnect',
    body: 'Press and hold for five seconds to enter pairing mode. The light pulses blue while your device is discoverable.',
  },
];

const GestureRow = React.memo(function GestureRow({ pattern, title, body }) {
  return (
    <View style={st.row}>
      <View style={st.patternChip}>
        <Text style={st.patternText}>{pattern}</Text>
      </View>
      <View style={st.rowBody}>
        <Text style={st.rowTitle}>{title}</Text>
        <Text style={st.rowText}>{body}</Text>
      </View>
    </View>
  );
});

export default React.memo(function DeviceGuideModal({ visible, onClose }) {
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
          <Text style={st.title}>Your device button</Text>
          <Text style={st.subtitle}>One button, four actions. Here's what each press does.</Text>

          {GESTURES.map((g) => (
            <GestureRow key={g.pattern} pattern={g.pattern} title={g.title} body={g.body} />
          ))}

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
    fontSize: 20,
    color: colors.ink,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
    marginBottom: 18,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  patternChip: {
    backgroundColor: colors.charcoal,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    minWidth: 78,
    alignItems: 'center',
  },
  patternText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.white,
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
