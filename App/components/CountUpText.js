import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text } from 'react-native';
import { IOS_EASE_OUT } from './SlideInView';

// Animated number count-up for stat values.
// `format` receives the in-flight numeric value and returns the display string.
export default React.memo(function CountUpText({
  value,
  format,
  duration = 900,
  delay = 0,
  style,
  ...textProps
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(() => (format ? format(0) : '0'));

  useEffect(() => {
    const id = anim.addListener(({ value: v }) => {
      setDisplay(format ? format(v) : String(Math.round(v)));
    });
    Animated.timing(anim, {
      toValue: value,
      duration,
      delay,
      easing: IOS_EASE_OUT,
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(id);
  }, [value]);

  return (
    <Text style={style} {...textProps}>
      {display}
    </Text>
  );
});
