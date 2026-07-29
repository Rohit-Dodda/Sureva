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
  borderLight: '#EEEEEE',   // check-in cards / inputs

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

  // Passport — gold ring on the user's best-session pin
  gold: '#E8B646',

  // Glassmorphism (translucent overlays on blurred surfaces)
  glassBorder: 'rgba(255,255,255,0.6)',
  glassOverlay: 'rgba(255,255,255,0.28)',
  glassShine: 'rgba(255,255,255,0.9)',
  glassBase: 'rgba(255,255,255,0.38)',

  // Dark glassmorphism (Skin Age hero card — a translucent dark "wallet
  // card" instead of a solid fill)
  glassDarkBase: 'rgba(15,14,12,0.28)',
  glassDarkBorder: 'rgba(255,255,255,0.14)',

  // Streak tier hues — each tier is a distinct color, not a recolor of orange.
  // blue (7–49), gold (50–99), pink (100–399), purple (400–599), green (600+).
  flameBlueStart: '#33E0FF',
  flameBlue: '#2F80FF',
  flameBlueEnd: '#2A5BFF',
  flameGoldStart: '#FFD75E',
  flameGold: '#F0B429',
  flameGoldEnd: '#E8981F',
  flamePinkStart: '#FF83CE',
  flamePink: '#FF3D9A',
  flamePinkEnd: '#FF1E7A',
  flamePurpleStart: '#BE8CFF',
  flamePurple: '#8A3FFF',
  flamePurpleEnd: '#6A1FFF',
  flameGreenStart: '#5AF08F',
  flameGreen: '#22C55E',
  flameGreenEnd: '#12A34C',

  // Achievement badge hues — one gradient family per achievement (start →
  // end), plus an accent (the emblem's outer glow / level pill) and a shade
  // (the emblem's bottom-inner darkening). Distinct from the streak tier hues
  // above: those mark *how long* you've logged, these mark *what* you've done.
  // Sun Hours deliberately reuses the gold tier family — same "time in sun"
  // idea — so it has no start/accent/end of its own, only a shade.
  achReapplyStart: '#5FE3C8',
  achReapplyAccent: '#14B8A6',
  achReapplyEnd: '#0E9E8F',
  achReapplyShade: '#08736A',
  achSunHoursShade: '#B8720F',
  achPlacesStart: '#8FB4FF',
  achPlacesAccent: '#4C6EF5',
  achPlacesEnd: '#3A4FD8',
  achPlacesShade: '#22308F',
  achPeakUvStart: '#FF9A6B',
  achPeakUvAccent: '#F2451D',
  achPeakUvEnd: '#E01E37',
  achPeakUvShade: '#9E0F26',
  achWaterStart: '#7DE8FF',
  achWaterAccent: '#22B8E6',
  achWaterEnd: '#0284C7',
  achWaterShade: '#03608F',
  achDawnStart: '#FFC4A3',
  achDawnAccent: '#FF8A5B',
  achDawnEnd: '#F2704B',
  achDawnShade: '#C24A28',
  achDuskStart: '#FFB35C',
  achDuskAccent: '#F5762E',
  achDuskEnd: '#E0457B',
  achDuskShade: '#A82658',
  achAltitudeStart: '#B9C6E8',
  achAltitudeAccent: '#7A6ED6',
  achAltitudeEnd: '#5B4FB5',
  achAltitudeShade: '#392C87',
  achLatitudeStart: '#7BE8B4',
  achLatitudeAccent: '#19B287',
  achLatitudeEnd: '#0E8F73',
  achLatitudeShade: '#076152',
  achFlawlessStart: '#C6F76B',
  achFlawlessAccent: '#7BC62D',
  achFlawlessEnd: '#3E9B18',
  achFlawlessShade: '#2A6B10',
  achSnowStart: '#D9F1FF',
  achSnowAccent: '#7FC4EB',
  achSnowEnd: '#4A9BD6',
  achSnowShade: '#1F6EA3',

  // Social brand colors — only used to tint the streak share-sheet icons.
  brandWhatsapp: '#25D366',
  brandTelegram: '#229ED9',
  brandX: '#000000',
  brandLinkedin: '#0A66C2',
  brandInstaStart: '#F9A03F',
  brandInstaMid: '#DB2E7A',
  brandInstaEnd: '#8A3AB9',
};

export default colors;
