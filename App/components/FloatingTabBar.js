import React, { useRef, useCallback } from 'react';
import {
  Pressable, Animated, StyleSheet, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';

const SCREEN_WIDTH = Dimensions.get('window').width;

const TABS = [
  { key: 'home',     iconDefault: 'home-outline',      iconActive: 'home' },
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
          color={isActive ? colors.white : 'rgba(255,255,255,0.38)'}
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
    backgroundColor: 'rgba(26,24,21,0.72)',
    borderRadius: 50,
    width: SCREEN_WIDTH * 0.74,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.40,
    shadowRadius: 24,
    elevation: 14,
    overflow: 'hidden',
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
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
});
