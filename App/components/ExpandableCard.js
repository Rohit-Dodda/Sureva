import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Animated, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import CardHeader from './CardHeader';
import PressableScale from './PressableScale';
import CleanGlassSurface from './CleanGlassSurface';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Spring scale, not fade — per design system
const EXPAND_SPRING = {
  duration: 360,
  create: { type: 'spring', springDamping: 0.9, property: 'scaleXY' },
  update: { type: 'spring', springDamping: 0.9 },
  delete: { type: 'spring', springDamping: 0.9, property: 'scaleXY' },
};

// Tap-to-expand card: header + always-visible children, plus an expanded
// section revealed in place. `expandedContent` null/undefined → behaves as a
// plain card (no chevron, no toggle). `linkLabel`/`onLinkPress` render a
// deep-link pill at the bottom of the expanded area.
export default React.memo(function ExpandableCard({
  icon,
  title,
  subtitle,
  children,
  expandedContent,
  linkLabel,
  linkIcon = 'arrow-forward',
  onLinkPress,
  style,
  glass,
}) {
  const [open, setOpen] = useState(false);
  const rotate = useRef(new Animated.Value(0)).current;
  const expandable = Boolean(expandedContent);

  const toggle = useCallback(() => {
    if (!expandable) return;
    const next = !open;
    LayoutAnimation.configureNext(EXPAND_SPRING);
    Animated.spring(rotate, {
      toValue: next ? 1 : 0,
      useNativeDriver: true,
      tension: 160,
      friction: 11,
    }).start();
    setOpen(next);
  }, [expandable, open, rotate]);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <PressableScale onPress={toggle} scaleTo={0.98} style={[st.card, glass && st.cardGlass, style]}>
      {glass && <CleanGlassSurface borderRadius={28} />}
      <CardHeader
        icon={icon}
        title={title}
        subtitle={subtitle}
        right={expandable ? (
          <Animated.View style={[st.chevron, { transform: [{ rotate: spin }] }]}>
            <Ionicons name="chevron-down" size={15} color={colors.ink} />
          </Animated.View>
        ) : null}
      />
      {children}
      {open && (
        <View>
          <View style={st.divider} />
          {expandedContent}
          {linkLabel ? (
            <PressableScale onPress={onLinkPress} scaleTo={0.96} style={st.linkBtn}>
              <Text style={st.linkText}>{linkLabel}</Text>
              <Ionicons name={linkIcon} size={14} color={colors.orangeDark} />
            </PressableScale>
          ) : null}
        </View>
      )}
    </PressableScale>
  );
});

const st = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  cardGlass: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    overflow: 'hidden',
    shadowColor: colors.orange,
    shadowOpacity: 0.14,
  },
  chevron: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: 16,
    marginBottom: 14,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.orangeWash,
    borderRadius: 22,
    paddingVertical: 12,
    marginTop: 14,
  },
  linkText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 13,
    color: colors.orangeDark,
    letterSpacing: 0.1,
  },
});
