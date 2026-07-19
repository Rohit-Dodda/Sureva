import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
  PanResponder,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import Device3D from '../components/onboarding/Device3D';
import GradientText from '../components/GradientText';

const SLIDES = [
  {
    gesture: 'single',
    eyebrow: 'Single press',
    pattern: '1 PRESS',
    title: 'Reapplied?\nOne press.',
    body: 'When an alert is buzzing, a single press confirms you reapplied sunscreen. Your protection resets to 100% and the light and buzz stop instantly.',
    note: 'During an active alert',
  },
  {
    gesture: 'double',
    eyebrow: 'Double press',
    pattern: '2 PRESSES',
    title: 'Topped up\nearly?',
    body: 'With no alert active, double-press to log a proactive reapplication. The light pulses for 5 seconds, press once more to confirm, so a stray tap never resets your clock.',
  },
  {
    gesture: 'triple',
    eyebrow: 'Triple press',
    pattern: '3 PRESSES',
    title: 'Done for\nthe day?',
    body: 'During a session, three presses ends it. The light flashes green three times to confirm your session data was saved.',
  },
  {
    gesture: 'hold',
    eyebrow: 'Hold 5 seconds',
    pattern: 'HOLD 5S',
    title: 'Need to\nreconnect?',
    body: 'Press and hold for five seconds to enter pairing mode. The light pulses blue while your device is discoverable.',
    note: 'Hold without releasing',
  },
  {
    gesture: 'intro',
    eyebrow: "You're ready",
    title: 'All set!',
    body: "That's the whole device. One button, four actions, and Sureva handles the rest, tracking your sun, your sunscreen, and your skin in the background. You can revisit these instructions anytime from your home screen.",
  },
];

// ── A block that slides in from the side on each step ───────────
function SlideText({ children, dir }) {
  const x = useRef(new Animated.Value(dir >= 0 ? 44 : -44)).current;
  const o = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(x, { toValue: 0, tension: 56, friction: 10, useNativeDriver: true }),
      Animated.timing(o, { toValue: 1, duration: 420, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.slideIn, { opacity: o, transform: [{ translateX: x }] }]}>
      {children}
    </Animated.View>
  );
}

export default function DeviceOnboardingScreen({ onComplete }) {
  const [phase, setPhase] = useState('intro'); // 'intro' | 'walk'
  const [step, setStep] = useState(0);
  const dirRef = useRef(1);
  const spin = phase === 'intro' ? 0 : step + 1;

  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;
  const heroGesture = phase === 'intro' ? 'intro' : slide.gesture;

  const btnScale = useRef(new Animated.Value(1)).current;

  const beginWalk = useCallback(() => {
    dirRef.current = 1;
    setStep(0);
    setPhase('walk');
  }, []);

  const handleNext = useCallback(() => {
    if (isLast) { onComplete && onComplete(); return; }
    dirRef.current = 1;
    setStep((s) => s + 1);
  }, [isLast, onComplete]);

  const handleBack = useCallback(() => {
    if (phase === 'walk' && step === 0) { setPhase('intro'); return; }
    if (step === 0) return;
    dirRef.current = -1;
    setStep((s) => s - 1);
  }, [phase, step]);

  const onPressIn = useCallback(() => {
    Animated.spring(btnScale, { toValue: 0.96, tension: 120, friction: 6, useNativeDriver: true }).start();
  }, []);
  const onPressOut = useCallback(() => {
    Animated.spring(btnScale, { toValue: 1, tension: 100, friction: 5, useNativeDriver: true }).start();
  }, []);

  const showBack = phase === 'walk';

  // Swipe left/right through the slides — scoped to the text/footer area
  // only (not the hero above), since Device3D's own PanResponder already
  // claims horizontal drags there to spin the device model.
  // Deliberately NOT wrapped in useRef: PanResponder.create's callbacks
  // would freeze whatever `phase`/handleNext/handleBack were at mount,
  // going stale after the first swipe since those change with step/phase.
  // Recreating it each render (cheap) keeps the closures current.
  const swipeResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) =>
      Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderRelease: (_, g) => {
      if (Math.abs(g.dx) < 40) return;
      if (g.dx < 0) {
        if (phase === 'intro') beginWalk();
        else handleNext();
      } else {
        handleBack();
      }
    },
  });

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />

      {/* top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={handleBack}
          activeOpacity={0.7}
          disabled={!showBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={showBack ? colors.ink : 'transparent'} />
        </TouchableOpacity>
        <Text style={styles.eyebrow}>
          {(phase === 'intro' ? 'Welcome' : slide.eyebrow).toUpperCase()}
        </Text>
        <TouchableOpacity style={styles.skipBtn} onPress={onComplete} activeOpacity={0.7}>
          <Text style={styles.skipText}>{isLast && phase === 'walk' ? '' : 'Skip'}</Text>
        </TouchableOpacity>
      </View>

      {/* persistent 3D hero — re-spins whenever `spin` changes */}
      <View style={styles.hero}>
        <Device3D gesture={heroGesture} spinTrigger={spin} />
      </View>

      {/* body content + footer — swipeable left/right through the slides.
          Scoped to here (not the hero above) so it doesn't fight
          Device3D's own drag-to-rotate gesture. */}
      <View style={{ flex: 1 }} {...swipeResponder.panHandlers}>
        {phase === 'intro' ? (
          <View style={styles.textArea}>
            <SlideText key="intro" dir={-1}>
              <Text style={styles.titleLine}>Meet your</Text>
              <GradientText style={styles.titleLine}>Sureva.</GradientText>
              <Text style={[styles.body, styles.introBody]}>
                One button does it all. Let's walk through what each press does, one by one.
              </Text>
            </SlideText>
          </View>
        ) : (
          <View style={styles.textArea}>
            <SlideText key={step} dir={dirRef.current}>
              {slide.pattern ? (
                <View style={styles.patternChip}>
                  <Text style={styles.patternText}>{slide.pattern}</Text>
                </View>
              ) : null}
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.body}>{slide.body}</Text>
              {slide.note ? (
                <View style={styles.noteRow}>
                  <View style={styles.noteDot} />
                  <Text style={styles.noteText}>{slide.note}</Text>
                </View>
              ) : null}
            </SlideText>
          </View>
        )}

        {/* footer */}
        <View style={styles.footer}>
          {phase === 'walk' ? (
            <View style={styles.dots}>
              {SLIDES.map((_, i) => (
                <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
              ))}
            </View>
          ) : (
            <View style={styles.dotsSpacer} />
          )}

          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={phase === 'intro' ? beginWalk : handleNext}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
            >
              <LinearGradient
                colors={[colors.gradOrangeStart, colors.gradOrangeEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cta}
              >
                <Text style={styles.ctaText}>
                  {phase === 'intro' ? 'Understand what it does' : isLast ? 'Enter Sureva' : 'Next'}
                </Text>
                {!(phase === 'walk' && isLast) ? (
                  <Ionicons name="arrow-forward" size={18} color={colors.white} style={styles.ctaIcon} />
                ) : null}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  topBar: {
    height: 48,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 64,
    height: 40,
    justifyContent: 'center',
  },
  eyebrow: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    letterSpacing: 1.4,
    color: colors.muted,
  },
  skipBtn: {
    width: 64,
    height: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  skipText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.muted,
  },
  hero: {
    height: 300,
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  textArea: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 4,
  },
  titleLine: {
    fontFamily: 'Outfit-Regular',
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: -1.2,
    color: colors.ink,
  },
  introBody: {
    marginTop: 16,
  },
  slideIn: {
    alignItems: 'flex-start',
  },
  patternChip: {
    backgroundColor: colors.charcoal,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 16,
  },
  patternText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    letterSpacing: 1.6,
    color: colors.white,
  },
  title: {
    fontFamily: 'Outfit-Regular',
    fontSize: 33,
    lineHeight: 38,
    letterSpacing: -1,
    color: colors.ink,
    marginBottom: 12,
  },
  body: {
    fontFamily: 'Outfit-Regular',
    fontSize: 16,
    lineHeight: 25,
    color: colors.muted,
    maxWidth: 340,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  noteDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.orange,
    marginRight: 9,
  },
  noteText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.inkMid,
    letterSpacing: 0.1,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 36,
    paddingTop: 8,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginBottom: 22,
  },
  dotsSpacer: {
    height: 7,
    marginBottom: 22,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.orange,
  },
  cta: {
    height: 58,
    borderRadius: 29,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 5,
  },
  ctaText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 17,
    color: colors.white,
    letterSpacing: 0.2,
  },
  ctaIcon: {
    marginLeft: 8,
  },
});
