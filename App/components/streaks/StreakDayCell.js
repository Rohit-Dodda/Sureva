import React, { useRef, useEffect } from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';

// One circular day. The circle fills its column (width 100% + aspectRatio 1).
// Today, once logged, animates from its date into the flame badge — the date
// fades out (opacity only, stays crisp) while the gradient disc pops in over
// it, mirroring the reveal. Every other day renders its final state directly.
function StreakDayCell({ day, state, isToday, iconSize = 40, gradient, accent }) {
  const grad = gradient?.length ? gradient : [colors.gradOrangeStart, colors.gradOrangeEnd];
  const ring = accent || colors.orange;
  const blank = day == null;
  const logged = !blank && state === 'logged';
  const frozen = !blank && state === 'freeze-covered';
  const missed = !blank && state === 'missed';
  const future = !blank && state === 'future';
  const earned = isToday && logged;

  const morph = useRef(new Animated.Value(earned ? 0 : 1)).current;
  useEffect(() => {
    if (!earned) return undefined;
    const id = setTimeout(() => {
      Animated.spring(morph, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start();
    }, 500);
    return () => clearTimeout(id);
  }, [earned, morph]);

  // Today-just-logged: animate date → flame badge.
  if (earned) {
    const dateOpacity = morph.interpolate({ inputRange: [0, 0.55], outputRange: [1, 0], extrapolate: 'clamp' });
    const discOpacity = morph.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, 0.7, 1], extrapolate: 'clamp' });
    const discScale = morph.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
    return (
      <View style={[st.circle, st.todayRing, { borderColor: ring }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: discOpacity, transform: [{ scale: discScale }] }]}>
          <LinearGradient colors={grad} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={[StyleSheet.absoluteFill, st.center]}>
            <Ionicons name="flame" size={iconSize * 0.5} color={colors.white} />
          </LinearGradient>
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, st.center, { opacity: dateOpacity }]}>
          <Text style={[st.num, { color: ring }]}>{day}</Text>
        </Animated.View>
      </View>
    );
  }

  let ringStyle = null;
  let bg = null;
  let content = null;

  let ringOverride = null;
  if (blank || future) {
    ringStyle = st.faint;
  } else if (logged) {
    bg = (
      <LinearGradient colors={grad} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
    );
    content = <Ionicons name="flame" size={iconSize * 0.5} color={colors.white} />;
  } else if (frozen) {
    ringStyle = st.frozenRing;
    content = <Ionicons name="snow" size={iconSize * 0.46} color={colors.bluetooth} />;
  } else {
    ringStyle = isToday ? st.todayRing : st.missedRing;
    if (isToday) ringOverride = { borderColor: ring };
    content = <Text style={[st.num, { color: isToday ? ring : missed ? colors.muted : colors.inkMid }]}>{day}</Text>;
  }

  return (
    <View style={[st.circle, ringStyle, ringOverride]}>
      {bg}
      {content}
      {isToday && (logged || frozen) && <View style={[StyleSheet.absoluteFill, st.round, st.todayRing, { borderColor: ring }]} pointerEvents="none" />}
    </View>
  );
}

const st = StyleSheet.create({
  circle: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  round: { borderRadius: 999 },
  faint: { borderWidth: 1.5, borderColor: colors.border },
  missedRing: { borderWidth: 1.5, borderColor: colors.borderLight },
  frozenRing: { borderWidth: 1.5, borderColor: colors.bluetooth, backgroundColor: colors.navyLight },
  todayRing: { borderWidth: 2, borderColor: colors.orange },
  num: { fontFamily: 'Inter-Medium', fontSize: 14 },
});

export default React.memo(StreakDayCell);
