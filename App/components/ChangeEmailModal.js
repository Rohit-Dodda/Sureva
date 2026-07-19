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
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function friendlyMessage(error) {
  const code = error?.code;
  const message = error?.message || '';
  if (code === 'user_already_exists' || /already registered|already exists|already in use/i.test(message)) {
    return 'That email is already in use by another account.';
  }
  // Resend's sandbox sender (no verified custom domain yet) only delivers
  // to the account owner's own address — a send failure to the new
  // address surfaces here as a generic SMTP/email error from Supabase.
  if (/smtp|sending|email address/i.test(message)) {
    return 'Couldn’t send the confirmation email. While our email service is in test mode, it can only deliver to the developer’s own address, not new ones.';
  }
  return 'Couldn’t update your email. Please try again.';
}

// Confirmation flow, not an instant change — Supabase emails a
// confirmation link to the new address before it actually takes effect
// (see SupabaseService.updateEmail), so this only ever gets to a "check
// your inbox" state, never a direct "email changed" state.
export default function ChangeEmailModal({ visible, currentEmail, onClose }) {
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setNewEmail('');
      setError('');
      setSent(false);
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

  const handleSubmit = useCallback(async () => {
    const trimmed = newEmail.trim();
    if (!trimmed) { setError('This field is required'); return; }
    if (!EMAIL_RE.test(trimmed)) { setError('Please enter a valid email address'); return; }
    if (trimmed.toLowerCase() === currentEmail.toLowerCase()) {
      setError('That’s already your current email');
      return;
    }
    setError('');
    setLoading(true);
    const { error: updateError } = await SupabaseService.updateEmail(trimmed);
    setLoading(false);
    if (updateError) {
      setError(friendlyMessage(updateError));
      return;
    }
    setSent(true);
  }, [newEmail, currentEmail]);

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
          {sent ? (
            <>
              <View style={st.iconCircle}>
                <Ionicons name="mail-outline" size={30} color={colors.orange} />
              </View>
              <Text style={st.title}>Check both inboxes</Text>
              <Text style={st.message}>
                For security, we need to confirm this change from both sides: tap the link we
                sent to <Text style={st.emailHighlight}>{currentEmail}</Text> AND the one sent to
                {'\n'}<Text style={st.emailHighlight}>{newEmail.trim()}</Text>
                {'\n\n'}Your email won’t change until both are confirmed.
              </Text>
              <TouchableOpacity style={st.confirmBtn} onPress={dismiss} activeOpacity={0.85}>
                <Text style={st.confirmText}>Done</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={st.title}>Change email</Text>
              <Text style={st.message}>
                Currently <Text style={st.emailHighlight}>{currentEmail}</Text>. We’ll send a
                confirmation link to both your current and new address, and both need to be
                confirmed before anything changes.
              </Text>
              <TextInput
                style={[st.input, !!error && st.inputError]}
                placeholder="New email address"
                placeholderTextColor={colors.muted}
                value={newEmail}
                onChangeText={(t) => { setNewEmail(t); if (error) setError(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="send"
                onSubmitEditing={handleSubmit}
                autoFocus
              />
              {!!error && <Text style={st.errorText}>{error}</Text>}
              <TouchableOpacity
                style={[st.confirmBtn, loading && st.confirmBtnDisabled]}
                onPress={loading ? undefined : handleSubmit}
                activeOpacity={loading ? 1 : 0.85}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color={colors.white} />
                  : <Text style={st.confirmText}>Send Confirmation</Text>
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
    marginBottom: 8,
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
  emailHighlight: {
    fontFamily: 'Outfit-Regular',
    color: colors.ink,
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
    marginBottom: 4,
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.danger,
    marginTop: 4,
    marginBottom: 4,
  },
  confirmBtn: {
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
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
