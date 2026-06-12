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
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  title: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 13,
    color: colors.ink,
    marginBottom: 2,
  },
  text: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 13,
    color: colors.inkMid,
    lineHeight: 19,
  },
});
