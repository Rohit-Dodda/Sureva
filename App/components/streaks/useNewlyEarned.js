import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PREVIEW_ALL_EARNED } from '../../services/BadgeGalleryService';

const SEEN_KEY = 'sureva_badges_seen';

// Tracks the LEVEL last celebrated per badge, across both families, and returns
// the set of ids that have gone up since. Storing the level rather than a bare
// "seen" flag is what makes an achievement level-up (II → III) replay the
// unlock animation instead of the ring quietly sliding forward.
//
// Returns null while loading so callers don't fire a celebration on the first
// render, before the persisted map is known — that would replay every badge the
// user already owns on every app launch.
//
// On a genuine first run (no stored map at all) the current levels are recorded
// silently. Otherwise a user who already had progress before this feature
// shipped would be ambushed by a celebration for badges they earned weeks ago.
export default function useNewlyEarned(items) {
  const [seen, setSeen] = useState(null);
  const [newlyEarned, setNewlyEarned] = useState(null);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SEEN_KEY);
        setSeen(raw ? JSON.parse(raw) : {});
        setSeeded(raw != null);
      } catch {
        setSeen({});
        setSeeded(true); // can't read storage — don't celebrate blind
      }
    })();
  }, []);

  useEffect(() => {
    if (!seen) return;
    // Preview forces every badge earned, which would otherwise fire 18 unlock
    // animations at once and persist them all as celebrated.
    if (PREVIEW_ALL_EARNED) { setNewlyEarned(new Set()); return; }

    const levels = {};
    const risen = [];
    for (const it of items) {
      if (it.level > 0) levels[it.id] = it.level;
      if (it.level > 0 && it.level > (seen[it.id] ?? 0)) risen.push(it.id);
    }

    if (!risen.length) { setNewlyEarned(new Set()); return; }

    const merged = { ...seen, ...levels };
    AsyncStorage.setItem(SEEN_KEY, JSON.stringify(merged)).catch(() => {});
    setSeen(merged);
    // First run: record what they already have, celebrate none of it.
    setNewlyEarned(seeded ? new Set(risen) : new Set());
    if (!seeded) setSeeded(true);
  }, [seen, items, seeded]);

  // Lets the owner drop the set once its celebration has been handed off, so
  // the same unlock can't re-trigger a redirect every render.
  const clear = useCallback(() => setNewlyEarned(new Set()), []);

  return { newlyEarned, clear };
}
