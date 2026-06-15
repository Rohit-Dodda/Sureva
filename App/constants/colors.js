const colors = {
  // Backgrounds
  white: '#FFFFFF',
  canvas: '#F7F4EF',        // warm off-white screen background — cards float on this
  surface: '#F2EEE7',       // insets, tracks, skeletons
  orangeWash: '#FFEDE2',
  orangeWashDark: '#FFD9C2',

  // Dark surfaces (hero cards, tab bar, active session moments)
  charcoal: '#1A1712',      // near-black with warmth
  charcoalHigh: '#26221B',  // elevated dark surface
  charcoalBorder: 'rgba(255,255,255,0.08)',

  // Text
  ink: '#17140E',
  inkMid: '#4A4439',
  muted: '#766F64',         // darker than before — sunlight-readable
  onDark: '#FFFFFF',
  onDarkMuted: 'rgba(255,255,255,0.56)',

  // Orange (primary — brand, CTA, progress, active states)
  orangeLight: '#FFE3D2',
  orangeMid: '#FFB088',
  orange: '#FF5A1F',
  orangeDark: '#D9430C',

  // Gradient stops (LinearGradient pairs)
  gradOrangeStart: '#FF7A33',
  gradOrangeEnd: '#FF4400',
  gradCharcoalStart: '#262119',
  gradCharcoalEnd: '#14110C',
  gradGreenStart: '#3BDD83',
  gradGreenEnd: '#1FAE57',

  // Navy (secondary accent — charts, links, info, premium/clinician)
  navyLight: '#E8EBF2',
  navy: '#2C3B5C',
  navyDark: '#161F33',

  // Borders
  border: '#ECE6DC',        // neutral warm hairline
  borderNeutral: '#ECE6DC',

  // Status washes (badge/pill backgrounds)
  greenWash: '#E2F7EB',
  amberWash: '#FCF1DB',
  redWash: '#FBE7E3',

  // UV Protection status (non-negotiable)
  protected: '#2ECC71',
  warning: '#F39C12',
  danger: '#E74C3C',

  // Device LED — pairing/advertising indicator
  bluetooth: '#2F80FF',
};

export default colors;
