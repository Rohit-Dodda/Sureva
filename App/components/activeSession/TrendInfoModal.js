import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';

const InfoRow = React.memo(function InfoRow({ icon, title, body }) {
  return (
    <View style={st.row}>
      <View style={st.rowIcon}>
        <Ionicons name={icon} size={17} color={colors.orange} />
      </View>
      <View style={st.rowBody}>
        <Text style={st.rowTitle}>{title}</Text>
        <Text style={st.rowText}>{body}</Text>
      </View>
    </View>
  );
});

// Explains how to read the live protection trend chart.
export default React.memo(function TrendInfoModal({ visible, onClose }) {
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
          <Text style={st.title}>How to read this</Text>
          <InfoRow icon="trending-down-outline" title="The line is your protection" body="It starts full on the left and falls as your sunscreen wears off. The further it drops, the lower your protection." />
          <InfoRow icon="radio-outline" title="“Now” is the right edge" body="The glowing dot is this exact moment. The line grows from there — so the whole timeline slowly scrolls left as time passes." />
          <InfoRow icon="flag-outline" title="Flags are reapplications" body="Each vertical orange line marks a moment you reapplied. They stay pinned to when it happened and drift left as time moves on." />
          <TouchableOpacity style={st.gotIt} onPress={dismiss} activeOpacity={0.85}>
            <Text style={st.gotItText}>Got it</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
});

const st = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backdropTouch: { flex: 1 },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 8,
  },
  title: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 20,
    color: colors.ink,
    letterSpacing: -0.4,
    marginBottom: 18,
  },
  row: {
    flexDirection: 'row',
    gap: 13,
    marginBottom: 16,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.orangeWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1 },
  rowTitle: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 14.5,
    color: colors.ink,
    marginBottom: 3,
  },
  rowText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
  },
  gotIt: {
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  gotItText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 16,
    color: colors.white,
  },
});
