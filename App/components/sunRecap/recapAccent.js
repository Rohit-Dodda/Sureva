// Vivid, full-bleed accent themes for the recap cards — Spotify-Wrapped-
// style saturation, kept in Sureva's warm sun palette. Each card is one bold
// color field with a bright "hero" pop color for the headline number and a
// soft body color. `ray` tints the animated sun-motif decor behind content.
const ACCENTS = {
  orange: {
    gradient: ['#FF9146', '#EF4B00'],
    hero: '#231006',
    body: 'rgba(35,16,6,0.74)',
    kicker: 'rgba(35,16,6,0.6)',
    ray: 'rgba(255,255,255,0.16)',
    onDark: false,
  },
  danger: {
    gradient: ['#C22A1F', '#6E120C'],
    hero: '#FFC957',
    body: '#FFE4DE',
    kicker: 'rgba(255,228,222,0.7)',
    ray: 'rgba(255,201,87,0.14)',
    onDark: true,
  },
  protected: {
    gradient: ['#1BAE5E', '#0A5E34'],
    hero: '#EAFFF3',
    body: 'rgba(234,255,243,0.85)',
    kicker: 'rgba(234,255,243,0.65)',
    ray: 'rgba(255,255,255,0.15)',
    onDark: true,
  },
  navy: {
    gradient: ['#2B3C63', '#141C30'],
    hero: '#8FB6FF',
    body: 'rgba(233,238,250,0.85)',
    kicker: 'rgba(233,238,250,0.6)',
    ray: 'rgba(143,182,255,0.14)',
    onDark: true,
  },
  warning: {
    gradient: ['#F4A81C', '#C2740A'],
    hero: '#2A1A04',
    body: 'rgba(42,26,4,0.76)',
    kicker: 'rgba(42,26,4,0.6)',
    ray: 'rgba(255,255,255,0.18)',
    onDark: false,
  },
  charcoal: {
    gradient: ['#2A251D', '#131009'],
    hero: '#FF7A33',
    body: 'rgba(255,246,239,0.82)',
    kicker: 'rgba(255,246,239,0.55)',
    ray: 'rgba(255,122,51,0.16)',
    onDark: true,
  },
};

export const RECAP_DISPLAY = 'SpaceGrotesk-Bold';
export const RECAP_BODY = 'Outfit-Regular';

export function accentFor(key) {
  return ACCENTS[key] ?? ACCENTS.orange;
}
