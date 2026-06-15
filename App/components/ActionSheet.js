import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable,
  Animated, Easing, Dimensions,
} from 'react-native';
import colors from '../constants/colors';

const SCREEN_H = Dimensions.get('window').height;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

function usePressScale(toValue = 0.97) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn  = () => Animated.spring(scale, { toValue,    useNativeDriver: true, tension: 280, friction: 12 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }).start();
  return { scale, onPressIn, onPressOut };
}

const SheetOption = React.memo(function SheetOption({ label, onPress, destructive, isLast }) {
  const { scale, onPressIn, onPressOut } = usePressScale();
  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[st.option, !isLast && st.optionBorder, { transform: [{ scale }] }]}>
        <Text style={[st.optionLabel, destructive && st.destructive]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
});

export default function ActionSheet({ visible, options, onClose }) {
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(false);

  // Mount as soon as visible becomes true
  useEffect(() => {
    if (visible) setRendered(true);
  }, [visible]);

  // Drive enter/exit animations off rendered+visible
  useEffect(() => {
    if (!rendered) return;
    if (visible) {
      slideAnim.setValue(SCREEN_H);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1, duration: 220, easing: EASE_OUT, useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0, tension: 65, friction: 11, useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 0, duration: 180, easing: EASE_OUT, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 220, easing: EASE_OUT, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setRendered(false);
      });
    }
  }, [rendered, visible]);

  const close = useCallback(() => onClose(), [onClose]);

  const { scale: cancelScale, onPressIn: cancelIn, onPressOut: cancelOut } = usePressScale(0.97);

  if (!rendered) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View style={[st.backdrop, { opacity: fadeAnim }]} pointerEvents="auto">
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[st.container, { transform: [{ translateY: slideAnim }] }]} pointerEvents="box-none">
        {/* Options card */}
        <View style={st.card}>
          {options.map((opt, i) => (
            <SheetOption
              key={opt.label}
              label={opt.label}
              destructive={opt.destructive}
              isLast={i === options.length - 1}
              onPress={() => {
                onClose();
                setTimeout(() => opt.onPress(), 240);
              }}
            />
          ))}
        </View>

        {/* Cancel */}
        <Pressable onPress={close} onPressIn={cancelIn} onPressOut={cancelOut}>
          <Animated.View style={[st.cancelCard, { transform: [{ scale: cancelScale }] }]}>
            <Text style={st.cancelLabel}>Cancel</Text>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: 36,
    gap: 10,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  option: {
    paddingVertical: 17,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  optionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 17,
    color: colors.ink,
  },
  destructive: {
    color: colors.danger,
  },
  cancelCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 17,
    alignItems: 'center',
  },
  cancelLabel: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 17,
    color: colors.ink,
  },
});
