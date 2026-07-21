import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Pressable, Animated, Easing, Share,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import RecapCard from '../components/sunRecap/RecapCard';
import RecapProgressBar from '../components/sunRecap/RecapProgressBar';
import RecapMorphLayer from '../components/sunRecap/RecapMorphLayer';
import { RECAP_BODY } from '../components/sunRecap/recapAccent';

const AUTO_MS = 5200;       // reveal cards auto-advance after this
const POST_ANSWER_MS = 3600; // interactive cards, once engaged
const TAP_MAX_MS = 220;     // press shorter than this = a tap, longer = a hold

// Story-style recap player. Reveal cards auto-advance on an animated
// progress bar; tap the right/left to skip, hold to pause. Interactive
// cards (quiz/scratch/shake) pause the timer until you engage, then resume.
export default function SunRecapScreen({ visible, recap, onClose }) {
  const cards = recap?.cards ?? [];
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState({});
  const [showHint, setShowHint] = useState(true);

  const progress = useRef(new Animated.Value(0)).current;
  const animRef = useRef(null);
  const durRef = useRef(AUTO_MS);
  const pausedAt = useRef(0);
  const pressT0 = useRef(0);
  const deckRef = useRef(null);

  const card = cards[index];
  const prevCardRef = useRef(null);
  const isLast = index >= cards.length - 1;
  // Only quiz/scratch/shake gate the timer; reveal, bookend and bridge cards
  // all auto-advance.
  const interactive = card && ['quiz', 'scratch', 'shake'].includes(card.mechanic);
  const timerRunning = card && !isLast && (!interactive || answered[index]);

  const advance = useCallback(() => {
    setIndex((i) => (i >= cards.length - 1 ? i : i + 1));
  }, [cards.length]);

  const runFrom = useCallback((from) => {
    animRef.current?.stop();
    progress.setValue(from);
    const remaining = Math.max(200, durRef.current * (1 - from));
    animRef.current = Animated.timing(progress, {
      toValue: 1, duration: remaining, easing: Easing.linear, useNativeDriver: false,
    });
    animRef.current.start(({ finished }) => { if (finished) advance(); });
  }, [progress, advance]);

  // Drive the active segment: last card fills and stops; a gated interactive
  // card waits; everything else auto-advances.
  useEffect(() => {
    if (!visible || !card) return undefined;
    animRef.current?.stop();
    if (isLast) { progress.setValue(1); return undefined; }
    if (interactive && !answered[index]) { progress.setValue(0); return undefined; }
    durRef.current = interactive && answered[index] ? POST_ANSWER_MS : (card.durationMs ?? AUTO_MS);
    runFrom(0);
    return () => animRef.current?.stop();
  }, [index, answered, visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track the outgoing card so the morph layer can reshape its glyph into the
  // incoming card's. Updated after each index change; during a render for a
  // new index this still holds the previous card.
  useEffect(() => { prevCardRef.current = card; }, [index]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset when the modal opens.
  useEffect(() => {
    if (visible) { setIndex(0); setAnswered({}); setShowHint(true); }
  }, [visible]);

  useEffect(() => {
    if (!showHint) return undefined;
    const t = setTimeout(() => setShowHint(false), 3200);
    return () => clearTimeout(t);
  }, [showHint]);

  const goPrev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const onAnswered = useCallback(() => {
    setAnswered((m) => (m[index] ? m : { ...m, [index]: true }));
  }, [index]);

  const handleClose = useCallback(() => { animRef.current?.stop(); onClose?.(); }, [onClose]);

  const handleShare = useCallback(async () => {
    const msg = `My Sun Recap — ${recap?.dateRangeLabel ?? ''}: ${recap?.avgScore ?? ''} average protection score. (Sureva)`;
    try {
      const uri = await captureRef(deckRef, { format: 'png', quality: 1 });
      await Share.share({ url: uri, message: msg });
    } catch {
      try { await Share.share({ message: msg }); } catch { /* dismissed */ }
    }
  }, [recap]);

  // Tap zones: short press navigates, long press pauses the timer.
  const onZoneIn = useCallback(() => {
    pressT0.current = Date.now();
    if (timerRunning) { animRef.current?.stop(); progress.stopAnimation((v) => { pausedAt.current = v; }); }
  }, [timerRunning, progress]);

  const makeZoneOut = (dir) => () => {
    const held = Date.now() - pressT0.current;
    if (held < TAP_MAX_MS) {
      if (dir === 'next') advance(); else goPrev();
    } else if (timerRunning) {
      runFrom(pausedAt.current);
    }
  };

  if (!recap || !card) return null;

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen" onRequestClose={handleClose}>
      <View style={st.root}>
        <View ref={deckRef} collapsable={false} style={StyleSheet.absoluteFill}>
          <RecapCard card={card} active onAnswered={onAnswered} />
        </View>

        {/* Transition flourish: the previous card's signature glyph morphs
            into this card's. Kept outside deckRef so it never lands in a
            share capture. */}
        {index > 0 && (
          <RecapMorphLayer key={index} from={prevCardRef.current} to={card} />
        )}

        {/* Navigation / pause zones. Interactive cards keep their center free
            for the mechanic; reveal cards advance on a full-area tap. */}
        <View style={st.zones} pointerEvents="box-none">
          {interactive ? (
            <>
              <Pressable style={[st.zone, { width: '16%' }]} onPressIn={onZoneIn} onPressOut={makeZoneOut('prev')} />
              <View style={st.zoneSpacer} pointerEvents="box-none" />
              <Pressable style={[st.zone, { width: '16%' }]} onPressIn={onZoneIn} onPressOut={makeZoneOut('next')} />
            </>
          ) : (
            <>
              <Pressable style={[st.zone, { width: '30%' }]} onPressIn={onZoneIn} onPressOut={makeZoneOut('prev')} />
              <Pressable style={[st.zone, { flex: 1 }]} onPressIn={onZoneIn} onPressOut={makeZoneOut('next')} />
            </>
          )}
        </View>

        <SafeAreaView style={st.overlay} pointerEvents="box-none">
          <View style={st.top}>
            <RecapProgressBar count={cards.length} index={index} progress={progress} />
            <View style={st.topRow}>
              <TouchableOpacity style={st.iconBtn} onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
              <Text style={st.wordmark}>SUN RECAP · {recap.dateRangeLabel}</Text>
              <TouchableOpacity style={st.shareBtn} onPress={handleShare} activeOpacity={0.85}>
                <Ionicons name="share-outline" size={15} color="#fff" />
                <Text style={st.shareBtnText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showHint && index === 0 && (
            <View style={st.hint} pointerEvents="none">
              <Text style={st.hintText}>Tap to skip · Hold to pause</Text>
            </View>
          )}

          {isLast && (
            <View style={st.footer}>
              <TouchableOpacity style={st.bigShare} onPress={handleShare} activeOpacity={0.9}>
                <Ionicons name="share-outline" size={18} color={colors.charcoal} />
                <Text style={st.bigShareText}>Share your recap</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.doneBtn} onPress={handleClose} activeOpacity={0.85}>
                <Text style={st.doneText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.charcoal },
  zones: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
  zone: { height: '100%' },
  zoneSpacer: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'space-between' },
  top: { paddingHorizontal: 16, paddingTop: 8 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 10,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    flex: 1,
    fontFamily: RECAP_BODY,
    fontSize: 11,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 34,
    paddingHorizontal: 13,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  shareBtnText: {
    fontFamily: RECAP_BODY,
    fontSize: 13,
    color: '#fff',
  },
  hint: {
    position: 'absolute',
    top: 92,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  hintText: {
    fontFamily: RECAP_BODY,
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 10,
  },
  bigShare: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fff',
  },
  bigShareText: {
    fontFamily: RECAP_BODY,
    fontSize: 16,
    color: colors.charcoal,
  },
  doneBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  doneText: {
    fontFamily: RECAP_BODY,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
});
