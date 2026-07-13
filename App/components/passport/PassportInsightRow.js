import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';

// One full-width insight row inside the stats card's expanded section:
// an icon, then either a headline/value pair (tappable location
// shortcuts) or a plain sentence — laid out with room to breathe instead
// of squeezed into a narrow horizontal-scroll chip.
export default React.memo(function PassportInsightRow({ icon, tint, warn, label, value, text, onPress }) {
  return (
    <TouchableOpacity
      style={[st.row, warn && st.rowWarn]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={st.iconWrap}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <View style={st.textWrap}>
        {label ? (
          <>
            <Text style={st.label}>{label}</Text>
            <Text style={st.value} numberOfLines={1}>{value}</Text>
          </>
        ) : (
          <Text style={st.text}>{text}</Text>
        )}
      </View>
      {onPress && <Ionicons name="chevron-forward" size={16} color={colors.muted} />}
    </TouchableOpacity>
  );
});

const st = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  rowWarn: {
    backgroundColor: colors.amberWash,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  label: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.muted,
    marginBottom: 1,
  },
  value: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 15,
    color: colors.ink,
  },
  text: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.inkMid,
    lineHeight: 18,
  },
});
