import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import PassportInsightRow from './PassportInsightRow';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Summary stats card anchored at the top of the bottom panel: the two
// hero numbers are always visible; any cross-location insights are
// tucked behind a collapsed-by-default toggle so the card reads clean at
// a glance, expanding into full-width rows (never a cramped chip strip).
export default React.memo(function PassportStatsCard({
  places,
  regions,
  topUvCluster,
  depletionCluster,
  onDepletionPress,
  loyaltyLine,
  patternLine,
}) {
  const [expanded, setExpanded] = useState(false);
  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((e) => !e);
  }, []);
  const hasInsights = !!(topUvCluster || depletionCluster || loyaltyLine || patternLine);

  return (
    <View style={st.card}>
      <View style={st.statsRow}>
        <View style={st.stat}>
          <Text style={st.number}>{places}</Text>
          <Text style={st.label}>Places Protected</Text>
        </View>
        <View style={st.divider} />
        <View style={st.stat}>
          <Text style={st.number}>{regions}</Text>
          <Text style={st.label}>Regions Covered</Text>
        </View>
      </View>

      {hasInsights && (
        <TouchableOpacity style={st.toggleRow} onPress={toggle} activeOpacity={0.7}>
          <Text style={st.toggleText}>{expanded ? 'Hide insights' : 'Show insights'}</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.orangeDark} />
        </TouchableOpacity>
      )}

      {expanded && hasInsights && (
        <View style={st.insights}>
          {topUvCluster && (
            <PassportInsightRow icon="sunny" tint={colors.orange} label="Highest UV" value={topUvCluster.city} />
          )}
          {depletionCluster && (
            <PassportInsightRow
              icon="flame"
              tint={colors.warning}
              warn
              label="Depletes fastest"
              value={depletionCluster.city}
              onPress={onDepletionPress}
            />
          )}
          {loyaltyLine && <PassportInsightRow icon="repeat" tint={colors.orange} text={loyaltyLine} />}
          {patternLine && <PassportInsightRow icon="analytics-outline" tint={colors.navy} text={patternLine} />}
        </View>
      )}
    </View>
  );
});

const st = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.border,
    paddingTop: 18,
    paddingBottom: 8,
    marginBottom: 20,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 6,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  number: {
    fontFamily: 'Outfit-Regular',
    fontSize: 36,
    color: colors.orange,
    letterSpacing: -1,
  },
  label: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.inkMid,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 44,
    backgroundColor: colors.border,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  toggleText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.orangeDark,
  },
  insights: {
    paddingHorizontal: 14,
    paddingTop: 10,
  },
});
