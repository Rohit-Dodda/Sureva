import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';

// The dark call-out card itself — pointer triangle, body copy, pagination
// dots, and a round next/done button, matching the reference tour's shape.
// Positioning (top/bottom/left/right relative to the spotlighted element)
// is entirely the caller's job (TourOverlay); this component only decides
// which side the pointer triangle sits on and how far along it is.
export default React.memo(function TourTooltip({
  text, stepIndex, stepCount, onNext, onSkip, pointerSide, pointerLeft,
}) {
  const isLast = stepIndex === stepCount - 1;
  return (
    <View>
      {pointerSide === 'top' && pointerLeft != null && (
        <View style={[st.pointerUp, { left: pointerLeft }]} />
      )}
      <View style={st.card}>
        <Pressable onPress={onSkip} hitSlop={10} style={st.skipBtn}>
          <Text style={st.skipText}>Skip</Text>
        </Pressable>
        <Text style={st.text}>{text}</Text>
        <View style={st.footer}>
          <View style={st.dots}>
            {Array.from({ length: stepCount }).map((_, i) => (
              <View key={i} style={[st.dot, i === stepIndex && st.dotActive]} />
            ))}
          </View>
          <Pressable onPress={onNext} style={st.nextBtn} hitSlop={8}>
            <Ionicons name={isLast ? 'checkmark' : 'arrow-forward'} size={18} color={colors.charcoal} />
          </Pressable>
        </View>
      </View>
      {pointerSide === 'bottom' && pointerLeft != null && (
        <View style={[st.pointerDown, { left: pointerLeft }]} />
      )}
    </View>
  );
});

const TRIANGLE = 10;

const st = StyleSheet.create({
  card: {
    backgroundColor: colors.charcoal,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 22,
    elevation: 10,
  },
  skipBtn: {
    position: 'absolute',
    top: 14,
    right: 16,
    zIndex: 1,
  },
  skipText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12.5,
    color: colors.onDarkMuted,
  },
  text: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 15.5,
    lineHeight: 22,
    color: colors.onDark,
    letterSpacing: -0.1,
    paddingRight: 40,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: {
    width: 16,
    backgroundColor: colors.orange,
  },
  nextBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.onDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointerUp: {
    position: 'absolute',
    top: -TRIANGLE,
    width: 0,
    height: 0,
    borderLeftWidth: TRIANGLE,
    borderRightWidth: TRIANGLE,
    borderBottomWidth: TRIANGLE,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.charcoal,
  },
  pointerDown: {
    position: 'absolute',
    bottom: -TRIANGLE,
    width: 0,
    height: 0,
    borderLeftWidth: TRIANGLE,
    borderRightWidth: TRIANGLE,
    borderTopWidth: TRIANGLE,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.charcoal,
  },
});
