import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

// Lets full-screen flows (e.g. the post-session check-in) hide the
// floating tab bar while they own the screen, so it can't overlap or
// block their controls. Count-based like the tab-swipe lock, so nested
// overlays compose safely.
const TabBarVisibilityContext = createContext({
  acquire: () => {},
  release: () => {},
  hidden: false,
});

export function TabBarVisibilityProvider({ children }) {
  const [count, setCount] = useState(0);
  const acquire = useCallback(() => setCount((c) => c + 1), []);
  const release = useCallback(() => setCount((c) => Math.max(0, c - 1)), []);
  const value = useMemo(() => ({ acquire, release, hidden: count > 0 }), [acquire, release, count]);
  return (
    <TabBarVisibilityContext.Provider value={value}>{children}</TabBarVisibilityContext.Provider>
  );
}

// Hides the tab bar for as long as `active` is true (and the caller is mounted).
export function useHideTabBar(active = true) {
  const { acquire, release } = useContext(TabBarVisibilityContext);
  React.useEffect(() => {
    if (!active) return undefined;
    acquire();
    return release;
  }, [active, acquire, release]);
}

export function useTabBarHidden() {
  return useContext(TabBarVisibilityContext).hidden;
}

export default TabBarVisibilityContext;
