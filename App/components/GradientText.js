import React from 'react';
import { Text } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../constants/colors';

// Renders text filled with a subtle orange gradient.
function GradientText({ children, style, colors: gradColors }) {
  const stops = gradColors || [colors.gradOrangeStart, colors.gradOrangeEnd];
  return (
    <MaskedView maskElement={<Text style={style}>{children}</Text>}>
      <LinearGradient colors={stops} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.9 }}>
        {/* transparent text reserves the exact glyph footprint for the gradient */}
        <Text style={[style, { opacity: 0 }]}>{children}</Text>
      </LinearGradient>
    </MaskedView>
  );
}

export default React.memo(GradientText);
