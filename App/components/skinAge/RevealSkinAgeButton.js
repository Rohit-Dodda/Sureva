import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Animated, Easing, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import GlassSurface from '../GlassSurface';
import ShimmerText from '../ShimmerText';

const BORDER_WIDTH = 2;
const SPIN_MS = 4000;

// Entry point at the very top of Insights: a clean glassmorphic surface —
// a white glass card with loose, scattered patches of orange diffused
// into it by the blur, not a fixed fill — ringed by an orange gradient
// that continuously sweeps around the border. Plain tap, no press/hover
// effect on the button itself.
export default React.memo(function RevealSkinAgeButton({ onPress, revealed }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = useCallback((e) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  }, []);

  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: SPIN_MS, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  // Square big enough that its inscribed circle covers the button's own
  // corner-to-corner diagonal at every rotation angle, with a margin so
  // no gap ever peeks through mid-spin — plain percentages undershoot on
  // a wide, short button like this one.
  const diag = Math.sqrt(size.w ** 2 + size.h ** 2) * 1.15;

  return (
    <View style={st.outer} onLayout={onLayout}>
      {diag > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            st.spinner,
            {
              width: diag,
              height: diag,
              top: (size.h - diag) / 2,
              left: (size.w - diag) / 2,
              transform: [{ rotate }],
            },
          ]}
        >
          <LinearGradient
            colors={[colors.orangeDark, colors.orange, colors.orangeLight, colors.orange, colors.orangeDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}

      <Pressable onPress={onPress} style={st.button}>
        <GlassSurface borderRadius={26} />
        <View style={st.inner}>
          <ShimmerText style={st.label}>{revealed ? 'View Your Skin Age' : 'Reveal Skin Age'}</ShimmerText>
          <Ionicons name="arrow-forward" size={20} color={colors.orangeDark} />
        </View>
      </Pressable>
    </View>
  );
});

const st = StyleSheet.create({
  outer: {
    borderRadius: 28,
    padding: BORDER_WIDTH,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 8,
  },
  spinner: {
    position: 'absolute',
  },
  button: {
    borderRadius: 26,
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 20,
  },
  label: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 19,
    color: colors.orangeDark,
    letterSpacing: -0.4,
  },
});
