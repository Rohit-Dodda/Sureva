import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import PressableScale from '../PressableScale';

// One result inside Quick Search: an icon badge, the card (or page) name,
// and the page it lives on underneath, on a dark surface that sits cleanly
// over the blurred backdrop.
export default React.memo(function QuickSearchResultRow({ entry, onPress }) {
  return (
    <PressableScale onPress={() => onPress(entry)} scaleTo={0.97} style={st.row}>
      <View style={st.iconBadge}>
        <Ionicons name={entry.icon} size={18} color={colors.orangeLight} />
      </View>
      <View style={st.textWrap}>
        <Text style={st.title} numberOfLines={1}>{entry.title}</Text>
        <Text style={st.page} numberOfLines={1}>{entry.page}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.onDarkMuted} />
    </PressableScale>
  );
});

const st = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 15,
    color: colors.onDark,
    letterSpacing: -0.1,
  },
  page: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.onDarkMuted,
    marginTop: 1,
  },
});
