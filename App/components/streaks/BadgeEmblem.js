import React, { useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Polygon, Circle, Path, Line, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { SHAPE_POINTS, CIRCLE_RADIUS } from './badgeShapes';
import AchievementIcon from './AchievementIcon';
import BadgeSheen from './BadgeSheen';
import useBadgeIdleMotion from './useBadgeIdleMotion';

let seq = 0;

function ShapeEl({ shape, fill }) {
  const points = SHAPE_POINTS[shape];
  if (points) return <Polygon points={points} fill={fill} />;
  return <Circle cx={50} cy={50} r={CIRCLE_RADIUS} fill={fill} />;
}

// ─── Inner white icons (0–100 box, centered) ──
function rays(n, r1, r2Even, r2Odd, sw) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = ((2 * Math.PI) / n) * i - Math.PI / 2;
    const r2 = i % 2 === 0 ? r2Even : r2Odd;
    out.push(
      <Line
        key={i}
        x1={50 + r1 * Math.cos(a)} y1={50 + r1 * Math.sin(a)}
        x2={50 + r2 * Math.cos(a)} y2={50 + r2 * Math.sin(a)}
        stroke={colors.white} strokeWidth={sw} strokeLinecap="round"
      />
    );
  }
  return out;
}

function IconEl({ icon }) {
  switch (icon) {
    case 'flame':
      return <Path d="M50 24 C60 40 65 47 65 57 A15 15 0 1 1 35 57 C35 47 40 40 50 24 Z" fill={colors.white} />;
    case 'sunburst':
      return <G><Circle cx={50} cy={50} r={10} fill={colors.white} />{rays(8, 15, 23, 23, 3)}</G>;
    case 'flameSun':
      return <G><Circle cx={50} cy={50} r={9} fill={colors.white} />{rays(6, 13, 23, 23, 3.4)}</G>;
    case 'corona':
      return (
        <G>
          <Circle cx={50} cy={50} r={6} fill={colors.white} />
          <Circle cx={50} cy={50} r={15} fill="none" stroke={colors.white} strokeWidth={1.4} strokeDasharray="2 3" />
          {rays(12, 19, 31, 25, 1.8)}
        </G>
      );
    case 'radiant':
      return <G><Circle cx={50} cy={50} r={9} fill={colors.white} />{rays(10, 13, 25, 20, 2.6)}</G>;
    default:
      return null;
  }
}

// The badge emblem: the tier's gradient shape with a top gloss + bottom shade,
// the white icon on top, and a soft accent glow. Locked = a flat gray shape
// with a lock icon instead.
//
// `iconSet` picks which illustration library `icon` names: 'streak' (the five
// sun/flame glyphs drawn inline below, in the same 0–100 box as the shape) or
// 'achievement' (the 15 handoff illustrations, drawn in their own 48-box and
// centered over the shape). `shadeColor` overrides the bottom-inner darkening;
// streak badges reuse the gradient's end color, achievements pass the deeper
// dedicated shade from the handoff.
function BadgeEmblem({ size, gradient, glow, shape, icon, locked, iconSet = 'streak', shadeColor, sheenDelay = 0 }) {
  const id = useRef(`emb${++seq}`).current;
  const shade = shadeColor || gradient[1];
  const isAchievement = iconSet === 'achievement';
  const { iconTransform, gradientOpacity } = useBadgeIdleMotion(icon, !locked, sheenDelay);

  // The shape's fills, drawn twice: once with the gradient running start→end,
  // once reversed. Cross-fading the two is what makes an earned emblem's colour
  // drift instead of sitting flat. Locked draws only the flat first pass.
  const shapeLayers = (gradId) => (
    <>
      <ShapeEl shape={shape} fill={`url(#${gradId})`} />
      <ShapeEl shape={shape} fill={`url(#${id}s)`} />
      <ShapeEl shape={shape} fill={`url(#${id}g)`} />
    </>
  );

  const defs = (
    <Defs>
      <LinearGradient id={`${id}m`} x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={gradient[0]} />
        <Stop offset="1" stopColor={gradient[1]} />
      </LinearGradient>
      <LinearGradient id={`${id}r`} x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={gradient[1]} />
        <Stop offset="1" stopColor={gradient[0]} />
      </LinearGradient>
      <LinearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={colors.white} stopOpacity="0.32" />
        <Stop offset="0.45" stopColor={colors.white} stopOpacity="0" />
      </LinearGradient>
      <LinearGradient id={`${id}s`} x1="0" y1="1" x2="0" y2="0">
        <Stop offset="0" stopColor={shade} stopOpacity="0.5" />
        <Stop offset="0.38" stopColor={shade} stopOpacity="0" />
      </LinearGradient>
    </Defs>
  );

  return (
    <View
      style={[
        { width: size, height: size, alignItems: 'center', justifyContent: 'center' },
        !locked && { shadowColor: glow, shadowOpacity: 0.34, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {defs}
        {locked ? (
          // A flatter, slightly-dimmed version of the real badge — you clearly
          // see the shape, color, and icon you're working toward, but without
          // the gloss, shade, glow or motion that make the earned one feel alive.
          <G opacity={0.72}>
            <ShapeEl shape={shape} fill={`url(#${id}m)`} />
          </G>
        ) : shapeLayers(`${id}m`)}
      </Svg>

      {/* Reversed-gradient twin, cross-faded over the base — the colour drift. */}
      {!locked && (
        <Animated.View style={[StyleSheet.absoluteFill, st.center, { opacity: gradientOpacity }]} pointerEvents="none">
          <Svg width={size} height={size} viewBox="0 0 100 100">
            {defs}
            {shapeLayers(`${id}r`)}
          </Svg>
        </Animated.View>
      )}

      {/* Illustration, in its own animated layer so it can move independently
          of the shape. Streak glyphs share the shape's 0–100 box; achievement
          art has its own 48-unit viewBox. */}
      <Animated.View
        style={[
          st.center,
          StyleSheet.absoluteFill,
          locked && { opacity: 0.72 },
          { transform: iconTransform },
        ]}
        pointerEvents="none"
      >
        {isAchievement ? (
          <AchievementIcon icon={icon} emblemSize={size} detail={shade} />
        ) : (
          <Svg width={size} height={size} viewBox="0 0 100 100">
            <IconEl icon={icon} />
          </Svg>
        )}
      </Animated.View>

      {/* Glisten, over both shape and icon so the whole emblem catches it. */}
      {!locked && <BadgeSheen size={size} shape={shape} delay={sheenDelay} />}

      {locked && (
        <View
          style={[st.lockChip, { width: size * 0.42, height: size * 0.42, borderRadius: size * 0.21, bottom: -size * 0.03, right: -size * 0.03 }]}
          pointerEvents="none"
        >
          <Ionicons name="lock-closed" size={size * 0.22} color={colors.muted} />
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  lockChip: {
    position: 'absolute',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default React.memo(BadgeEmblem);
