import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import SupabaseService from '../services/SupabaseService';
import SlideInView from '../components/SlideInView';

// Gate shown after a correct email/password sign-in when the account has
// a verified TOTP factor — the session exists at AAL1 but App.js won't
// route past this screen until verifyMfaFactor raises it to AAL2 (see
// AuthContext's mfaPending).
export default function MFAChallengeScreen({ onSignOut }) {
  const { clearMfaPending } = useAuth();
  const [factorId, setFactorId] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    SupabaseService.listMfaFactors().then(({ data }) => {
      const verified = data?.totp?.find((f) => f.status === 'verified');
      setFactorId(verified?.id ?? null);
    });
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
    clearMfaPending();
  }, [factorId, code, clearMfaPending]);

  const handleUseDifferentAccount = useCallback(async () => {
    setSigningOut(true);
    await onSignOut?.();
  }, [onSignOut]);

  const canSubmit = factorId && code.length === 6;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <SlideInView delay={0}>
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark-outline" size={30} color={colors.orange} />
            </View>
            <Text style={styles.heading}>Two-Factor Authentication</Text>
            <Text style={styles.subheading}>
              Enter the 6-digit code from your authenticator app.
            </Text>
          </SlideInView>

          <SlideInView delay={100}>
            <TextInput
              style={[styles.input, !!error && styles.inputError]}
              placeholder="000000"
              placeholderTextColor={colors.muted}
              value={code}
              onChangeText={(t) => { setCode(t.replace(/[^0-9]/g, '').slice(0, 6)); if (error) setError(''); }}
              keyboardType="number-pad"
              autoFocus
              maxLength={6}
              textContentType="oneTimeCode"
              returnKeyType="done"
              onSubmitEditing={handleVerify}
            />
            {!!error && <Text style={styles.errorText}>{error}</Text>}
          </SlideInView>

          <SlideInView delay={160}>
            <TouchableOpacity
              style={[styles.ctaButton, (!canSubmit || loading) && styles.ctaButtonDisabled]}
              onPress={canSubmit && !loading ? handleVerify : undefined}
              activeOpacity={canSubmit && !loading ? 0.85 : 1}
            >
              {loading
                ? <ActivityIndicator color={colors.white} />
                : <Text style={styles.ctaText}>Verify</Text>
              }
            </TouchableOpacity>
          </SlideInView>

          <SlideInView delay={220}>
            <TouchableOpacity onPress={signingOut ? undefined : handleUseDifferentAccount} activeOpacity={0.7} style={styles.signOutRow}>
              <Text style={styles.signOutText}>
                {signingOut ? 'Signing out…' : 'Not your account? Sign out'}
              </Text>
            </TouchableOpacity>
          </SlideInView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.orangeWash,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heading: {
    fontFamily: 'Outfit-Regular',
    fontSize: 26,
    color: colors.ink,
    letterSpacing: -0.6,
    marginBottom: 10,
  },
  subheading: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    color: colors.muted,
    lineHeight: 21,
    marginBottom: 32,
  },
  input: {
    height: 58,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 18,
    fontFamily: 'Outfit-Regular',
    fontSize: 24,
    letterSpacing: 8,
    color: colors.ink,
    marginBottom: 8,
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
    marginBottom: 16,
  },
  ctaButton: {
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  ctaButtonDisabled: {
    backgroundColor: colors.orangeLight,
  },
  ctaText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 16,
    color: colors.white,
    letterSpacing: 0.2,
  },
  signOutRow: {
    alignItems: 'center',
    marginTop: 24,
  },
  signOutText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.muted,
  },
});
