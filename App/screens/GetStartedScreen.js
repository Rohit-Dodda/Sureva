import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import colors from '../constants/colors';

const { width } = Dimensions.get('window');

const STAGGER = 110;
const ENTER_DURATION = 520;
const ENTER_OFFSET = 36;

function useEntranceAnim(delay) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(ENTER_OFFSET)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: ENTER_DURATION,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay,
        tension: 60,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return { opacity, transform: [{ translateY }] };
}

export default function GetStartedScreen({ onContinue, onBack }) {
  // Illustration floats down from above
  const illustrationOpacity = useRef(new Animated.Value(0)).current;
  const illustrationY = useRef(new Animated.Value(-28)).current;
  const float = useRef(new Animated.Value(0)).current;

  const headingAnim = useEntranceAnim(STAGGER * 2);
  const subAnim = useEntranceAnim(STAGGER * 3);
  const btnAnim = useEntranceAnim(STAGGER * 4);

  const btnScale = useRef(new Animated.Value(1)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;
  const exitScale = useRef(new Animated.Value(1)).current;

  const handleContinue = () => {
    Animated.parallel([
      Animated.timing(exitOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(exitScale, {
        toValue: 0.96,
        tension: 80,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onContinue) onContinue();
    });
  };

  useEffect(() => {
    // Illustration entrance
    Animated.parallel([
      Animated.timing(illustrationOpacity, {
        toValue: 1,
        duration: 600,
        delay: STAGGER,
        useNativeDriver: true,
      }),
      Animated.spring(illustrationY, {
        toValue: 0,
        delay: STAGGER,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Gentle float loop after entrance
      Animated.loop(
        Animated.sequence([
          Animated.timing(float, {
            toValue: -8,
            duration: 2200,
            useNativeDriver: true,
          }),
          Animated.timing(float, {
            toValue: 0,
            duration: 2200,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, []);

  const handlePressIn = () => {
    Animated.spring(btnScale, {
      toValue: 0.96,
      tension: 120,
      friction: 6,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(btnScale, {
      toValue: 1,
      tension: 100,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <Animated.View
        style={[styles.screenWrap, { opacity: exitOpacity, transform: [{ scale: exitScale }] }]}
        pointerEvents="box-none"
      >

      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
        <View style={styles.backArrow}>
          <View style={styles.arrowStem} />
          <View style={styles.arrowHeadTop} />
          <View style={styles.arrowHeadBottom} />
        </View>
      </TouchableOpacity>

      {/* Illustration */}
      <Animated.View
        style={[
          styles.illustrationWrap,
          {
            opacity: illustrationOpacity,
            transform: [{ translateY: illustrationY }, { translateY: float }],
          },
        ]}
      >
        {/* Outermost ring */}
        <View style={styles.ring4} />
        {/* Second ring */}
        <View style={styles.ring3} />
        {/* Third ring */}
        <View style={styles.ring2} />
        {/* Inner glow */}
        <View style={styles.ring1} />
        {/* Sun core */}
        <View style={styles.core} />

        {/* Accent dots — like skin cells / UV particles */}
        <View style={[styles.dot, styles.dotA]} />
        <View style={[styles.dot, styles.dotB]} />
        <View style={[styles.dot, styles.dotC]} />
        <View style={[styles.dot, styles.dotD]} />
      </Animated.View>

      {/* Content */}
      <View style={styles.content}>
        <Animated.Text style={[styles.heading, headingAnim]}>
          Let's get started
        </Animated.Text>

        <Animated.Text style={[styles.sub, subAnim]}>
          Welcome to Sureva. Tell us about your skin so Sureva can protect it better.
        </Animated.Text>

        <View style={styles.spacer} />

        <Animated.View style={[{ transform: [{ scale: btnScale }] }, btnAnim]}>
          <TouchableOpacity
            style={styles.btn}
            onPress={handleContinue}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={1}
          >
            <Text style={styles.btnText}>Continue</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const CORE = 64;
const R1 = 112;
const R2 = 168;
const R3 = 224;
const R4 = 280;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  screenWrap: {
    flex: 1,
  },

  backBtn: {
    position: 'absolute',
    top: 12,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowStem: {
    position: 'absolute',
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.ink,
    left: 2,
  },
  arrowHeadTop: {
    position: 'absolute',
    width: 8,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.ink,
    left: 2,
    top: 7,
    transform: [{ rotate: '-45deg' }, { translateX: 1 }],
  },
  arrowHeadBottom: {
    position: 'absolute',
    width: 8,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.ink,
    left: 2,
    bottom: 7,
    transform: [{ rotate: '45deg' }, { translateX: 1 }],
  },

  illustrationWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 72,
    height: R4 + 20,
  },

  ring4: {
    position: 'absolute',
    width: R4,
    height: R4,
    borderRadius: R4 / 2,
    backgroundColor: colors.surface,
    opacity: 0.55,
  },
  ring3: {
    position: 'absolute',
    width: R3,
    height: R3,
    borderRadius: R3 / 2,
    backgroundColor: colors.orangeLight,
    opacity: 0.35,
  },
  ring2: {
    position: 'absolute',
    width: R2,
    height: R2,
    borderRadius: R2 / 2,
    backgroundColor: colors.orangeLight,
    opacity: 0.6,
  },
  ring1: {
    position: 'absolute',
    width: R1,
    height: R1,
    borderRadius: R1 / 2,
    backgroundColor: colors.orangeMid,
    opacity: 0.3,
  },
  core: {
    position: 'absolute',
    width: CORE,
    height: CORE,
    borderRadius: CORE / 2,
    backgroundColor: colors.orange,
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },

  dot: {
    position: 'absolute',
    borderRadius: 99,
    backgroundColor: colors.orange,
  },
  dotA: {
    width: 10,
    height: 10,
    opacity: 0.55,
    top: 28,
    right: width / 2 - 60,
  },
  dotB: {
    width: 7,
    height: 7,
    opacity: 0.4,
    bottom: 32,
    left: width / 2 - 72,
  },
  dotC: {
    width: 13,
    height: 13,
    opacity: 0.3,
    top: 48,
    left: width / 2 - 80,
  },
  dotD: {
    width: 8,
    height: 8,
    opacity: 0.45,
    bottom: 44,
    right: width / 2 - 56,
  },

  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 48,
    paddingTop: 48,
  },
  heading: {
    fontFamily: 'Outfit-Regular',
    fontSize: 38,
    color: colors.ink,
    letterSpacing: -1.2,
    lineHeight: 44,
    marginBottom: 16,
  },
  sub: {
    fontFamily: 'Outfit-Regular',
    fontSize: 17,
    color: colors.muted,
    lineHeight: 26,
    maxWidth: 320,
  },
  spacer: {
    flex: 1,
  },
  btn: {
    height: 58,
    backgroundColor: colors.orange,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 5,
  },
  btnText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 17,
    color: colors.white,
    letterSpacing: 0.2,
  },
});
