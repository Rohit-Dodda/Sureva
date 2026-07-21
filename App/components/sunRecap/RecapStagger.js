import React, { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

// Wraps a card element so it rises + fades in on a per-index delay, giving
// each card a choreographed, staggered entrance instead of appearing at once.
export default React.memo(function RecapStagger({ index = 0, active, style, children }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) { anim.setValue(0); return; }
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 460,
      delay: 120 + index * 130,
      useNativeDriver: true,
    }).start();
  }, [active, index, anim]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [22, 0] });

  return (
    <Animated.View style={[style, { opacity: anim, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
});
