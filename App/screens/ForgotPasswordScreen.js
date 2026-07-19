import React, { useState, useCallback } from 'react';
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
import SupabaseService from '../services/SupabaseService';
import SlideInView from '../components/SlideInView';

export default function ForgotPasswordScreen({ onBack }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = useCallback(async () => {
    const trimmed = email.trim();
    if (!trimmed) { setError('This field is required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    setLoading(true);
    const { error: sendError } = await SupabaseService.resetPasswordForEmail(trimmed);
    setLoading(false);
    if (sendError) {
      setError('Couldn’t send the reset link. Please try again.');
      return;
    }
    setSent(true);
  }, [email]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onBack}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={26} color={colors.ink} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {sent ? (
            <SlideInView delay={0} style={styles.sentBlock}>
              <View style={styles.iconCircle}>
                <Ionicons name="mail-outline" size={36} color={colors.orange} />
              </View>
              <Text style={[styles.heading, styles.centerText]}>Check your email</Text>
              <Text style={[styles.subheading, styles.centerText]}>
                We sent a password reset link to{'\n'}
                <Text style={styles.emailText}>{email.trim()}</Text>
                {'\n\n'}Tap the link to set a new password.
              </Text>
            </SlideInView>
          ) : (
            <>
              <SlideInView delay={0}>
                <Text style={styles.heading}>Reset your password</Text>
                <Text style={styles.subheading}>
                  Enter the email on your account and we’ll send you a link to set a new password.
                </Text>
              </SlideInView>

              <SlideInView delay={80}>
                <Text style={styles.fieldLabel}>Email Address</Text>
                <TextInput
                  style={[styles.input, !!error && styles.inputError]}
                  placeholder="Email Address"
                  placeholderTextColor={colors.muted}
                  value={email}
                  onChangeText={(t) => { setEmail(t); if (error) setError(''); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="send"
                  onSubmitEditing={handleSend}
                />
                {!!error && <Text style={styles.errorText}>{error}</Text>}

                <TouchableOpacity
                  style={[styles.ctaButton, loading && styles.ctaButtonDisabled]}
                  onPress={loading ? undefined : handleSend}
                  activeOpacity={loading ? 1 : 0.85}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color={colors.white} />
                    : <Text style={styles.ctaText}>Send Reset Link</Text>
                  }
                </TouchableOpacity>
              </SlideInView>
            </>
          )}
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },

  sentBlock: {
    alignItems: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.orangeWash,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  heading: {
    fontFamily: 'Outfit-Regular',
    fontSize: 28,
    color: colors.ink,
    letterSpacing: -1,
    marginBottom: 14,
  },
  subheading: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
    marginBottom: 28,
  },
  emailText: {
    fontFamily: 'Outfit-Regular',
    color: colors.ink,
  },

  fieldLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.ink,
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  input: {
    height: 52,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    color: colors.ink,
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.danger,
    marginTop: 5,
  },

  ctaButton: {
    height: 56,
    marginTop: 24,
    backgroundColor: colors.orange,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaButtonDisabled: {
    backgroundColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 17,
    color: colors.white,
    letterSpacing: 0.2,
  },
});
