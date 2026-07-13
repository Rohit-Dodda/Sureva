import React, {
  createContext, useContext, useRef, useState, useCallback, useMemo,
} from 'react';
import { Animated, Easing } from 'react-native';

// How far (px) a downward drag from the profile bar has to travel for a
// full 0→1 reveal, and how far/fast it has to get before release commits
// to opening instead of springing back — same shape as the swipe-back
// gestures elsewhere in this app (SessionDetailScreen, SkinAgeScreen).
const OPEN_DRAG_DISTANCE = 90;
const OPEN_PROGRESS_THRESHOLD = 0.38;
const OPEN_VELOCITY_THRESHOLD = 0.5;
// Springy but tuned for ONE clean overshoot (damping ratio ~0.52) rather
// than several fading oscillations. The gesture's release velocity is fed
// in on commit so a flick carries straight through into the bounce.
//
// useNativeDriver is FALSE on purpose here: the drag tracks the finger via
// reveal.setValue (a JS-thread update), and if the release spring then ran
// on the native driver, RN would have to migrate the value across threads
// mid-animation — that migration was the frozen "pause" in the middle of
// the bounce. Keeping the whole lifecycle (drag + spring) on the JS driver
// removes the handoff entirely, so it's one continuous motion.
const OPEN_SPRING = { stiffness: 200, damping: 19, mass: 1, useNativeDriver: false };
// Ceiling on the release velocity fed into the spring, so even a hard
// flick can't overshoot far enough to push the panel off the top edge.
const MAX_OPEN_VELOCITY = 5;
const CLOSE_EASE = Easing.bezier(0.23, 1, 0.32, 1);

// Swiping up from the empty backdrop mirrors the open gesture in reverse.
const CLOSE_DRAG_DISTANCE = 90;
const CLOSE_PROGRESS_THRESHOLD = 0.3;
const CLOSE_VELOCITY_THRESHOLD = 0.5;

// Drives the Quick Search overlay (backdrop + panel reveal, open/close,
// gesture tracking) and doubles as the registry nested screens use to
// expose an "open me" callback — the same key-based registration pattern
// ScrollToTopContext uses for scroll handlers, just for openers instead.
const QuickSearchContext = createContext(null);

export function QuickSearchProvider({ activeTab, setActiveTab, children }) {
  const reveal = useRef(new Animated.Value(0)).current;
  const [isOpen, setIsOpen] = useState(false);
  const gestureActive = useRef(false);
  const openersRef = useRef({});
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const setActiveTabRef = useRef(setActiveTab);
  setActiveTabRef.current = setActiveTab;

  // Focusing the search input is done through a registered ref, NOT a state
  // bump. A state change here would re-render the whole overlay (results
  // list and all) at the exact moment the open spring starts, and since
  // that spring runs on the JS thread, the render blocks it for a frame or
  // two — which was the pause in the middle of the bounce. Firing focus via
  // a ref keeps the entire open path free of re-renders.
  const focusHandlerRef = useRef(null);
  const setFocusHandler = useCallback((fn) => { focusHandlerRef.current = fn; }, []);
  const scheduleFocus = useCallback(() => {
    // Late enough that the keyboard's slide-up never overlaps the bounce.
    setTimeout(() => focusHandlerRef.current?.(), 340);
  }, []);

  const registerOpener = useCallback((key, fn) => {
    openersRef.current[key] = fn;
    return () => {
      if (openersRef.current[key] === fn) delete openersRef.current[key];
    };
  }, []);

  const closeSearch = useCallback(() => {
    gestureActive.current = false;
    // Same JS driver as the open path — reveal must never mix drivers.
    Animated.timing(reveal, { toValue: 0, duration: 220, easing: CLOSE_EASE, useNativeDriver: false })
      .start(() => setIsOpen(false));
  }, [reveal]);

  const openSearch = useCallback(() => {
    setIsOpen(true);
    Animated.spring(reveal, { toValue: 1, ...OPEN_SPRING }).start();
    scheduleFocus();
  }, [reveal, scheduleFocus]);

  // The profile-bar PanResponder drives these three directly during the
  // drag, tracking the finger 1:1 like the app's other swipe gestures.
  const onGestureStart = useCallback(() => {
    gestureActive.current = true;
    reveal.setValue(0);
    setIsOpen(true);
  }, [reveal]);

  const onGestureMove = useCallback((dy) => {
    if (!gestureActive.current) return;
    reveal.setValue(Math.max(0, Math.min(1, dy / OPEN_DRAG_DISTANCE)));
  }, [reveal]);

  const onGestureEnd = useCallback((dy, vy) => {
    if (!gestureActive.current) return;
    gestureActive.current = false;
    const progress = dy / OPEN_DRAG_DISTANCE;
    if (progress > OPEN_PROGRESS_THRESHOLD || vy > OPEN_VELOCITY_THRESHOLD) {
      // Carry the finger's velocity into the spring (gesture vy is px/ms,
      // normalized here into reveal-units/s) so the bounce continues the
      // flick rather than restarting from a standstill.
      const velocity = Math.min(MAX_OPEN_VELOCITY, (vy * 1000) / OPEN_DRAG_DISTANCE);
      Animated.spring(reveal, { toValue: 1, velocity, ...OPEN_SPRING }).start();
      scheduleFocus();
    } else {
      Animated.timing(reveal, { toValue: 0, duration: 180, easing: CLOSE_EASE, useNativeDriver: false })
        .start(() => setIsOpen(false));
    }
  }, [reveal, scheduleFocus]);

  // Swipe-up-to-dismiss on the empty backdrop — tracks the finger 1:1 like
  // the open gesture, in reverse. Not committing (a short drag that falls
  // back short of the threshold) springs back to fully open rather than
  // leaving it half-shut.
  const onClosingGestureMove = useCallback((dy) => {
    reveal.setValue(Math.max(0, Math.min(1, 1 + dy / CLOSE_DRAG_DISTANCE)));
  }, [reveal]);

  const onClosingGestureEnd = useCallback((dy, vy) => {
    const draggedUp = -dy / CLOSE_DRAG_DISTANCE;
    if (draggedUp > CLOSE_PROGRESS_THRESHOLD || vy < -CLOSE_VELOCITY_THRESHOLD) {
      closeSearch();
    } else {
      Animated.spring(reveal, { toValue: 1, ...OPEN_SPRING }).start();
    }
  }, [reveal, closeSearch]);

  // Closes the overlay, then hands off to the tab it lives on. Nested
  // screens (Settings, Trends, Passport, Skin Age) get a short extra beat
  // so their own push-in plays after the tab pager has visibly landed,
  // instead of both animations fighting for attention at once.
  const navigateTo = useCallback((destination) => {
    const tabChanging = destination.tab !== activeTabRef.current;
    closeSearch();
    setActiveTabRef.current?.(destination.tab);
    if (destination.opener) {
      setTimeout(() => openersRef.current[destination.opener]?.(), tabChanging ? 320 : 0);
    }
  }, [closeSearch]);

  const value = useMemo(() => ({
    reveal, isOpen, setFocusHandler,
    openSearch, closeSearch,
    onGestureStart, onGestureMove, onGestureEnd,
    onClosingGestureMove, onClosingGestureEnd,
    registerOpener, navigateTo,
  }), [
    reveal, isOpen, setFocusHandler, openSearch, closeSearch,
    onGestureStart, onGestureMove, onGestureEnd,
    onClosingGestureMove, onClosingGestureEnd, registerOpener, navigateTo,
  ]);

  return <QuickSearchContext.Provider value={value}>{children}</QuickSearchContext.Provider>;
}

export function useQuickSearch() {
  return useContext(QuickSearchContext);
}

// Registers a screen's "open me" callback for the lifetime of the
// component, keyed to match an entry's `opener` in searchIndex.
export function useRegisterOpener(key, fn) {
  const ctx = useContext(QuickSearchContext);
  React.useEffect(() => {
    if (!ctx || !key) return undefined;
    return ctx.registerOpener(key, fn);
  }, [ctx, key, fn]);
}

export default QuickSearchContext;
