// Live worldwide UV for the Passport World Map — one batched Open-Meteo
// request covering every curated destination at once (verified:
// Open-Meteo accepts comma-separated multi-location latitude/longitude
// lists and returns an array of per-location results in the same
// order). Same free, no-API-key backend WeatherService already uses for
// the Forecast tab — deliberately not a second, different UV source, so
// numbers can't disagree between screens. Values are always fetched
// live, never hardcoded — a curated "seasonal average" table would go
// stale and, for a high-latitude city in winter, would either need
// constant upkeep or quietly lie.
import { WORLD_UV_DESTINATIONS } from '../constants/worldUvDestinations';
import { UV_BANDS } from '../components/passport/locationDetailUtils';

// Same band-lookup shape uvDistribution (locationDetailUtils.js) already
// uses: first band's floor is 0, each subsequent floor is the previous
// band's ceiling.
export function bandFor(uv) {
  let min = 0;
  for (const band of UV_BANDS) {
    if (uv > min && uv <= band.max) return band;
    min = band.max;
  }
  return UV_BANDS[0];
}

export async function fetchWorldUv(destinations = WORLD_UV_DESTINATIONS) {
  const lats = destinations.map((d) => d.lat).join(',');
  const lngs = destinations.map((d) => d.lng).join(',');
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}`
    + `&daily=uv_index_max&timezone=auto&forecast_days=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`World UV fetch failed: ${res.status}`);
  const data = await res.json();
  // A single-destination request returns one object, not an array —
  // only relevant if this is ever called with exactly one destination.
  const rows = Array.isArray(data) ? data : [data];

  return destinations.map((dest, i) => {
    const raw = rows[i]?.daily?.uv_index_max?.[0];
    const uvIndex = raw != null ? Math.round(raw) : null;
    return { ...dest, uvIndex, band: uvIndex != null ? bandFor(uvIndex) : null };
  });
}
