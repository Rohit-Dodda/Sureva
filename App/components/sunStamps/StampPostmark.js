import React, { useMemo } from 'react';
import Svg, { Defs, Path, Circle, Text, TextPath } from 'react-native-svg';
import colors from '../../constants/colors';

// The circular cancellation mark — the detail that makes a stamp read as
// franked rather than merely printed. Real curved text on a circular path,
// not an image, so it stays crisp at any size and carries the capture's own
// date rather than decorative filler.
function StampPostmark({ size = 58, date }) {
  const label = useMemo(() => {
    const d = date instanceof Date ? date : new Date(date);
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `SUREVA · CAUGHT · ${months[d.getMonth()]} ${d.getDate()} ·`;
  }, [date]);

  const c = size / 2;
  const outerR = size * 0.46;
  const textR = size * 0.355;
  const innerR = size * 0.26;

  // Full circle as two arcs — a single arc command can't close a circle,
  // since start and end would be the same point.
  const textPath = `M ${c} ${c - textR} A ${textR} ${textR} 0 1 1 ${c} ${c + textR} A ${textR} ${textR} 0 1 1 ${c} ${c - textR}`;

  return (
    <Svg width={size} height={size}>
      <Defs>
        <Path id="postmarkPath" d={textPath} />
      </Defs>
      <Circle cx={c} cy={c} r={outerR} fill="none" stroke={colors.white} strokeWidth={1.2} opacity={0.85} />
      <Circle cx={c} cy={c} r={innerR} fill="none" stroke={colors.white} strokeWidth={0.8} opacity={0.45} />
      <Text
        fill={colors.white}
        fontSize={size * 0.115}
        fontFamily="Switzer-Semibold"
        letterSpacing={size * 0.028}
        opacity={0.92}
      >
        <TextPath href="#postmarkPath" startOffset="2%">{label}</TextPath>
      </Text>
    </Svg>
  );
}

export default React.memo(StampPostmark);
