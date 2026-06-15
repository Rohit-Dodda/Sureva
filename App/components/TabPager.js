import React, { useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, Animated, PanResponder, Dimensions } from 'react-native';

const SCREEN_W = Dimensions.get('window').width;
// Tuned to feel like iOS paging: settles quickly, carries flick momentum, no wobble.
const SPRING = { stiffness: 210, damping: 32, mass: 1, useNativeDriver: true };
// How far you must drag (or how fast you must flick) to commit to the next page.
const DISTANCE_THRESHOLD = SCREEN_W * 0.22;
const VELOCITY_THRESHOLD = 0.3;
// Resistance applied past the first/last page so the edges feel rubbery, not dead.
const RUBBER_BAND = 0.32;

// A horizontal paged carousel. All pages stay mounted side by side; the track
// tracks the finger 1:1 during a drag, then springs to the nearest page.
export default function TabPager({ tabs, activeIndex, onIndexChange, swipeLockRef }) {
  const pan = useRef(new Animated.Value(-activeIndex * SCREEN_W)).current;
  const indexRef = useRef(activeIndex);
  const lastPage = tabs.length - 1;

  const settle = useCallback(
    (rawIndex, velocity = 0) => {
      const next = Math.max(0, Math.min(lastPage, rawIndex));
      indexRef.current = next;
      Animated.spring(pan, {
        toValue: -next * SCREEN_W,
        velocity: velocity * 1000, // gesture vx is px/ms; spring wants px/s
        ...SPRING,
      }).start();
      onIndexChange(next);
    },
    [lastPage, onIndexChange, pan]
  );

  // Sync the track when the page changes from outside the gesture (tab bar tap).
  useEffect(() => {
    if (activeIndex === indexRef.current) return;
    settle(activeIndex);
  }, [activeIndex, settle]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        swipeLockRef.current === 0 &&
        Math.abs(dx) > 24 &&
        Math.abs(dx) > Math.abs(dy) * 2.5,
      onPanResponderMove: (_, { dx }) => {
        const base = -indexRef.current * SCREEN_W;
        let next = base + dx;
        const min = -lastPage * SCREEN_W;
        if (next > 0) next *= RUBBER_BAND; // past the first page
        else if (next < min) next = min + (next - min) * RUBBER_BAND; // past the last
        pan.setValue(next);
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        const base = indexRef.current;
        let target = base;
        if (dx <= -DISTANCE_THRESHOLD || vx <= -VELOCITY_THRESHOLD) target = base + 1;
        else if (dx >= DISTANCE_THRESHOLD || vx >= VELOCITY_THRESHOLD) target = base - 1;
        settle(target, vx);
      },
      onPanResponderTerminate: () => settle(indexRef.current),
    })
  ).current;

  return (
    <View style={st.root} {...panResponder.panHandlers}>
      <Animated.View
        style={[
          st.track,
          { width: SCREEN_W * tabs.length, transform: [{ translateX: pan }] },
        ]}
      >
        {tabs.map((tab) => (
          <View key={tab.key} style={st.page}>
            {tab.render()}
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  track: {
    flex: 1,
    flexDirection: 'row',
  },
  page: {
    width: SCREEN_W,
  },
});
