import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../../constants/colors';

// Custom map pin: electric orange circle with a white center dot. Shows a
// session-count badge when the cluster has more than one session, and a
// subtle gold ring on the location holding the user's best score overall.
export default React.memo(function PassportPin({ count, hasBestSession }) {
  return (
    <View style={st.wrap}>
      <View style={[st.pin, hasBestSession && st.pinBest]}>
        <View style={st.centerDot} />
      </View>
      {count > 1 && (
        <View style={st.badge}>
          <Text style={st.badgeText}>{count}</Text>
        </View>
      )}
    </View>
  );
});

const st = StyleSheet.create({
  wrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pin: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  pinBest: {
    borderWidth: 3,
    borderColor: colors.gold,
  },
  centerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.white,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: colors.orangeDark,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 10,
    color: colors.white,
  },
});
