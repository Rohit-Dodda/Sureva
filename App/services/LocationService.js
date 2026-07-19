import * as Location from 'expo-location';
import { classifyPlace } from '../constants/environments';

// Detect the user's session environment from their current location.
// Returns { status: 'granted' | 'denied' | 'error', environment: string | null,
// latitude, longitude, city, region } — the last four are null unless status
// is 'granted'. latitude/longitude/city/region ride along on the same
// reverseGeocodeAsync lookup already done for environment classification, so
// callers that persist a session's location don't need a second lookup.
// Never throws — callers treat denied/error identically (fall back to manual picker).
export async function detectEnvironment() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return { status: 'denied', environment: null, latitude: null, longitude: null, city: null, region: null };
    }
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
      city: place?.city ?? null,
      region: place?.region ?? null,
    };
  } catch (err) {
    console.log('environment detection failed:', err?.message ?? err);
    return { status: 'error', environment: null, latitude: null, longitude: null, city: null, region: null };
  }
}
