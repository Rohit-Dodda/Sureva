import React, { useRef, useCallback } from 'react';
import { View, ScrollView, StyleSheet, PanResponder, Animated } from 'react-native';
import colors from '../../constants/colors';

// Draggable bottom sheet holding the What If controls. The grab handle
// resizes it between minH and maxH (never full screen — the chart above
// must stay visible); on release it springs to the nearest snap point,
// biased by fling velocity. Content scrolls independently inside.
export default React.memo(function ControlsSheet({
  heightAnim,
  minH,
  initialH,
  maxH,
  scrollRef,
  scrollLocked,
  children,
}) {
  const hVal = useRef(initialH);
  const startH = useRef(initialH);

  // Track the animated height numerically for drag math.
  React.useEffect(() => {
    const id = heightAnim.addListener(({ value }) => { hVal.current = value; });
    return () => heightAnim.removeListener(id);
  }, [heightAnim]);

  const snapTo = useCallback((target) => {
    Animated.spring(heightAnim, {
      toValue: target,
      tension: 180,
      friction: 22,
      useNativeDriver: false,
    }).start();
  }, [heightAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => { startH.current = hVal.current; },
      onPanResponderMove: (_, { dy }) => {
        heightAnim.setValue(Math.min(Math.max(startH.current - dy, minH), maxH));
      },
      onPanResponderRelease: (_, { vy }) => {
        const snaps = [minH, initialH, maxH];
        let target;
        if (vy < -0.5) {
          // Fling up → next snap above the current height.
          target = snaps.find((s) => s > hVal.current + 1) ?? maxH;
        } else if (vy > 0.5) {
          // Fling down → next snap below.
          target = [...snaps].reverse().find((s) => s < hVal.current - 1) ?? minH;
        } else {
          target = snaps.reduce((a, b) =>
            Math.abs(b - hVal.current) < Math.abs(a - hVal.current) ? b : a
          );
        }
        snapTo(target);
      },
      onPanResponderTerminate: () => {
        const snaps = [minH, initialH, maxH];
        snapTo(snaps.reduce((a, b) =>
          Math.abs(b - hVal.current) < Math.abs(a - hVal.current) ? b : a
        ));
      },
    })
  ).current;

  return (
    <Animated.View style={[st.sheet, { height: heightAnim }]}>
      <View style={st.handleZone} collapsable={false} {...panResponder.panHandlers}>
        <View style={st.handleBar} />
      </View>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={st.content}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!scrollLocked}
        bounces={!scrollLocked}
      >
        {children}
      </ScrollView>
    </Animated.View>
  );
});

const st = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.canvas,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  handleZone: {
    paddingTop: 10,
    paddingBottom: 12,
    alignItems: 'center',
  },
  handleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
});
