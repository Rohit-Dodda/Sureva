import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, Animated,
  StyleSheet, Dimensions, ActivityIndicator, Keyboard,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import SupabaseService from '../services/SupabaseService';

const { height: SCREEN_H } = Dimensions.get('window');

// Only ever reached after the caller has already gated this behind
// Face ID/Touch ID (see ProfileScreen's use of utils/deviceAuth) — this
// modal itself just collects and submits the new password.
export default function ChangePasswordModal({ visible, onClose }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setPassword('');
      setConfirmPassword('');
      setError('');
      setSaved(false);
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 12, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const dismiss = useCallback(() => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(overlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 220, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [onClose]);

  const canSubmit = password.length >= 6 && password === confirmPassword;

  const handleSubmit = useCallback(async () => {
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords don’t match'); return; }
    setError('');
    setLoading(true);
    const { error: saveError } = await SupabaseService.updatePassword(password);
    setLoading(false);
    if (saveError) {
      setError('Couldn’t update your password. Please try again.');
      return;
    }
    setSaved(true);
  }, [password, confirmPassword]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" statusBarTranslucent onRequestClose={dismiss}>
      <Animated.View style={[st.overlay, { opacity: overlayAnim }]}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={dismiss} />
      </Animated.View>
      <KeyboardAvoidingView
        style={st.positioner}
        pointerEvents="box-none"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[st.dialog, { transform: [{ translateY: slideAnim }] }]}>
          {saved ? (
            <>
              <View style={st.iconCircle}>
                <Ionicons name="checkmark-circle-outline" size={30} color={colors.orange} />
              </View>
              <Text style={st.title}>Password updated</Text>
              <Text style={st.message}>Your password has been changed.</Text>
              <TouchableOpacity style={st.confirmBtn} onPress={dismiss} activeOpacity={0.85}>
                <Text style={st.confirmText}>Done</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={st.title}>Change password</Text>
              <TextInput
                style={[st.input, !!error && st.inputError]}
                placeholder="New password"
                placeholderTextColor={colors.muted}
                value={password}
                onChangeText={(t) => { setPassword(t); if (error) setError(''); }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                returnKeyType="next"
                autoFocus
              />
              <TextInput
                style={[st.input, !!error && st.inputError]}
                placeholder="Confirm new password"
                placeholderTextColor={colors.muted}
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); if (error) setError(''); }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                returnKeyType="send"
                onSubmitEditing={handleSubmit}
              />
              {!!error && <Text style={st.errorText}>{error}</Text>}
              <TouchableOpacity
                style={[st.confirmBtn, (loading || !canSubmit) && st.confirmBtnDisabled]}
                onPress={loading ? undefined : handleSubmit}
                activeOpacity={loading ? 1 : 0.85}
                disabled={loading || !canSubmit}
              >
                {loading
                  ? <ActivityIndicator color={colors.white} />
                  : <Text style={st.confirmText}>Save</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity style={st.cancelBtn} onPress={dismiss} activeOpacity={0.6}>
                <Text style={st.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
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
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.orangeWash,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Outfit-Regular',
    fontSize: 21,
    color: colors.ink,
    letterSpacing: -0.5,
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.muted,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 18,
  },
  input: {
    height: 52,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    color: colors.ink,
    marginBottom: 10,
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.danger,
    marginTop: -4,
    marginBottom: 8,
  },
  confirmBtn: {
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  confirmBtnDisabled: {
    backgroundColor: colors.orangeLight,
  },
  confirmText: {
    fontFamily: 'Outfit-Regular',
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
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    color: colors.inkMid,
  },
});
