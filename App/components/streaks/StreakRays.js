import React, { useRef, useEffect } from 'react';
import { Animated, View, StyleSheet, Easing } from 'react-native';

const RAY_COUNT = 12;

// A slowly rotating corona of light behind the streak number — the signature
// motion for the top two tiers. Pure decoration (pointerEvents none), driven
// by one looped rotation on the native driver so it's cheap.
function StreakRays({ size, color, durationMs = 12000 }) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: durationMs,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spin, durationMs]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const rayLength = size * 0.5;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        st.wrap,
        { width: size, height: size, transform: [{ rotate }] },
      ]}
    >
      {Array.from({ length: RAY_COUNT }).map((_, i) => (
        <View
          key={i}
          style={[
            st.ray,
            {
              height: rayLength,
              backgroundColor: color,
              opacity: i % 2 === 0 ? 0.22 : 0.12,
              transform: [
                { rotate: `${(360 / RAY_COUNT) * i}deg` },
                { translateY: -rayLength / 2 },
              ],
            },
          ]}
        />
      ))}
    </Animated.View>
  );
}

const st = StyleSheet.create({
  wrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ray: {
    position: 'absolute',
    width: 3,
    borderRadius: 2,
  },
});

export default React.memo(StreakRays);
