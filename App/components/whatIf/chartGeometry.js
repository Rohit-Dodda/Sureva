// Shared SVG geometry helpers for the What If charts. Not a component.
import { yForPct } from '../ChartPlot';

export function xForMinute(m, durationMinutes, width) {
  return (m / durationMinutes) * width;
}

export function buildLinePath(points, durationMinutes, width, height) {
  if (!points.length) return '';
  let d = `M ${xForMinute(points[0].m, durationMinutes, width)} ${yForPct(points[0].pct, height)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${xForMinute(points[i].m, durationMinutes, width)} ${yForPct(points[i].pct, height)}`;
  }
  return d;
}

// Total polyline length in px — used to drive the draw-in replay animation
// via strokeDasharray/strokeDashoffset.
export function polylineLength(points, durationMinutes, width, height) {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const dx =
      xForMinute(points[i].m, durationMinutes, width) -
      xForMinute(points[i - 1].m, durationMinutes, width);
    const dy = yForPct(points[i].pct, height) - yForPct(points[i - 1].pct, height);
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

// Protection % at a given minute (points are one per 30-second interval).
export function pctAtMinute(points, m) {
  const idx = Math.min(points.length - 1, Math.max(0, Math.round(m * 2)));
  return points[idx]?.pct ?? 0;
}
