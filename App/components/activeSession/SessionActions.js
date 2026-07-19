import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import PressableScale from '../PressableScale';

const Pill = React.memo(function Pill({ icon, label, active, onPress }) {
  return (
    <PressableScale
      style={[st.pill, active && st.pillActive]}
      containerStyle={st.pillFlex}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={17}
        color={active ? colors.orangeDark : colors.inkMid}
      />
      <Text style={[st.label, active && st.labelActive]}>{label}</Text>
    </PressableScale>
  );
});

// Secondary in-session actions: snooze the reapply alert, log a shade break.
// `snoozed` / `inShade` drive the active affordance.
export default React.memo(function SessionActions({
  snoozed,
  inShade,
  onSnooze,
  onShade,
}) {
  return (
    <View style={st.row}>
      <Pill
        icon={snoozed ? 'notifications-off' : 'notifications-outline'}
        label={snoozed ? 'Snoozed' : 'Snooze'}
        active={snoozed}
        onPress={onSnooze}
      />
      <Pill
        icon={inShade ? 'umbrella' : 'umbrella-outline'}
        label={inShade ? 'In shade' : 'Shade'}
        active={inShade}
        onPress={onShade}
      />
    </View>
  );
});

const st = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
  },
  pillFlex: {
    flex: 1,
  },
  pill: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: {
    backgroundColor: colors.orangeWash,
    borderColor: colors.orangeWashDark,
  },
  label: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.inkMid,
  },
  labelActive: {
    color: colors.orangeDark,
  },
});
