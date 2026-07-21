import React, { useCallback } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import colors from '../../constants/colors';
import TimelineMarkers from './TimelineMarkers';

const SNAP_MIN = 5; // matches TimelineMarkers' snap increment

// Reapplication editor. If the session had reapplications, each one is a
// draggable marker on a mini timeline. If it had none, a toggle reveals a
// marker so the user can see what one reapplication would have done.
// The drag mechanics live in TimelineMarkers (shared with the Depletion
// Lab's event controls); this wrapper owns only the add-one toggle.
export default React.memo(function ReapplicationControl({ durationMinutes, minutes, onChange, hadActual, onDraggingChange }) {
  const toggleAdded = useCallback(
    (on) => onChange(on ? [Math.round(durationMinutes / 2 / SNAP_MIN) * SNAP_MIN] : []),
    [onChange, durationMinutes]
  );

  return (
    <View>
      {!hadActual && (
        <View style={st.toggleRow}>
          <Text style={st.toggleLabel}>Add a reapplication</Text>
          <Switch
            value={minutes.length > 0}
            onValueChange={toggleAdded}
            trackColor={{ false: colors.surface, true: colors.orange }}
            thumbColor={colors.white}
          />
        </View>
      )}
      {minutes.length > 0 && (
        <TimelineMarkers
          durationMinutes={durationMinutes}
          minutes={minutes}
          onChange={onChange}
          onDraggingChange={onDraggingChange}
          markerColor={colors.protected}
        />
      )}
      {minutes.length > 0 && <Text style={st.hint}>Drag to move when you reapplied</Text>}
    </View>
  );
});

const st = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  toggleLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.ink,
  },
  hint: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
});
