import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import CircleIconButton from './CircleIconButton';

// Card header: circular tinted icon badge + large title + optional round
// action button on the right ("…", "↗", chevron).
export default React.memo(function CardHeader({
  icon,
  title,
  subtitle,
  actionIcon,
  onActionPress,
  right,
  style,
}) {
  return (
    <View style={[st.row, style]}>
      {icon ? (
        <View style={st.iconBadge}>
          <Ionicons name={icon} size={17} color={colors.orangeDark} />
        </View>
      ) : null}
      <View style={st.titleBlock}>
        <Text style={st.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={st.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right}
      {actionIcon ? <CircleIconButton icon={actionIcon} onPress={onActionPress} /> : null}
    </View>
  );
});

const st = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 16,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.orangeWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 16,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },
});
