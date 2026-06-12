import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SectionCard from '../SectionCard';
import colors from '../../constants/colors';

export default React.memo(function AlertComplianceCard({ alerts }) {
  return (
    <SectionCard icon="notifications-outline" title="Alert Compliance">
      <View style={st.countRow}>
        <Text style={st.countNumber}>{alerts.fired}</Text>
        <Text style={st.countLabel}>{alerts.fired === 1 ? 'alert fired' : 'alerts fired'}</Text>
      </View>

      {alerts.log.map((a) => (
        <View key={a.id} style={st.alertRow}>
          <Ionicons
            name={a.confirmed ? 'checkmark-circle' : 'close-circle'}
            size={18}
            color={a.confirmed ? colors.protected : colors.danger}
          />
          <Text style={st.alertId}>Alert {a.id}</Text>
          <Text style={[st.alertDetail, !a.confirmed && st.alertDetailMissed]}>{a.detail}</Text>
        </View>
      ))}

      <View style={st.ratingBlock}>
        <Text style={st.ratingText}>{alerts.rating}</Text>
      </View>
    </SectionCard>
  );
});

const st = StyleSheet.create({
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 12,
  },
  countNumber: {
    fontFamily: 'SFProDisplay-Black',
    fontSize: 30,
    color: colors.ink,
    letterSpacing: -1,
  },
  countLabel: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 14,
    color: colors.muted,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: colors.surface,
  },
  alertId: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 13,
    color: colors.ink,
    width: 56,
  },
  alertDetail: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 13,
    color: colors.inkMid,
    flex: 1,
    lineHeight: 18,
  },
  alertDetailMissed: {
    color: colors.danger,
    fontFamily: 'SFProDisplay-Bold',
  },
  ratingBlock: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 12,
  },
  ratingText: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 13,
    color: colors.ink,
    lineHeight: 19,
  },
});
