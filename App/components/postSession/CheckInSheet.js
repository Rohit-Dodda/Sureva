import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated, Dimensions, Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import SupabaseService from '../../services/SupabaseService';
import { useAuth } from '../../context/AuthContext';
import {
  SKIN_FEEL_AFTER_OPTIONS,
  SKIN_FEEL_BEFORE_OPTIONS,
  buildPostSessionRecord,
} from '../../services/PostSessionService';
import CheckInOptionList from './CheckInOptionList';
import CheckInFeedbackInput from './CheckInFeedbackInput';
import PressableScale from '../PressableScale';

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_H = Math.round(SCREEN_H * 0.82); // tall bottom sheet
const TOTAL = 3;

const QUESTIONS = [
  {
    headline: 'How does your skin feel after this session?',
    subline: "This helps Sureva understand how accurate today's protection was.",
  },
  {
    headline: 'How did your skin feel going into this session?',
    subline: 'This helps Sureva calibrate your personal sensitivity for today.',
  },
  {
    headline: 'Any feedback for Sureva?',
    subline: 'Optional — tell us anything about today that we should know.',
  },
];

// Piece 3 — the post-session check-in, styled as a tall survey sheet:
// centered title, a "Question N / 03" header, lettered answer cards, and a
// pinned action button. One question at a time; not dismissable by drag —
// only Done or the explicit "Skip check-in" link closes it.
export default function CheckInSheet({ session, previousSkinFeelAfter, onDismiss }) {
  const { user } = useAuth();
  const translateY = useRef(new Animated.Value(SHEET_H)).current;
  const enter = useRef(new Animated.Value(1)).current; // per-question slide/fade
  const dir = useRef(1); // 1 = forward, -1 = back
  const firstRun = useRef(true);
  const [step, setStep] = useState(0);
  const [skinFeelAfter, setSkinFeelAfter] = useState(null);
  const [skinFeelBefore, setSkinFeelBefore] = useState(null);
  const [feedback, setFeedback] = useState('');

  // Completion animation state: the form fades out, a checkmark pops into
  // a ring, "Thank you!" fades in, then the whole sheet scales + fades away.
  const [completed, setCompleted] = useState(false);
  const formFade = useRef(new Animated.Value(1)).current;
  const success = useRef(new Animated.Value(0)).current;
  const sheetScale = useRef(new Animated.Value(1)).current;
  const sheetOpacity = useRef(new Animated.Value(1)).current;
  const backdropOpacity = useRef(new Animated.Value(1)).current;
  const doneTimer = useRef(null);

  useEffect(() => {
    Animated.spring(translateY, { toValue: 0, tension: 150, friction: 22, useNativeDriver: true }).start();
    return () => clearTimeout(doneTimer.current);
  }, [translateY]);

  // Slide + fade each time the question changes (direction-aware).
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    enter.setValue(0);
    Animated.timing(enter, { toValue: 1, duration: 240, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [step, enter]);

  const persist = useCallback((answers) => {
    // Session-level storage only — modifiers never touch the profile
    // baseline. Failures are silent; the check-in never blocks the UI.
    const sessionMeta = {
      // MOCK context fields — TODO: pass the real completed session's
      // conditions/depletion metadata once live sessions are wired.
      sessionId: session.id,
      date: session.dateISO ?? session.date,
      environment: session.environment,
      peakUV: session.peakUV,
      score: session.score,
      spf: session.spf,
      durationMinutes: session.durationMinutes,
    };
    const record = buildPostSessionRecord(answers, sessionMeta, {
      previousSkinFeelAfter,
      sessionId: session.id,
      sessionDate: session.dateISO ?? session.date,
    });
    SupabaseService.savePostSessionCheckIn(user?.id, session.id, record).catch(() => {});
  }, [session, previousSkinFeelAfter, user]);

  const close = useCallback((answers) => {
    persist(answers);
    Animated.timing(translateY, { toValue: SHEET_H, duration: 240, useNativeDriver: true }).start(onDismiss);
  }, [persist, translateY, onDismiss]);

  const handleNext = useCallback(() => { dir.current = 1; setStep((s) => s + 1); }, []);
  const handleBack = useCallback(() => { dir.current = -1; setStep((s) => Math.max(0, s - 1)); }, []);

  // Finish: persist, then play the checkmark completion sequence before
  // dismissing (no slide-down — the box eases away into the check).
  const handleDone = useCallback(() => {
    persist({ skinFeelAfter, skinFeelBefore, userFeedback: feedback.trim() || null });
    setCompleted(true);
    Animated.timing(formFade, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    Animated.sequence([
      Animated.delay(120),
      Animated.spring(success, { toValue: 1, tension: 110, friction: 7, useNativeDriver: true }),
    ]).start();
    doneTimer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(sheetScale, { toValue: 0.9, duration: 340, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(sheetOpacity, { toValue: 0, duration: 340, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 340, useNativeDriver: true }),
      ]).start(onDismiss);
    }, 1300);
  }, [persist, skinFeelAfter, skinFeelBefore, feedback, formFade, success, sheetScale, sheetOpacity, backdropOpacity, onDismiss]);
  const handleSkip = useCallback(() => {
    // Unanswered questions are stored as null.
    close({
      skinFeelAfter: step > 0 ? skinFeelAfter : null,
      skinFeelBefore: step > 1 ? skinFeelBefore : null,
      userFeedback: null,
    });
  }, [close, step, skinFeelAfter, skinFeelBefore]);

  const q = QUESTIONS[step];
  const isLast = step === TOTAL - 1;
  const nextEnabled = step === 0 ? skinFeelAfter != null : step === 1 ? skinFeelBefore != null : true;
  const ctaLabel = isLast ? 'Done' : 'Next';
  const onCta = isLast ? handleDone : handleNext;

  const contentStyle = {
    opacity: enter,
    transform: [{ translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [dir.current * 36, 0] }) }],
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Dim the detail behind; deliberately NOT tappable-to-dismiss. */}
      <Animated.View style={[st.backdrop, { opacity: backdropOpacity }]} />
      <View style={st.avoider} pointerEvents="box-none">
        <Animated.View
          style={[st.sheet, {
            opacity: sheetOpacity,
            transform: [{ translateY }, { scale: sheetScale }],
          }]}
        >
          {/* Success overlay — checkmark ring + Thank you. */}
          {completed && (
            <View style={st.successOverlay} pointerEvents="none">
              <View style={st.checkWrap}>
                <Animated.View
                  style={[st.ring, {
                    opacity: success.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.45, 0.22, 0] }),
                    transform: [{ scale: success.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.8] }) }],
                  }]}
                />
                <Animated.View style={[st.checkCircle, { transform: [{ scale: success }] }]}>
                  <Ionicons name="checkmark" size={46} color={colors.white} />
                </Animated.View>
              </View>
              <Animated.Text
                style={[st.thankYou, {
                  opacity: success.interpolate({ inputRange: [0.4, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
                  transform: [{ translateY: success.interpolate({ inputRange: [0.4, 1], outputRange: [10, 0], extrapolate: 'clamp' }) }],
                }]}
              >
                Thank you!
              </Animated.Text>
              <Animated.Text
                style={[st.thankSub, {
                  opacity: success.interpolate({ inputRange: [0.55, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
                }]}
              >
                Your check-in helps Sureva learn your skin.
              </Animated.Text>
            </View>
          )}

          <Animated.View style={[st.form, { opacity: formFade }]} pointerEvents={completed ? 'none' : 'auto'}>
          {/* Header — centered title + hairline divider (no close button). */}
          <View style={st.header}>
            {step > 0 && (
              <TouchableOpacity
                style={st.backBtn}
                onPress={handleBack}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="chevron-back" size={22} color={colors.ink} />
              </TouchableOpacity>
            )}
            <Text style={st.headerTitle}>Session Check-In</Text>
          </View>
          <View style={st.divider} />

          <Animated.View style={[st.content, contentStyle]}>
            <View style={st.progressRow}>
              <Text style={st.progressLabel}>Question {step + 1}</Text>
              <Text style={st.progressFrac}>
                <Text style={st.progressCur}>{String(step + 1).padStart(2, '0')}</Text>
                {` / ${String(TOTAL).padStart(2, '0')}`}
              </Text>
            </View>

            <Text style={st.headline}>{q.headline}</Text>
            <Text style={st.subline}>{q.subline}</Text>

            <ScrollView
              style={st.answerScroll}
              contentContainerStyle={st.answerScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {step === 0 && (
                <CheckInOptionList
                  options={SKIN_FEEL_AFTER_OPTIONS}
                  selected={skinFeelAfter}
                  onSelect={setSkinFeelAfter}
                />
              )}
              {step === 1 && (
                <CheckInOptionList
                  options={SKIN_FEEL_BEFORE_OPTIONS}
                  selected={skinFeelBefore}
                  onSelect={setSkinFeelBefore}
                />
              )}
              {step === 2 && <CheckInFeedbackInput value={feedback} onChange={setFeedback} />}
            </ScrollView>
          </Animated.View>

          {/* Pinned action button + skip link. */}
          <View style={st.footer}>
            <PressableScale
              containerStyle={st.ctaWrap}
              style={[st.cta, !nextEnabled && st.ctaDisabled]}
              onPress={nextEnabled ? onCta : undefined}
              disabled={!nextEnabled}
            >
              <Text style={st.ctaLabel}>{ctaLabel}</Text>
              <Ionicons
                name={isLast ? 'checkmark-circle' : 'arrow-forward-circle'}
                size={22}
                color={colors.white}
                style={st.ctaIcon}
              />
            </PressableScale>
            <TouchableOpacity
              style={st.skipBtn}
              onPress={handleSkip}
              hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
            >
              <Text style={st.skip}>Skip check-in</Text>
            </TouchableOpacity>
          </View>
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  avoider: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    height: SHEET_H,
    backgroundColor: colors.canvas,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 18,
    overflow: 'hidden',
  },
  form: {
    flex: 1,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    zIndex: 2,
  },
  checkWrap: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.orange,
  },
  checkCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  thankYou: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 26,
    color: colors.ink,
    letterSpacing: -0.6,
    marginTop: 24,
  },
  thankSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 6,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 16,
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 17,
    color: colors.orange,
    letterSpacing: -0.2,
  },
  backBtn: {
    position: 'absolute',
    left: 12,
    top: -2,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  content: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 22,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressLabel: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.6,
  },
  progressFrac: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 16,
    color: colors.muted,
  },
  progressCur: {
    color: colors.orange,
  },
  headline: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 17,
    lineHeight: 23,
    color: colors.ink,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subline: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
    marginBottom: 18,
  },
  answerScroll: {
    flex: 1,
  },
  answerScrollContent: {
    paddingBottom: 12,
  },
  footer: {
    paddingHorizontal: 22,
    paddingBottom: 28,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    gap: 12,
  },
  ctaWrap: {
    alignSelf: 'stretch',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.orange,
    borderRadius: 20,
    paddingVertical: 17,
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaDisabled: {
    backgroundColor: colors.orangeMid,
    shadowOpacity: 0,
  },
  ctaLabel: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 16,
    color: colors.white,
  },
  ctaIcon: {
    position: 'absolute',
    right: 20,
  },
  skipBtn: {
    alignSelf: 'center',
  },
  skip: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.muted,
  },
});
