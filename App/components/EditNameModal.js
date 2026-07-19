import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, Animated,
  StyleSheet, Dimensions, ActivityIndicator, Keyboard,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import colors from '../constants/colors';
import { useAuth } from '../context/AuthContext';

const { height: SCREEN_H } = Dimensions.get('window');

export default function EditNameModal({ visible, currentFirstName, currentLastName, onClose }) {
  const { updateProfileName } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setFirstName(currentFirstName || '');
      setLastName(currentLastName || '');
      setError('');
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 12, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, currentFirstName, currentLastName]);

  const dismiss = useCallback(() => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(overlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 220, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [onClose]);

  const handleSubmit = useCallback(async () => {
    const first = firstName.trim();
    const last = lastName.trim();
    if (!first || !last) { setError('Both first and last name are required'); return; }
    setError('');
    setLoading(true);
    const { error: saveError } = await updateProfileName(first, last);
    setLoading(false);
    if (saveError) {
      setError('Couldn’t save your name. Please try again.');
      return;
    }
    dismiss();
  }, [firstName, lastName, updateProfileName, dismiss]);

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
          <Text style={st.title}>Edit name</Text>
          <TextInput
            style={[st.input, !!error && st.inputError]}
            placeholder="First name"
            placeholderTextColor={colors.muted}
            value={firstName}
            onChangeText={(t) => { setFirstName(t); if (error) setError(''); }}
            autoCapitalize="words"
            autoCorrect={false}
            textContentType="givenName"
            returnKeyType="next"
            autoFocus
          />
          <TextInput
            style={[st.input, !!error && st.inputError]}
            placeholder="Last name"
            placeholderTextColor={colors.muted}
            value={lastName}
            onChangeText={(t) => { setLastName(t); if (error) setError(''); }}
            autoCapitalize="words"
            autoCorrect={false}
            textContentType="familyName"
            returnKeyType="send"
            onSubmitEditing={handleSubmit}
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
              : <Text style={st.confirmText}>Save</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={st.cancelBtn} onPress={dismiss} activeOpacity={0.6}>
            <Text style={st.cancelText}>Cancel</Text>
          </TouchableOpacity>
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
  title: {
    fontFamily: 'Outfit-Regular',
    fontSize: 21,
    color: colors.ink,
    letterSpacing: -0.5,
    marginBottom: 16,
    textAlign: 'center',
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
