import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';

// Full-width sentence insight (protection gaps, streaks, correlations) —
// an icon-in-circle plus prose on a tinted pill, matching the insight-row
// language already used on the Passport map, instead of a bare line of
// text hung off a hairline divider.
export default React.memo(function LocationNote({ icon, text, warn }) {
  return (
    <View style={[st.row, warn && st.rowWarn]}>
      <View style={st.iconWrap}>
        <Ionicons name={icon} size={16} color={warn ? colors.warning : colors.orangeDark} />
      </View>
      <Text style={st.text}>{text}</Text>
    </View>
  );
});

const st = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
  },
  rowWarn: {
    backgroundColor: colors.amberWash,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  text: {
    flex: 1,
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.inkMid,
    lineHeight: 18,
    paddingTop: 6,
  },
});
