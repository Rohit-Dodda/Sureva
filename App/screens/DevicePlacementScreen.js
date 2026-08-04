import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Pressable, Animated, ScrollView, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureDetector } from 'react-native-gesture-handler';
import colors from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { DEVICE_PLACEMENTS } from '../constants/devicePlacementOptions';
import SelectablePill from '../components/settings/SelectablePill';
import { useSlideOverScreen } from '../hooks/useSlideOverScreen';

// Lets a signed-in user set where they actually wear their Sureva device.
// Unlike most Settings sub-screens, this isn't display preference — it's
// a real algorithmic input (calculatePlacementCorrection in
// depletionEngine.js): a save here changes the UV correction applied on
// the very next session, the same real effect EditSkinProfileScreen's
// answers have (see engineProfileFor in sessionMath.js).
export default function DevicePlacementScreen({ visible, onClose }) {
  const { userProfile, updateDevicePlacement } = useAuth();
  const { screenTranslateX, gesture, handleClose } = useSlideOverScreen({ visible, onClose });
  const [saving, setSaving] = useState(false);
  const [placement, setPlacement] = useState(null);

  // Falls back to the same default the engine itself uses
  // (shoulder_strap) when nothing's been saved yet, so the pill list
  // shows a pre-selection consistent with what depletion math is
  // already assuming for this user.
  const originalRef = useRef(null);
  useEffect(() => {
    if (!visible) return;
    const snapshot = userProfile?.devicePlacement ?? 'shoulder_strap';
    originalRef.current = snapshot;
    setPlacement(snapshot);
  }, [visible, userProfile]);

  const isDirty = placement !== originalRef.current;

  const handleSave = useCallback(async () => {
    if (!placement) return;
    setSaving(true);
    const { error } = await updateDevicePlacement(placement);
    setSaving(false);
    if (error) {
      Alert.alert('Couldn’t Save', 'Please check your connection and try again.');
      return;
    }
    handleClose();
  }, [updateDevicePlacement, placement, handleClose]);

  if (!visible) return null;

  return (
    <GestureDetector gesture={gesture}>
    <Animated.View style={[st.root, { transform: [{ translateX: screenTranslateX }] }]}>
      <SafeAreaView style={st.safe}>
        <StatusBar style="dark" />
        <View style={st.header}>
          <Pressable onPress={handleClose} hitSlop={12} style={st.backBtn}>
            <Text style={st.backArrow}>←</Text>
          </Pressable>
          <Text style={st.headerTitle}>Device Placement</Text>
          <View style={st.headerSpacer} />
        </View>

        <ScrollView style={st.scroll} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={st.intro}>
            Where you wear Sureva changes how much UV actually reaches your skin. Tell us where
            it is so your protection percentage stays accurate.
          </Text>

          {DEVICE_PLACEMENTS.map((opt) => (
            <SelectablePill
              key={opt.id}
              label={opt.label}
              sublabel={opt.sub}
              selected={placement === opt.id}
              onPress={() => setPlacement(opt.id)}
            />
          ))}

          <Pressable
            onPress={handleSave}
            disabled={!isDirty || saving}
            style={[st.saveBtn, (!isDirty || saving) && st.saveBtnDisabled]}
          >
            <Text style={st.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
    </GestureDetector>
  );
}

const st = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.canvas,
    zIndex: 10,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontFamily: 'Outfit-Regular',
    fontSize: 18,
    color: colors.ink,
    textAlign: 'center',
    includeFontPadding: false,
  },
  headerTitle: {
    fontFamily: 'Outfit-Regular',
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.4,
  },
  headerSpacer: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 48,
  },
  intro: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
    marginBottom: 20,
    width: '100%',
  },
  saveBtn: {
    backgroundColor: colors.orange,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  saveBtnDisabled: {
    backgroundColor: colors.orangeLight,
  },
  saveBtnText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    color: colors.white,
  },
});
