import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import colors from '../constants/colors';

// Same recipe as GlassSurface's scattered patches, just held still — a
// white base with a few soft, fixed color patches for the blur to
// diffuse into a loose wash, no motion.
export const CLEAN_GLASS_BLOBS = [
  { color: colors.orangeMid, size: 150, top: -50, right: -30, opacity: 0.2 },
  { color: colors.orangeLight, size: 120, bottom: -35, left: -20, opacity: 0.26 },
  { color: colors.orange, size: 70, bottom: 6, right: '28%', opacity: 0.1 },
  { color: colors.orangeLight, size: 60, top: -10, left: '22%', opacity: 0.18 },
];

// Clean, static glassmorphic background: a white glass card with a few
// soft orange patches diffused into it by the blur — scattered tint, not
// a directional fill — and nothing animated. Purely decorative, an
// absolute-fill layer the caller stacks real content on top of.
export default React.memo(function CleanGlassSurface({ borderRadius = 28, blobs = CLEAN_GLASS_BLOBS }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, st.clip, { borderRadius }]}>
      <View style={[StyleSheet.absoluteFill, st.base]} />
      {blobs.map((b, i) => (
        <View
          key={i}
          style={[
            st.blob,
            {
              width: b.size,
              height: b.size,
              borderRadius: b.size / 2,
              backgroundColor: b.color,
              opacity: b.opacity,
              top: b.top,
              bottom: b.bottom,
              left: b.left,
              right: b.right,
            },
          ]}
        />
      ))}
      <BlurView
        intensity={55}
        tint="light"
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, st.border, { borderRadius }]} />
    </View>
  );
});

const st = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
  base: {
    backgroundColor: colors.glassBase,
  },
  blob: {
    position: 'absolute',
  },
  border: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
});
