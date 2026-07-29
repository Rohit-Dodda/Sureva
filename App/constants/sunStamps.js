import colors from './colors.js';

// Visual recipe per Sun Stamp tier. Separated from SunStampService (which
// decides WHICH tier a capture earns) so the rarity logic stays pure and
// node-testable, with no color or styling knowledge in it at all — the same
// split streakBadges/achievementBadges already keep from their services.
//
// Escalation is deliberate and must survive being seen without its label:
// each tier widens its gradient's chroma span, gains a heavier frame, and
// only `once` crosses two distant hue families and earns a seal.
export const STAMP_TIER_ART = {
  everyday: {
    label: 'Everyday',
    sky: [colors.stampEverydayStart, colors.stampEverydayEnd],
    glow: colors.white,
    accent: colors.stampEverydayAccent,
    shade: colors.stampEverydayShade,
    // Sun sits high and small — flat midday light, nothing dramatic.
    sunY: 0.24,
    sunScale: 0.34,
    rayCount: 0,
    rayOpacity: 0,
    frameWidth: 1,
    hasSeal: false,
    shimmer: false,
  },
  seasonal: {
    label: 'Seasonal',
    sky: [colors.stampSeasonalStart, colors.stampSeasonalEnd],
    glow: colors.stampSeasonalStart,
    accent: colors.stampSeasonalAccent,
    shade: colors.stampSeasonalShade,
    sunY: 0.46,
    sunScale: 0.44,
    rayCount: 12,
    rayOpacity: 0.16,
    frameWidth: 1.5,
    hasSeal: false,
    shimmer: false,
  },
  alignment: {
    label: 'Alignment',
    sky: [colors.stampAlignmentStart, colors.stampAlignmentEnd],
    glow: colors.stampSeasonalStart,
    accent: colors.stampAlignmentAccent,
    shade: colors.stampAlignmentShade,
    sunY: 0.58,
    sunScale: 0.5,
    rayCount: 16,
    rayOpacity: 0.22,
    frameWidth: 2,
    hasSeal: false,
    shimmer: true,
  },
  once: {
    label: 'Once-a-Year',
    // Three stops rather than two — the only tier that crosses hue families,
    // which is what makes it legible as "special" from across a room.
    sky: [colors.stampOnceStart, colors.stampAlignmentStart, colors.stampOnceEnd],
    glow: colors.stampOnceEnd,
    accent: colors.stampOnceAccent,
    shade: colors.stampOnceShade,
    sunY: 0.7,
    sunScale: 0.56,
    rayCount: 20,
    rayOpacity: 0.3,
    frameWidth: 2,
    hasSeal: true,
    shimmer: true,
  },
};

export function artFor(tier) {
  return STAMP_TIER_ART[tier] ?? STAMP_TIER_ART.everyday;
}

export default { STAMP_TIER_ART, artFor };
