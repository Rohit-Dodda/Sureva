import React, { useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';

// iOS-style deceleration curve: starts fast, glides to rest with no overshoot
export const IOS_EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);

export default React.memo(function SlideInView({ delay = 0, offset = 24, children, style }) {
  const translateY = useRef(new Animated.Value(offset)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: 0,
      duration: 600,
      easing: IOS_EASE_OUT,
      delay,
      useNativeDriver: true,
    }).start();
  }, [translateY, delay]);

  return (
    <Animated.View style={[style, { transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
});
