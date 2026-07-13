import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../constants/colors';

const BAND_WIDTH = 70;
const SWEEP_MS = 1500;
const PAUSE_MS = 1400;

// Text with a light band that periodically sweeps across it, masked to
// the exact letterforms — the base text stays fully legible underneath;
// the sweep is a highlight pass over the letters, not a color change.
export default React.memo(function ShimmerText({ children, style, shimmerColor = colors.glassShine }) {
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((e) => setWidth(e.nativeEvent.layout.width), []);

  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, { toValue: 1, duration: SWEEP_MS, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(PAUSE_MS),
        Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-BAND_WIDTH, Math.max(width, BAND_WIDTH)],
  });

  return (
    <View onLayout={onLayout}>
      <Text style={style}>{children}</Text>
      {width > 0 && (
        <MaskedView
          style={StyleSheet.absoluteFill}
          maskElement={<Text style={style}>{children}</Text>}
        >
          <Animated.View style={[st.band, { transform: [{ translateX }] }]}>
            <LinearGradient
              colors={['transparent', shimmerColor, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </MaskedView>
      )}
    </View>
  );
});

const st = StyleSheet.create({
  band: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: BAND_WIDTH,
  },
});
