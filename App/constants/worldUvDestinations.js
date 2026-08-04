// Curated set of well-known destinations for the Passport World Map —
// coordinates only (verifiable, static facts about where these places
// are). UV values are deliberately NOT stored here — they're fetched
// live from WeatherService's same Open-Meteo backend each time the map
// opens (see WorldUvService.js), so this list never goes stale the way
// a hardcoded "seasonal average" table would, and a high-latitude city
// in winter correctly shows near-zero rather than a fabricated number.
// Spans every inhabited continent and a wide latitude range on purpose
// (including a couple of high-latitude cities) so the map shows real
// variation, not just uniformly "high" tropical readings.
export const WORLD_UV_DESTINATIONS = [
  { name: 'New York', country: 'USA', lat: 40.7128, lng: -74.0060 },
  { name: 'Los Angeles', country: 'USA', lat: 34.0522, lng: -118.2437 },
  { name: 'Miami', country: 'USA', lat: 25.7617, lng: -80.1918 },
  { name: 'Honolulu', country: 'USA', lat: 21.3069, lng: -157.8583 },
  { name: 'Anchorage', country: 'USA', lat: 61.2181, lng: -149.9003 },
  { name: 'Vancouver', country: 'Canada', lat: 49.2827, lng: -123.1207 },
  { name: 'Toronto', country: 'Canada', lat: 43.6532, lng: -79.3832 },
  { name: 'Mexico City', country: 'Mexico', lat: 19.4326, lng: -99.1332 },
  { name: 'Nassau', country: 'Bahamas', lat: 25.0343, lng: -77.3963 },
  { name: 'Rio de Janeiro', country: 'Brazil', lat: -22.9068, lng: -43.1729 },
  { name: 'Buenos Aires', country: 'Argentina', lat: -34.6037, lng: -58.3816 },
  { name: 'Santiago', country: 'Chile', lat: -33.4489, lng: -70.6693 },
  { name: 'Punta Arenas', country: 'Chile', lat: -53.1638, lng: -70.9171 },
  { name: 'London', country: 'UK', lat: 51.5072, lng: -0.1276 },
  { name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522 },
  { name: 'Barcelona', country: 'Spain', lat: 41.3874, lng: 2.1686 },
  { name: 'Lisbon', country: 'Portugal', lat: 38.7223, lng: -9.1393 },
  { name: 'Rome', country: 'Italy', lat: 41.9028, lng: 12.4964 },
  { name: 'Athens', country: 'Greece', lat: 37.9838, lng: 23.7275 },
  { name: 'Reykjavik', country: 'Iceland', lat: 64.1466, lng: -21.9426 },
  { name: 'Moscow', country: 'Russia', lat: 55.7558, lng: 37.6173 },
  { name: 'Istanbul', country: 'Turkey', lat: 41.0082, lng: 28.9784 },
  { name: 'Cairo', country: 'Egypt', lat: 30.0444, lng: 31.2357 },
  { name: 'Marrakech', country: 'Morocco', lat: 31.6295, lng: -7.9811 },
  { name: 'Lagos', country: 'Nigeria', lat: 6.5244, lng: 3.3792 },
  { name: 'Nairobi', country: 'Kenya', lat: -1.2921, lng: 36.8219 },
  { name: 'Cape Town', country: 'South Africa', lat: -33.9249, lng: 18.4241 },
  { name: 'Dubai', country: 'UAE', lat: 25.2048, lng: 55.2708 },
  { name: 'Mumbai', country: 'India', lat: 19.0760, lng: 72.8777 },
  { name: 'Bangalore', country: 'India', lat: 12.9716, lng: 77.5946 },
  { name: 'Bangkok', country: 'Thailand', lat: 13.7563, lng: 100.5018 },
  { name: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { name: 'Bali', country: 'Indonesia', lat: -8.6705, lng: 115.2126 },
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503 },
  { name: 'Seoul', country: 'South Korea', lat: 37.5665, lng: 126.9780 },
  { name: 'Beijing', country: 'China', lat: 39.9042, lng: 116.4074 },
  { name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093 },
  { name: 'Auckland', country: 'New Zealand', lat: -36.8485, lng: 174.7633 },
];
