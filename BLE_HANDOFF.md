# BLE Integration Handoff

The app side is done. This is what's left — all of it is the hardware/Bluetooth bridge.

## Before writing any code: 3 decisions we need to make together

These aren't yours to decide alone — the app's engine is already built around specific assumptions, so let's agree on these first or your code won't line up with what the app expects.

1. **Timing.** The device polls every 5 seconds (per spec), but the app's depletion engine currently processes one reading per 30-second "tick." Do you send one reading every 5s and the app averages six of them into a tick, or does the engine's tick rate change to match the device? This affects `Algorithm/constants/algorithmConstants.js`'s `INTERVAL_MS`.
2. **Data format.** What exact bytes/units does the firmware send over the BLE characteristic? The app needs `{ uvIndex, temperature (°C), humidity (%), activityLevel }` per reading — does the device report activity level itself, or send raw motion data the app has to classify into `sedentary` / `moderate` / `high`?
3. **Water events.** Does the device detect "just got submerged" and report it? If so, what does that signal look like? The app has a real function ready to receive it (`SessionEngine.handleWaterEvent(durationSeconds)` in `Algorithm/services/SessionService.js`) but nothing currently calls it.

## What you're building

### 1. Bluetooth plumbing (from scratch)
- Add a BLE library (e.g. `react-native-ble-plx`) — nothing is installed yet.
- Add iOS Bluetooth permissions — `Info.plist`/`app.json` currently has **zero** Bluetooth entries (no `NSBluetoothAlwaysUsageDescription`). Without this, iOS blocks all Bluetooth API calls outright.
- Scan for the device, connect, subscribe to its characteristic(s), decode whatever bytes it sends into the reading shape above.

### 2. Plug into the 3 seams already built and tested for this

**`App/services/SessionReadingSource.js`** — replace `startMockReadingSource` with a real version. Same contract:
```js
startYourBleReadingSource({ onReading }) 
// call onReading({ timestamp, uvIndex, temperature, humidity, activityLevel })
// whenever a real reading arrives. Returns { stop() }.
```
`ActiveSessionScreen.js` already calls this — swap the import, nothing else changes.

**This is the actual wire into the depletion algorithm — here's the full path, so it's not a black box:**
```
your BLE code → onReading(reading)
  → ActiveSessionScreen.js's handleIncomingReading(reading)
    → SessionEngine.processInterval(reading)   [Algorithm/services/SessionService.js]
      → runSessionInterval(...)                [Algorithm/js/depletionEngine.js — the real math]
```
`processInterval` is the one function that actually runs the depletion math (UV/heat/activity/skin-type multipliers, alert thresholds, everything). Every reading you produce eventually lands there. **You should not need to touch `depletionEngine.js` or `algorithmConstants.js` at all** — the math is done and already tested (70/70 passing in `Algorithm/tests/engineTests.js`) — you're only responsible for the shape of what gets fed in via `onReading`. The one exception is the `INTERVAL_MS` timing decision above, if we decide the tick rate itself needs to change.

One more real algorithmic input, already fully wired, that you don't need to build: **device placement** (wrist vs. shoulder strap vs. hat, etc.) — a user sets this in Settings → Device Placement, and it already correctly adjusts the UV reading before it hits the math (`calculatePlacementCorrection` in `depletionEngine.js`). Nothing needed from you here unless the device can auto-detect its own placement, in which case that'd be a new conversation.

**Gap you'll need to design for — mid-session disconnects:** the `onReading`-only contract above has no `onDisconnected`/`onError`. If the BLE link drops mid-session (walked out of range, radio hiccup), there's currently no path for the app to notice or show anything — readings just silently stop. Before this ships for real use, the reading source needs a way to signal "connection lost" back to `ActiveSessionScreen`, and that screen needs a visible state for it (a banner, a paused indicator, something) rather than just going quiet. This doesn't exist yet on either side — flag it back to me if you want help building the app-side half of it once you know what your BLE disconnect events look like.

**`App/services/DeviceScanSource.js`** — replace all three mock functions with real BLE calls, same callback shapes:
```js
getBluetoothState()                          // 'poweredOn' | 'poweredOff'
startDeviceScan({ onDeviceFound })            // calls onDeviceFound(device) per device found
connectToDevice(device, { onConnected, onError })
```
`BluetoothPairingScreen.js` already calls these — swap the import, nothing else changes.

**`App/context/DeviceConnectionContext.js`** — call these from your real connection code when things actually happen:
```js
pairDevice({ deviceId, name, battery })  // first successful pairing
reportConnected(battery)                 // reconnect to an already-paired device
reportDisconnected()                     // radio link dropped
```
Home and Settings already read from this context — call these functions and the UI updates automatically.

### 3. Water events (once decision #3 above is settled)
Call `SessionEngine.handleWaterEvent(durationSeconds)` when the device reports one.

## If you're also touching firmware
Per the project rules, the JS depletion engine (`Algorithm/js/depletionEngine.js`) and the firmware's C version must always produce identical output for identical input. If the firmware does any of its own UV/heat/depletion math (rather than just streaming raw sensor values for the app to process), that math needs to match this file exactly — flag it so we can check the two stay in sync.

## Known gaps, so you're not surprised
- None of this has ever been tested against real hardware — the seams are logically verified, not hardware-verified. Expect some friction on the first real connection.
- Re-pairing a device from Settings isn't wired up yet — only first-time pairing (onboarding) is.
- The weekly UV budget bar has a known, unrelated bug (ignores sunscreen) — not blocking, already flagged separately.
