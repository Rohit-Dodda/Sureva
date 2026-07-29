import * as Location from 'expo-location';
import { classifyPlace } from '../constants/environments';

// GPS altitude is far noisier than horizontal position — a fix good to 20m
// across the ground can be 50m+ out vertically — so a reading whose stated
// accuracy is worse than this is discarded rather than banked. Altitude Ace
// grades in 1,000m steps, so dropping a doubtful reading costs the user almost
// nothing, while trusting one could hand them a summit badge at sea level.
const MAX_ALTITUDE_ACCURACY_M = 100;

function readAltitude(coords) {
  const { altitude, altitudeAccuracy } = coords || {};
  if (typeof altitude !== 'number' || !Number.isFinite(altitude)) return null;
  if (typeof altitudeAccuracy === 'number' && altitudeAccuracy > MAX_ALTITUDE_ACCURACY_M) return null;
  return Math.round(altitude);
}

const DENIED = {
  status: 'denied', environment: null,
  latitude: null, longitude: null, altitude: null, city: null, region: null,
};

// Detect the user's session environment from their current location.
// Returns { status: 'granted' | 'denied' | 'error', environment: string | null,
// latitude, longitude, altitude, city, region } — the last five are null unless
// status is 'granted'. They ride along on the same position fix and
// reverseGeocodeAsync lookup already done for environment classification, so
// callers that persist a session's location don't need a second lookup.
// Never throws — callers treat denied/error identically (fall back to manual picker).
export async function detectEnvironment() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return DENIED;
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const places = await Location.reverseGeocodeAsync({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });
    const place = places?.[0];
    const environment = classifyPlace(place);
    // Diagnostic for tuning the classifier — remove once heuristics settle
    console.log('environment detection', { place, environment });
    return {
      status: 'granted',
      environment,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      altitude: readAltitude(position.coords),
      city: place?.city ?? null,
      region: place?.region ?? null,
    };
  } catch (err) {
    console.log('environment detection failed:', err?.message ?? err);
    return { ...DENIED, status: 'error' };
  }
}
