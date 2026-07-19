// Local (device-scheduled) notifications for reapply alerts — no remote
// push, no server. The alert condition is detected on-device in real
// time, so a wall-clock-anchored scheduled notification is the only
// reliable way to reach the user once the app backgrounds (JS timers
// throttle/pause in the background; a scheduled OS notification does not).
import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';
import { ALERT_ESCALATION } from '../../Algorithm/constants/algorithmConstants.js';

export async function ensureNotificationPermission() {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

// Called once at app root. Prefers the in-app toast while foregrounded —
// the OS banner only needs to carry the alert once backgrounded/locked,
// which is the whole reason this feature exists.
export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => {
      const foregrounded = AppState.currentState === 'active';
      return {
        shouldShowBanner: !foregrounded,
        shouldShowList: true,
        shouldPlaySound: !foregrounded,
        shouldSetBadge: false,
      };
    },
  });
}

const LEVEL_CONTENT = {
  1: { title: 'Time to reapply', body: 'Your sunscreen protection has dropped below your threshold.' },
  2: { title: 'Still unprotected', body: 'You haven’t confirmed reapplication yet, your skin is exposed.' },
  3: { title: 'Reapply now', body: 'This is your third alert. Please reapply sunscreen as soon as possible.' },
  safety: { title: 'Safety check-in', body: 'It’s been 2 hours since your last application, reapply to stay protected.' },
};

async function scheduleAt(kind, date, sessionId) {
  if (!date || date.getTime() <= Date.now()) return null; // already past — don't schedule a no-op
  const { title, body } = LEVEL_CONTENT[kind];
  return Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true, data: { sessionId, kind } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  });
}

// Schedules all 4 reapply-alert notifications for a session, anchored off
// the estimated level-1 crossing time and the last-application timestamp.
// Levels 2/3 and the safety floor are fixed offsets from those two anchors
// (per ALERT_ESCALATION) — only level-1 ever needs live-rate re-projection,
// so callers only recompute estimatedLevel1Date, never the other three.
export async function scheduleReapplyAlerts({ estimatedLevel1Date, lastApplicationTime, sessionId }) {
  await cancelAllForSession(sessionId);
  const [level1Id, level2Id, level3Id, safetyFloorId] = await Promise.all([
    scheduleAt(1, estimatedLevel1Date, sessionId),
    scheduleAt(2, estimatedLevel1Date && new Date(estimatedLevel1Date.getTime() + ALERT_ESCALATION.secondAlertDelayMs), sessionId),
    scheduleAt(3, estimatedLevel1Date && new Date(estimatedLevel1Date.getTime() + ALERT_ESCALATION.thirdAlertDelayMs), sessionId),
    scheduleAt('safety', new Date(lastApplicationTime + ALERT_ESCALATION.safetyFloorMs), sessionId),
  ]);
  return { level1Id, level2Id, level3Id, safetyFloorId };
}

export async function cancelReapplyAlerts(ids) {
  const list = Object.values(ids || {}).filter(Boolean);
  await Promise.all(list.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
}

// Safety net independent of tracked ids — filters by the sessionId tag on
// every currently-scheduled notification, so a killed-and-restarted app
// (which loses any in-memory id refs) can't leave stale ones behind.
export async function cancelAllForSession(sessionId) {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const mine = scheduled.filter((n) => n.content?.data?.sessionId === sessionId);
    await Promise.all(mine.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {})));
  } catch {
    // Best-effort cleanup — never block session flow on this.
  }
}

// Sessions never resume across an app restart (HomeScreen always boots
// with activeSession = null), but a scheduled local notification lives in
// the OS queue independent of the app's lifecycle. Any session that ended
// via a crash, force-quit, or a Stop in Xcode instead of a clean "End
// Session" tap leaves its scheduled alerts behind with nothing left to
// cancel them — so sweep every reapply-tagged notification at each app
// launch, since at that point there is never a legitimate active session
// for one to belong to.
export async function cancelAllReapplyNotifications() {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const mine = scheduled.filter((n) => n.content?.data?.kind != null);
    await Promise.all(mine.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {})));
  } catch {
    // Best-effort cleanup — never block app startup on this.
  }
}

export function addReapplyNotificationResponseListener(onTapped) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const sessionId = response.notification.request.content.data?.sessionId;
    onTapped?.(sessionId);
  });
}

// There's no global navigation ref in this app (screens are manually
// composed local state, not a router) — HomeScreen registers its own
// "slide the session screen into view" callback here so a tapped
// notification can reach it without threading a prop through every layer
// between App.js and HomeScreen. Same unregister-on-cleanup shape as
// AppTourContext's registerTarget.
let activeSessionOpener = null;
export function setActiveSessionOpener(fn) {
  activeSessionOpener = fn;
  return () => { if (activeSessionOpener === fn) activeSessionOpener = null; };
}
export function openActiveSessionFromNotification() {
  activeSessionOpener?.();
}

// Fires almost immediately — lets a user confirm notifications are
// actually working from the Notification Settings screen.
export async function sendTestNotification() {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Sureva',
      body: 'Notifications are working, you’ll get alerts like this during a session.',
      sound: true,
    },
    trigger: null,
  });
}
