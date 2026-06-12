import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FACTOR_COLORS } from './ChartTooltip';
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

export default React.memo(function ChartInfoModal({ visible, onClose }) {
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
          <Text style={st.title}>Reading your timeline</Text>

          <InfoRow icon="pulse-outline" title="The curve" body="Your protection level from session start to finish. Drops are depletion or water events, jumps back to 100% are reapplications." />
          <InfoRow icon="remove-outline" title="Threshold lines" body="The amber dashed line marks 60% — below it, plan to reapply soon. The red line marks 20% — below it you're effectively unprotected." />
          <InfoRow icon="hand-left-outline" title="Drag to inspect" body="Press and slide your finger along the chart to see the exact time, protection percent, and what was driving depletion at that moment." />
          <InfoRow icon="expand-outline" title="Tap to expand" body="A quick tap grows the chart for a closer look. Tap again to shrink it back." />

          <Text style={st.legendTitle}>Factor colors</Text>
          <View style={st.legend}>
            {Object.entries(FACTOR_COLORS).map(([label, color]) => (
              <View key={label} style={st.legendItem}>
                <View style={[st.legendDot, { backgroundColor: color }]} />
                <Text style={st.legendText}>{label}</Text>
              </View>
            ))}
          </View>

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
    fontFamily: 'SFProDisplay-Black',
    fontSize: 20,
    color: colors.ink,
    letterSpacing: -0.5,
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
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 14,
    color: colors.ink,
    marginBottom: 2,
  },
  rowText: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 13,
    color: colors.inkMid,
    lineHeight: 18,
  },
  legendTitle: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 12,
    color: colors.inkMid,
  },
  button: {
    backgroundColor: colors.ink,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 15,
    color: colors.white,
  },
});
