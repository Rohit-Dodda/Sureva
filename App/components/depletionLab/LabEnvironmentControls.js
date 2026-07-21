import React, { useCallback } from 'react';
import colors from '../../constants/colors';
import ControlCard from '../whatIf/ControlCard';
import SnapSlider from '../whatIf/SnapSlider';
import OptionToggleRow from '../whatIf/OptionToggleRow';
import { formatLabDuration } from '../../services/DepletionLabService';

export const DURATION_VALUES = [30, 60, 90, 120, 180, 240, 360, 480];
const UV_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const TEMP_VALUES = [15, 20, 25, 30, 35, 40, 45];
const HUMIDITY_VALUES = [20, 35, 50, 65, 80, 95];
const ACTIVITY_OPTIONS = [
  { label: 'Low', value: 'sedentary' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'High', value: 'high' },
];

function uvWord(uv) {
  if (uv <= 2) return 'Low';
  if (uv <= 5) return 'Moderate';
  if (uv <= 7) return 'High';
  if (uv <= 10) return 'Very High';
  return 'Extreme';
}

// The Lab's environment block: session length plus the conditions the
// wearable would be sensing. All values are hypothetical constants held
// for the whole simulated session.
export default React.memo(function LabEnvironmentControls({ config, onChange, onDraggingChange }) {
  const setDuration = useCallback((durationMinutes) => onChange({ durationMinutes }), [onChange]);
  const setUv = useCallback((uvIndex) => onChange({ uvIndex }), [onChange]);
  const setTemp = useCallback((temperature) => onChange({ temperature }), [onChange]);
  const setHumidity = useCallback((humidity) => onChange({ humidity }), [onChange]);
  const setActivity = useCallback((activityLevel) => onChange({ activityLevel }), [onChange]);

  return (
    <>
      <ControlCard
        label="Session length"
        value={formatLabDuration(config.durationMinutes)}
        actualLabel="How long you'll be out in the sun"
      >
        <SnapSlider values={DURATION_VALUES} value={config.durationMinutes} onChange={setDuration} onDraggingChange={onDraggingChange} />
      </ControlCard>

      <ControlCard
        label="UV Index"
        value={`UV ${config.uvIndex} · ${uvWord(config.uvIndex)}`}
        actualLabel="How intense the sun is"
      >
        <SnapSlider values={UV_VALUES} value={config.uvIndex} onChange={setUv} onDraggingChange={onDraggingChange} />
      </ControlCard>

      <ControlCard
        label="Temperature"
        value={`${config.temperature}°C`}
        actualLabel="Heat drives sweat, and sweat strips sunscreen"
      >
        <SnapSlider values={TEMP_VALUES} value={config.temperature} onChange={setTemp} onDraggingChange={onDraggingChange} />
      </ControlCard>

      <ControlCard
        label="Humidity"
        value={`${config.humidity}%`}
        actualLabel="Humid air slows sweat evaporation"
      >
        <SnapSlider values={HUMIDITY_VALUES} value={config.humidity} onChange={setHumidity} onDraggingChange={onDraggingChange} />
      </ControlCard>

      <ControlCard
        label="Activity level"
        value={ACTIVITY_OPTIONS.find((o) => o.value === config.activityLevel)?.label}
        actualLabel="Exertion multiplies heat's effect on depletion"
      >
        <OptionToggleRow options={ACTIVITY_OPTIONS} value={config.activityLevel} onChange={setActivity} />
      </ControlCard>
    </>
  );
});
