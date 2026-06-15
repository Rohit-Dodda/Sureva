import React, { useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import mockData from '../constants/mockData';
import SectionCard from '../components/SectionCard';
import SlideInView from '../components/SlideInView';
import UVCurveChart from '../components/forecast/UVCurveChart';
import WeekForecastStrip from '../components/forecast/WeekForecastStrip';
import { useScrollToTop } from '../context/ScrollToTopContext';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W = SCREEN_W - 16 * 2 - 18 * 2; // screen padding + card padding
const CHART_H = 168;

function uvLevel(uv) {
  if (uv >= 6) return { color: colors.danger, label: 'High' };
  if (uv >= 3) return { color: colors.warning, label: 'Moderate' };
  return { color: colors.protected, label: 'Low' };
}

// ─── Today's UV Forecast ──────────────────────────────────────
const TodayForecastCard = React.memo(function TodayForecastCard({ today, location, updated }) {
  const peakStartIndex = today.hourly.findIndex((h) => h.hour === '11a');
  const peakEndIndex = today.hourly.findIndex((h) => h.hour === '2p');
  const nowIndex = today.hourly.findIndex((h) => h.hour === '10a'); // current hour (9:42 AM → 10a)
  const nowUV = today.hourly[nowIndex].uv;
  const now = uvLevel(nowUV);
  const peak = uvLevel(today.peakUV);

  return (
    <SectionCard icon="sunny" title="Today's UV Forecast" subtitle={`${location} · updated ${updated}`}>
      {/* Headline stats — read the moment without scanning the curve */}
      <View style={st.statHeader}>
        <View style={st.statBlock}>
          <View style={st.statValRow}>
            <Text style={[st.statVal, { color: now.color }]}>{nowUV}</Text>
            <View style={[st.statPill, { backgroundColor: `${now.color}1A` }]}>
              <Text style={[st.statPillText, { color: now.color }]}>{now.label}</Text>
            </View>
          </View>
          <Text style={st.statLabel}>UV right now</Text>
        </View>
        <View style={st.statDivider} />
        <View style={st.statBlock}>
          <View style={st.statValRow}>
            <Text style={[st.statVal, { color: peak.color }]}>{today.peakUV}</Text>
            <View style={[st.statPill, { backgroundColor: `${peak.color}1A` }]}>
              <Text style={[st.statPillText, { color: peak.color }]}>{peak.label}</Text>
            </View>
          </View>
          <Text style={st.statLabel}>Peak · {today.peakWindow.start}–{today.peakWindow.end}</Text>
        </View>
      </View>

      <View style={st.chartWrap}>
        <UVCurveChart
          hourly={today.hourly}
          peakStartIndex={peakStartIndex}
          peakEndIndex={peakEndIndex}
          nowIndex={nowIndex}
          width={CHART_W}
          height={CHART_H}
        />
      </View>

      {/* Personalized peak-window callout */}
      <View style={st.peakCallout}>
        <View style={st.peakBadge}>
          <Ionicons name="warning" size={13} color={colors.danger} />
          <Text style={st.peakBadgeText}>Peak {today.peakWindow.start}–{today.peakWindow.end}</Text>
        </View>
        <Text style={st.peakLine}>{today.riskLine}</Text>
      </View>
    </SectionCard>
  );
});

// ─── Recommended Session Setup ────────────────────────────────
const RecommendedSetupCard = React.memo(function RecommendedSetupCard({ setup }) {
  const specs = [
    { icon: 'flask', label: 'Sunscreen', value: setup.spf, accent: true },
    { icon: 'water', label: 'Water resistance', value: setup.waterResistant ? 'Recommended' : 'Optional' },
    { icon: 'timer', label: 'Reapply every', value: `${setup.reapplyMinutes} min` },
  ];
  return (
    <SectionCard icon="shield-checkmark" title="Recommended Setup" subtitle="Tuned to your skin & today's conditions">
      {/* Prescription spec list — even rows, no awkward boxes */}
      <View style={st.specList}>
        {specs.map((s, i) => (
          <View key={s.label} style={[st.specRow, i < specs.length - 1 && st.specRowBorder]}>
            <View style={st.specIcon}>
              <Ionicons name={s.icon} size={16} color={colors.orangeDark} />
            </View>
            <Text style={st.specLabel}>{s.label}</Text>
            <Text style={[st.specValue, s.accent && st.specValueAccent]}>{s.value}</Text>
          </View>
        ))}
      </View>

      <Text style={st.recoLine}>{setup.line}</Text>

      {/* Why — the conditions driving the recommendation */}
      <Text style={st.whyLabel}>Why this setup</Text>
      <View style={st.chipRow}>
        {setup.factors.map((f) => (
          <View key={f.label} style={st.chip}>
            <Ionicons name={f.icon} size={13} color={colors.inkMid} />
            <Text style={st.chipText}>{f.label}</Text>
          </View>
        ))}
      </View>
    </SectionCard>
  );
});

// ─── This Week ────────────────────────────────────────────────
const WeekCard = React.memo(function WeekCard({ week }) {
  const legend = [
    { color: colors.muted, label: 'Low' },
    { color: colors.warning, label: 'Moderate' },
    { color: colors.danger, label: 'High' },
  ];
  return (
    <SectionCard icon="calendar" title="This Week" subtitle="Risk level for your skin, 7-day outlook">
      <WeekForecastStrip week={week} />
      <View style={st.legendRow}>
        {legend.map((l) => (
          <View key={l.label} style={st.legendItem}>
            <View style={[st.legendDot, { backgroundColor: l.color }]} />
            <Text style={st.legendLabel}>{l.label}</Text>
          </View>
        ))}
      </View>
    </SectionCard>
  );
});

// ─── Condition Alert ──────────────────────────────────────────
const ConditionAlertCard = React.memo(function ConditionAlertCard({ alert }) {
  return (
    <View style={st.alertCard}>
      <View style={st.alertHeader}>
        <View style={st.alertIcon}>
          <Ionicons name="alert-circle" size={18} color={colors.white} />
        </View>
        <Text style={st.alertTitle}>{alert.title}</Text>
      </View>
      <Text style={st.alertLine}>{alert.line}</Text>
    </View>
  );
});

// ─── Best time to go out ──────────────────────────────────────
const BestTimeCard = React.memo(function BestTimeCard({ text }) {
  return (
    <View style={st.bestCard}>
      <View style={st.bestIcon}>
        <Ionicons name="time" size={18} color={colors.orangeDark} />
      </View>
      <View style={st.bestTextWrap}>
        <Text style={st.bestLabel}>Best time to go out today</Text>
        <Text style={st.bestText}>{text}</Text>
      </View>
    </View>
  );
});

// ─── Main screen ──────────────────────────────────────────────
export default function ForecastScreen() {
  const { forecast } = mockData;
  const { today, recommendedSetup, week, alert, location, updated } = forecast;

  const scrollRef = useRef(null);
  const scrollToTop = useCallback(
    () => scrollRef.current?.scrollTo({ y: 0, animated: true }),
    []
  );
  useScrollToTop('forecast', scrollToTop);

  return (
    <View style={st.root}>
      <SafeAreaView style={st.safe}>
        <StatusBar style="dark" />

        <View style={st.topBar}>
          <View style={st.titleBlock}>
            <Text style={st.kicker}>Forecast & Planning</Text>
            <Text style={st.heading}>Plan your sun</Text>
          </View>
          <View style={st.locPill}>
            <Ionicons name="location" size={13} color={colors.orangeDark} />
            <Text style={st.locText} numberOfLines={1}>{location}</Text>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={st.scroll}
          contentContainerStyle={st.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <SlideInView delay={40}>
            <TodayForecastCard today={today} location={location} updated={updated} />
          </SlideInView>
          <SlideInView delay={110}>
            <RecommendedSetupCard setup={recommendedSetup} />
          </SlideInView>
          <SlideInView delay={180}>
            <WeekCard week={week} />
          </SlideInView>
          {alert.active && (
            <SlideInView delay={250}>
              <ConditionAlertCard alert={alert} />
            </SlideInView>
          )}
          <SlideInView delay={alert.active ? 320 : 250}>
            <BestTimeCard text={today.bestTime} />
          </SlideInView>
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  safe: { flex: 1, backgroundColor: colors.canvas },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 12,
  },
  titleBlock: { flex: 1 },
  kicker: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: colors.muted,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  heading: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 24,
    lineHeight: 28,
    color: colors.ink,
    letterSpacing: -0.6,
  },
  locPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 150,
    backgroundColor: colors.orangeWash,
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  locText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 12,
    color: colors.orangeDark,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 120,
  },

  // Today — stat header
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  statBlock: { flex: 1, gap: 4 },
  statValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statVal: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 34,
    letterSpacing: -1,
  },
  statPill: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statPillText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 11,
  },
  statLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.muted,
  },
  statDivider: {
    width: 1,
    height: 42,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },

  // Today — chart
  chartWrap: { marginBottom: 4 },
  peakCallout: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  peakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: colors.redWash,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  peakBadgeText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 12,
    color: colors.danger,
  },
  peakLine: {
    fontFamily: 'Inter-Regular',
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.inkMid,
  },

  // Recommended setup — spec list
  specList: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
  },
  specRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  specIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: colors.orangeWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specLabel: {
    flex: 1,
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: colors.inkMid,
  },
  specValue: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 15,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  specValueAccent: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 17,
    color: colors.orange,
  },
  recoLine: {
    fontFamily: 'Inter-Regular',
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.inkMid,
    marginBottom: 16,
  },
  whyLabel: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  chipText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 12,
    color: colors.inkMid,
  },

  // Week
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  legendLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.muted,
  },

  // Alert
  alertCard: {
    backgroundColor: colors.charcoal,
    borderRadius: 28,
    padding: 20,
    marginBottom: 14,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 3,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 12,
  },
  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitle: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 16,
    color: colors.onDark,
    letterSpacing: -0.3,
  },
  alertLine: {
    fontFamily: 'Inter-Regular',
    fontSize: 13.5,
    lineHeight: 21,
    color: colors.onDarkMuted,
  },

  // Best time
  bestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.white,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  bestIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.orangeWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bestTextWrap: { flex: 1, gap: 2 },
  bestLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.muted,
  },
  bestText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 15,
    lineHeight: 21,
    color: colors.ink,
    letterSpacing: -0.2,
  },
});
