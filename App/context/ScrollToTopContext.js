import React, { createContext, useContext, useRef, useCallback, useMemo, useEffect } from 'react';

// Lets the tab bar ask the currently-visible screen to scroll back to the top
// when its tab is tapped again. Ref-based so registering a scroller never
// triggers a re-render.
const ScrollToTopContext = createContext({
  registerScroller: () => {},
  scrollToTop: () => {},
});

export function ScrollToTopProvider({ children }) {
  // key -> stack of scroll handlers. The last entry is the topmost visible
  // surface for that tab (e.g. a session-detail overlay above its list), so
  // it wins. When that overlay unmounts, the list underneath resumes.
  const scrollersRef = useRef({});

  const registerScroller = useCallback((key, fn) => {
    const stack = scrollersRef.current[key] || (scrollersRef.current[key] = []);
    stack.push(fn);
    return () => {
      const i = stack.indexOf(fn);
      if (i !== -1) stack.splice(i, 1);
    };
  }, []);

  const scrollToTop = useCallback((key) => {
    const stack = scrollersRef.current[key];
    stack?.[stack.length - 1]?.();
  }, []);

  const value = useMemo(
    () => ({ registerScroller, scrollToTop }),
    [registerScroller, scrollToTop]
  );

  return <ScrollToTopContext.Provider value={value}>{children}</ScrollToTopContext.Provider>;
}

// Registers a screen's scroll-to-top handler for the lifetime of the component.
// `scrollFn` should smoothly scroll that screen's list/scrollview to the top.
export function useScrollToTop(key, scrollFn) {
  const { registerScroller } = useContext(ScrollToTopContext);
  useEffect(() => {
    if (!key) return undefined;
    return registerScroller(key, scrollFn);
  }, [key, scrollFn, registerScroller]);
}

export default ScrollToTopContext;
