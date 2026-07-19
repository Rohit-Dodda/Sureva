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
import { useAuth } from '../context/AuthContext';
import SlideInView from '../components/SlideInView';

// Shown whenever a password-recovery session is active (see
// AuthContext's passwordRecoveryPending), regardless of where in the app
// the link happened to land. There's no "back" — the only way out is
// setting a new password.
export default function ResetPasswordScreen() {
  const { clearPasswordRecoveryPending } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const toggleShowPassword = useCallback(() => setShowPassword((prev) => !prev), []);

  const handleSubmit = useCallback(async () => {
    const newErrors = {
      password: !password
        ? 'This field is required'
        : password.length < 6
        ? 'Password must be at least 6 characters'
        : '',
      confirmPassword: password !== confirmPassword ? 'Passwords do not match' : '',
    };
    setErrors(newErrors);
    if (Object.values(newErrors).some((e) => e)) return;

    setLoading(true);
    const { error } = await SupabaseService.updatePassword(password);
    if (error) {
      setLoading(false);
      setErrors({ password: '', confirmPassword: 'Couldn’t update your password. Please try again.' });
      return;
    }
    // Sign out of the recovery session deliberately — the user should
    // prove the new password works by actually signing back in with it,
    // rather than being silently carried into the app on the old session.
    await SupabaseService.signOut();
    clearPasswordRecoveryPending();
    setLoading(false);
  }, [password, confirmPassword, clearPasswordRecoveryPending]);

  const canSubmit = password.length >= 6 && password === confirmPassword;

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
              <Ionicons name="lock-closed-outline" size={32} color={colors.orange} />
            </View>
            <Text style={styles.heading}>Set a new password</Text>
            <Text style={styles.subheading}>
              Choose a new password for your account.
            </Text>
          </SlideInView>

          <SlideInView delay={80}>
            <Text style={styles.fieldLabel}>New Password</Text>
            <View style={[styles.passwordWrapper, !!errors.password && styles.inputError]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                placeholderTextColor={colors.muted}
                value={password}
                onChangeText={(t) => { setPassword(t); if (errors.password) setErrors((e) => ({ ...e, password: '' })); }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="next"
              />
              <TouchableOpacity
                onPress={toggleShowPassword}
                style={styles.eyeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={colors.muted}
                />
              </TouchableOpacity>
            </View>
            {!!errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Confirm Password</Text>
            <View style={[styles.passwordWrapper, !!errors.confirmPassword && styles.inputError]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm Password"
                placeholderTextColor={colors.muted}
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); if (errors.confirmPassword) setErrors((e) => ({ ...e, confirmPassword: '' })); }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            </View>
            {!!errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

            <TouchableOpacity
              style={[styles.ctaButton, (!canSubmit || loading) && styles.ctaButtonDisabled]}
              onPress={canSubmit && !loading ? handleSubmit : undefined}
              activeOpacity={canSubmit && !loading ? 0.85 : 1}
            >
              {loading
                ? <ActivityIndicator color={colors.white} />
                : <Text style={styles.ctaText}>Update Password</Text>
              }
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
    paddingHorizontal: 24,
    paddingTop: 60,
  },

  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.orangeWash,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  heading: {
    fontFamily: 'Outfit-Regular',
    fontSize: 28,
    color: colors.ink,
    letterSpacing: -1,
    marginBottom: 10,
  },
  subheading: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
    marginBottom: 28,
  },

  fieldLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.ink,
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  passwordWrapper: {
    height: 52,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  inputError: {
    borderColor: colors.danger,
  },
  passwordInput: {
    flex: 1,
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    color: colors.ink,
    height: '100%',
  },
  eyeButton: {
    paddingLeft: 8,
  },
  errorText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.danger,
    marginTop: 5,
  },

  ctaButton: {
    height: 56,
    marginTop: 28,
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
