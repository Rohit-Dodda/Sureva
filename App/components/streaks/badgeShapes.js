// Emblem shape geometry, shared by the streak-milestone badges and the
// achievement badges. Every shape is expressed as points in a 0–100 box so a
// single <Svg viewBox="0 0 100 100"> renders any of them at any size.
// Coordinates match the design handoff's clip-path polygons exactly.

function starPoints(n, outer, inner, cx = 50, cy = 50) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / n) * i - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}

// Regular n-gon inscribed in the box, first vertex at `rotDeg`.
function polyPoints(n, rotDeg = -90, cx = 50, cy = 50, r = 50) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = ((rotDeg + (360 / n) * i) * Math.PI) / 180;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}

// Polygon point strings. `circle` is the one shape with no point list — it
// falls through to a <Circle> in ShapeEl (see BadgeEmblem).
export const SHAPE_POINTS = {
  hex: '50,2 95,26 95,74 50,98 5,74 5,26',
  hexagon: '50,2 95,26 95,74 50,98 5,74 5,26', // alias — streakBadges.js spells it out
  shield: '50,0 88,10 88,52 72,82 50,100 28,82 12,52 12,10',
  diamond: '50,0 100,50 50,100 0,50',
  squircle: '28,1 72,1 99,28 99,72 72,99 28,99 1,72 1,28',
  scallop: starPoints(16, 50, 44),
  star8: starPoints(8, 50, 24),
  star6: starPoints(6, 50, 26),
  pentagon: polyPoints(5),
  octagon: polyPoints(8, -112.5),
};

export const CIRCLE_RADIUS = 50;
