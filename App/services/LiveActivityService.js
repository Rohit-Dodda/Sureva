// Wraps expo-live-activity so screens never call the raw native library
// directly — same pattern as NotificationService.js/WeatherService.js.
//
// Deliberately temporary: this app has no BLE device yet (see CLAUDE.md),
// so the protection %/next-alert numbers fed in here come from the same
// deterministic mock-conditions math the rest of an active session uses.
// Once the real device lands, updates will need to be driven by actual
// incoming BLE data (which can wake the app briefly in the background via
// iOS's Bluetooth background mode) rather than the foreground-only React
// effect that drives this today — that's a real, separate rework, not
// just swapping which numbers get passed to the functions below.
//
// expo-live-activity is itself an unmaintained (deprecated by its author)
// library — chosen anyway because the actively-maintained alternative
// (expo-widgets) requires Expo SDK 55+, and this project is pinned to
// SDK 54; upgrading the SDK for a feature this temporary wasn't judged
// worth the risk to the app's other native modules (camera, location,
// maps, three.js).
import { Platform } from 'react-native';
import * as LiveActivity from 'expo-live-activity';
import colors from '../constants/colors';
import { statusFor } from '../components/activeSession/sessionMath';

// The library's README frames progressBar's `date`/`progress` as "only one
// at a time" — that's only true for its own default progress-bar UI (which
// this app doesn't use, having fully replaced it with SurevaDesign's custom
// views). The native module (ExpoLiveActivityModule.swift) maps both fields
// independently and unconditionally: `timerEndDateInMilliseconds:
// state.progressBar?.date, progress: state.progressBar?.progress` — so
// setting both here is required, not just allowed. A bare top-level
// `progress` key (not nested under progressBar) is silently dropped by the
// native Record decoder, which only declares `progressBar.date`/
// `progressBar.progress` — that was this file's actual bug: the Swift side
// derives its status word/color entirely from `context.state.progress` (see
// ProtectionLevel in SurevaDesign.swift), and without progressBar.progress
// set, it's always nil, which clamps to 0 (empty/red) regardless of the
// real protection level.
function buildState(protectionPct, nextAlertDate) {
  const status = statusFor(protectionPct);
  return {
    title: 'Sureva',
    subtitle: `${Math.round(protectionPct)}% protected · ${status.word}`,
    progressBar: {
      date: nextAlertDate.getTime(),
      progress: Math.max(0, Math.min(1, protectionPct / 100)),
    },
  };
}

function buildConfig(protectionPct) {
  const status = statusFor(protectionPct);
  return {
    backgroundColor: colors.charcoal,
    titleColor: colors.white,
    subtitleColor: colors.white,
    progressViewTint: status.color,
    progressViewLabelColor: colors.white,
    timerType: 'circular',
    // Tapping the Live Activity/Dynamic Island opens the app to this route
    // (handled in App.js's Linking listener) — the library has no App
    // Intents support, so a tap can only open the app, not act directly.
    deepLinkUrl: 'session',
  };
}

// Returns the activity id to keep for update/end calls, or null if Live
// Activities aren't available here (Android, iOS < 16.2, or the native
// module isn't linked yet because prebuild hasn't run) — callers treat
// null exactly like "feature unavailable," never a crash.
export function startSessionActivity(protectionPct, nextAlertDate) {
  if (Platform.OS !== 'ios') return null;
  try {
    return LiveActivity.startActivity(buildState(protectionPct, nextAlertDate), buildConfig(protectionPct)) ?? null;
  } catch {
    return null;
  }
}

export function updateSessionActivity(id, protectionPct, nextAlertDate) {
  if (!id || Platform.OS !== 'ios') return;
  try {
    LiveActivity.updateActivity(id, buildState(protectionPct, nextAlertDate));
  } catch {
    // Best-effort — a missed update just means the island shows slightly
    // stale info until the next successful one, never a crash.
  }
}

export function endSessionActivity(id, finalProtectionPct) {
  if (!id || Platform.OS !== 'ios') return;
  try {
    LiveActivity.stopActivity(id, {
      title: 'Sureva',
      subtitle: `Session ended · ${Math.round(finalProtectionPct)}% protected`,
      progressBar: { progress: Math.max(0, Math.min(1, finalProtectionPct / 100)) },
    });
  } catch {
    // Best-effort — the OS will eventually clean up a stale activity itself.
  }
}
