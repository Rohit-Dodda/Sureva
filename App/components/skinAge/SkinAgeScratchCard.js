import React, { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Defs, Mask, Rect, Path, RadialGradient, Stop, Ellipse } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';

const STROKE_W = 54;
const MIN_POINT_DIST = 5; // px — throttles how often a new path point is added
const GRID_COLS = 22;
const GRID_ROWS = 12;
const COMPLETE_THRESHOLD = 0.55; // fraction of the grid scratched before the rest auto-clears

const MAX_TILT_DEG = 12;
const TILT_RANGE = 90; // px of drag to reach max tilt

// Radial glow spots, each following the finger at a different strength —
// the nearer-feeling ones move more, giving the light a sense of depth
// alongside the tilt.
const SPOTS = [
  { key: 'a', size: 240, top: -60, left: -40, opacity: 0.4, follow: 1 },
  { key: 'b', size: 190, top: 40, left: '58%', opacity: 0.3, follow: 0.55 },
  { key: 'c', size: 150, top: -20, left: '28%', opacity: 0.22, follow: 0.3 },
];

// The Skin Age hero card, always interactive: a dark glassmorphic surface
// with a few orange radial glows that track the finger, and a 3D tilt
// that follows any drag — a "trading card" feel that keeps working after
// the reveal, not just during it. While `showPaint` is true, the same
// drag simultaneously scratches away a paint layer covering the card
// (grid-tracked coverage; crossing 55% auto-clears the rest).
export default React.memo(function SkinAgeScratchCard({
  children, showPaint, onRevealed, onScratchStart, onScratchEnd,
}) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  // Handlers below are built once (via useRef) and permanently bound to
  // that first render's closures — reading `size` state directly there
  // would freeze it at {w:0, h:0} forever, since it's read before
  // onLayout ever fires. Mirroring it into a ref that's reassigned every
  // render keeps it live for those handlers.
  const sizeRef = useRef({ w: 0, h: 0 });
  sizeRef.current = size;
  // `nativeEvent.locationX/Y` is unreliable mid-drag in RN (it can stay
  // relative to wherever the touch originally landed instead of tracking
  // properly), which is why the finger and the scratch position drifted
  // apart. Measuring the card's actual on-screen origin and working from
  // `pageX/pageY` (screen-absolute, always accurate) against that fixed
  // point is the reliable way to get local coordinates — same technique
  // already used for dragging in SkinAgeTrendChart.js.
  //
  // That measurement has to happen fresh on every gesture, not be cached
  // from onLayout: the screen slides in with its own translateX animation,
  // so a position captured at layout time can still be mid-slide and wrong
  // by the time a touch actually lands — which drew a stray line from that
  // stale point to the corrected one the instant a finger touched down.
  const cardRef = useRef(null);
  const originRef = useRef({ x: 0, y: 0 });
  const originReadyRef = useRef(false);

  const onLayout = useCallback((e) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  }, []);

  // Tilt + glow-follow — active on every drag, scratching or not.
  const tiltX = useRef(new Animated.Value(0)).current;
  const tiltY = useRef(new Animated.Value(0)).current;
  const followX = useRef(new Animated.Value(0)).current;
  const followY = useRef(new Animated.Value(0)).current;

  const settleTilt = useCallback(() => {
    Animated.parallel([
      Animated.spring(tiltX, { toValue: 0, useNativeDriver: true, tension: 180, friction: 14 }),
      Animated.spring(tiltY, { toValue: 0, useNativeDriver: true, tension: 180, friction: 14 }),
      Animated.spring(followX, { toValue: 0, useNativeDriver: true, tension: 140, friction: 14 }),
      Animated.spring(followY, { toValue: 0, useNativeDriver: true, tension: 140, friction: 14 }),
    ]).start();
  }, [tiltX, tiltY, followX, followY]);

  // Scratch-paint state — only relevant while `showPaint`.
  const [hintVisible, setHintVisible] = useState(true);
  const paintOpacity = useRef(new Animated.Value(1)).current;
  const [pathD, setPathD] = useState('');
  const pathCommands = useRef([]);
  const lastPoint = useRef(null);
  const grid = useRef(null);
  const scratchedCells = useRef(0);
  const paintDoneRef = useRef(!showPaint);

  const appendPoint = useCallback((x, y) => {
    pathCommands.current.push(`${pathCommands.current.length === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
    setPathD(pathCommands.current.join(' '));
  }, []);

  const markScratched = useCallback((x, y) => {
    const { w, h } = sizeRef.current;
    if (!w || !h) return;
    if (!grid.current) grid.current = new Uint8Array(GRID_COLS * GRID_ROWS);
    const col = Math.floor((x / w) * GRID_COLS);
    const row = Math.floor((y / h) * GRID_ROWS);
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = row + dr, c = col + dc;
        if (r < 0 || r >= GRID_ROWS || c < 0 || c >= GRID_COLS) continue;
        const idx = r * GRID_COLS + c;
        if (!grid.current[idx]) {
          grid.current[idx] = 1;
          scratchedCells.current += 1;
        }
      }
    }
  }, []);

  const completePaint = useCallback(() => {
    if (paintDoneRef.current) return;
    paintDoneRef.current = true;
    Animated.timing(paintOpacity, { toValue: 0, duration: 550, useNativeDriver: true }).start(() => onRevealed?.());
  }, [paintOpacity, onRevealed]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        onScratchStart?.();
        if (!paintDoneRef.current) {
          setHintVisible(false);
          originReadyRef.current = false;
          const { pageX, pageY } = e.nativeEvent;
          cardRef.current?.measureInWindow((x, y) => {
            originRef.current = { x, y };
            originReadyRef.current = true;
            const localX = pageX - x;
            const localY = pageY - y;
            lastPoint.current = { x: localX, y: localY };
            appendPoint(localX, localY);
            markScratched(localX, localY);
          });
        }
      },
      onPanResponderMove: (e, gesture) => {
        if (paintDoneRef.current) {
          // Paint's gone — this drag is purely the tilt/glow interaction.
          const { dx, dy } = gesture;
          const nx = Math.max(-1, Math.min(1, dx / TILT_RANGE));
          const ny = Math.max(-1, Math.min(1, dy / TILT_RANGE));
          tiltY.setValue(nx * MAX_TILT_DEG);
          tiltX.setValue(-ny * MAX_TILT_DEG);
          followX.setValue(nx);
          followY.setValue(ny);
          return;
        }
        // Still scratching. If the grant's origin measurement hasn't
        // resolved yet, there's nothing correct to compute against —
        // drop this point rather than draw from a stale/zeroed origin.
        if (!originReadyRef.current) return;
        // Local coords come from the fixed origin measured on grant, not
        // locationX/Y.
        const localX = e.nativeEvent.pageX - originRef.current.x;
        const localY = e.nativeEvent.pageY - originRef.current.y;
        const last = lastPoint.current;
        const distSq = last ? (localX - last.x) ** 2 + (localY - last.y) ** 2 : Infinity;
        if (distSq >= MIN_POINT_DIST * MIN_POINT_DIST) {
          appendPoint(localX, localY);
          lastPoint.current = { x: localX, y: localY };
        }
        markScratched(localX, localY);
        if (scratchedCells.current / (GRID_COLS * GRID_ROWS) >= COMPLETE_THRESHOLD) {
          completePaint();
        }
      },
      onPanResponderRelease: () => {
        onScratchEnd?.();
        settleTilt();
      },
      onPanResponderTerminate: () => {
        onScratchEnd?.();
        settleTilt();
      },
    })
  ).current;

  const rotateXDeg = tiltX.interpolate({ inputRange: [-MAX_TILT_DEG, MAX_TILT_DEG], outputRange: [`-${MAX_TILT_DEG}deg`, `${MAX_TILT_DEG}deg`] });
  const rotateYDeg = tiltY.interpolate({ inputRange: [-MAX_TILT_DEG, MAX_TILT_DEG], outputRange: [`-${MAX_TILT_DEG}deg`, `${MAX_TILT_DEG}deg`] });

  return (
    <Animated.View
      ref={cardRef}
      style={[
        st.wrap,
        { transform: [{ perspective: 800 }, { rotateX: rotateXDeg }, { rotateY: rotateYDeg }] },
      ]}
      onLayout={onLayout}
      {...panResponder.panHandlers}
    >
      <View style={st.darkBase} pointerEvents="none" />
      {size.w > 0 && SPOTS.map((s) => (
        <Animated.View
          key={s.key}
          pointerEvents="none"
          style={[
            st.spot,
            {
              width: s.size,
              height: s.size,
              top: s.top,
              left: s.left,
              opacity: s.opacity,
              transform: [
                { translateX: Animated.multiply(followX, size.w * 0.2 * s.follow) },
                { translateY: Animated.multiply(followY, size.h * 0.2 * s.follow) },
              ],
            },
          ]}
        >
          <Svg width={s.size} height={s.size}>
            <Defs>
              <RadialGradient id={`skinAgeSpot-${s.key}`} cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0" stopColor={colors.orange} stopOpacity="1" />
                <Stop offset="0.6" stopColor={colors.orange} stopOpacity="0.25" />
                <Stop offset="1" stopColor={colors.orange} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Ellipse cx={s.size / 2} cy={s.size / 2} rx={s.size / 2} ry={s.size / 2} fill={`url(#skinAgeSpot-${s.key})`} />
          </Svg>
        </Animated.View>
      ))}
      <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={st.darkBorder} pointerEvents="none" />

      {children}

      {showPaint && size.w > 0 && (
        <Animated.View style={[st.paintOverlay, { opacity: paintOpacity }]} pointerEvents="none">
          <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill}>
            <Defs>
              <Mask id="scratchMask">
                <Rect x={0} y={0} width={size.w} height={size.h} fill="white" />
                <Path
                  d={pathD}
                  stroke="black"
                  strokeWidth={STROKE_W}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </Mask>
            </Defs>
            <Rect x={0} y={0} width={size.w} height={size.h} fill={colors.charcoal} mask="url(#scratchMask)" />
          </Svg>
          {hintVisible && (
            <View style={st.hint}>
              <Ionicons name="finger-print-outline" size={26} color={colors.orangeLight} />
              <Text style={st.hintText}>Scratch to reveal</Text>
            </View>
          )}
        </Animated.View>
      )}
    </Animated.View>
  );
});

const st = StyleSheet.create({
  wrap: {
    marginBottom: 14,
    borderRadius: 28,
    overflow: 'hidden',
  },
  darkBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.glassDarkBase,
  },
  spot: {
    position: 'absolute',
  },
  darkBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.glassDarkBorder,
  },
  paintOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  hint: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  hintText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 13,
    color: colors.orangeLight,
    letterSpacing: 0.3,
  },
});
