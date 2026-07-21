import React, { useRef, useEffect } from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';

const SIZE = 38;

// One day in the reveal's week strip. For the day the streak was just earned
// (`earned`), it holds on the plain date for a beat, then transforms into the
// flame badge — the date fades (opacity only, so it stays crisp) while the
// badge pops in over it. A pure 2D cross-fade + scale: no 3D rotation, nothing
// to rasterize. Every other day renders its final state immediately.
function StreakWeekDay({ date, isToday, filled, frozen, earned, gradient, delay = 650 }) {
  const t = useRef(new Animated.Value(earned ? 0 : filled ? 1 : 0)).current;

  useEffect(() => {
    if (!earned) return undefined;
    const id = setTimeout(() => {
      Animated.spring(t, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start();
    }, delay);
    return () => clearTimeout(id);
  }, [earned, delay, t]);

  if (!earned) {
    return filled ? <Badge frozen={frozen} gradient={gradient} /> : <DateRing date={date} isToday={isToday} />;
  }

  const dateOpacity = t.interpolate({ inputRange: [0, 0.55], outputRange: [1, 0], extrapolate: 'clamp' });
  const badgeOpacity = t.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, 0.7, 1], extrapolate: 'clamp' });
  // Spring overshoots past 1 for a little pop, then settles exactly on the badge.
  const badgeScale = t.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });

  return (
    <View style={st.cell}>
      <Animated.View style={[st.face, { opacity: dateOpacity }]}>
        <DateRing date={date} isToday={isToday} />
      </Animated.View>
      <Animated.View style={[st.face, { opacity: badgeOpacity, transform: [{ scale: badgeScale }] }]}>
        <Badge frozen={frozen} gradient={gradient} />
      </Animated.View>
    </View>
  );
}

function Badge({ frozen, gradient }) {
  return (
    <LinearGradient
      colors={gradient?.length ? gradient : [colors.gradOrangeStart, colors.gradOrangeEnd]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={st.disc}
    >
      <Ionicons name={frozen ? 'snow' : 'checkmark'} size={16} color={colors.white} />
    </LinearGradient>
  );
}

function DateRing({ date, isToday }) {
  return (
    <View style={[st.disc, st.ring, isToday && st.ringToday]}>
      <Text style={[st.date, isToday && st.dateToday]}>{date}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  cell: { width: SIZE, height: SIZE },
  face: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disc: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: { backgroundColor: 'transparent' },
  ringToday: { borderWidth: 2, borderColor: colors.orange },
  date: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: colors.inkMid },
  dateToday: { color: colors.orange },
});

export default React.memo(StreakWeekDay);
