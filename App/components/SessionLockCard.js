import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../constants/colors';

// The 10-session unlock gate shared by Insights and Skin Age (and matching
// the visual language of Home's Protection Pattern lock): a lock glyph, a
// short promise, and a progress bar counting real completed sessions toward
// the threshold. `totalSessions` is the raw all-time completed-session count,
// so every screen's lock reports the same number for the same user.
function SessionLockCard({ totalSessions, threshold = 10, title, description }) {
  const count = totalSessions ?? 0;
  const progress = Math.min(count / threshold, 1);

  return (
    <View style={st.card}>
      <View style={st.lockWrap}>
        <Ionicons name="lock-closed" size={22} color={colors.muted} />
      </View>
      <Text style={st.title}>{title}</Text>
      <Text style={st.sub}>{description}</Text>
      <View style={st.progressWrap}>
        <View style={st.progressBg}>
          <LinearGradient
            colors={[colors.gradOrangeStart, colors.gradOrangeEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[st.progressFill, { width: `${progress * 100}%` }]}
          />
        </View>
        <Text style={st.progressLabel}>{count} / {threshold}</Text>
      </View>
    </View>
  );
}

export default React.memo(SessionLockCard);

const st = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  lockWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Outfit-Regular',
    fontSize: 16,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 8,
  },
  sub: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    maxWidth: 280,
  },
  progressWrap: {
    width: '100%',
    gap: 8,
    alignItems: 'center',
  },
  progressBg: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.4,
  },
});
