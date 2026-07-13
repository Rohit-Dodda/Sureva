import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../../constants/colors';
import ControlCard from './ControlCard';
import SnapSlider from './SnapSlider';
import OptionToggleRow from './OptionToggleRow';
import ReapplicationControl from './ReapplicationControl';
import whatIfInfoContent from './whatIfInfoContent';

const SPF_VALUES = [15, 30, 50, 70];
const TIMING_VALUES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45];
const WATER_OPTIONS = [
  { label: 'None', value: 0 },
  { label: '40-min', value: 40 },
  { label: '80-min', value: 80 },
];
const ACTIVITY_OPTIONS = [
  { label: 'Low', value: 'sedentary' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'High', value: 'high' },
];

const timingLabel = (v) => (v === 0 ? 'Right before going out' : `${v} min late`);
const activityLabel = (v) => ACTIVITY_OPTIONS.find((o) => o.value === v)?.label ?? v;
const waterLabel = (v) => (v === 0 ? 'None' : `${v}-min rated`);

// Zone 4: the five variable controls plus "Reset to actual".
// onDraggingChange lets the screen lock its ScrollView while a knob is held.
export default React.memo(function ControlsPanel({ overrides, actuals, durationMinutes, onChange, onReset, onDraggingChange }) {
  const setSpf = useCallback((spf) => onChange({ spf }), [onChange]);
  const setWater = useCallback((waterResistanceRating) => onChange({ waterResistanceRating }), [onChange]);
  const setTiming = useCallback((applicationDelayMinutes) => onChange({ applicationDelayMinutes }), [onChange]);
  const setReapps = useCallback((reapplicationMinutes) => onChange({ reapplicationMinutes }), [onChange]);
  const setActivity = useCallback((activityLevel) => onChange({ activityLevel }), [onChange]);

  const actualReapps = actuals.reapplicationMinutes ?? [];
  const reappActualLabel = actualReapps.length
    ? `Your actual: ${actualReapps.length} reapplication${actualReapps.length > 1 ? 's' : ''} (at ${actualReapps.map((m) => `${m}m`).join(', ')})`
    : 'Your actual: no reapplication';

  return (
    <View>
      <TouchableOpacity onPress={onReset} style={st.resetBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={st.resetLabel}>Reset to actual</Text>
      </TouchableOpacity>

      <ControlCard label="SPF" value={`SPF ${overrides.spf}`} actualLabel={`Your actual: SPF ${actuals.spf}`} info={whatIfInfoContent.spf}>
        <SnapSlider values={SPF_VALUES} value={overrides.spf} onChange={setSpf} onDraggingChange={onDraggingChange} />
      </ControlCard>

      <ControlCard
        label="Water resistance"
        value={waterLabel(overrides.waterResistanceRating)}
        actualLabel={`Your actual: ${waterLabel(actuals.waterResistanceRating)}`}
        info={whatIfInfoContent.water}
      >
        <OptionToggleRow options={WATER_OPTIONS} value={overrides.waterResistanceRating} onChange={setWater} />
      </ControlCard>

      <ControlCard
        label="Application timing"
        value={timingLabel(overrides.applicationDelayMinutes)}
        actualLabel={`Your actual: ${timingLabel(actuals.applicationDelayMinutes ?? 0)}`}
        info={whatIfInfoContent.timing}
      >
        <SnapSlider values={TIMING_VALUES} value={overrides.applicationDelayMinutes} onChange={setTiming} onDraggingChange={onDraggingChange} />
      </ControlCard>

      <ControlCard label="Reapplication" actualLabel={reappActualLabel} info={whatIfInfoContent.reapply}>
        <ReapplicationControl
          durationMinutes={durationMinutes}
          minutes={overrides.reapplicationMinutes}
          onChange={setReapps}
          hadActual={actualReapps.length > 0}
          onDraggingChange={onDraggingChange}
        />
      </ControlCard>

      <ControlCard
        label="Activity level"
        value={activityLabel(overrides.activityLevel ?? actuals.dominantActivity)}
        actualLabel={`Your actual: ${activityLabel(actuals.dominantActivity)}`}
        info={whatIfInfoContent.activity}
      >
        <OptionToggleRow
          options={ACTIVITY_OPTIONS}
          value={overrides.activityLevel ?? actuals.dominantActivity}
          onChange={setActivity}
        />
      </ControlCard>
    </View>
  );
});

const st = StyleSheet.create({
  resetBtn: {
    alignSelf: 'center',
    marginBottom: 10,
  },
  resetLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: colors.muted,
    textDecorationLine: 'underline',
  },
});
