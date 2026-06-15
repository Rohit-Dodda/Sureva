import React, { createContext, useContext, useRef, useCallback, useMemo } from 'react';

// Lets full-screen overlays (e.g. a session detail page) temporarily disable
// the root tab-swipe gesture so their own swipe-back motion is the only one
// that fires. Ref-based so toggling it never triggers a re-render.
const SwipeNavContext = createContext({
  lockTabSwipe: () => {},
  unlockTabSwipe: () => {},
});

export function SwipeNavProvider({ lockRef, children }) {
  const lockTabSwipe = useCallback(() => {
    lockRef.current += 1;
  }, [lockRef]);

  const unlockTabSwipe = useCallback(() => {
    lockRef.current = Math.max(0, lockRef.current - 1);
  }, [lockRef]);

  const value = useMemo(
    () => ({ lockTabSwipe, unlockTabSwipe }),
    [lockTabSwipe, unlockTabSwipe]
  );

  return <SwipeNavContext.Provider value={value}>{children}</SwipeNavContext.Provider>;
}

// Locks the tab swipe for the lifetime of the calling component.
export function useTabSwipeLock(active = true) {
  const { lockTabSwipe, unlockTabSwipe } = useContext(SwipeNavContext);
  React.useEffect(() => {
    if (!active) return undefined;
    lockTabSwipe();
    return unlockTabSwipe;
  }, [active, lockTabSwipe, unlockTabSwipe]);
}

export default SwipeNavContext;
