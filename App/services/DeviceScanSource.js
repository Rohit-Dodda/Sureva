// The Bluetooth-pairing equivalent of SessionReadingSource.js: a small,
// exact contract BluetoothPairingScreen reacts to, instead of that
// screen deciding on its own timeline when a device was "found" or
// "connected." Real BLE integration replaces the three functions below
// with ones backed by an actual scan/connect (e.g. react-native-ble-plx),
// calling the exact same callback shapes — the screen itself doesn't
// need to change.
//
// What this mock CANNOT do: prove that scanning/pairing/connecting
// actually works against real hardware. That only gets proven once a
// real BLE library and a real device exist. What it DOES do: make the
// screen's state machine (checking Bluetooth → scanning → found →
// connecting → connected, plus the error/bluetoothOff branches) fully
// reactive and already-tested today, so the eventual swap is trusting
// one new thing (the radio), not also debugging the screen's logic for
// the first time.
const MOCK_DEVICE = { id: '1', name: 'Sureva Device', rssi: -52 };

// A real BLE library exposes the OS radio's on/off state and lets you
// subscribe to it changing (react-native-ble-plx: manager.state() /
// onStateChange). There is no real radio to query yet, so this always
// reports on — the seam exists so BluetoothPairingScreen never assumes
// Bluetooth is available without asking first.
export function getMockBluetoothState() {
  return 'poweredOn'; // or 'poweredOff'
}

// Emits onDeviceFound(device) once, after a delay standing in for a real
// scan's discovery latency. A real scan can find zero, one, or several
// devices over time and keeps running until stopScan() is called — the
// caller (BluetoothPairingScreen) owns the "give up after N seconds with
// nothing found" policy, not this function, since that's a UX decision,
// not something a scan API itself would enforce.
export function startMockDeviceScan({ onDeviceFound }) {
  const timeoutId = setTimeout(() => onDeviceFound(MOCK_DEVICE), 3000);
  return {
    stopScan() {
      clearTimeout(timeoutId);
    },
  };
}

// Emits onConnected(device) after a delay standing in for real connection
// latency. onError exists so the screen has a real failure path wired up
// (its 'error' state can be reached from either a scan timeout or a
// failed connect) — this mock never actually calls it, since there's
// nothing real to fail against yet.
export function connectToMockDevice(device, { onConnected, onError }) {
  const timeoutId = setTimeout(() => onConnected(device), 2000);
  return {
    cancel() {
      clearTimeout(timeoutId);
    },
  };
}
