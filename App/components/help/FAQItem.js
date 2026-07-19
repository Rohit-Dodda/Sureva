import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, LayoutAnimation, Platform, UIManager, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// property: 'opacity' (not 'scaleXY') on create/delete — a subtle fade for
// the answer text appearing/disappearing, rather than a pop. `update`
// drives the row's own smooth height/spring resize — the chevron's
// rotation below rides this same timeline instead of a separate Animated
// value, so the box and the text move together instead of on two competing
// curves (a separate native-driven transform alongside LayoutAnimation is
// also the exact combination that crashes Fabric's
// LayoutAnimationKeyFrameManager elsewhere in this app — see
// ExpandableCard.js).
const EXPAND_SPRING = {
  duration: 320,
  create: { type: 'spring', springDamping: 0.9, property: 'opacity' },
  update: { type: 'spring', springDamping: 0.9 },
  delete: { type: 'spring', springDamping: 0.9, property: 'opacity' },
};

// A single collapsible Q&A row — several sit inside one card per FAQ
// category on the Help & Support screen.
export default React.memo(function FAQItem({ question, answer, isLast }) {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(EXPAND_SPRING);
    setOpen((o) => !o);
  }, []);

  return (
    <Pressable onPress={toggle}>
      <View style={[st.row, !isLast && st.rowBorder]}>
        <View style={st.headerRow}>
          <Text style={st.question}>{question}</Text>
          <View style={[st.chevron, { transform: [{ rotate: open ? '180deg' : '0deg' }] }]}>
            <Ionicons name="chevron-down" size={16} color={colors.muted} />
          </View>
        </View>
        {open && <Text style={st.answer}>{answer}</Text>}
      </View>
    </Pressable>
  );
});

const st = StyleSheet.create({
  row: {
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  question: {
    flex: 1,
    fontFamily: 'Outfit-Regular',
    fontSize: 14.5,
    color: colors.ink,
    lineHeight: 20,
  },
  chevron: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  answer: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13.5,
    color: colors.inkMid,
    lineHeight: 20,
    marginTop: 10,
    paddingRight: 28,
  },
});
