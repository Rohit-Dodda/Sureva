import React, { useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Pressable,
  Animated, ScrollView, Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import FAQItem from '../components/help/FAQItem';
import { useSlideOverScreen } from '../hooks/useSlideOverScreen';

const SUPPORT_EMAIL = 'rohitk.dodda@gmail.com';

const FAQ_SECTIONS = [
  {
    title: 'HOW SUREVA WORKS',
    items: [
      {
        q: 'How does Sureva know when I need to reapply sunscreen?',
        a: 'Your device tracks UV intensity, temperature, humidity, motion, and water contact in real time, then combines them into a single depletion model calibrated to your skin. When your protection drops below your personal threshold, Sureva alerts you before you’d normally notice.',
      },
      {
        q: 'What does the protection percentage actually mean?',
        a: 'It’s an estimate of how much of your sunscreen’s original protection is still active, based on how long it’s been on and what conditions it’s been through. 100% means freshly applied; Sureva alerts you well before you reach 0%.',
      },
      {
        q: 'Does Sureva work with any sunscreen?',
        a: 'Yes. Enter your SPF and water-resistance rating when you start a session, and the model adjusts to match your specific product.',
      },
      {
        q: 'What is a MED, and why do you use it?',
        a: 'A MED (Minimal Erythemal Dose) is the standard dermatology unit for UV exposure: the dose expected to just barely redden a given skin type. Sureva tracks your exposure in MEDs instead of vague terms like "a lot of sun," so your history is directly comparable to real photobiology research.',
      },
    ],
  },
  {
    title: 'YOUR DEVICE',
    items: [
      {
        q: 'Where should I wear my Sureva device?',
        a: 'Shoulder strap or hat brim gives the most accurate reading. Wrist placement works too, but tends to underread direct UV exposure slightly. Sureva corrects for this automatically based on your placement setting.',
      },
      {
        q: 'What happens if my phone loses connection to the device?',
        a: 'Sureva keeps tracking locally and syncs your session the moment connection is restored. You won’t lose any data. You just won’t see live updates until it reconnects.',
      },
    ],
  },
  {
    title: 'SKIN AGE & INSIGHTS',
    items: [
      {
        q: 'What is Skin Age?',
        a: 'An estimate of how your accumulated UV exposure is affecting long-term skin aging, based on published dermatology dosimetry research. It can only add years relative to your real age. There’s no science behind claiming good habits make you biologically younger, only that they slow how much photoaging risk you accumulate.',
      },
      {
        q: 'Why do my Insights change over time?',
        a: 'Every card on your Insights page is recalculated from your actual session history, so the more you use Sureva, the more accurate and personalized the numbers get.',
      },
    ],
  },
  {
    title: 'ACCOUNT & DATA',
    items: [
      {
        q: 'Is my data private?',
        a: 'Your session and skin data is tied to your account and protected by row-level security, so no one else can access it, including other Sureva users. We don’t sell your data.',
      },
      {
        q: 'Can I export my data?',
        a: 'Yes. Head to Insights and tap "Export PDF" for a full profile you can save, share with a doctor, or hand to another app.',
      },
      {
        q: 'Can I change my email or password?',
        a: 'Yes, both are in Settings under your profile. Email changes require confirming from both your old and new address; password changes are protected behind Face ID or your device passcode.',
      },
      {
        q: 'How do I delete my account?',
        a: 'In Settings, scroll to the Danger Zone and tap Delete Account. You’ll confirm with Face ID or your passcode, then one final confirmation. This permanently removes your account and all associated data.',
      },
    ],
  },
];

function usePressScale(toValue = 0.97) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn  = () => Animated.spring(scale, { toValue,    useNativeDriver: true, tension: 280, friction: 12 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }).start();
  return { scale, onPressIn, onPressOut };
}

export default function HelpSupportScreen({ visible, onClose }) {
  const { screenTranslateX, gesture, handleClose } = useSlideOverScreen({ visible, onClose });
  const { scale: emailScale, onPressIn: emailPressIn, onPressOut: emailPressOut } = usePressScale(0.97);

  const handleEmail = useCallback(() => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Sureva Support')}`);
  }, []);

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
          <Text style={st.headerTitle}>Help & Support</Text>
        </View>

        <ScrollView style={st.scroll} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={st.intro}>Answers to what Sureva users ask most, or skip straight to reaching us below.</Text>

          {FAQ_SECTIONS.map((section) => (
            <View key={section.title}>
              <Text style={st.sectionHeading}>{section.title}</Text>
              <View style={st.card}>
                {section.items.map((item, idx) => (
                  <FAQItem
                    key={item.q}
                    question={item.q}
                    answer={item.a}
                    isLast={idx === section.items.length - 1}
                  />
                ))}
              </View>
            </View>
          ))}

          <Pressable onPressIn={emailPressIn} onPressOut={emailPressOut} onPress={handleEmail}>
            <Animated.View style={[st.contactCard, { transform: [{ scale: emailScale }] }]}>
              <View style={st.contactIcon}>
                <Ionicons name="mail-outline" size={22} color={colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.contactTitle}>Still need help?</Text>
                <Text style={st.contactSub}>Email us directly. We read every message.</Text>
                <Text style={st.contactEmail}>{SUPPORT_EMAIL}</Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={26} color={colors.white} />
            </Animated.View>
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
  },
  sectionHeading: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 22,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.ink,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginTop: 28,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactTitle: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    color: colors.white,
  },
  contactSub: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  contactEmail: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13.5,
    color: colors.orangeLight,
    marginTop: 6,
  },
});
