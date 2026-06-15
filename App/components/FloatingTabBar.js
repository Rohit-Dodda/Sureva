import React, { useRef, useCallback } from 'react';
import {
  Pressable, View, Animated, StyleSheet, Dimensions, Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';

const SCREEN_WIDTH = Dimensions.get('window').width;

const TABS = [
  { key: 'home',     iconDefault: 'home-outline',      iconActive: 'home' },
  { key: 'forecast', iconDefault: 'partly-sunny-outline', iconActive: 'partly-sunny' },
  { key: 'history',  iconDefault: 'time-outline',       iconActive: 'time' },
  { key: 'insights', iconDefault: 'bar-chart-outline',  iconActive: 'bar-chart' },
];

const TabItem = React.memo(function TabItem({ tab, isActive, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.88,
      useNativeDriver: true,
      tension: 320,
      friction: 10,
    }).start();
  }, [scale]);

  const onPressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 220,
      friction: 9,
    }).start();
  }, [scale]);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      hitSlop={10}
      style={st.tabBtn}
    >
      <Animated.View
        style={[
          st.iconWrap,
          isActive && st.iconWrapActive,
          { transform: [{ scale }] },
        ]}
      >
        <Ionicons
          name={isActive ? tab.iconActive : tab.iconDefault}
          size={25}
          color={isActive ? '#FFFFFF' : 'rgba(255,255,255,0.70)'}
        />
      </Animated.View>
    </Pressable>
  );
});

export default function FloatingTabBar({ activeTab, onTabPress }) {
  const glowOpacity = useRef(new Animated.Value(0)).current;

  const handleTabPress = useCallback((key) => {
    onTabPress(key);

    // Brief glow flash on the pill
    glowOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(glowOpacity, {
        toValue: 1,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(glowOpacity, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start();
  }, [onTabPress, glowOpacity]);

  return (
    <Animated.View style={st.pill}>
      {/* Frosted glass layer */}
      <BlurView
        intensity={Platform.OS === 'android' ? 30 : 22}
        tint="light"
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      {/* Orange glass tint over the blur */}
      <View pointerEvents="none" style={st.tint} />

      {/* Glow overlay — flashes on press */}
      <Animated.View
        style={[st.glowOverlay, { opacity: glowOpacity }]}
        pointerEvents="none"
      />

      {TABS.map((tab) => (
        <TabItem
          key={tab.key}
          tab={tab}
          isActive={activeTab === tab.key}
          onPress={() => handleTabPress(tab.key)}
        />
      ))}
    </Animated.View>
  );
}

const st = StyleSheet.create({
  pill: {
    position: 'absolute',
    bottom: 40,
    zIndex: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 50,
    width: SCREEN_WIDTH * 0.74,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
    shadowColor: colors.orangeDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.40,
    shadowRadius: 24,
    elevation: 14,
    overflow: 'hidden',
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(178,58,12,0.42)',
  },
  glowOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 50,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  iconWrap: {
    height: 46,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.40)',
  },
});
