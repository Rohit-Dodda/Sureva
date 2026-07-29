import React from 'react';
import { View, StyleSheet } from 'react-native';

const RAY_COUNT = 16;

// The 16-spoke burst behind an earned badge's ring. Static geometry — callers
// animate it (scale/opacity) during an unlock. Shared by both badge types.
function BadgeRayGlow({ size, color }) {
  const len = size * 0.62;
  return (
    <View style={[st.wrap, { width: size, height: size }]} pointerEvents="none">
      {Array.from({ length: RAY_COUNT }).map((_, i) => (
        <View
          key={i}
          style={[
            st.ray,
            {
              height: len,
              backgroundColor: color,
              transform: [{ rotate: `${(360 / RAY_COUNT) * i}deg` }, { translateY: -len / 2 }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  ray: { position: 'absolute', width: 2, borderRadius: 1, opacity: 0.4 },
});

export default React.memo(BadgeRayGlow);
