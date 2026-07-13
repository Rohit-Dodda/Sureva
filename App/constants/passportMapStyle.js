// Muted map-tile style for the Passport map (Google provider / Android).
// iOS uses Apple Maps' built-in "mutedStandard" type instead. These hex
// values are map TILE colors required by the Google style spec — they are
// not app UI colors and intentionally live outside constants/colors.js.
const passportMapStyle = [
  { elementType: 'geometry', stylers: [{ saturation: -85 }, { lightness: 18 }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a857c' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f2ec' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#e9e4da' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#d4dde3' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f2eee6' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#d8d2c6' }] },
];

export default passportMapStyle;
