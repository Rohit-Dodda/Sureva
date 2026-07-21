import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Animated, View, Text, StyleSheet, Easing } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../../constants/colors';

// The streak number that fills up: masked to the digits, it starts as a pale
// empty shape, then the gradient rises into it from the bottom. The rising
// layer has a SOFT (feathered) top edge — transparent fading into the gradient
// — so the fill line glides smoothly instead of reading as a hard bar sliding
// up. Native-driver translateY only; nothing is scaled, so the digits stay
// perfectly crisp.
function StreakCountFill({ value, gradient, size = 86, delay = 650 }) {
  const fill = useRef(new Animated.Value(0)).current;
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => {
      Animated.timing(fill, {
        toValue: 1,
        duration: 1150,
        // gentle S-curve — eases in, glides, settles; no abrupt start/stop
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, delay);
    return () => clearTimeout(id);
  }, [fill, delay]);

  // Rising layer is 1.3× the digit height with a feather across its top quarter.
  // At fill=1 the feather clears above the digits, leaving them fully colored.
  const layerH = height * 1.3;
  const translateY = fill.interpolate({ inputRange: [0, 1], outputRange: [layerH, -height * 0.3] });

  const { fillColors, fillLocations } = useMemo(() => {
    const g = gradient?.length ? gradient : [colors.orange];
    const colorsOut = [`${g[0]}00`, ...g];
    const n = g.length - 1 || 1;
    const locsOut = [0, ...g.map((_, i) => 0.28 + 0.72 * (i / n))];
    return { fillColors: colorsOut, fillLocations: locsOut };
  }, [gradient]);

  const textStyle = [st.count, { fontSize: size, lineHeight: size * 1.12 }];

  return (
    <MaskedView maskElement={<Text style={textStyle}>{value}</Text>}>
      <View onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
        {/* Sizer — gives the fill layers the digits' exact box. */}
        <Text style={[textStyle, { opacity: 0 }]}>{value}</Text>
        {/* Pale unfilled base. */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.orangeWashDark }]} />
        {/* Gradient rising into the digits, soft leading edge. */}
        {height > 0 && (
          <Animated.View style={[st.riser, { height: layerH, transform: [{ translateY }] }]}>
            <LinearGradient colors={fillColors} locations={fillLocations} style={StyleSheet.absoluteFill} />
          </Animated.View>
        )}
      </View>
    </MaskedView>
  );
}

const st = StyleSheet.create({
  count: {
    fontFamily: 'Outfit-Regular',
    color: colors.ink,
    letterSpacing: -2,
    textAlign: 'center',
    includeFontPadding: false,
  },
  riser: { position: 'absolute', left: 0, right: 0, top: 0 },
});

export default React.memo(StreakCountFill);
