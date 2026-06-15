import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import colors from '../constants/colors';
import { IOS_EASE_OUT } from './SlideInView';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

let gradientSeq = 0;

// Circular progress ring with round caps and an optional gradient stroke.
// Animates to `percent` on mount and on every change.
export default React.memo(function ProgressRing({
  percent = 0,
  size = 220,
  strokeWidth = 14,
  color = colors.orange,
  gradient, // optional [startColor, endColor]
  trackColor = colors.surface,
  duration = 900,
  children,
}) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const anim = useRef(new Animated.Value(0)).current;
  const gradId = useRef(`ringGrad${++gradientSeq}`).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.max(0, Math.min(100, percent)),
      duration,
      easing: IOS_EASE_OUT,
      useNativeDriver: false,
    }).start();
  }, [percent]);

  const dashOffset = anim.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        {gradient ? (
          <Defs>
            <LinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={gradient[0]} />
              <Stop offset="100%" stopColor={gradient[1]} />
            </LinearGradient>
          </Defs>
        ) : null}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={gradient ? `url(#${gradId})` : color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          fill="none"
        />
      </Svg>
      {children}
    </View>
  );
});
