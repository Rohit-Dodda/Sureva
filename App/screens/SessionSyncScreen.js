import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import colors from '../constants/colors';

const PHRASES = [
  'Syncing session data',
  'Analyzing your UV exposure',
  'Calculating protection accuracy',
  'Building your session summary',
  'Almost ready',
];
const PHRASE_HOLD_MS = 1800;
const PHRASE_FADE_MS = 350;
const PHRASE_VISIBLE_MS = PHRASE_HOLD_MS - PHRASE_FADE_MS;

// ─── Geometry ──────────────────────────────────────────────────────
// The rendered HyperFrames loop (videos/sureva-sun-bounce) is a 1200×760
// canvas — the sun visiting each letter and landing back in the "u". The
// visible content (sun hop zone + word) only spans the middle of that
// canvas (from y=150 to y=499.5 of 760), so the raw video frame carries a
// lot of blank space above and below it that would otherwise throw off
// how the group centers on the page.
const SCREEN_W = Dimensions.get('window').width;
const VIDEO_W = Math.min(460, SCREEN_W - 24);
const VIDEO_H = Math.round((VIDEO_W * 760) / 1200);
const CONTENT_TOP_RATIO = 150 / 760;
const CONTENT_BOTTOM_RATIO = 499.5 / 760;
// Trim the blank top out of layout (small gap kept above the sun) so the
// centered block starts at the visible content, not the raw frame edge.
const VIDEO_TOP_TRIM = -Math.round(VIDEO_H * CONTENT_TOP_RATIO) + 10;
// Pull the phrase zone up out of the blank bottom so it reads as sitting
// just under the word instead of under the whole video frame.
const PHRASE_ZONE_OFFSET = -Math.round(VIDEO_H * (1 - CONTENT_BOTTOM_RATIO)) + 14;

// Piece 1 — the post-session syncing screen. The rendered wordmark loop
// plays (sun visits every letter, lands back in the "u") while the phrases
// cycle (~9s), then the screen fades to reveal the session detail. Not
// skippable.
export default function SessionSyncScreen({ onComplete }) {
  const [idx, setIdx] = useState(0);
  const phraseOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  const player = useVideoPlayer(require('../assets/sureva-loading.mp4'), (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  // Phrase timeline: fade in, hold, fade all the way out — then either swap
  // the text in for the next phrase, or (on the last one) fade the screen.
  useEffect(() => {
    Animated.timing(phraseOpacity, { toValue: 1, duration: PHRASE_FADE_MS, useNativeDriver: true }).start();

    const isLast = idx >= PHRASES.length - 1;
    const t = setTimeout(() => {
      if (isLast) {
        Animated.timing(screenOpacity, { toValue: 0, duration: 500, useNativeDriver: true }).start(onComplete);
        return;
      }
      Animated.timing(phraseOpacity, { toValue: 0, duration: PHRASE_FADE_MS, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setIdx((i) => i + 1);
      });
    }, PHRASE_VISIBLE_MS);
    return () => clearTimeout(t);
  }, [idx, phraseOpacity, screenOpacity, onComplete]);

  return (
    <Animated.View style={[st.root, { opacity: screenOpacity }]}>
      <View style={st.center}>
        <VideoView
          player={player}
          style={st.video}
          contentFit="contain"
          nativeControls={false}
          pointerEvents="none"
        />

        <View style={st.phraseZone}>
          <Animated.Text style={[st.phrase, { opacity: phraseOpacity }]}>
            {PHRASES[idx]}
          </Animated.Text>
        </View>
      </View>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.white,
    zIndex: 20,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: {
    width: VIDEO_W,
    height: VIDEO_H,
    marginTop: VIDEO_TOP_TRIM,
  },
  phraseZone: {
    height: 26,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: PHRASE_ZONE_OFFSET,
  },
  phrase: {
    fontFamily: 'Inter-Medium',
    fontSize: 15,
    color: colors.inkMid,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
});
