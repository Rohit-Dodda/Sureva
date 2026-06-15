import React, { useEffect, useRef } from 'react';
import { Text, View, Animated, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import colors from '../constants/colors';

export default function SplashIntroScreen({ onComplete }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.88)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(900),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start(() => onComplete());
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Animated.View style={[styles.lockup, { opacity, transform: [{ scale }] }]}>
        <Text style={styles.wordmark}>Sureva</Text>
        <Text style={styles.tagline}>Sun smart, effortlessly.</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
  },
  lockup: {
    alignItems: 'center',
  },
  wordmark: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 56,
    color: colors.orange,
    letterSpacing: -2.5,
  },
  tagline: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: colors.muted,
    letterSpacing: 0.2,
    marginTop: 8,
  },
});
