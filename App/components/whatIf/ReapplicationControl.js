import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, PanResponder, Animated } from 'react-native';
import colors from '../../constants/colors';

const MARKER = 22;
const WRAP_W = 44; // marker + label container — wide enough for "185m" on one line
const SNAP_MIN = 5; // markers snap to 5-minute increments

// Reapplication editor. If the session had reapplications, each one is a
// draggable marker on a mini timeline. If it had none, a toggle reveals a
// marker so the user can see what one reapplication would have done.
//
// Each marker follows the finger continuously via its own Animated.Value;
// the snapped minute only decides when onChange fires. The array is never
// re-sorted mid-drag (indices must stay stable under the finger) — the
// simulation service sorts internally.
export default React.memo(function ReapplicationControl({ durationMinutes, minutes, onChange, hadActual, onDraggingChange }) {
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

  // Marker positions are the marker's LEFT edge in [0, trackW - MARKER],
  // matching SnapSlider: full-width track, marker travels inside its ends.
  useEffect(() => {
    if (trackW <= 0) return;
    minutes.forEach((m, i) => {
      if (i !== dragIndex.current) {
        markerXs.current[i]?.setValue((m / durationMinutes) * (trackW - MARKER));
      }
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
    return Math.min(Math.max(snapped, SNAP_MIN), Math.floor((dur - SNAP_MIN) / SNAP_MIN) * SNAP_MIN);
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
      Animated.spring(markerXs.current[i], {
        toValue: (next / dur) * (w - MARKER),
        tension: 220,
        friction: 18,
        useNativeDriver: false,
      }).start();
      if (next !== ms[i]) {
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
        trackRef.current?.measureInWindow((x) => { trackPageX.current = x; });
        // Grab whichever marker is closest to the touch.
        const { trackW: w, minutes: ms, durationMinutes: dur } = geom.current;
        const x = e.nativeEvent.pageX - trackPageX.current;
        let best = 0;
        let bestDist = Infinity;
        ms.forEach((m, i) => {
          const center = (m / dur) * (w - MARKER) + MARKER / 2;
          const dist = Math.abs(center - x);
          if (dist < bestDist) { bestDist = dist; best = i; }
        });
        dragIndex.current = best;
        moveTo(e.nativeEvent.pageX);
      },
      onPanResponderMove: (e) => moveTo(e.nativeEvent.pageX),
      onPanResponderRelease: settle,
      onPanResponderTerminate: settle,
    })
  ).current;

  const toggleAdded = useCallback(
    (on) => onChange(on ? [Math.round(durationMinutes / 2 / SNAP_MIN) * SNAP_MIN] : []),
    [onChange, durationMinutes]
  );

  return (
    <View>
      {!hadActual && (
        <View style={st.toggleRow}>
          <Text style={st.toggleLabel}>Add a reapplication</Text>
          <Switch
            value={minutes.length > 0}
            onValueChange={toggleAdded}
            trackColor={{ false: colors.surface, true: colors.orange }}
            thumbColor={colors.white}
          />
        </View>
      )}
      {minutes.length > 0 && (
        <View ref={trackRef} style={st.timelineZone} onLayout={onLayout} collapsable={false} {...panResponder.panHandlers}>
          <View style={st.track} />
          {minutes.map((m, i) => (
            <Animated.View
              key={i}
              style={[st.markerWrap, { transform: [{ translateX: Animated.subtract(markerXs.current[i], (WRAP_W - MARKER) / 2) }] }]}
            >
              <View style={st.marker} />
              <Text style={st.markerLabel} numberOfLines={1}>{m}m</Text>
            </Animated.View>
          ))}
        </View>
      )}
      {minutes.length > 0 && <Text style={st.hint}>Drag to move when you reapplied</Text>}
    </View>
  );
});

const st = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  toggleLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: colors.ink,
  },
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
    borderColor: colors.protected,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  markerLabel: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 10,
    color: colors.inkMid,
    marginTop: 3,
  },
  hint: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
});
