// Shared source of truth for device-placement choices — used by
// DevicePlacementScreen (Settings). ids match
// Algorithm/constants/algorithmConstants.js's PLACEMENT_CORRECTION_FACTORS
// keys exactly; a mismatch here would silently fall back to that map's
// 1.0 default instead of applying the real correction.
export const DEVICE_PLACEMENTS = [
  { id: 'shoulder_strap', label: 'Shoulder strap or backpack', sub: 'Most accurate — no correction needed' },
  { id: 'hat_brim',       label: 'Hat or visor',                sub: 'Most accurate — no correction needed' },
  { id: 'chest',          label: 'Chest or shirt clip',         sub: 'Slightly shaded — reading corrected up 5%' },
  { id: 'upper_arm',      label: 'Upper arm band',              sub: 'Slightly shaded — reading corrected up 5%' },
  { id: 'wrist',          label: 'Wrist',                       sub: 'Often shaded by clothing — reading corrected up 15%' },
];
