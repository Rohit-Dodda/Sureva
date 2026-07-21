import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, Animated,
  StyleSheet, Dimensions, ActivityIndicator, Keyboard, ScrollView,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import colors from '../constants/colors';
import SupabaseService from '../services/SupabaseService';
import TwoFactorInfoModal from './TwoFactorInfoModal';

const { height: SCREEN_H } = Dimensions.get('window');

// Only ever reached after the caller has already gated this behind Face
// ID/Touch ID (see SettingsScreen's use of utils/deviceAuth) — turning
// 2FA on or off is at least as sensitive as a password change.
export default function TwoFactorAuthModal({ visible, onClose }) {
  // 'checking' (listing existing factors) | 'off' (not enrolled) |
  // 'enrolling' (QR shown, awaiting a code) | 'enrolled' (just turned on) |
  // 'on' (already enrolled from a previous session)
  const [stage, setStage] = useState('checking');
  const [factorId, setFactorId] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);

  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    setCode('');
    setError('');
    setCopied(false);
    setStage('checking');
    SupabaseService.listMfaFactors().then(({ data }) => {
      const verified = data?.totp?.find((f) => f.status === 'verified');
      if (verified) {
        setFactorId(verified.id);
        setStage('on');
      } else {
        setStage('off');
      }
    });
    Animated.parallel([
      Animated.timing(overlayAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 12, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  const dismiss = useCallback(() => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(overlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 220, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [onClose]);

  const handleStartEnroll = useCallback(async () => {
    setError('');
    setLoading(true);
    const { data, error: enrollError } = await SupabaseService.enrollMfa();
    setLoading(false);
    if (enrollError || !data) {
      setError('Couldn’t start setup. Please try again.');
      return;
    }
    setFactorId(data.id);
    setQrCode(data.totp?.qr_code ?? null);
    setSecret(data.totp?.secret ?? null);
    setStage('enrolling');
  }, []);

  const handleVerify = useCallback(async () => {
    if (!factorId || code.length !== 6) return;
    setError('');
    setLoading(true);
    const { error: verifyError } = await SupabaseService.verifyMfaFactor(factorId, code);
    setLoading(false);
    if (verifyError) {
      setError('Incorrect code. Please try again.');
      return;
    }
    setStage('enrolled');
  }, [factorId, code]);

  const handleDisable = useCallback(async () => {
    if (!factorId) return;
    setError('');
    setLoading(true);
    const { error: unenrollError } = await SupabaseService.unenrollMfa(factorId);
    setLoading(false);
    if (unenrollError) {
      setError('Couldn’t turn off 2FA. Please try again.');
      return;
    }
    setFactorId(null);
    setStage('off');
  }, [factorId]);

  // Text's `selectable` long-press-to-copy is unreliable inside a Modal
  // (and doesn't work at all on a simulator without a real touch), so this
  // is the actual way to get the secret onto a device that can't scan the
  // QR — e.g. testing on the iOS Simulator with a CLI TOTP generator.
  const handleCopySecret = useCallback(async () => {
    if (!secret) return;
    await Clipboard.setStringAsync(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [secret]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" statusBarTranslucent onRequestClose={dismiss}>
      <Animated.View style={[st.overlay, { opacity: overlayAnim }]}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={dismiss} />
      </Animated.View>
      <View style={st.positioner} pointerEvents="box-none">
        <Animated.View style={[st.dialog, { transform: [{ translateY: slideAnim }] }]}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
          style={st.scroll}
          contentContainerStyle={st.scrollContent}
        >
          {stage === 'checking' && (
            <ActivityIndicator color={colors.orange} style={{ marginVertical: 24 }} />
          )}

          {stage === 'off' && (
            <>
              <View style={st.iconCircle}>
                <Ionicons name="shield-outline" size={28} color={colors.orange} />
              </View>
              <Text style={st.title}>Two-Factor Authentication</Text>
              <Text style={st.message}>
                Add a second step at sign-in using an authenticator app like Google Authenticator or Authy.
              </Text>
              {!!error && <Text style={st.errorText}>{error}</Text>}
              <TouchableOpacity
                style={[st.confirmBtn, loading && st.confirmBtnDisabled]}
                onPress={loading ? undefined : handleStartEnroll}
                activeOpacity={loading ? 1 : 0.85}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color={colors.white} />
                  : <Text style={st.confirmText}>Get Started</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity style={st.cancelBtn} onPress={dismiss} activeOpacity={0.6}>
                <Text style={st.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}

          {stage === 'enrolling' && (
            <>
              <View style={st.titleRow}>
                <Text style={[st.title, { marginBottom: 0 }]}>Scan this code</Text>
                <TouchableOpacity onPress={() => setInfoVisible(true)} hitSlop={10} style={st.infoBtn}>
                  <Ionicons name="information-circle-outline" size={20} color={colors.muted} />
                </TouchableOpacity>
              </View>
              <Text style={st.message}>
                Scan with your authenticator app, then enter the 6-digit code it shows.
              </Text>
              {!!qrCode && (
                <View style={st.qrWrap}>
                  <SvgXml xml={qrCode} width={180} height={180} />
                </View>
              )}
              {!!secret && (
                <TouchableOpacity style={st.secretRow} onPress={handleCopySecret} activeOpacity={0.7}>
                  <Text style={st.secretText}>{secret}</Text>
                  <Ionicons
                    name={copied ? 'checkmark' : 'copy-outline'}
                    size={16}
                    color={copied ? colors.orange : colors.muted}
                  />
                </TouchableOpacity>
              )}
              <TextInput
                style={[st.input, st.codeInput, !!error && st.inputError]}
                placeholder="000000"
                placeholderTextColor={colors.muted}
                value={code}
                onChangeText={(t) => { setCode(t.replace(/[^0-9]/g, '').slice(0, 6)); if (error) setError(''); }}
                keyboardType="number-pad"
                maxLength={6}
                textContentType="oneTimeCode"
                returnKeyType="done"
                onSubmitEditing={handleVerify}
              />
              {!!error && <Text style={st.errorText}>{error}</Text>}
              <TouchableOpacity
                style={[st.confirmBtn, (loading || code.length !== 6) && st.confirmBtnDisabled]}
                onPress={loading || code.length !== 6 ? undefined : handleVerify}
                activeOpacity={loading ? 1 : 0.85}
                disabled={loading || code.length !== 6}
              >
                {loading
                  ? <ActivityIndicator color={colors.white} />
                  : <Text style={st.confirmText}>Verify & Enable</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity style={st.cancelBtn} onPress={dismiss} activeOpacity={0.6}>
                <Text style={st.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}

          {stage === 'enrolled' && (
            <>
              <View style={st.iconCircle}>
                <Ionicons name="checkmark-circle-outline" size={30} color={colors.orange} />
              </View>
              <Text style={st.title}>Two-factor authentication enabled</Text>
              <Text style={st.message}>
                You’ll need a code from your authenticator app the next time you sign in.
              </Text>
              <TouchableOpacity style={st.confirmBtn} onPress={dismiss} activeOpacity={0.85}>
                <Text style={st.confirmText}>Done</Text>
              </TouchableOpacity>
            </>
          )}

          {stage === 'on' && (
            <>
              <View style={st.iconCircle}>
                <Ionicons name="shield-checkmark-outline" size={28} color={colors.orange} />
              </View>
              <Text style={st.title}>Two-Factor Authentication</Text>
              <Text style={st.message}>Enabled. Your authenticator app is required at sign-in.</Text>
              {!!error && <Text style={st.errorText}>{error}</Text>}
              <TouchableOpacity
                style={[st.dangerBtn, loading && st.confirmBtnDisabled]}
                onPress={loading ? undefined : handleDisable}
                activeOpacity={loading ? 1 : 0.85}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color={colors.white} />
                  : <Text style={st.confirmText}>Turn Off</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity style={st.cancelBtn} onPress={dismiss} activeOpacity={0.6}>
                <Text style={st.cancelText}>Close</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
        </Animated.View>
      </View>

      <TwoFactorInfoModal visible={infoVisible} onClose={() => setInfoVisible(false)} />
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
    overflow: 'hidden',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  scroll: {
    // A direct maxHeight (rather than flex:1) so this resolves on its own —
    // dialog's own height is content-driven (RN defaults flexShrink to 0),
    // so a flexed child here has no defined space to grow into and
    // collapses to zero. Capped so a tall stage (the QR step) scrolls
    // internally instead of resizing/sliding the sheet itself when the
    // keyboard opens — the sheet's own position and frame never move.
    maxHeight: SCREEN_H * 0.82,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 18,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  infoBtn: {
    padding: 2,
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
    marginBottom: 12,
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
  qrWrap: {
    // Full-width (not alignSelf-snug) so the QR centers against a definite
    // box width via alignItems/justifyContent, rather than a two-step
    // shrink-then-center that's more fragile to get pixel-centered.
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 14,
  },
  secretRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 18,
  },
  secretText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.inkMid,
    letterSpacing: 1,
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
  codeInput: {
    fontSize: 22,
    letterSpacing: 6,
    textAlign: 'center',
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.danger,
    textAlign: 'center',
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
  dangerBtn: {
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.danger,
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
