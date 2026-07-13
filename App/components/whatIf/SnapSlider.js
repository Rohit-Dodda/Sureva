import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, PanResponder, Animated } from 'react-native';
import colors from '../../constants/colors';

const THUMB = 22;
const TRACK_H = 5;

// Slider with fixed benchmark values. While dragging, the thumb follows
// the finger with complete freedom — nothing snaps, nothing recomputes, so
// the motion stays perfectly smooth. Only on release does the thumb spring
// to the nearest benchmark and onChange fire once with that value.
//
// Geometry follows native sliders: the track spans the full content width
// (flush with the card's text) and the thumb travels inside the track ends,
// so it never overhangs. The animated value is the thumb's LEFT edge,
// ranging [0, trackW - THUMB].
export default React.memo(function SnapSlider({ values, value, onChange, onRelease, onDraggingChange }) {
  const [trackW, setTrackW] = useState(0);
  const trackRef = useRef(null);
  const trackPageX = useRef(0);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const geom = useRef({ trackW: 0, values, value });
  geom.current = { trackW, values, value };

  const thumbX = useRef(new Animated.Value(0)).current;

  const xForValue = useCallback((v, w) => {
    const vs = geom.current.values;
    const i = Math.max(0, vs.indexOf(v));
    return vs.length > 1 ? (i / (vs.length - 1)) * (w - THUMB) : 0;
  }, []);

  // Sync the thumb to the value prop when it changes from outside a drag
  // (initial layout, Reset to actual).
  useEffect(() => {
    if (!dragging.current && trackW > 0) {
      Animated.timing(thumbX, {
        toValue: xForValue(value, trackW),
        duration: 160,
        useNativeDriver: false,
      }).start();
    }
  }, [value, trackW, thumbX, xForValue]);

  const onLayout = useCallback((e) => {
    setTrackW(e.nativeEvent.layout.width);
    trackRef.current?.measureInWindow((x) => { trackPageX.current = x; });
  }, []);

  // pageX against the measured track origin — locationX is relative to
  // whichever child view sits under the finger and jumps when the finger
  // crosses the thumb.
  const moveTo = useCallback((pageX) => {
    const w = geom.current.trackW;
    if (w <= 0) return;
    const x = Math.min(Math.max(pageX - trackPageX.current - THUMB / 2, 0), w - THUMB);
    lastX.current = x;
    thumbX.setValue(x); // free movement — no snapping, no state updates
  }, [thumbX]);

  const settle = useCallback(() => {
    dragging.current = false;
    onDraggingChange?.(false);
    const { trackW: w, values: vs, value: cur } = geom.current;
    if (w > 0) {
      const next = vs[Math.round((lastX.current / (w - THUMB)) * (vs.length - 1))];
      Animated.spring(thumbX, {
        toValue: xForValue(next, w),
        tension: 220,
        friction: 18,
        useNativeDriver: false,
      }).start();
      if (next !== cur) onChange(next); // single update, on release only
    }
    onRelease?.();
  }, [thumbX, xForValue, onChange, onRelease, onDraggingChange]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      // Android: keep the gesture even when a native scroll view wants it.
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (e) => {
        dragging.current = true;
        onDraggingChange?.(true);
        trackRef.current?.measureInWindow((x) => { trackPageX.current = x; });
        moveTo(e.nativeEvent.pageX);
      },
      onPanResponderMove: (e) => moveTo(e.nativeEvent.pageX),
      onPanResponderRelease: settle,
      onPanResponderTerminate: settle,
    })
  ).current;

  const idx = Math.max(0, values.indexOf(value));

  return (
    <View ref={trackRef} style={st.hitZone} onLayout={onLayout} collapsable={false} {...panResponder.panHandlers}>
      <View style={st.track} />
      {/* Fill reaches the thumb's center. */}
      <Animated.View style={[st.fill, { width: Animated.add(thumbX, THUMB / 2) }]} />
      {values.map((v, i) => (
        <View
          key={v}
          style={[
            st.tick,
            { left: THUMB / 2 + (values.length > 1 ? i / (values.length - 1) : 0) * (trackW - THUMB) - 2 },
            i <= idx && st.tickActive,
          ]}
        />
      ))}
      <Animated.View style={[st.thumb, { transform: [{ translateX: thumbX }] }]} />
    </View>
  );
});

const st = StyleSheet.create({
  hitZone: {
    height: 40,
    justifyContent: 'center',
  },
  track: {
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    backgroundColor: colors.surface,
  },
  fill: {
    position: 'absolute',
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    backgroundColor: colors.orange,
  },
  tick: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    top: 18,
  },
  tickActive: {
    backgroundColor: colors.orangeDark,
  },
  thumb: {
    position: 'absolute',
    left: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: colors.orange,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
});
