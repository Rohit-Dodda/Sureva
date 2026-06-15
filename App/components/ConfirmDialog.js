import React, { useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Modal, Animated, StyleSheet, Dimensions,
} from 'react-native';
import colors from '../constants/colors';

const { height: SCREEN_H } = Dimensions.get('window');

export default function ConfirmDialog({
  visible, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  danger = false, onConfirm, onCancel,
}) {
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 12, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const dismiss = useCallback((after) => {
    Animated.parallel([
      Animated.timing(overlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 220, useNativeDriver: true }),
    ]).start(() => after());
  }, []);

  const handleCancel = useCallback(() => dismiss(onCancel), [dismiss, onCancel]);
  const handleConfirm = useCallback(() => dismiss(onConfirm), [dismiss, onConfirm]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" statusBarTranslucent onRequestClose={handleCancel}>
      <Animated.View style={[st.overlay, { opacity: overlayAnim }]}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handleCancel} />
      </Animated.View>
      <View style={st.positioner} pointerEvents="box-none">
        <Animated.View style={[st.dialog, { transform: [{ translateY: slideAnim }] }]}>
          <Text style={st.title}>{title}</Text>
          {!!message && <Text style={st.message}>{message}</Text>}
          <TouchableOpacity
            style={[st.confirmBtn, danger && st.confirmBtnDanger]}
            onPress={handleConfirm}
            activeOpacity={0.85}
          >
            <Text style={st.confirmText}>{confirmLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.cancelBtn} onPress={handleCancel} activeOpacity={0.6}>
            <Text style={st.cancelText}>{cancelLabel}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  positioner: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingHorizontal: 14,
    paddingBottom: 36,
  },
  dialog: {
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 18,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  title: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 21,
    color: colors.ink,
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.muted,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 22,
  },
  confirmBtn: {
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDanger: {
    backgroundColor: colors.danger,
  },
  confirmText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 16,
    color: colors.white,
    letterSpacing: 0.2,
  },
  cancelBtn: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  cancelText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 15,
    color: colors.inkMid,
  },
});
