import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';

// Small ⓘ button that pops a simple explanation card — same visual
// language as ChartInfoModal. `info` is { title, rows: [{icon, title, body}] };
// a row may use `dot: '<color>'` instead of `icon` to show a chart-marker
// swatch. Set `dark` when the button sits on a dark surface.
export default React.memo(function WhatIfInfoButton({ info, dark }) {
  const [visible, setVisible] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(anim, { toValue: 1, tension: 70, friction: 12, useNativeDriver: true }).start();
    }
  }, [visible, anim]);

  const open = useCallback(() => setVisible(true), []);
  const dismiss = useCallback(() => {
    Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() =>
      setVisible(false)
    );
  }, [anim]);

  return (
    <>
      <TouchableOpacity
        onPress={open}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name="information-circle-outline"
          size={18}
          color={dark ? colors.onDarkMuted : colors.muted}
        />
      </TouchableOpacity>

      {visible && (
        <Modal transparent visible animationType="none" onRequestClose={dismiss}>
          <Animated.View style={[st.backdrop, { opacity: anim }]}>
            <TouchableOpacity style={st.backdropTouch} activeOpacity={1} onPress={dismiss} />
          </Animated.View>
          <View style={st.center} pointerEvents="box-none">
            <Animated.View
              style={[st.card, {
                opacity: anim,
                transform: [
                  { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
                  { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
                ],
              }]}
            >
              <Text style={st.title}>{info.title}</Text>
              {info.rows.map((row) => (
                <View key={row.title} style={st.row}>
                  <View style={st.rowIconWrap}>
                    {row.dot ? (
                      <View style={[st.rowDot, { borderColor: row.dot }]} />
                    ) : (
                      <Ionicons name={row.icon} size={17} color={row.color ?? colors.orange} />
                    )}
                  </View>
                  <View style={st.rowBody}>
                    <Text style={st.rowTitle}>{row.title}</Text>
                    <Text style={st.rowText}>{row.body}</Text>
                  </View>
                </View>
              ))}
              <TouchableOpacity style={st.button} onPress={dismiss} activeOpacity={0.85}>
                <Text style={st.buttonText}>Got it</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>
      )}
    </>
  );
});

const st = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.ink + '73',
  },
  backdropTouch: {
    flex: 1,
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  title: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 20,
    color: colors.ink,
    letterSpacing: -0.5,
    marginBottom: 18,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  rowIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.orangeWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Mirrors the chart markers: white center with a colored ring.
  rowDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    backgroundColor: colors.white,
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 14,
    color: colors.ink,
    marginBottom: 2,
  },
  rowText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.inkMid,
    lineHeight: 18,
  },
  button: {
    backgroundColor: colors.ink,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 15,
    color: colors.white,
  },
});
