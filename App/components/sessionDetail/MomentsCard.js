import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SectionCard from '../SectionCard';
import colors from '../../constants/colors';

const Moment = React.memo(function Moment({ icon, iconColor, title, body }) {
  return (
    <View style={st.moment}>
      <View style={[st.momentIconWrap, { backgroundColor: iconColor + '1A' }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <View style={st.momentBody}>
        <Text style={st.momentTitle}>{title}</Text>
        <Text style={st.momentText}>{body}</Text>
      </View>
    </View>
  );
});

export default React.memo(function MomentsCard({ moments }) {
  return (
    <SectionCard icon="time-outline" title="Session Moments">
      <Moment
        icon="trending-down"
        iconColor={colors.danger}
        title={`Fastest depletion · ${moments.fastestDrop.time}`}
        body={moments.fastestDrop.text}
      />
      <Moment
        icon="shield-checkmark"
        iconColor={colors.protected}
        title={`Best protected window · ${moments.bestWindow.duration}`}
        body={moments.bestWindow.text}
      />
      {moments.longestUnprotected ? (
        <Moment
          icon="alert-circle"
          iconColor={colors.danger}
          title={`Longest unprotected window · ${moments.longestUnprotected.duration}`}
          body={moments.longestUnprotected.text}
        />
      ) : null}

      {moments.waterEvents.length > 0 ? (
        <View style={st.waterBlock}>
          <Text style={st.waterLabel}>Water events</Text>
          {moments.waterEvents.map((e) => (
            <View key={e.time} style={st.waterRow}>
              <Text style={st.waterTime}>{e.time}</Text>
              <View style={[st.waterTag, e.type === 'Immersion' && st.waterTagImmersion]}>
                <Text style={[st.waterTagText, e.type === 'Immersion' && st.waterTagTextImmersion]}>
                  {e.type}
                </Text>
              </View>
              <Text style={st.waterCut}>−{e.cut}%</Text>
            </View>
          ))}
        </View>
      ) : null}
    </SectionCard>
  );
});

const st = StyleSheet.create({
  moment: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  momentIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  momentBody: {
    flex: 1,
  },
  momentTitle: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 13,
    color: colors.ink,
    marginBottom: 3,
  },
  momentText: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 13,
    color: colors.inkMid,
    lineHeight: 19,
  },
  waterBlock: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  waterLabel: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  waterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: colors.surface,
  },
  waterTime: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 13,
    color: colors.ink,
    width: 72,
  },
  waterTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: colors.orangeLight,
  },
  waterTagImmersion: {
    backgroundColor: colors.orange,
  },
  waterTagText: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 11,
    color: colors.orange,
  },
  waterTagTextImmersion: {
    color: colors.white,
  },
  waterCut: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 13,
    color: colors.danger,
    flex: 1,
    textAlign: 'right',
  },
});
