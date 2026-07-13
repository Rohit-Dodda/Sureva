import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import colors from '../constants/colors';

export default function SplashIntroScreen({ onComplete }) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const translateY = useRef(new Animated.Value(80)).current;
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // Bounce the logo up into place with a visible, springy overshoot.
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 6,
          tension: 90,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          friction: 5.5,
          tension: 90,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(650),
      // Glide the logo down while the splash crossfades to the screen behind.
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 48,
          duration: 600,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fade, {
          toValue: 0,
          duration: 600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => onComplete());
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fade }]}>
      <StatusBar style="dark" />
      <Animated.View style={{ transform: [{ translateY }, { scale }] }}>
        <Image
          source={require('../assets/sureva-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
    zIndex: 10,
  },
  logo: {
    width: 300,
    height: 87,
  },
});
