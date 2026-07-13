import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import SupabaseService from '../services/SupabaseService';
import SlideInView from '../components/SlideInView';

const RESEND_COOLDOWN_SECONDS = 30;

// Shown after signup while email confirmation is pending. There is
// nothing to enter here — tapping the link in the email reopens the app
// (sureva://auth-callback) and AuthContext's deep-link handler completes
// sign-in automatically, unmounting this screen.
export default function CheckEmailScreen({ email, onBack }) {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError('');
    const { error: resendError } = await SupabaseService.resendSignupEmail(email);
    setResending(false);
    if (resendError) {
      setError('Couldn’t resend the email. Please try again.');
      return;
    }
    setResent(true);
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }, [cooldown, resending, email]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
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
        <SlideInView delay={0}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail-outline" size={36} color={colors.orange} />
          </View>
          <Text style={styles.heading}>Check your email</Text>
          <Text style={styles.subheading}>
            We sent a confirmation link to{'\n'}
            <Text style={styles.emailText}>{email}</Text>
            {'\n\n'}Tap the link to finish creating your account — this screen
            will move on by itself once you do.
          </Text>
        </SlideInView>

        <SlideInView delay={80}>
          {!!error && <Text style={styles.errorText}>{error}</Text>}
          <TouchableOpacity
            onPress={handleResend}
            disabled={cooldown > 0 || resending}
            style={styles.resendRow}
            activeOpacity={0.7}
          >
            <Text style={styles.resendText}>
              {cooldown > 0
                ? `Resend email in ${cooldown}s`
                : resending
                ? 'Sending…'
                : resent
                ? 'Sent — resend again'
                : 'Didn’t get an email? Resend'}
            </Text>
          </TouchableOpacity>
        </SlideInView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
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
    paddingTop: 32,
    alignItems: 'center',
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
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 28,
    color: colors.ink,
    letterSpacing: -1,
    textAlign: 'center',
    marginBottom: 14,
  },
  subheading: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
    textAlign: 'center',
  },
  emailText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: colors.ink,
  },

  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
    marginTop: 32,
  },
  resendRow: {
    alignSelf: 'center',
    marginTop: 32,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  resendText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 14,
    color: colors.orange,
  },
});
