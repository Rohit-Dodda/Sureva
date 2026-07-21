// Local persistence for Sun Recaps. Recaps are a periodic, low-volume
// artifact and there's no Supabase table for them yet, so they live in
// AsyncStorage (same choice as the Depletion Lab's saved scenarios). Each
// full recap record is stored so the history page can replay it exactly as
// generated — never recomputed on revisit.
//
// TODO: move to a Supabase `sun_recaps` table (needs a migration) so recaps
// survive a reinstall / sync across devices.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'sunRecapRecords';
const MAX_STORED = 24; // generous cap (6/year hard limit means ~4 years)

export async function loadRecaps() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function saveRecap(recap) {
  try {
    const existing = await loadRecaps();
    const next = [recap, ...existing].slice(0, MAX_STORED);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

// The lightweight history the trigger evaluator needs: firing time, the
// chapter's end (so the next chapter scopes strictly after it), and a
// summary for the chapter-vs-last card.
export async function loadTriggerHistory() {
  const recaps = await loadRecaps();
  return recaps.map((r) => ({
    firedAt: r.firedAt,
    chapterEnd: r.chapterEnd,
    avgScore: r.summary?.avgScore ?? r.avgScore ?? null,
  }));
}

// Most recent recap's summary, for the next recap's chapter-over-chapter
// comparison.
export async function loadPrevSummary() {
  const recaps = await loadRecaps();
  return recaps.length ? recaps[0].summary ?? null : null;
}
