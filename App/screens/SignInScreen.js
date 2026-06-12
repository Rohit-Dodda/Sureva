import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import FirebaseService from '../services/FirebaseService';

export default function SignInScreen({ onNavigateToSignUp }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const toggleShowPassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const toggleRememberMe = useCallback(() => {
    setRememberMe((prev) => !prev);
  }, []);

  const handleSignIn = useCallback(async () => {
    const newErrors = {
      email: !email.trim()
        ? 'This field is required'
        : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ? 'Please enter a valid email address'
        : '',
      password: password ? '' : 'This field is required',
    };
    setErrors(newErrors);
    if (Object.values(newErrors).some((e) => e)) return;

    setLoading(true);
    try {
      await FirebaseService.signIn(email.trim(), password);
      // Navigation is handled automatically by onAuthStateChanged in AuthContext
    } catch (e) {
      const code = e?.code ?? '';
      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found'
      ) {
        setErrors({ email: '', password: 'Incorrect email or password' });
      } else if (code === 'auth/invalid-email') {
        setErrors((prev) => ({ ...prev, email: 'Please enter a valid email address' }));
      } else if (code === 'auth/too-many-requests') {
        setErrors({ email: '', password: 'Too many attempts. Try again later.' });
      } else {
        setErrors({ email: '', password: 'Sign in failed. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  }, [email, password]);

  const handleGoogleSignIn = useCallback(() => {
    // Google auth coming soon
  }, []);

  const borderColor = (field) =>
    focusedField === field ? colors.orange : colors.border;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Heading */}
          <Text style={styles.heading}>Welcome Back</Text>
          <Text style={styles.subheading} numberOfLines={1} adjustsFontSizeToFit>
            Let's keep you covered.
          </Text>

          {/* Google SSO */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            activeOpacity={0.8}
          >
            <Image
              source={require('../assets/google-icon.png')}
              style={styles.googleIcon}
            />
            <Text style={styles.googleText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* OR divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email */}
          <Text style={styles.fieldLabel}>Email Address</Text>
          <View style={styles.fieldBlock}>
            <TextInput
              style={[styles.input, { borderColor: borderColor('email') }]}
              placeholder="Email Address"
              placeholderTextColor={colors.muted}
              value={email}
              onChangeText={(t) => { setEmail(t); if (errors.email) setErrors((e) => ({ ...e, email: '' })); }}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
            />
            {!!errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* Password */}
          <Text style={styles.fieldLabel}>Password</Text>
          <View style={[styles.fieldBlock, { marginBottom: 16 }]}>
            <View style={[styles.passwordWrapper, { borderColor: borderColor('password') }]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                placeholderTextColor={colors.muted}
                value={password}
                onChangeText={(t) => { setPassword(t); if (errors.password) setErrors((e) => ({ ...e, password: '' })); }}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                textContentType="password"
                importantForAutofill="yes"
                returnKeyType="done"
                onSubmitEditing={handleSignIn}
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
          </View>

          {/* Remember me + Forgot password */}
          <View style={styles.utilRow}>
            <TouchableOpacity
              style={styles.rememberRow}
              onPress={toggleRememberMe}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && (
                  <Ionicons name="checkmark" size={12} color={colors.white} />
                )}
              </View>
              <Text style={styles.rememberText}>Remember me</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={[styles.ctaButton, loading && styles.ctaButtonDisabled]}
            onPress={loading ? undefined : handleSignIn}
            activeOpacity={loading ? 1 : 0.85}
          >
            {loading
              ? <ActivityIndicator color={colors.white} />
              : <Text style={styles.ctaText}>Sign In</Text>
            }
          </TouchableOpacity>

          {/* Sign up link — pinned to bottom */}
          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={onNavigateToSignUp} activeOpacity={0.7}>
              <Text style={styles.signupLink}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 48,
  },

  heading: {
    fontFamily: 'SFProDisplay-Black',
    fontSize: 34,
    color: colors.ink,
    letterSpacing: -1,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  subheading: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 15,
    color: colors.muted,
    marginBottom: 36,
    alignSelf: 'flex-start',
  },

  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    gap: 10,
    backgroundColor: colors.white,
    marginBottom: 28,
  },
  googleIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  googleText: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 15,
    color: colors.ink,
    letterSpacing: 0.1,
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerLabel: {
    fontFamily: 'SFProDisplay-Regular',
    marginHorizontal: 14,
    fontSize: 13,
    color: colors.muted,
    letterSpacing: 0.5,
  },

  fieldLabel: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 13,
    color: colors.ink,
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  input: {
    height: 52,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 15,
    color: colors.ink,
  },
  fieldBlock: {
    marginBottom: 20,
  },
  errorText: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 12,
    color: colors.danger,
    marginTop: 5,
  },
  passwordWrapper: {
    height: 52,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  passwordInput: {
    flex: 1,
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 15,
    color: colors.ink,
    height: '100%',
  },
  eyeButton: {
    paddingLeft: 8,
  },

  utilRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  checkboxChecked: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  rememberText: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 14,
    color: colors.ink,
  },
  forgotText: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 14,
    color: colors.orange,
  },

  ctaButton: {
    height: 56,
    backgroundColor: colors.orange,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 28,
  },
  ctaButtonDisabled: {
    backgroundColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaText: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 17,
    color: colors.white,
    letterSpacing: 0.2,
  },

  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 14,
    color: colors.muted,
  },
  signupLink: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 14,
    color: colors.orange,
  },
});
