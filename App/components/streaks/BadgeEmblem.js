import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Polygon, Circle, Path, Line, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';

let seq = 0;

// ─── Shape geometry (0–100 box, matching the design handoff polygons) ──
const HEXAGON = '50,2 95,26 95,74 50,98 5,74 5,26';
const SHIELD = '50,0 88,10 88,52 72,82 50,100 28,82 12,52 12,10';

function starPoints(n, outer, inner, cx = 50, cy = 50) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / n) * i - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}

function ShapeEl({ shape, fill }) {
  if (shape === 'circle') return <Circle cx={50} cy={50} r={48} fill={fill} />;
  if (shape === 'hexagon') return <Polygon points={HEXAGON} fill={fill} />;
  if (shape === 'shield') return <Polygon points={SHIELD} fill={fill} />;
  if (shape === 'scallop') return <Polygon points={starPoints(16, 50, 44)} fill={fill} />;
  if (shape === 'star8') return <Polygon points={starPoints(8, 50, 24)} fill={fill} />;
  return <Circle cx={50} cy={50} r={48} fill={fill} />;
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
function BadgeEmblem({ size, gradient, glow, shape, icon, locked }) {
  const id = useRef(`emb${++seq}`).current;
  const shade = gradient[1];

  return (
    <View
      style={[
        { width: size, height: size, alignItems: 'center', justifyContent: 'center' },
        !locked && { shadowColor: glow, shadowOpacity: 0.34, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={`${id}m`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={gradient[0]} />
            <Stop offset="1" stopColor={gradient[1]} />
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

        {locked ? (
          // A flatter, slightly-dimmed version of the real badge — you clearly
          // see the shape, color, and icon you're working toward, but without
          // the gloss, shade, or glow that make the earned one feel elegant.
          <G opacity={0.72}>
            <ShapeEl shape={shape} fill={`url(#${id}m)`} />
            <IconEl icon={icon} />
          </G>
        ) : (
          <>
            <ShapeEl shape={shape} fill={`url(#${id}m)`} />
            <ShapeEl shape={shape} fill={`url(#${id}s)`} />
            <ShapeEl shape={shape} fill={`url(#${id}g)`} />
            <IconEl icon={icon} />
          </>
        )}
      </Svg>

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
