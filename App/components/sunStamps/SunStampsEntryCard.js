import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import PressableScale from '../PressableScale';

// The way into Sun Stamps, on Passport — where the app's other keepsakes
// already live. Two actions: go catch one, or look at what you have.
//
// Copy is an invitation, never a prompt about risk or a nudge about
// protection. This card must read like an open door.
function SunStampsEntryCard({ filled, total, onScout, onOpenAtlas }) {
  const hasAny = filled > 0;

  return (
    <View style={st.card}>
      <LinearGradient
        colors={[colors.stampAlignmentStart, colors.stampSeasonalEnd]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={st.banner}
      >
        <View style={st.bannerText}>
          <Text style={st.title}>Catch today's light</Text>
          <Text style={st.blurb}>
            {hasAny
              ? `${filled} of ${total} slots filled in your Atlas.`
              : 'Point at the sky and keep what it looks like right now.'}
          </Text>
        </View>
        <Ionicons name="sunny-outline" size={30} color={colors.white} style={st.bannerIcon} />
      </LinearGradient>

      <View style={st.actions}>
        {/* PressableScale puts `style` on an inner Animated.View and
            `containerStyle` on the Pressable itself — so the flex that
            divides the row has to go on containerStyle, or each button
            collapses to its content width and crushes the label. */}
        <PressableScale containerStyle={st.action} style={st.primary} onPress={onScout}>
          <Ionicons name="camera-outline" size={17} color={colors.white} />
          <Text style={st.primaryLabel} numberOfLines={1}>Scout</Text>
        </PressableScale>

        <PressableScale containerStyle={st.action} style={st.secondary} onPress={onOpenAtlas}>
          <Text style={st.secondaryLabel} numberOfLines={1}>Your Atlas</Text>
        </PressableScale>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  bannerText: { flex: 1 },
  bannerIcon: { marginLeft: 12, opacity: 0.9 },
  title: {
    fontFamily: 'Outfit-Regular',
    fontSize: 20,
    color: colors.white,
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  blurb: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.white,
    opacity: 0.9,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  // Splits the row evenly. Lives on the Pressable, not the inner view.
  action: {
    flex: 1,
  },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.orange,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  primaryLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    color: colors.white,
  },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.charcoal,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  secondaryLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    color: colors.ink,
  },
});

export default React.memo(SunStampsEntryCard);
