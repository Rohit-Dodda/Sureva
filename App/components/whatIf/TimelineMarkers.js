import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, PanResponder, Animated } from 'react-native';
import colors from '../../constants/colors';

const MARKER = 22;
const WRAP_W = 44; // marker + label container — wide enough for "185m" on one line
const SNAP_MIN = 5; // markers snap to 5-minute increments

// Generic draggable-markers-on-a-timeline track, extracted from
// ReapplicationControl so water breaks and lab reapplications can share
// the exact same gesture mechanics instead of duplicating them.
//
// Each marker follows the finger continuously via its own Animated.Value;
// the snapped minute only decides when onChange fires. The array is never
// re-sorted mid-drag (indices must stay stable under the finger) — the
// simulation service sorts internally.
export default React.memo(function TimelineMarkers({
  durationMinutes,
  minutes,
  onChange,
  onDraggingChange,
  markerColor = colors.protected,
}) {
  const [trackW, setTrackW] = useState(0);
  const trackRef = useRef(null);
  const trackPageX = useRef(0);
  const dragIndex = useRef(-1);
  const geom = useRef({ trackW: 0, minutes, durationMinutes });
  geom.current = { trackW, minutes, durationMinutes };

  // One Animated.Value per marker, kept in sync with props when not dragging.
  const markerXs = useRef([]);
  while (markerXs.current.length < minutes.length) markerXs.current.push(new Animated.Value(0));
  markerXs.current.length = minutes.length;

  // The marker settle() just released a spring on, and the exact target X
  // it's springing toward — lets the sync effect below tell "this position
  // update is just the onChange echo of the spring already in flight" apart
  // from "minutes changed for some other reason (Reset, add/remove)".
  // Without this, settle()'s onChange triggers this effect with
  // dragIndex.current already reset to -1, so it looks like nothing is
  // dragging and the effect force-jumps the marker via setValue — cutting
  // the spring off mid-bounce on every single release.
  const suppressSyncRef = useRef(null);

  // Marker positions are the marker's LEFT edge in [0, trackW - MARKER],
  // matching SnapSlider: full-width track, marker travels inside its ends.
  useEffect(() => {
    if (trackW <= 0) return;
    minutes.forEach((m, i) => {
      if (i === dragIndex.current) return;
      // Clamped defensively — a minute isn't guaranteed to fall inside
      // [0, durationMinutes], and an unclamped ratio > 1 renders the
      // marker past the track entirely.
      const ratio = durationMinutes > 0 ? Math.min(Math.max(m / durationMinutes, 0), 1) : 0;
      const targetX = ratio * (trackW - MARKER);
      const suppress = suppressSyncRef.current;
      if (suppress && suppress.index === i && Math.abs(suppress.value - targetX) < 0.5) {
        suppressSyncRef.current = null; // consumed — later changes to this index sync normally
        return;
      }
      markerXs.current[i]?.setValue(targetX);
    });
  }, [minutes, trackW, durationMinutes]);

  const onLayout = useCallback((e) => {
    setTrackW(e.nativeEvent.layout.width);
    trackRef.current?.measureInWindow((x) => { trackPageX.current = x; });
  }, []);

  const snapMinute = (x) => {
    const { trackW: w, durationMinutes: dur } = geom.current;
    const raw = (Math.min(Math.max(x, 0), w - MARKER) / (w - MARKER)) * dur;
    const snapped = Math.round(raw / SNAP_MIN) * SNAP_MIN;
    // Normally kept at least one SNAP_MIN away from both ends — an event
    // exactly at session start/end doesn't make sense. But a session
    // shorter than 2*SNAP_MIN has no room for that margin on both sides at
    // once: `upper` goes negative while `lower` stays positive, so the
    // bounds invert and Math.min(Math.max(...)) collapses to that single
    // negative number regardless of input — sending the marker to a wildly
    // out-of-track x on every release. Fall back to the widest sane range,
    // [0, dur], when there's no room for the margin.
    const lower = SNAP_MIN;
    const upper = Math.floor((dur - SNAP_MIN) / SNAP_MIN) * SNAP_MIN;
    if (upper < lower) {
      return Math.min(Math.max(snapped, 0), Math.max(0, Math.floor(dur / SNAP_MIN) * SNAP_MIN));
    }
    return Math.min(Math.max(snapped, lower), upper);
  };

  const lastX = useRef(0);

  // Free movement while dragging — the marker follows the finger exactly;
  // snapping and the (single) onChange happen on release.
  const moveTo = useCallback((pageX) => {
    const w = geom.current.trackW;
    const i = dragIndex.current;
    if (i < 0 || w <= 0) return;
    const x = Math.min(Math.max(pageX - trackPageX.current - MARKER / 2, 0), w - MARKER);
    lastX.current = x;
    markerXs.current[i]?.setValue(x);
  }, []);

  const settle = useCallback(() => {
    const { trackW: w, minutes: ms, durationMinutes: dur } = geom.current;
    const i = dragIndex.current;
    dragIndex.current = -1;
    onDraggingChange?.(false);
    if (i >= 0 && w > 0 && ms[i] != null) {
      const next = snapMinute(lastX.current);
      const targetX = (next / dur) * (w - MARKER);
      Animated.spring(markerXs.current[i], {
        toValue: targetX,
        tension: 220,
        friction: 18,
        useNativeDriver: false,
      }).start();
      if (next !== ms[i]) {
        suppressSyncRef.current = { index: i, value: targetX };
        const updated = [...ms];
        updated[i] = next;
        onChange(updated); // single update, on release only
      }
    }
  }, [onChange, onDraggingChange]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => geom.current.minutes.length > 0,
      onStartShouldSetPanResponderCapture: () => geom.current.minutes.length > 0,
      onMoveShouldSetPanResponder: () => geom.current.minutes.length > 0,
      onPanResponderTerminationRequest: () => false,
      // Android: keep the gesture even when a native scroll view wants it.
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (e) => {
        onDraggingChange?.(true);
        const { pageX } = e.nativeEvent;
        // measureInWindow is async — trackPageX.current only reflects the
        // container's position as of its LAST measurement (mount, or the
        // previous touch), which is stale right after an entrance
        // animation. Picking the closest marker and moving it must wait
        // for the fresh measurement, or the very first touch after opening
        // can grab the wrong marker / jump to the wrong spot.
        trackRef.current?.measureInWindow((x) => {
          trackPageX.current = x;
          const { trackW: w, minutes: ms, durationMinutes: dur } = geom.current;
          const touchX = pageX - x;
          let best = 0;
          let bestDist = Infinity;
          ms.forEach((m, i) => {
            const center = (m / dur) * (w - MARKER) + MARKER / 2;
            const dist = Math.abs(center - touchX);
            if (dist < bestDist) { bestDist = dist; best = i; }
          });
          dragIndex.current = best;
          moveTo(pageX);
        });
      },
      onPanResponderMove: (e) => moveTo(e.nativeEvent.pageX),
      onPanResponderRelease: settle,
      onPanResponderTerminate: settle,
    })
  ).current;

  return (
    <View ref={trackRef} style={st.timelineZone} onLayout={onLayout} collapsable={false} {...panResponder.panHandlers}>
      <View style={st.track} />
      {minutes.map((m, i) => (
        <Animated.View
          key={i}
          style={[st.markerWrap, { transform: [{ translateX: Animated.subtract(markerXs.current[i], (WRAP_W - MARKER) / 2) }] }]}
        >
          <View style={[st.marker, { borderColor: markerColor }]} />
          <Text style={st.markerLabel} numberOfLines={1}>{m}m</Text>
        </Animated.View>
      ))}
    </View>
  );
});

const st = StyleSheet.create({
  timelineZone: {
    height: 56,
    justifyContent: 'center',
    marginTop: 8,
  },
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.surface,
  },
  markerWrap: {
    position: 'absolute',
    left: 0,
    top: 12,
    alignItems: 'center',
    width: WRAP_W,
  },
  marker: {
    width: MARKER,
    height: MARKER,
    borderRadius: MARKER / 2,
    backgroundColor: colors.white,
    borderWidth: 3,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  markerLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 10,
    color: colors.inkMid,
    marginTop: 3,
  },
});
