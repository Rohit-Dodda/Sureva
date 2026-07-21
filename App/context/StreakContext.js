import React, {
  createContext, useContext, useState, useEffect, useCallback, useMemo,
} from 'react';
import SupabaseService from '../services/SupabaseService';
import { onSessionSaved } from '../services/SessionEventsService';
import { useAuth } from './AuthContext';
import { computeStreak } from '../services/StreakService';

// App-wide streak state, derived entirely from existing session history — no
// new data is collected. One getSessions fetch feeds computeStreak; the result
// is shared by the tab-icon badge (FloatingTabBar), the Streaks screen, and
// the post-check-in reveal (HomeScreen), so all three can never disagree about
// the current streak. Refreshes on the same guaranteed-correct onSessionSaved
// signal Home uses, so the number is right the moment a session finishes.
const StreakContext = createContext(null);

const EMPTY = computeStreak([]);

export function StreakProvider({ children }) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState(null); // null = still loading

  const load = useCallback(async () => {
    if (!user?.id) { setSessions([]); return; }
    try {
      const { data, error } = await SupabaseService.getSessions(user.id);
      if (error || !data) return; // keep whatever's already loaded on failure
      setSessions(data);
    } catch {
      // Leave the last-known sessions in place.
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => onSessionSaved(load), [load]);

  // Recomputed only when the underlying sessions change — never stored, always
  // derived (the streak is pure output of the session list).
  const streak = useMemo(() => computeStreak(sessions || []), [sessions]);

  const value = useMemo(
    () => ({ sessions: sessions || [], streak, loading: sessions === null, refresh: load }),
    [sessions, streak, load]
  );

  return <StreakContext.Provider value={value}>{children}</StreakContext.Provider>;
}

export function useStreak() {
  return useContext(StreakContext) ?? { sessions: [], streak: EMPTY, loading: false, refresh: () => {} };
}

export default StreakContext;
