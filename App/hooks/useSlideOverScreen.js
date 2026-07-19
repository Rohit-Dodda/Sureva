import { useRef, useCallback, useEffect } from 'react';
import { Animated, Dimensions, Easing } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';

const SCREEN_W = Dimensions.get('window').width;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
// Matches SessionDetailScreen's proven-feel swipe-back threshold — a
// fixed pixel distance, not a fraction of screen width.
const SWIPE_DISMISS_THRESHOLD = 80;
const SWIPE_DISMISS_VELOCITY = 500; // px/s — gesture-handler reports velocity per second, not per ms

// Shared slide-in-from-right / swipe-right-to-dismiss behavior for every
// full-screen settings sub-page (Profile, Help & Support, About Sureva,
// Notifications, Skin Profile).
//
// This used to be a plain RN PanResponder, which only negotiates with
// OTHER JS responders (like a Pressable, which claims responder on touch
// down) — it can't reliably win a gesture that starts over the page's
// ScrollView, since the ScrollView's own NATIVE pan recognizer claims
// those touches first and a JS-only capture request can't dependably
// steal from an already-engaged native recognizer. That's exactly why
// swiping over a "box" (a Pressable) worked but swiping over plain text
// or background (bare ScrollView content) didn't.
// react-native-gesture-handler's Pan gesture runs natively alongside the
// ScrollView's own recognizer, so activeOffsetX/failOffsetY let it
// genuinely coordinate — claim clearly-horizontal drags, yield to
// clearly-vertical ones — regardless of what's under the finger.
export function useSlideOverScreen({ visible, onClose }) {
  const slideAnim = useRef(new Animated.Value(SCREEN_W)).current;
  const dragX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    Animated.timing(slideAnim, { toValue: 0, duration: 320, easing: EASE_OUT, useNativeDriver: true }).start();
  }, [visible, slideAnim]);

  const handleClose = useCallback(() => {
    Animated.timing(slideAnim, { toValue: SCREEN_W, duration: 260, easing: EASE_OUT, useNativeDriver: true }).start(() => onClose());
  }, [onClose, slideAnim]);

  const gesture = Gesture.Pan()
    // Only activates once the drag is clearly rightward-horizontal...
    .activeOffsetX(10)
    // ...bails immediately if it's actually leftward...
    .failOffsetX(-10)
    // ...and yields to the ScrollView for anything more vertical than this.
    .failOffsetY([-15, 15])
    .onUpdate((e) => {
      if (e.translationX > 0) dragX.setValue(e.translationX);
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_DISMISS_THRESHOLD || e.velocityX > SWIPE_DISMISS_VELOCITY) {
        Animated.timing(dragX, { toValue: SCREEN_W, duration: 240, easing: EASE_OUT, useNativeDriver: true }).start(() => {
          slideAnim.setValue(SCREEN_W);
          dragX.setValue(0);
          onClose();
        });
      } else {
        Animated.spring(dragX, { toValue: 0, tension: 140, friction: 10, useNativeDriver: true }).start();
      }
    });

  const screenTranslateX = Animated.add(slideAnim, dragX);

  return { screenTranslateX, gesture, handleClose };
}
