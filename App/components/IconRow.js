import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';

export default React.memo(function IconRow({ icon, title, text, iconColor }) {
  return (
    <View style={st.row}>
      <View style={st.iconWrap}>
        <Ionicons name={icon} size={16} color={iconColor || colors.orange} />
      </View>
      <View style={st.body}>
        {title ? <Text style={st.title}>{title}</Text> : null}
        <Text style={st.text}>{text}</Text>
      </View>
    </View>
  );
});

const st = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: colors.orangeWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  title: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.ink,
    marginBottom: 2,
  },
  text: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.inkMid,
    lineHeight: 19,
  },
});
