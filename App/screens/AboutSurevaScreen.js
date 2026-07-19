import React, { useRef, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Pressable,
  Animated, ScrollView, Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureDetector } from 'react-native-gesture-handler';
import colors from '../constants/colors';
import LegalDocumentModal from '../components/LegalDocumentModal';
import { PRIVACY_POLICY, TERMS_OF_SERVICE, ACCESSIBILITY_STATEMENT } from '../constants/legalContent';
import { useSlideOverScreen } from '../hooks/useSlideOverScreen';

const APP_VERSION = '1.0.0';

function usePressScale(toValue = 0.97) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn  = () => Animated.spring(scale, { toValue,    useNativeDriver: true, tension: 280, friction: 12 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }).start();
  return { scale, onPressIn, onPressOut };
}

const AboutRow = React.memo(function AboutRow({ label, isLast, onPress }) {
  const { scale, onPressIn, onPressOut } = usePressScale();
  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[st.row, !isLast && st.rowBorder, { transform: [{ scale }] }]}>
        <Text style={st.rowLabel}>{label}</Text>
        <Text style={st.chevron}>›</Text>
      </Animated.View>
    </Pressable>
  );
});

export default function AboutSurevaScreen({ visible, onClose }) {
  const { screenTranslateX, gesture, handleClose } = useSlideOverScreen({ visible, onClose });
  const [legalDoc, setLegalDoc] = useState(null);

  const openPrivacy = useCallback(() => setLegalDoc(PRIVACY_POLICY), []);
  const openTerms = useCallback(() => setLegalDoc(TERMS_OF_SERVICE), []);
  const openAccessibility = useCallback(() => setLegalDoc(ACCESSIBILITY_STATEMENT), []);
  const closeLegal = useCallback(() => setLegalDoc(null), []);

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
          <Text style={st.headerTitle}>About Sureva</Text>
        </View>

        <ScrollView style={st.scroll} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={st.hero}>
            <Image source={require('../assets/sureva-logo.png')} style={st.logo} resizeMode="contain" />
            <Text style={st.appName}>Sureva</Text>
            <Text style={st.version}>Version {APP_VERSION}</Text>
          </View>

          <Text style={st.mission}>
            Sunburn is a silent failure: by the time you feel it, the damage is already done.
            Sureva exists to close that gap: a wearable that tracks the real conditions on your
            skin (UV, heat, humidity, sweat, water) and tells you the moment your protection
            actually runs out, instead of leaving you to guess or wait for the 2-hour rule of
            thumb to catch up with reality.
          </Text>
          <Text style={st.mission}>
            Every number Sureva shows you (Skin Age, MED dose, factor breakdowns) is built on
            published dermatology and photobiology research, not invented heuristics. We'd rather
            be conservative and wrong in your favor than confident and wrong against you.
          </Text>

          <Text style={st.sectionHeading}>LEGAL</Text>
          <View style={st.card}>
            <AboutRow label="Privacy Policy" onPress={openPrivacy} />
            <AboutRow label="Terms of Service" onPress={openTerms} />
            <AboutRow label="Accessibility Statement" isLast onPress={openAccessibility} />
          </View>

          <Text style={st.footer}>© 2026 Sureva, Inc. All rights reserved.</Text>
        </ScrollView>
      </SafeAreaView>

      <LegalDocumentModal visible={legalDoc !== null} document={legalDoc} onClose={closeLegal} />
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
    paddingTop: 8,
    paddingBottom: 48,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 24,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 14,
  },
  appName: {
    fontFamily: 'Outfit-Regular',
    fontSize: 26,
    color: colors.ink,
    letterSpacing: -0.6,
  },
  version: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.muted,
    marginTop: 4,
  },
  mission: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14.5,
    color: colors.inkMid,
    lineHeight: 22,
    marginBottom: 14,
  },
  sectionHeading: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 12,
    marginLeft: 4,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    color: colors.ink,
  },
  chevron: {
    fontSize: 20,
    color: colors.muted,
    lineHeight: 22,
  },
  footer: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 28,
  },
});
