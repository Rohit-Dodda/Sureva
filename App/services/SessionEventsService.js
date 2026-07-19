// Tiny pub/sub so screens that stay mounted for the app's whole lifetime
// (Home and History are both kept alive by TabPager for smooth swiping —
// see App.js — so neither one naturally refetches after its initial mount)
// can learn when a session has actually finished saving to Supabase and
// refetch, instead of only ever reading whatever was true at mount time.
// Same lightweight module-level-callback shape as
// NotificationService.js's setActiveSessionOpener, just supporting more
// than one listener since both Home and History need to hear this.
const listeners = new Set();

export function onSessionSaved(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function notifySessionSaved() {
  listeners.forEach((cb) => {
    try { cb(); } catch { /* one listener's own error shouldn't break the rest */ }
  });
}
