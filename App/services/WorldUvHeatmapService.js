// Grid math + cache + batched fetch for the World Map's heatmap raster
// (v2 of the curated-destination point map in WorldUvService.js — see
// that file's own header for why UV is always fetched live, never
// hardcoded). This is the "on-demand grid sampling as the user pans/
// zooms" version: instead of ~40 fixed named cities, it samples a grid
// covering whatever region is currently visible, using the exact same
// batched multi-location Open-Meteo request technique (one HTTP call
// covers the whole grid, verified against the real API when the point
// map shipped).
import { bandFor } from './WorldUvService';

// Grid spacing snaps to one of these "nice" degree values rather than a
// value computed fresh from the viewport every time. Two viewports at
// roughly the same zoom level then produce grid points on the SAME
// global lattice, so panning across an already-sampled area hits the
// cache instead of re-fetching — a viewport-relative grid (N points
// evenly spread between the exact bounds) would essentially never repeat
// a coordinate between two pans.
const STEP_LADDER = [0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 20, 40];

// Hard ceiling on points per fetch regardless of viewport size or step
// rounding edge cases — the actual rate-limit backstop. At the largest
// step this is unreachable in practice; it exists for the pathological
// case (e.g. a very wide, short viewport) where step rounding could
// otherwise produce more points than intended. Raised alongside the
// finer ladder rungs above and the higher default targetPointsPerAxis
// below — a denser grid needs more headroom before hitting the cap.
const MAX_GRID_POINTS = 110;

// UV doesn't meaningfully change minute to minute, so a re-fetched point
// within this window just reuses what's already known instead of hitting
// the network again — this is most of what keeps pan-heavy usage cheap.
const CACHE_TTL_MS = 20 * 60 * 1000;

function nearestStep(raw) {
  for (const s of STEP_LADDER) {
    if (raw <= s) return s;
  }
  return STEP_LADDER[STEP_LADDER.length - 1];
}

function round(v, step) {
  // Round to a couple more decimal places than the step itself needs, so
  // floating-point drift (e.g. 0.30000000000000004) never splits what
  // should be the same cache key into two.
  const precision = step < 1 ? 4 : 2;
  return Math.round(v * 10 ** precision) / 10 ** precision;
}

// Snaps a viewport (react-native-maps' onRegionChangeComplete shape) to
// the global lattice and returns every lattice point inside it, capped
// at MAX_GRID_POINTS.
export function buildGrid(region, targetPointsPerAxis = 9) {
  const rawStep = Math.max(region.latitudeDelta, region.longitudeDelta) / targetPointsPerAxis;
  const step = nearestStep(rawStep);

  const latMin = Math.floor((region.latitude - region.latitudeDelta / 2) / step) * step;
  const latMax = Math.ceil((region.latitude + region.latitudeDelta / 2) / step) * step;
  const lngMin = Math.floor((region.longitude - region.longitudeDelta / 2) / step) * step;
  const lngMax = Math.ceil((region.longitude + region.longitudeDelta / 2) / step) * step;

  const points = [];
  for (let lat = latMin; lat <= latMax + 1e-9; lat += step) {
    const clampedLat = Math.max(-85, Math.min(85, lat)); // Open-Meteo/Web Mercator both break down near the poles
    for (let lng = lngMin; lng <= lngMax + 1e-9; lng += step) {
      const wrappedLng = ((lng + 540) % 360) - 180; // wrap across the antimeridian
      points.push({ lat: round(clampedLat, step), lng: round(wrappedLng, step) });
      if (points.length >= MAX_GRID_POINTS) return { points, step };
    }
  }
  return { points, step };
}

function cacheKey(lat, lng, step) {
  return `${step}:${lat}:${lng}`;
}

const cache = new Map(); // cacheKey -> { uvIndex, band, fetchedAt }

function getCached(lat, lng, step) {
  const hit = cache.get(cacheKey(lat, lng, step));
  if (!hit) return null;
  if (Date.now() - hit.fetchedAt > CACHE_TTL_MS) return null;
  return hit;
}

function setCached(lat, lng, step, uvIndex) {
  cache.set(cacheKey(lat, lng, step), { uvIndex, band: uvIndex != null ? bandFor(uvIndex) : null, fetchedAt: Date.now() });
}

// Batched fetch for arbitrary points (not named destinations) — same
// technique as WorldUvService.fetchWorldUv, generalized.
async function fetchGridUvBatch(points) {
  if (!points.length) return [];
  const lats = points.map((p) => p.lat).join(',');
  const lngs = points.map((p) => p.lng).join(',');
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}`
    + `&daily=uv_index_max&timezone=auto&forecast_days=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Grid UV fetch failed: ${res.status}`);
  const data = await res.json();
  const rows = Array.isArray(data) ? data : [data];
  return points.map((p, i) => {
    const raw = rows[i]?.daily?.uv_index_max?.[0];
    return { ...p, uvIndex: raw != null ? Math.round(raw) : null };
  });
}

// Main entry point: builds the lattice grid for the given region, serves
// whatever's already cached and fresh, and fetches only the points that
// aren't — merging both into one array the caller can render directly.
// step is returned too so the caller can size heatmap circles to the
// grid spacing.
export async function getGridUvForRegion(region, targetPointsPerAxis = 9) {
  const { points, step } = buildGrid(region, targetPointsPerAxis);

  const toFetch = [];
  const results = [];
  for (const p of points) {
    const cached = getCached(p.lat, p.lng, step);
    if (cached) {
      results.push({ ...p, uvIndex: cached.uvIndex, band: cached.band, step });
    } else {
      toFetch.push(p);
    }
  }

  if (toFetch.length) {
    const fetched = await fetchGridUvBatch(toFetch);
    for (const f of fetched) {
      setCached(f.lat, f.lng, step, f.uvIndex);
      results.push({ ...f, band: f.uvIndex != null ? bandFor(f.uvIndex) : null, step });
    }
  }

  return { points: results, step };
}
