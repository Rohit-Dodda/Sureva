// Shared "is a device actually connected right now" state — the piece
// that didn't exist anywhere before this. Previously Home's device card
// and Settings' DEVICE section each read straight from mockData.device,
// which is permanently hardcoded to { connected: true, battery: 78 } —
// not simulating anything, just stuck showing one fake state forever.
//
// This is real state management with a stand-in data source, same
// pattern as SessionReadingSource.js: the paired device's identity
// persists across app restarts (AsyncStorage — real BLE pairing/bonding
// would too), but `connected` does NOT persist — a fresh launch starts
// disconnected until something reports a real connection, which is the
// honest behavior (a BLE link is a live radio session, it doesn't
// survive an app relaunch on its own). There is no fake auto-reconnect
// timer here pretending a device is present.
//
// Today, the only thing that calls reportConnected/pairDevice is
// BluetoothPairingScreen's scripted (fake) pairing flow — see its own
// header. Once real BLE integration exists, that code calls these exact
// same functions when a real connection/disconnection/battery-level
// event happens, and reportDisconnected() when the radio link actually
// drops — nothing downstream (HomeScreen, SettingsScreen) needs to
// change.
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PAIRED_DEVICE_KEY = 'pairedDevice'; // { deviceId, name }

const DEFAULT_STATE = {
  paired: false,
  deviceId: null,
  name: null,
  connected: false,
  battery: null,
  lastSyncedAt: null,
};

const DeviceConnectionContext = createContext(null);

export function DeviceConnectionProvider({ children }) {
  const [state, setState] = useState(DEFAULT_STATE);

  // Restores WHICH device is paired (identity only) on launch — connected
  // stays false until something actually reports a live connection, per
  // this file's header.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PAIRED_DEVICE_KEY);
        const saved = raw ? JSON.parse(raw) : null;
        if (saved?.deviceId && !cancelled) {
          setState((prev) => ({ ...prev, paired: true, deviceId: saved.deviceId, name: saved.name }));
        }
      } catch {
        // No saved pairing readable — same as a fresh install, not an error.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // First-time pairing (or re-pairing a different device) — persists the
  // identity so it survives the next app launch, and marks connected
  // immediately since a pairing flow that just succeeded implies a live
  // connection at that moment.
  const pairDevice = useCallback(({ deviceId, name, battery = null }) => {
    setState({ paired: true, deviceId, name, connected: true, battery, lastSyncedAt: Date.now() });
    AsyncStorage.setItem(PAIRED_DEVICE_KEY, JSON.stringify({ deviceId, name })).catch(() => {});
  }, []);

  // An already-paired device reconnecting (app relaunch, walked back into
  // BLE range, etc.) — identity was already known, this just flips the
  // live connection state back on.
  const reportConnected = useCallback((battery = null) => {
    setState((prev) => (prev.paired
      ? { ...prev, connected: true, battery: battery ?? prev.battery, lastSyncedAt: Date.now() }
      : prev)); // can't "connect" a device that was never paired
  }, []);

  const reportDisconnected = useCallback(() => {
    setState((prev) => ({ ...prev, connected: false }));
  }, []);

  // Real, user-facing action (Settings → Device → Forget This Device),
  // not just a dev/test affordance — clears the persisted identity too,
  // so it doesn't come back on next launch.
  const forgetDevice = useCallback(() => {
    setState(DEFAULT_STATE);
    AsyncStorage.removeItem(PAIRED_DEVICE_KEY).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ ...state, pairDevice, reportConnected, reportDisconnected, forgetDevice }),
    [state, pairDevice, reportConnected, reportDisconnected, forgetDevice]
  );

  return (
    <DeviceConnectionContext.Provider value={value}>
      {children}
    </DeviceConnectionContext.Provider>
  );
}

export function useDeviceConnection() {
  return useContext(DeviceConnectionContext) ?? { ...DEFAULT_STATE, pairDevice: () => {}, reportConnected: () => {}, reportDisconnected: () => {}, forgetDevice: () => {} };
}

// Small shared formatter so Home and Settings can't drift into showing
// different wording for the same lastSyncedAt value.
export function formatLastSynced(lastSyncedAt) {
  if (!lastSyncedAt) return 'Never';
  const mins = Math.max(0, Math.round((Date.now() - lastSyncedAt) / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default DeviceConnectionContext;
