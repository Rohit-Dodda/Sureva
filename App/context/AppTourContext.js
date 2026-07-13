import React, {
  createContext, useContext, useRef, useState, useCallback, useMemo, useEffect,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

const DONE_KEY_PREFIX = 'sureva_tour_done_';

// Scoped per-account, not per-device: without the uid, a "seen" flag from
// one account would silently suppress the tour for a different account
// signing in later on the same device. Exposed so a caller (e.g. a debug
// "force this tour every time" reset) can clear the same AsyncStorage key
// this module reads, without duplicating the prefix string.
export function tourDoneKey(id, uid) {
  return `${DONE_KEY_PREFIX}${id}_${uid}`;
}

// Drives the app-wide coach-mark tour system: a registry of spotlight
// targets (screens register their own element refs by key), which tour
// (if any) is currently running, and step navigation. Only one tour can
// run at a time — a milestone tour won't interrupt the welcome tour, and
// vice versa.
const AppTourContext = createContext(null);

export function AppTourProvider({ children, onNavigateTab }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  // Mirrored into a ref so the stable callbacks below always read the
  // current uid without needing it in their own dependency arrays.
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const targetsRef = useRef({}); // key -> ref object
  const [activeTour, setActiveTour] = useState(null); // { id, steps } | null
  const [stepIndex, setStepIndex] = useState(0);
  // The welcome tour drives the root tabs itself so it can walk through
  // each page; mirrored into a ref so the exposed callback is stable.
  const navigateToTabRef = useRef(onNavigateTab);
  navigateToTabRef.current = onNavigateTab;
  const navigateToTab = useCallback((key) => navigateToTabRef.current?.(key), []);
  // Mirrored every render so startTour can check "is one already running"
  // without needing activeTour in its own deps (which would otherwise
  // change its identity — and every consumer relying on it — every step).
  const activeTourRef = useRef(activeTour);
  activeTourRef.current = activeTour;

  const registerTarget = useCallback((key, ref) => {
    targetsRef.current[key] = ref;
    return () => {
      if (targetsRef.current[key] === ref) delete targetsRef.current[key];
    };
  }, []);

  const getTargetRef = useCallback((key) => targetsRef.current[key] || null, []);

  const finishTour = useCallback((id) => {
    const key = tourDoneKey(id, userIdRef.current);
    console.log('[tour] finishTour writing', key);
    AsyncStorage.setItem(key, '1')
      .then(() => console.log('[tour] finishTour wrote OK', key))
      .catch((e) => console.log('[tour] finishTour write FAILED', key, e?.message));
    setActiveTour(null);
    setStepIndex(0);
  }, []);

  // Only one tour runs at a time — first one to ask, wins. Returns
  // whether it actually started, so a caller that got blocked (e.g. a
  // milestone tour asking while the welcome tour is still up) knows to
  // treat itself as still-pending rather than silently giving up forever.
  const startTour = useCallback((id, steps) => {
    if (activeTourRef.current) return false;
    setStepIndex(0);
    setActiveTour({ id, steps });
    return true;
  }, []);

  const nextStep = useCallback(() => {
    setActiveTour((current) => {
      if (!current) return current;
      setStepIndex((i) => {
        if (i + 1 < current.steps.length) return i + 1;
        finishTour(current.id);
        return 0;
      });
      return current;
    });
  }, [finishTour]);

  const skipTour = useCallback(() => {
    setActiveTour((current) => {
      if (current) finishTour(current.id);
      return current;
    });
  }, [finishTour]);

  // Settings' "Replay App Tour" — clears the done flag so it reads as
  // fresh, then starts it immediately regardless of any prior state.
  const restartTour = useCallback((id, steps) => {
    AsyncStorage.removeItem(tourDoneKey(id, userIdRef.current)).catch(() => {});
    setStepIndex(0);
    setActiveTour({ id, steps });
  }, []);

  const value = useMemo(() => ({
    activeTour, stepIndex, userId,
    registerTarget, getTargetRef, navigateToTab,
    startTour, nextStep, skipTour, restartTour,
  }), [activeTour, stepIndex, userId, registerTarget, getTargetRef, navigateToTab, startTour, nextStep, skipTour, restartTour]);

  return <AppTourContext.Provider value={value}>{children}</AppTourContext.Provider>;
}

export function useAppTour() {
  return useContext(AppTourContext);
}

// Registers a spotlightable element's ref for the lifetime of the caller.
export function useTourTarget(key) {
  const ctx = useContext(AppTourContext);
  const ref = useRef(null);
  useEffect(() => {
    if (!ctx || !key) return undefined;
    return ctx.registerTarget(key, ref);
  }, [ctx, key]);
  return ref;
}

// Auto-starts a tour once `enabled` is true, unless it's already been
// seen (or skipped) before. If it's blocked because another tour is
// currently running, it doesn't give up — it retries the next time the
// active tour changes (including clearing to none), so a milestone tour
// that loses the race to the welcome tour still gets its turn once that
// one finishes, instead of being silently consumed.
export function useAutoStartTour(id, steps, enabled) {
  const ctx = useContext(AppTourContext);
  const doneRef = useRef(false);
  const activeTourId = ctx?.activeTour?.id ?? null;
  const userId = ctx?.userId ?? null;
  useEffect(() => {
    if (!ctx || !enabled || !userId || doneRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const key = tourDoneKey(id, userId);
        const done = await AsyncStorage.getItem(key);
        console.log('[tour] useAutoStartTour check', key, '-> done =', done);
        if (cancelled) return;
        if (done === '1') { doneRef.current = true; return; }
        const started = ctx.startTour(id, steps);
        console.log('[tour] useAutoStartTour startTour', id, '-> started =', started);
        if (started) doneRef.current = true;
      } catch (e) {
        console.log('[tour] useAutoStartTour AsyncStorage read FAILED', e?.message);
        // Can't confirm — leave it to retry on the next eligible change
        // rather than risk nagging on every render.
      }
    })();
    return () => { cancelled = true; };
  }, [ctx, id, enabled, steps, activeTourId, userId]);
}

export default AppTourContext;
