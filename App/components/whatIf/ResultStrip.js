import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../../constants/colors';
import CountUpText from '../CountUpText';
import WhatIfInfoButton from './WhatIfInfoButton';
import whatIfInfoContent from './whatIfInfoContent';

function formatDelta(v) {
  const mins = Math.round(v);
  const sign = mins > 0 ? '+' : mins < 0 ? '−' : '±';
  const abs = Math.abs(mins);
  if (abs >= 60) return `${sign}${Math.floor(abs / 60)}h ${abs % 60}m`;
  return `${sign}${abs} min`;
}

// Zone 3: live plain-English summary of the difference between the actual
// session and the simulation. The headline number animates on every change.
export default React.memo(function ResultStrip({ comparison }) {
  const { deltaProtectedMinutes, deltaReapplicationsNeeded, actualMedDose, simulatedMedDose, stayedProtected } = comparison;
  const worse = deltaProtectedMinutes < 0;

  let caption;
  if (stayedProtected && deltaProtectedMinutes > 0) {
    caption = 'longer protected: you would have stayed covered the whole session.';
  } else if (deltaProtectedMinutes > 0) {
    caption = 'longer before your first reapply alert.';
  } else if (worse) {
    caption = 'sooner to your first alert than what actually happened.';
  } else {
    caption = 'same time to your first alert as your actual session.';
  }
  if (deltaReapplicationsNeeded > 0) {
    caption += ` ${deltaReapplicationsNeeded} fewer reapplication${deltaReapplicationsNeeded > 1 ? 's' : ''} needed.`;
  } else if (deltaReapplicationsNeeded < 0) {
    caption += ` ${-deltaReapplicationsNeeded} more reapplication${deltaReapplicationsNeeded < -1 ? 's' : ''} needed.`;
  }

  return (
    <View style={st.strip}>
      <View style={st.infoBtn}>
        <WhatIfInfoButton info={whatIfInfoContent.result} dark />
      </View>
      <CountUpText
        value={deltaProtectedMinutes}
        duration={300}
        format={formatDelta}
        style={[st.delta, worse && st.deltaWorse]}
      />
      <Text style={st.caption}>{caption}</Text>
      <Text style={st.med}>
        Skin UV dose: {actualMedDose} → {simulatedMedDose} MEDs
      </Text>
    </View>
  );
});

const st = StyleSheet.create({
  // Floats over the chart, pinned above the controls sheet — compact so
  // it hides as little of the chart as possible.
  strip: {
    backgroundColor: colors.charcoal,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 8,
  },
  delta: {
    fontFamily: 'Outfit-Regular',
    fontSize: 30,
    color: colors.orange,
    letterSpacing: -0.8,
  },
  deltaWorse: {
    color: colors.danger,
  },
  caption: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.onDark,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  med: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.onDarkMuted,
    marginTop: 6,
  },
  infoBtn: {
    position: 'absolute',
    top: 12,
    right: 14,
    zIndex: 2,
  },
});
