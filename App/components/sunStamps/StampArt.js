import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Path, Circle } from 'react-native-svg';
import { artFor } from '../../constants/sunStamps';

// The sky itself — shared by the full reveal card and the small Atlas chip,
// so a stamp is recognizably the same object at both sizes. Sizing is driven
// entirely by props; nothing here knows which surface it's on.
//
// The sun's height in frame comes from the tier (a Once-a-Year sits low and
// molten, an Everyday sits high and flat), NOT from the capture's real solar
// altitude. That's deliberate: the art has to read as its tier at a glance in
// a grid, and a real 4° sun would be a nearly invisible sliver at chip size.
// The true angle is still printed on the card's plate, where it's exact.
function StampArt({ tier, width, height, borderRadius = 0 }) {
  const art = artFor(tier);
  const cx = width / 2;
  const cy = height * (1 - art.sunY);
  const sunR = Math.min(width, height) * art.sunScale * 0.34;

  // Rays are drawn as thin triangular wedges radiating from the sun. RN's SVG
  // has no conic gradient, so a real sweep isn't available — a fan of wedges
  // is the honest way to get the engraved-plate look without one.
  const rays = useMemo(() => {
    if (!art.rayCount) return [];
    const reach = Math.max(width, height) * 1.2;
    const halfArc = Math.PI / art.rayCount / 2.6;
    return Array.from({ length: art.rayCount }, (_, i) => {
      const angle = (i / art.rayCount) * Math.PI * 2;
      const x1 = cx + Math.cos(angle - halfArc) * reach;
      const y1 = cy + Math.sin(angle - halfArc) * reach;
      const x2 = cx + Math.cos(angle + halfArc) * reach;
      const y2 = cy + Math.sin(angle + halfArc) * reach;
      return `M ${cx} ${cy} L ${x1} ${y1} L ${x2} ${y2} Z`;
    });
  }, [art.rayCount, cx, cy, width, height]);

  return (
    <View style={[st.wrap, { width, height, borderRadius }]}>
      <LinearGradient
        colors={art.sky}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={art.glow} stopOpacity="1" />
            <Stop offset="45%" stopColor={art.glow} stopOpacity="0.55" />
            <Stop offset="100%" stopColor={art.glow} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {rays.map((d, i) => (
          <Path key={i} d={d} fill={art.glow} opacity={art.rayOpacity} />
        ))}

        {/* Halo first, then the core, so the glow reads as light bleeding
            outward rather than a hard disc with a ring stuck around it. */}
        <Circle cx={cx} cy={cy} r={sunR * 3.2} fill="url(#sunGlow)" />
        <Circle cx={cx} cy={cy} r={sunR} fill={art.glow} opacity={0.95} />
      </Svg>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    position: 'relative',
  },
});

export default React.memo(StampArt);
