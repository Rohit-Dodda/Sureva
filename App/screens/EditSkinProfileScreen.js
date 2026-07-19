import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, SafeAreaView, Pressable,
  Animated, ScrollView, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureDetector } from 'react-native-gesture-handler';
import colors from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { SKIN_TONES, AGE_RANGES, BURN_OPTIONS, SKIN_TYPES } from '../constants/onboardingOptions';
import SelectablePill from '../components/settings/SelectablePill';
import ToggleRow from '../components/settings/ToggleRow';
import { useSlideOverScreen } from '../hooks/useSlideOverScreen';

// "unsure" only ever exists as a first-time-onboarding shortcut for burn
// rate — it's coerced to "moderate" before it's ever saved, so an editor
// showing already-saved answers never needs to offer it again.
const EDITABLE_BURN_OPTIONS = BURN_OPTIONS.filter((o) => o.id !== 'unsure');

// Lets a signed-in user revisit and change the answers they gave during
// onboarding (skin tone, age range, skin type, burn rate, medications,
// skin condition). These are the same real Supabase columns onboarding
// itself writes, so a save here changes the actual algorithmic inputs
// (Fitzpatrick estimate, age group, skin type, medication flag) used the
// next time a session runs — see engineProfileFor in sessionMath.js.
export default function EditSkinProfileScreen({ visible, onClose }) {
  const { userProfile, updateProfileFields } = useAuth();
  const { screenTranslateX, gesture, handleClose } = useSlideOverScreen({ visible, onClose });
  const [saving, setSaving] = useState(false);

  const [skinTone, setSkinTone] = useState(null);
  const [ageRange, setAgeRange] = useState(null);
  const [exactAge, setExactAge] = useState('');
  const [skinType, setSkinType] = useState(null);
  const [burnRate, setBurnRate] = useState(null);
  const [medications, setMedications] = useState(false);
  const [skinCondition, setSkinCondition] = useState(false);

  // Snapshot of what was actually loaded when the screen opened (i.e. the
  // last saved answers), so "Reset to Original" can undo in-progress edits
  // without needing a round-trip back to Supabase.
  const originalRef = useRef(null);

  useEffect(() => {
    if (!visible) return;
    const snapshot = {
      skinTone: userProfile?.skinTone ?? null,
      ageRange: userProfile?.ageRange ?? null,
      exactAge: userProfile?.exactAge != null ? String(userProfile.exactAge) : '',
      skinType: userProfile?.skinType ?? null,
      burnRate: userProfile?.burnRate ?? null,
      medications: !!userProfile?.medications,
      skinCondition: !!userProfile?.skinCondition,
    };
    originalRef.current = snapshot;
    setSkinTone(snapshot.skinTone);
    setAgeRange(snapshot.ageRange);
    setExactAge(snapshot.exactAge);
    setSkinType(snapshot.skinType);
    setBurnRate(snapshot.burnRate);
    setMedications(snapshot.medications);
    setSkinCondition(snapshot.skinCondition);
  }, [visible, userProfile]);

  const isDirty = !!originalRef.current && (
    skinTone !== originalRef.current.skinTone ||
    ageRange !== originalRef.current.ageRange ||
    exactAge !== originalRef.current.exactAge ||
    skinType !== originalRef.current.skinType ||
    burnRate !== originalRef.current.burnRate ||
    medications !== originalRef.current.medications ||
    skinCondition !== originalRef.current.skinCondition
  );

  const handleReset = useCallback(() => {
    const snap = originalRef.current;
    if (!snap) return;
    setSkinTone(snap.skinTone);
    setAgeRange(snap.ageRange);
    setExactAge(snap.exactAge);
    setSkinType(snap.skinType);
    setBurnRate(snap.burnRate);
    setMedications(snap.medications);
    setSkinCondition(snap.skinCondition);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const { error } = await updateProfileFields({
      skinTone, ageRange, exactAge: exactAge.trim() ? parseInt(exactAge, 10) : null,
      skinType, burnRate, medications, skinCondition,
    });
    setSaving(false);
    if (error) {
      Alert.alert('Couldn’t Save', 'Please check your connection and try again.');
      return;
    }
    handleClose();
  }, [updateProfileFields, skinTone, ageRange, exactAge, skinType, burnRate, medications, skinCondition, handleClose]);

  if (!visible) return null;

  const canSave = skinTone !== null && ageRange !== null && skinType !== null && burnRate !== null;

  return (
    <GestureDetector gesture={gesture}>
    <Animated.View style={[st.root, { transform: [{ translateX: screenTranslateX }] }]}>
      <SafeAreaView style={st.safe}>
        <StatusBar style="dark" />
        <View style={st.header}>
          <Pressable onPress={handleClose} hitSlop={12} style={st.backBtn}>
            <Text style={st.backArrow}>←</Text>
          </Pressable>
          <Text style={st.headerTitle}>Skin Profile</Text>
          <View style={st.headerSpacer} />
          {isDirty && (
            <Pressable onPress={handleReset} hitSlop={12}>
              <Text style={st.resetLink}>Reset</Text>
            </Pressable>
          )}
        </View>

        <ScrollView style={st.scroll} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={st.intro}>
            These are the same answers you gave during setup. Changing them updates how Sureva
            calculates your protection, reapply timing, and alerts.
          </Text>

          <Text style={st.sectionHeading}>SKIN TONE</Text>
          <View style={st.toneRow}>
            {SKIN_TONES.map((tone) => (
              <Pressable key={tone.id} onPress={() => setSkinTone(tone.id)} style={st.toneOuter}>
                <View style={[st.toneCircle, { backgroundColor: tone.color }, skinTone === tone.id && st.toneSelected]} />
              </Pressable>
            ))}
          </View>

          <Text style={st.sectionHeading}>AGE RANGE</Text>
          {AGE_RANGES.map((opt) => (
            <SelectablePill
              key={opt.id}
              label={opt.label}
              selected={ageRange === opt.id}
              onPress={() => setAgeRange(opt.id)}
            />
          ))}

          <Text style={st.sectionHeading}>EXACT AGE (OPTIONAL)</Text>
          <TextInput
            style={st.exactAgeInput}
            placeholder="e.g. 27"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            value={exactAge}
            onChangeText={setExactAge}
            returnKeyType="done"
            maxLength={3}
          />

          <Text style={st.sectionHeading}>SKIN TYPE</Text>
          {SKIN_TYPES.map((opt) => (
            <SelectablePill
              key={opt.id}
              label={opt.label}
              selected={skinType === opt.id}
              onPress={() => setSkinType(opt.id)}
            />
          ))}

          <Text style={st.sectionHeading}>HOW QUICKLY YOU BURN</Text>
          {EDITABLE_BURN_OPTIONS.map((opt) => (
            <SelectablePill
              key={opt.id}
              label={opt.label}
              sublabel={opt.sub}
              selected={burnRate === opt.id}
              onPress={() => setBurnRate(opt.id)}
            />
          ))}

          <Text style={st.sectionHeading}>MEDICATIONS &amp; CONDITIONS</Text>
          <View style={st.card}>
            <ToggleRow
              label="Photosensitizing medications"
              sublabel="Increases UV sensitivity"
              value={medications}
              onValueChange={setMedications}
            />
            <View style={st.cardDivider} />
            <ToggleRow
              label="Skin condition"
              sublabel="Rosacea, eczema, psoriasis, lupus, etc."
              value={skinCondition}
              onValueChange={setSkinCondition}
            />
          </View>

          <Pressable
            onPress={handleSave}
            disabled={!canSave || saving}
            style={[st.saveBtn, (!canSave || saving) && st.saveBtnDisabled]}
          >
            <Text style={st.saveBtnText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
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
  resetLink: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.orangeDark,
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
    marginBottom: 8,
    // Text doesn't reliably stretch to fill its container the way a
    // View/Pressable does by default — forcing full width explicitly so
    // this lines up exactly with the pill boxes below it.
    width: '100%',
  },
  sectionHeading: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 22,
    marginLeft: 4,
  },
  toneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  toneOuter: {
    padding: 4,
  },
  toneCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  toneSelected: {
    borderColor: colors.orange,
  },
  exactAgeInput: {
    height: 50,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    fontFamily: 'Outfit-Regular',
    fontSize: 16,
    color: colors.ink,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 16,
  },
  saveBtn: {
    backgroundColor: colors.orange,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
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
