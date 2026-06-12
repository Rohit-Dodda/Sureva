import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, Animated, Dimensions, Easing } from 'react-native';

const SCREEN_W = Dimensions.get('window').width;
const PARALLAX = 0.35;
const DURATION = 400;
// Emphasized-decelerate: carries momentum longer before easing out — reads as a glide
const GLIDE = Easing.bezier(0.05, 0.7, 0.1, 1);

export default React.memo(function AnimatedTabScreen({ active, direction, children }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(active);

  useEffect(() => {
    if (active) {
      setRendered(true);
      if (direction === 0) {
        translateX.setValue(0);
        return;
      }
      // Incoming: enter fullscreen from the side this tab lives on
      translateX.setValue(direction * SCREEN_W);
      Animated.timing(translateX, {
        toValue: 0,
        duration: DURATION,
        easing: GLIDE,
        useNativeDriver: true,
      }).start();
    } else if (rendered) {
      // Outgoing: drift away underneath at parallax speed, then unmount
      Animated.timing(translateX, {
        toValue: -direction * SCREEN_W * PARALLAX,
        duration: DURATION,
        easing: GLIDE,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setRendered(false);
      });
    }
  }, [active, direction, translateX]);

  return (
    <Animated.View
      pointerEvents={active ? 'auto' : 'none'}
      style={[
        StyleSheet.absoluteFill,
        !rendered && st.hidden,
        { zIndex: active ? 2 : rendered ? 1 : 0 },
        { transform: [{ translateX }] },
      ]}
    >
      {children}
    </Animated.View>
  );
});

const st = StyleSheet.create({
  hidden: {
    display: 'none',
  },
});
