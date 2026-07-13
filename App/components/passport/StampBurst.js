import React, { useRef, useEffect } from 'react';
import { StyleSheet, Animated } from 'react-native';
import colors from '../../constants/colors';

const SIZE = 44;

// The passport-stamp moment: an orange circle expands from the pin and
// fades out. Rendered once, the first time a location is ever tapped;
// onDone lets the parent unmount it after the animation finishes.
export default React.memo(function StampBurst({ onDone }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }).start(() => {
      onDone?.();
    });
  }, [anim, onDone]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[st.burst, {
        opacity: anim.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.9, 0.7, 0] }),
        transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2.4] }) }],
      }]}
    />
  );
});

const st = StyleSheet.create({
  burst: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 3,
    borderColor: colors.orange,
    backgroundColor: colors.orangeWash,
  },
});
