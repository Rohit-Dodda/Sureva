import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { accentFor, RECAP_BODY } from './recapAccent';
import RecapDecor from './RecapDecor';
import RecapMotif from './RecapMotif';
import RecapStagger from './RecapStagger';

// Full-bleed card shell: a vivid gradient field, the animated sun-motif
// decor behind it, the recurring signature ribbon-fan flourish in the corner,
// a kicker up top, and a content slot the mechanic fills. The kicker rides
// the stagger sequence as element 0.
export default React.memo(function RecapCardFrame({ accent, kicker, active, align = 'center', children }) {
  const a = accentFor(accent);
  return (
    <View style={st.fill}>
      <LinearGradient colors={a.gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      <RecapDecor ray={a.ray} active={active} />
      <RecapMotif accent={accent} active={active} width={190} height={150} spread={190} strokeWidth={4} opacity={0.4} style={st.signature} />
      <View style={st.content}>
        {kicker ? (
          <RecapStagger index={0} active={active}>
            <Text style={[st.kicker, { color: a.kicker }]}>{kicker}</Text>
          </RecapStagger>
        ) : null}
        <View style={[st.body, align === 'top' && st.bodyTop]}>{children}</View>
      </View>
    </View>
  );
});

const st = StyleSheet.create({
  fill: {
    flex: 1,
    overflow: 'hidden',
  },
  signature: {
    position: 'absolute',
    bottom: -18,
    right: -34,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 108,
    paddingBottom: 120,
  },
  kicker: {
    fontFamily: RECAP_BODY,
    fontSize: 13,
    letterSpacing: 3,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
  },
  bodyTop: {
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
});
