// Local, on-device checkpoint of the one in-progress session — the fix
// for "session data only lives in memory." Before this, an active
// session existed only as a React state value (HomeScreen.js) plus a
// plain JS module variable (Algorithm/services/SessionService.js). Both
// vanish completely if the app process is killed (backgrounding alone
// was already handled — see HomeScreen's AppState wall-clock
// reconciliation — this is specifically for the app actually being
// terminated and relaunched). Same pattern as SunRecapStore.js: plain
// AsyncStorage, try/catch everywhere, silent fallback rather than a
// blocked screen (CLAUDE.md).
//
// Written after every processed engine tick and every reapply
// (ActiveSessionScreen.js), cleared the moment a session ends normally
// or is discarded. On next app launch, HomeScreen checks for a leftover
// checkpoint before rendering its normal idle state — if one exists and
// belongs to the signed-in user, the live session is rehydrated exactly
// where it left off (via SessionService.resumeSession) instead of being
// lost outright.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'activeSessionCheckpoint';

export async function saveCheckpoint(checkpoint) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(checkpoint));
  } catch {
    // Best-effort — a missed write just means recovery falls back to
    // the last successful checkpoint (at most ~30s stale), never a crash.
  }
}

export async function loadCheckpoint() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function clearCheckpoint() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // Best-effort — a stale leftover checkpoint is harmless: it's
    // user-scoped at restore time and gets overwritten by the very next
    // real session anyway.
  }
}
