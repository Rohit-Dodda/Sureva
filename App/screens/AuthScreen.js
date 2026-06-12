import React, { useState, useCallback, useRef } from 'react';
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
import { fetchSignInMethodsForEmail } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import colors from '../constants/colors';
import SlideInView from '../components/SlideInView';

export default function AuthScreen({ onNavigateToSignIn, onAccountCreated, prefillError }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [errors, setErrors] = useState(prefillError ? { email: prefillError } : {});
  const [tosAccepted, setTosAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const lastNameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  // Track previous lengths to detect autofill (multiple chars added at once)
  const prevFirstNameLen = useRef(0);
  const prevLastNameLen = useRef(0);
  const prevEmailLen = useRef(0);

  const toggleShowPassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const toggleTos = useCallback(() => setTosAccepted((prev) => !prev), []);
  const togglePrivacy = useCallback(() => setPrivacyAccepted((prev) => !prev), []);

  const canSubmit = tosAccepted && privacyAccepted;

  const handleSignUp = useCallback(async () => {
    const newErrors = {
      firstName: firstName.trim() ? '' : 'This field is required',
      lastName: lastName.trim() ? '' : 'This field is required',
      email: !email.trim()
        ? 'This field is required'
        : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ? 'Please enter a valid email address'
        : '',
      password: !password
        ? 'This field is required'
        : password.length < 6
        ? 'Password must be at least 6 characters'
        : '',
    };
    setErrors(newErrors);
    if (Object.values(newErrors).some((e) => e)) return;

    setLoading(true);
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email.trim());
      if (methods.length > 0) {
        setErrors((prev) => ({ ...prev, email: 'An account with this email already exists' }));
        setLoading(false);
        return;
      }
    } catch {
      // email enumeration protection may be enabled — proceed and let creation fail if duplicate
    }

    try {
      await onAccountCreated({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      // On success the component unmounts; no need to reset loading
    } catch (e) {
      const code = e?.code ?? '';
      if (code === 'auth/email-already-in-use') {
        setErrors((prev) => ({ ...prev, email: 'An account with this email already exists' }));
      } else {
        setErrors((prev) => ({ ...prev, email: 'Account creation failed. Please try again.' }));
      }
      setLoading(false);
    }
  }, [firstName, lastName, email, password, onAccountCreated]);

  const handleGoogleSignUp = useCallback(() => {
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
          <SlideInView delay={0}>
            <Text style={styles.heading}>Join Sureva</Text>
            <Text style={styles.subheading} numberOfLines={1} adjustsFontSizeToFit>
              Your skin deserves smarter protection. Let's set you up.
            </Text>
          </SlideInView>

          {/* Google SSO */}
          <SlideInView delay={60}>
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleSignUp}
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
          </SlideInView>

          {/* First + Last name */}
          <SlideInView delay={120} style={styles.nameRow}>
            <View style={styles.nameCol}>
              <Text style={styles.fieldLabel}>First Name</Text>
              <TextInput
                style={[styles.input, { borderColor: borderColor('firstName') }]}
                placeholder="First Name"
                placeholderTextColor={colors.muted}
                value={firstName}
                onChangeText={(t) => {
                  if (errors.firstName) setErrors((e) => ({ ...e, firstName: '' }));
                  setFirstName(t);
                  if (t.length - prevFirstNameLen.current > 1) lastNameRef.current?.focus();
                  prevFirstNameLen.current = t.length;
                }}
                onFocus={() => setFocusedField('firstName')}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="words"
                autoComplete="given-name"
                textContentType="givenName"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => lastNameRef.current?.focus()}
              />
              {!!errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
            </View>
            <View style={styles.nameCol}>
              <Text style={styles.fieldLabel}>Last Name</Text>
              <TextInput
                ref={lastNameRef}
                style={[styles.input, { borderColor: borderColor('lastName') }]}
                placeholder="Last Name"
                placeholderTextColor={colors.muted}
                value={lastName}
                onChangeText={(t) => {
                  if (errors.lastName) setErrors((e) => ({ ...e, lastName: '' }));
                  setLastName(t);
                  if (t.length - prevLastNameLen.current > 1) emailRef.current?.focus();
                  prevLastNameLen.current = t.length;
                }}
                onFocus={() => setFocusedField('lastName')}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="words"
                autoComplete="family-name"
                textContentType="familyName"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => emailRef.current?.focus()}
              />
              {!!errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
            </View>
          </SlideInView>

          {/* Email */}
          <SlideInView delay={180}>
          <Text style={styles.fieldLabel}>Email Address</Text>
          <View style={styles.fieldBlock}>
            <TextInput
              ref={emailRef}
              style={[styles.input, { borderColor: borderColor('email') }]}
              placeholder="Email Address"
              placeholderTextColor={colors.muted}
              value={email}
              onChangeText={(t) => {
                if (errors.email) setErrors((e) => ({ ...e, email: '' }));
                setEmail(t);
                if (t.length - prevEmailLen.current > 1) passwordRef.current?.focus();
                prevEmailLen.current = t.length;
              }}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              importantForAutofill="yes"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            {!!errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>
          </SlideInView>

          {/* Password */}
          <SlideInView delay={240}>
          <Text style={styles.fieldLabel}>Password</Text>
          <View style={[styles.fieldBlock, { marginBottom: 20 }]}>
            <View style={[styles.passwordWrapper, { borderColor: borderColor('password') }]}>
              <TextInput
                ref={passwordRef}
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
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={handleSignUp}
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
          </SlideInView>

          {/* Consent checkboxes */}
          <SlideInView delay={300}>
          <TouchableOpacity style={styles.checkboxRow} onPress={toggleTos} activeOpacity={0.7}>
            <View style={[styles.checkbox, tosAccepted && styles.checkboxChecked]}>
              {tosAccepted && <Ionicons name="checkmark" size={14} color={colors.white} />}
            </View>
            <Text style={styles.checkboxLabel}>I have read the <Text style={styles.checkboxLink}>Terms of Service</Text></Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.checkboxRow, { marginBottom: 28 }]} onPress={togglePrivacy} activeOpacity={0.7}>
            <View style={[styles.checkbox, privacyAccepted && styles.checkboxChecked]}>
              {privacyAccepted && <Ionicons name="checkmark" size={14} color={colors.white} />}
            </View>
            <Text style={styles.checkboxLabel}>I have read the <Text style={styles.checkboxLink}>Privacy Policy</Text></Text>
          </TouchableOpacity>
          </SlideInView>

          {/* CTA */}
          <SlideInView delay={360}>
          <TouchableOpacity
            style={[styles.ctaButton, (!canSubmit || loading) && styles.ctaButtonDisabled]}
            onPress={canSubmit && !loading ? handleSignUp : undefined}
            activeOpacity={canSubmit && !loading ? 0.85 : 1}
          >
            {loading
              ? <ActivityIndicator color={colors.white} />
              : <Text style={styles.ctaText}>Create Account</Text>
            }
          </TouchableOpacity>

          {/* Sign in link */}
          <View style={styles.signinRow}>
            <Text style={styles.signinText}>Already have an account? </Text>
            <TouchableOpacity onPress={onNavigateToSignIn} activeOpacity={0.7}>
              <Text style={styles.signinLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
          </SlideInView>

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
  },
  subheading: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 15,
    color: colors.muted,
    marginBottom: 36,
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

  nameRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  nameCol: {
    flex: 1,
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

  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  checkboxLabel: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 14,
    color: colors.ink,
    flex: 1,
  },
  checkboxLink: {
    fontFamily: 'SFProDisplay-Bold',
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

  signinRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signinText: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 14,
    color: colors.muted,
  },
  signinLink: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 14,
    color: colors.orange,
  },

});
