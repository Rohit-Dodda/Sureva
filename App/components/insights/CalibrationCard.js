import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SectionCard from '../SectionCard';
import PressableScale from '../PressableScale';
import colors from '../../constants/colors';

// Only renders when there's an active offset — PersonalCalibrationService
// only ever tightens the alert threshold (offset >= 0), so a zero offset
// is the normal/no-signal state, not something to surface. Not silent
// about the adjustment itself, though: it changes real alert timing, so
// it stays visible with an explicit undo rather than working invisibly.
export default React.memo(function CalibrationCard({ offset, summary, onReset, resetting }) {
  if (!offset) return null;

  return (
    <SectionCard glass icon="pulse-outline" title="Personal Calibration">
      <View style={st.row}>
        <Ionicons name="information-circle-outline" size={18} color={colors.orange} style={st.icon} />
        <Text style={st.text}>{summary}</Text>
      </View>
      <PressableScale onPress={onReset} disabled={resetting} style={st.resetBtn}>
        <Text style={st.resetText}>{resetting ? 'Resetting…' : 'Undo this adjustment'}</Text>
      </PressableScale>
    </SectionCard>
  );
});

const st = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  icon: {
    marginTop: 2,
  },
  text: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.inkMid,
    lineHeight: 19,
    flex: 1,
  },
  resetBtn: {
    alignSelf: 'flex-start',
  },
  resetText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.orange,
  },
});
