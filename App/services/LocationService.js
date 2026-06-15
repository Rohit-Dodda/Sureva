import * as Location from 'expo-location';
import { classifyPlace } from '../constants/environments';

// Detect the user's session environment from their current location.
// Returns { status: 'granted' | 'denied' | 'error', environment: string | null }.
// Never throws — callers treat denied/error identically (fall back to manual picker).
export async function detectEnvironment() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return { status: 'denied', environment: null };
    }
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const places = await Location.reverseGeocodeAsync({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });
    const environment = classifyPlace(places?.[0]);
    // Diagnostic for tuning the classifier — remove once heuristics settle
    console.log('environment detection', { place: places?.[0], environment });
    return { status: 'granted', environment };
  } catch (err) {
    console.log('environment detection failed:', err?.message ?? err);
    return { status: 'error', environment: null };
  }
}
