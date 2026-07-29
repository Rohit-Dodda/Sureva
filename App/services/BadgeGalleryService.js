import { STREAK_BADGES } from '../constants/streakBadges.js';
import { ACHIEVEMENT_BADGES } from '../constants/achievementBadges.js';
import { BADGE_SECTIONS, FEATURED, idOf } from '../constants/badgeGallery.js';
import { computeMetrics } from './AchievementService.js';
import { levelFor } from '../constants/achievementBadges.js';

// Flattens both badge families into one list of comparable items so a single
// grid can render them. Pure and synchronous — it takes the session list and
// the longest streak that StreakContext already derives, and stores nothing.
//
// `level` is the shared currency: a streak badge is 0 or 1 (locked/earned), an
// achievement is 0–3. That lets the newly-earned tracking treat "unlocked a
// streak badge" and "went from II to III" as the same kind of event.

// ⚠️ TEMPORARY — on-device preview of the earned states. Set true to force
// every badge to its top level regardless of real progress; set back to false
// (the shipping value) when you're done looking.
//
// While it's on, useNewlyEarned skips both the celebration and its AsyncStorage
// write, so previewing can't quietly mark 18 badges as "already celebrated" and
// rob you of the animation when you genuinely earn them.
export const PREVIEW_ALL_EARNED = false;

export function computeGalleryItems(sessions = [], longestStreak = 0) {
  const metrics = computeMetrics(sessions);

  const streaks = STREAK_BADGES.map((badge) => ({
    kind: 'streak',
    key: badge.key,
    id: idOf('streak', badge.key),
    section: 'streak',
    badge,
    level: longestStreak >= badge.days ? 1 : 0,
  }));

  const achievements = ACHIEVEMENT_BADGES.map((badge) => ({
    kind: 'achievement',
    key: badge.key,
    id: idOf('achievement', badge.key),
    section: badge.category,
    badge,
    level: levelFor(badge, metrics[badge.metric]),
  }));

  const items = [...streaks, ...achievements];
  if (!PREVIEW_ALL_EARNED) return items;
  return items.map((it) => ({ ...it, level: it.kind === 'streak' ? 1 : 3 }));
}

// Registry order is arbitrary to a user, so within a section the ones they hold
// come first — a section shouldn't bury the single badge they've earned behind
// six locked ones.
export function groupIntoSections(items) {
  return BADGE_SECTIONS.map((section) => ({
    ...section,
    items: items
      .filter((it) => it.section === section.key)
      .sort((a, b) => b.level - a.level),
  })).filter((s) => s.items.length > 0);
}

export function featuredFrom(items) {
  return FEATURED
    .map(({ kind, key }) => items.find((it) => it.kind === kind && it.key === key))
    .filter(Boolean);
}

export function earnedCount(items) {
  return items.filter((it) => it.level > 0).length;
}

export default { computeGalleryItems, groupIntoSections, featuredFrom, earnedCount };
