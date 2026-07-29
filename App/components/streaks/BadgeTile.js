import React from 'react';
import StreakBadge from './StreakBadge';
import AchievementBadge from './AchievementBadge';

// Renders whichever badge family an item belongs to. The two cards differ (an
// achievement has a level pill and three tiers, a streak badge has a day
// count), so they stay separate components — this just picks one, letting the
// galleries stay ignorant of the distinction.
function BadgeTile({ item, celebrate = false, ringSize, sheenDelay }) {
  if (item.kind === 'streak') {
    return (
      <StreakBadge
        badge={item.badge}
        unlocked={item.level > 0}
        justUnlocked={celebrate}
        ringSize={ringSize}
        sheenDelay={sheenDelay}
      />
    );
  }
  return (
    <AchievementBadge
      badge={item.badge}
      level={item.level}
      celebrate={celebrate}
      ringSize={ringSize}
      sheenDelay={sheenDelay}
    />
  );
}

export default React.memo(BadgeTile);
