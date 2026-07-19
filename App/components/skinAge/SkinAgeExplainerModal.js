import React, { useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';

// First-reveal explainer: a centered card describing what "Skin Age"
// means, shown once right after the scratch-off completes. Dismissible
// only via the button, not a backdrop tap — it's a short one-time bit of
// context, not something to accidentally swipe away.
export default React.memo(function SkinAgeExplainerModal({ onDismiss }) {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.92)).current;
  const cardTranslateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.timing(backdropOpacity, { toValue: 1, duration: 260, useNativeDriver: true }).start();
    Animated.parallel([
      Animated.spring(cardOpacity, { toValue: 1, useNativeDriver: true, tension: 120, friction: 14 }),
      Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, tension: 120, friction: 14 }),
      Animated.spring(cardTranslateY, { toValue: 0, useNativeDriver: true, tension: 120, friction: 14 }),
    ]).start();
  }, [backdropOpacity, cardOpacity, cardScale, cardTranslateY]);

  const handleDismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(cardScale, { toValue: 0.95, duration: 200, useNativeDriver: true }),
    ]).start(() => onDismiss?.());
  }, [backdropOpacity, cardOpacity, cardScale, onDismiss]);

  return (
    <View style={st.root} pointerEvents="box-none">
      <Animated.View style={[st.backdrop, { opacity: backdropOpacity }]} />
      <View style={st.center} pointerEvents="box-none">
        <Animated.View
          style={[
            st.card,
            {
              opacity: cardOpacity,
              transform: [{ scale: cardScale }, { translateY: cardTranslateY }],
            },
          ]}
        >
          <View style={st.iconWrap}>
            <Ionicons name="sparkles" size={22} color={colors.orangeDark} />
          </View>
          <Text style={st.title}>What is Skin Age?</Text>
          <Text style={st.body}>
            Skin Age estimates how your skin has aged from real UV exposure, not the calendar.
            Consistent protection keeps it lower than your real age; unprotected exposure pushes
            it higher. It updates as Sureva learns more about your habits.
          </Text>
          <TouchableOpacity style={st.button} onPress={handleDismiss} activeOpacity={0.85}>
            <Text style={st.buttonText}>Got it</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
});

const st = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 10,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.orangeWash,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontFamily: 'Outfit-Regular',
    fontSize: 19,
    color: colors.ink,
    letterSpacing: -0.4,
    marginBottom: 10,
    textAlign: 'center',
  },
  body: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    lineHeight: 21,
    color: colors.inkMid,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    alignSelf: 'stretch',
    backgroundColor: colors.orange,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    color: colors.white,
  },
});
