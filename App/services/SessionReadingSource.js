// A "reading source" is anything that calls onReading(reading) whenever
// a new sensor snapshot exists — { timestamp, uvIndex, temperature,
// humidity, activityLevel }, the exact shape SessionEngine.processInterval
// already expects. ActiveSessionScreen registers ONE handler and reacts
// to whatever arrives; it no longer loops over "how many ticks should
// exist by now" itself. That reframing IS the seam real hardware
// replaces: a BLE integration would call this same onReading callback
// from a characteristic-notification handler instead of a timer —
// nothing else in the app needs to change.
//
// This mock implementation is what gets swapped out. It emits one
// synthetic reading roughly every INTERVAL_MS using the same
// liveConditionsAt curve the rest of the demo already relies on, so it's
// still push-based (it decides when a reading exists and hands it over),
// not something the caller has to pull by computing tick counts from an
// elapsed display timer.
//
// While backgrounded, its setInterval throttles/pauses like any JS
// timer, so it naturally stops emitting. On return to foreground it
// catches up by computing how much real wall-clock time was missed and
// emitting a burst of readings for it — this preserves the existing felt
// behavior of continuous depletion across backgrounding (relied on for
// testing the Live Activity/Dynamic Island). A REAL reading source
// should almost certainly NOT do this: real readings from while the
// phone was backgrounded either genuinely happened and the device
// buffers + delivers them for real, or they genuinely didn't (an honest
// gap, not something to fabricate afterward). The catch-up burst exists
// here only because there's no real data to be honest about yet — don't
// carry it over when this file gets replaced by a real BLE source.
import { AppState } from 'react-native';
import { INTERVAL_MS } from '../../Algorithm/constants/algorithmConstants.js';
import { liveConditionsAt, toEngineActivityLevel } from '../components/activeSession/sessionMath';
import mockData from '../constants/mockData';

const INTERVAL_SECONDS = INTERVAL_MS / 1000;

// `startTime` must be the engine session's own startTime (not just
// "now") so tSec lines up exactly with what ActiveSessionScreen's curve
// derives from the same readings' timestamps. `alreadyEmittedCount` lets
// a resumed session (see SessionCheckpointStore.js) pick up numbering
// where it left off instead of replaying — and therefore duplicating —
// ticks that were already processed before the app died.
export function startMockReadingSource({ startTime, alreadyEmittedCount = 0, onReading }) {
  let emittedCount = alreadyEmittedCount;

  const emitDue = () => {
    const elapsedSecs = (Date.now() - startTime) / 1000;
    const targetCount = Math.floor(elapsedSecs / INTERVAL_SECONDS);
    while (emittedCount < targetCount) {
      emittedCount += 1;
      const tSec = emittedCount * INTERVAL_SECONDS;
      const live = liveConditionsAt(mockData.conditions, tSec);
      onReading({
        timestamp: Date.now(),
        uvIndex: live.uvIndex,
        temperature: live.temperature,
        humidity: live.humidity,
        activityLevel: toEngineActivityLevel(live.activity),
      });
    }
  };

  // Covers both a fresh mount (no-op, elapsedSecs is ~0) and resuming a
  // checkpoint after an app kill (catches up whatever was missed while
  // the app was closed, same mechanism as an ordinary backgrounding gap).
  emitDue();

  const intervalId = setInterval(emitDue, INTERVAL_MS);
  const sub = AppState.addEventListener('change', (nextState) => {
    if (nextState === 'active') emitDue();
  });

  return {
    stop() {
      clearInterval(intervalId);
      sub.remove();
    },
  };
}
