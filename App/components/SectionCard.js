import React from 'react';
import { View, StyleSheet } from 'react-native';
import colors from '../constants/colors';
import CardHeader from './CardHeader';

export default React.memo(function SectionCard({
  icon,
  title,
  subtitle,
  actionIcon,
  onActionPress,
  headerRight,
  children,
  style,
}) {
  return (
    <View style={[st.card, style]}>
      <CardHeader
        icon={icon}
        title={title}
        subtitle={subtitle}
        actionIcon={actionIcon}
        onActionPress={onActionPress}
        right={headerRight}
      />
      {children}
    </View>
  );
});

const st = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 14,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
});
