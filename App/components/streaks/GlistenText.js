import React, { useRef, useEffect, useState } from 'react';
import { Animated, View, Text, StyleSheet, Easing } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';

// Text rendered in a tier color with a light band that periodically sweeps
// across it — a "glisten". Masked to the glyphs, so the shimmer only shows on
// the letters. Native-driver translate; the text stays crisp.
function GlistenText({ text, color, style }) {
  const x = useRef(new Animated.Value(0)).current;
  const [w, setW] = useState(0);

  useEffect(() => {
    if (!w) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(x, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(1600),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [x, w]);

  const translateX = x.interpolate({ inputRange: [0, 1], outputRange: [-w, w] });

  return (
    <MaskedView maskElement={<Text style={style}>{text}</Text>}>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        <Text style={[style, { opacity: 0 }]}>{text}</Text>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: color }]} />
        {w > 0 && (
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}>
            <LinearGradient
              colors={[`${color}00`, '#FFFFFFDD', `${color}00`]}
              locations={[0.25, 0.5, 0.75]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        )}
      </View>
    </MaskedView>
  );
}

export default React.memo(GlistenText);
