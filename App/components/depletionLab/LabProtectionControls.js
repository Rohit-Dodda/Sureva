import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../../constants/colors';
import ControlCard from '../whatIf/ControlCard';
import SnapSlider from '../whatIf/SnapSlider';
import OptionToggleRow from '../whatIf/OptionToggleRow';
import TimelineMarkers from '../whatIf/TimelineMarkers';
import LabStepperRow from './LabStepperRow';

const SPF_VALUES = [15, 30, 50, 70];
const WATER_OPTIONS = [
  { label: 'None', value: 0 },
  { label: '40-min', value: 40 },
  { label: '80-min', value: 80 },
];
const BREAK_TYPE_OPTIONS = [
  { label: 'Splash', value: 'splash' },
  { label: 'Swim', value: 'swim' },
];
const MAX_MARKERS = 4;

// Inserts a new marker in the middle of the largest empty stretch of the
// timeline (snapped to 5 min), so added events land somewhere sensible
// without disturbing markers the user has already dragged into place.
export function addMarkerMinute(minutes, durationMinutes) {
  const sorted = [...minutes].sort((a, b) => a - b);
  const stops = [0, ...sorted, durationMinutes];
  let gapStart = 0;
  let gapSize = -1;
  for (let i = 1; i < stops.length; i++) {
    if (stops[i] - stops[i - 1] > gapSize) {
      gapSize = stops[i] - stops[i - 1];
      gapStart = stops[i - 1];
    }
  }
  const mid = Math.round((gapStart + gapSize / 2) / 5) * 5;
  return [...minutes, Math.min(Math.max(mid, 5), Math.max(5, durationMinutes - 5))];
}

// The Lab's protection block: what's on your skin (SPF, water resistance),
// your own planned reapplications, and any water breaks — both as
// draggable markers on the session timeline.
export default React.memo(function LabProtectionControls({ config, onChange, onDraggingChange }) {
  const setSpf = useCallback((spf) => onChange({ spf }), [onChange]);
  const setWater = useCallback((waterResistanceRating) => onChange({ waterResistanceRating }), [onChange]);
  const setReapps = useCallback((reapplicationMinutes) => onChange({ reapplicationMinutes }), [onChange]);
  const setBreaks = useCallback((waterBreakMinutes) => onChange({ waterBreakMinutes }), [onChange]);
  const setBreakType = useCallback((waterBreakType) => onChange({ waterBreakType }), [onChange]);

  const addReapp = useCallback(
    () => onChange({ reapplicationMinutes: addMarkerMinute(config.reapplicationMinutes, config.durationMinutes) }),
    [onChange, config.reapplicationMinutes, config.durationMinutes]
  );
  const removeReapp = useCallback(
    () => onChange({ reapplicationMinutes: config.reapplicationMinutes.slice(0, -1) }),
    [onChange, config.reapplicationMinutes]
  );
  const addBreak = useCallback(
    () => onChange({ waterBreakMinutes: addMarkerMinute(config.waterBreakMinutes, config.durationMinutes) }),
    [onChange, config.waterBreakMinutes, config.durationMinutes]
  );
  const removeBreak = useCallback(
    () => onChange({ waterBreakMinutes: config.waterBreakMinutes.slice(0, -1) }),
    [onChange, config.waterBreakMinutes]
  );

  return (
    <>
      <ControlCard label="SPF" value={`SPF ${config.spf}`} actualLabel="What's on your skin at the start">
        <SnapSlider values={SPF_VALUES} value={config.spf} onChange={setSpf} onDraggingChange={onDraggingChange} />
      </ControlCard>

      <ControlCard
        label="Water resistance"
        value={config.waterResistanceRating === 0 ? 'None' : `${config.waterResistanceRating}-min rated`}
        actualLabel="How well it survives splashes and swims"
      >
        <OptionToggleRow options={WATER_OPTIONS} value={config.waterResistanceRating} onChange={setWater} />
      </ControlCard>

      <ControlCard label="Your reapplication plan" actualLabel="Optional — leave at 0 to see the unmanaged outcome">
        <LabStepperRow label="Planned reapplications" count={config.reapplicationMinutes.length} max={MAX_MARKERS} onAdd={addReapp} onRemove={removeReapp} />
        {config.reapplicationMinutes.length > 0 && (
          <>
            <TimelineMarkers
              durationMinutes={config.durationMinutes}
              minutes={config.reapplicationMinutes}
              onChange={setReapps}
              onDraggingChange={onDraggingChange}
              markerColor={colors.orange}
            />
            <Text style={st.hint}>Drag to plan when you'd reapply</Text>
          </>
        )}
      </ControlCard>

      <ControlCard label="Water activity" actualLabel="Each dip cuts protection the moment it happens">
        <LabStepperRow label="Water breaks" count={config.waterBreakMinutes.length} max={MAX_MARKERS} onAdd={addBreak} onRemove={removeBreak} />
        {config.waterBreakMinutes.length > 0 && (
          <>
            <View style={st.typeRow}>
              <OptionToggleRow options={BREAK_TYPE_OPTIONS} value={config.waterBreakType} onChange={setBreakType} />
            </View>
            <TimelineMarkers
              durationMinutes={config.durationMinutes}
              minutes={config.waterBreakMinutes}
              onChange={setBreaks}
              onDraggingChange={onDraggingChange}
              markerColor={colors.navy}
            />
            <Text style={st.hint}>Drag to move when you'd be in the water</Text>
          </>
        )}
      </ControlCard>
    </>
  );
});

const st = StyleSheet.create({
  typeRow: {
    marginTop: 12,
  },
  hint: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
});
