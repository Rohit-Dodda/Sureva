import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

// iOS 26 "Liquid Glass" — distinct from this app's other glass surfaces
// (GlassSurface, CleanGlassSurface), which paint a flat brand-color tint
// over the blur. Real liquid glass reads as almost colorless: the backdrop
// behind it supplies the hue, the material just frosts and bends light
// around it. Two cues sell that:
//   • a bright specular highlight riding the top inner edge, fading out by
//     the vertical middle — light catching the bevel of the glass
//   • a soft dark contact shadow pooling along the bottom inner edge —
//     where the least light reaches
// Both ride on top of a blur with only a light wash behind it, not a flat
// tint — just enough of the brand color for white icon glyphs to stay
// readable against whatever's actually behind the bar. Purely decorative —
// an absolute-fill layer the caller stacks real content on top of.
export default React.memo(function LiquidGlassShell({ borderRadius = 50, intensity, tintColor = 'rgba(178,58,12,0.34)' }) {
  const blurIntensity = intensity ?? (Platform.OS === 'android' ? 45 : 34);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius, overflow: 'hidden' }]}>
      <BlurView
        intensity={blurIntensity}
        tint="light"
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />

      {/* Light wash — enough color for icon contrast, still sheer enough
          that the blurred backdrop shows through it, not painted over. */}
      <View style={[st.wash, { backgroundColor: tintColor }]} />

      {/* Specular highlight — the single cue that reads as "glass" rather
          than just "blur". Bright at the top, gone by the vertical middle. */}
      <LinearGradient
        colors={['rgba(255,255,255,0.65)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0)']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Contact shadow — the underside of the glass, hugging the bottom edge. */}
      <LinearGradient
        colors={['rgba(20,14,8,0)', 'rgba(20,14,8,0.10)']}
        locations={[0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[st.rim, { borderRadius }]} />
    </View>
  );
});

const st = StyleSheet.create({
  wash: {
    ...StyleSheet.absoluteFillObject,
  },
  rim: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
});
