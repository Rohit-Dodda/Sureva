import React, { useRef, useCallback } from 'react';
import { Pressable, Animated } from 'react-native';

// Universal press feedback: quick spring down on press, glide back on release.
export default React.memo(function PressableScale({
  children,
  style,
  containerStyle,
  scaleTo = 0.97,
  ...pressableProps
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: scaleTo,
      useNativeDriver: true,
      tension: 320,
      friction: 12,
    }).start();
  }, [scale, scaleTo]);

  const onPressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 220,
      friction: 9,
    }).start();
  }, [scale]);

  return (
    <Pressable style={containerStyle} onPressIn={onPressIn} onPressOut={onPressOut} {...pressableProps}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
});
