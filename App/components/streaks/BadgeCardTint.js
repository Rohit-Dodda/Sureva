import React, { useRef, useEffect } from 'react';
import { Animated, View, StyleSheet, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Two soft colour blobs drifting behind an earned badge's card, so an unlocked
// badge is subtly alive instead of a flat white tile. Shared by StreakBadge and
// AchievementBadge — the tint IS the "this one is yours" signal, so both must
// use the same motion or the two galleries read as different systems.

function TintBlob({ color, size, from, to, dur }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [t, dur]);

  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [from.x, to.x] });
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [from.y, to.y] });
  const opacity = t.interpolate({ inputRange: [0, 1], outputRange: [from.o, to.o] });

  return (
    <Animated.View
      style={[st.blob, { width: size, height: size, borderRadius: size / 2, opacity, transform: [{ translateX }, { translateY }] }]}
    >
      <LinearGradient
        colors={[color, `${color}00`]}
        start={{ x: 0.3, y: 0.2 }}
        end={{ x: 0.85, y: 0.9 }}
        style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
      />
    </Animated.View>
  );
}

function BadgeCardTint({ gradient, glow }) {
  return (
    <View style={st.clip} pointerEvents="none">
      <TintBlob color={gradient[0]} size={150} from={{ x: -46, y: -34, o: 0.16 }} to={{ x: -18, y: -8, o: 0.28 }} dur={3200} />
      <TintBlob color={glow} size={140} from={{ x: 72, y: 78, o: 0.12 }} to={{ x: 46, y: 54, o: 0.24 }} dur={3900} />
    </View>
  );
}

const st = StyleSheet.create({
  clip: { ...StyleSheet.absoluteFillObject, borderRadius: 27, overflow: 'hidden' },
  blob: { position: 'absolute', top: 0, left: 0 },
});

export default React.memo(BadgeCardTint);
