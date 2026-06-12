import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import SectionCard from '../SectionCard';
import IconRow from '../IconRow';
import colors from '../../constants/colors';

const BAR_MAX_H = 64;

export default React.memo(function SeasonalCard({ seasonal }) {
  const rates = seasonal.months.filter((x) => x.rate != null).map((x) => x.rate);
  const maxRate = Math.max(...rates);

  return (
    <SectionCard icon="partly-sunny-outline" title="Seasonal Intelligence">
      <Text style={st.chartLabel}>Average depletion rate by month</Text>
      <View style={st.chart}>
        {seasonal.months.map((mo, i) => {
          const isCurrent = i === seasonal.currentMonthIndex;
          const h = mo.rate == null ? 3 : Math.max(6, (mo.rate / maxRate) * BAR_MAX_H);
          return (
            <View key={`${mo.m}-${i}`} style={st.barCol}>
              <View
                style={[
                  st.bar,
                  { height: h },
                  mo.rate == null
                    ? st.barEmpty
                    : isCurrent
                      ? st.barCurrent
                      : st.barPast,
                ]}
              />
              <Text style={[st.barLabel, isCurrent && st.barLabelCurrent]}>{mo.m}</Text>
            </View>
          );
        })}
      </View>

      <IconRow icon="warning-outline" title="Highest risk month" text={seasonal.highestRiskMonth} iconColor={colors.warning} />
      <IconRow icon="swap-vertical-outline" title="Versus last year" text={seasonal.yoy} />
      <IconRow icon="shield-half-outline" title="Seasonal SPF check" text={seasonal.spfReco} iconColor={colors.warning} />
      <IconRow icon="hourglass-outline" title="Summer behavior" text={seasonal.complianceShift} />
    </SectionCard>
  );
});

const st = StyleSheet.create({
  chartLabel: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: BAR_MAX_H + 22,
    marginBottom: 18,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    marginBottom: 6,
  },
  barPast: {
    backgroundColor: colors.orangeLight,
  },
  barCurrent: {
    backgroundColor: colors.orange,
  },
  barEmpty: {
    backgroundColor: colors.surface,
  },
  barLabel: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 10,
    color: colors.muted,
  },
  barLabelCurrent: {
    fontFamily: 'SFProDisplay-Black',
    color: colors.orange,
  },
});
