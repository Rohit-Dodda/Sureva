import React from 'react';
import Svg, { Path, Circle, Rect, Ellipse, G } from 'react-native-svg';
import colors from '../../constants/colors';

// The 11 achievement illustrations, transcribed verbatim from the design
// handoff's 48×48 SVG paths. Kept out of BadgeEmblem so neither file grows
// past the size limit and the streak emblems stay unaffected by icon churn.
//
// `f` is the icon body (white). `d` is the detail color — used only for the
// five icons whose handoff art layers a translucent *white* highlight over an
// already-white body (droplet, pin, mountain, globe, check). On the web
// reference those details render white-on-white and vanish; drawing them in
// the emblem's shade instead keeps the intended detail readable, which matters
// most for `check`, where the tick IS the icon.

// Reference icon width in px, against the handoff's 79.2px emblem
// (132 ring × 0.6). Stored so each icon keeps its designed optical size.
const REF_EMBLEM = 79.2;
const REF_SIZE = {
  droplet: 38, hourglass: 38, pin: 38, peak: 38, check: 38,
  wave: 40, sunrise: 40, sunset: 40, mountain: 40, globe: 40,
  snow: 40,
};

// A rounded bar rotated about a pivot — the sun/sparkle rays several icons use.
function Ray({ x, y, w, h, fill, opacity, deg, cx, cy }) {
  return (
    <Rect
      x={x} y={y} width={w} height={h} rx={w / 2}
      fill={fill} opacity={opacity}
      rotation={deg} originX={cx} originY={cy}
    />
  );
}

function IconBody({ icon, f, d }) {
  switch (icon) {
    case 'droplet':
      return (
        <>
          <Path fill={f} d="M24 5c7 9 12 14.2 12 20.5A12 12 0 0 1 12 25.5C12 19.2 17 14 24 5Z" />
          <Path fill={d} opacity={0.45} d="M19 26a5 5 0 0 0 5 5v3a8 8 0 0 1-8-8Z" />
        </>
      );
    case 'hourglass':
      return (
        <>
          <Path fill={f} d="M13 6h22v3l-9 13 9 13v3H13v-3l9-13-9-13V6Z" />
          <Rect x={10} y={4} width={28} height={3} rx={1.5} fill={f} />
          <Rect x={10} y={41} width={28} height={3} rx={1.5} fill={f} />
        </>
      );
    case 'pin':
      return (
        <>
          <Path fill={f} d="M24 4c7.2 0 13 5.6 13 12.6C37 26 24 44 24 44S11 26 11 16.6C11 9.6 16.8 4 24 4Z" />
          <Circle cx={24} cy={17} r={5} fill={d} opacity={0.6} />
        </>
      );
    case 'peak':
      return (
        <>
          <Circle cx={24} cy={30} r={8.5} fill={f} />
          {[0, 1, 2, 3, 4].map((i) => (
            <Ray key={i} x={22.8} y={2} w={2.4} h={6} fill={f} deg={i * 36} cx={24} cy={24} />
          ))}
          <Path fill={f} d="M24 2l7 9H17l7-9Z" />
        </>
      );
    case 'wave':
      return (
        <>
          <Circle cx={24} cy={15} r={7} fill={f} opacity={0.85} />
          <Path fill={f} d="M4 27c5 0 5 4 10 4s5-4 10-4 5 4 10 4 5-4 10-4v5c-5 0-5 4-10 4s-5-4-10-4-5 4-10 4-5-4-10-4v-5Z" />
          <Path fill={f} opacity={0.5} d="M4 38c5 0 5 3 10 3s5-3 10-3 5 3 10 3 5-3 10-3v4H4v-4Z" />
        </>
      );
    case 'sunrise':
      return (
        <>
          <Path fill={f} d="M11 29a13 13 0 0 1 26 0H11Z" />
          {[0, 1, 2, 3, 4].map((i) => (
            <Ray key={i} x={23} y={3} w={2.4} h={7} fill={f} deg={-60 + i * 30} cx={24} cy={29} />
          ))}
          <Rect x={5} y={33} width={38} height={3} rx={1.5} fill={f} />
          <Rect x={12} y={39} width={24} height={3} rx={1.5} fill={f} opacity={0.6} />
        </>
      );
    case 'sunset':
      return (
        <>
          <Path fill={f} opacity={0.9} d="M11 28a13 13 0 0 0 26 0H11Z" />
          <Circle cx={24} cy={22} r={9} fill={f} />
          <Rect x={4} y={30} width={40} height={3} rx={1.5} fill={f} />
          <Rect x={10} y={36} width={12} height={3} rx={1.5} fill={f} opacity={0.55} />
          <Rect x={26} y={36} width={12} height={3} rx={1.5} fill={f} opacity={0.55} />
        </>
      );
    case 'mountain':
      return (
        <>
          <Circle cx={35} cy={13} r={5} fill={f} opacity={0.7} />
          <Path fill={f} d="M4 38 18 14l9 15 4-6 13 15H4Z" />
          <Path fill={d} opacity={0.55} d="M18 14l5.2 8.7-5.2 2.3-4.6-2.6L18 14Z" />
        </>
      );
    case 'globe':
      return (
        <>
          <Circle cx={24} cy={24} r={19} fill={f} />
          <G stroke={d} strokeWidth={2} fill="none" opacity={0.65}>
            <Ellipse cx={24} cy={24} rx={8.5} ry={19} />
            <Path d="M5 24h38" />
            <Path d="M8 14h32M8 34h32" opacity={0.7} />
          </G>
        </>
      );
    case 'check':
      return (
        <>
          <Path fill={f} d="M24 3 41 9v15c0 11-7.6 18.4-17 21.5C14.6 42.4 7 35 7 24V9l17-6Z" />
          <Path
            d="m16 24 6 6 12-13"
            stroke={d} strokeWidth={4} fill="none"
            strokeLinecap="round" strokeLinejoin="round"
          />
        </>
      );
    case 'snow':
      return (
        <>
          <G stroke={f} strokeWidth={3} strokeLinecap="round">
            {[0, 1, 2].map((i) => (
              <G key={i} rotation={i * 60} originX={24} originY={24}>
                <Path d="M24 5v38" />
                <Path d="m24 12 5-5M24 12l-5-5M24 36l5 5M24 36l-5 5" strokeWidth={2.4} />
              </G>
            ))}
          </G>
          <Circle cx={24} cy={24} r={5} fill={f} />
        </>
      );
    default:
      return null;
  }
}

// `emblemSize` is the emblem's px width; the icon scales off it so every badge
// keeps the handoff's icon-to-emblem ratio at any ring size.
function AchievementIcon({ icon, emblemSize, detail }) {
  const px = ((REF_SIZE[icon] ?? 40) / REF_EMBLEM) * emblemSize;
  return (
    <Svg width={px} height={px} viewBox="0 0 48 48">
      <IconBody icon={icon} f={colors.white} d={detail} />
    </Svg>
  );
}

export default React.memo(AchievementIcon);
