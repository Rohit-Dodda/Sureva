import React, { useRef, useCallback, useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, Dimensions, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { engineProfileFor } from '../components/activeSession/sessionMath';
import { getForecast } from '../services/WeatherService';
import SectionCard from '../components/SectionCard';
import CleanGlassSurface from '../components/CleanGlassSurface';
import SlideInView from '../components/SlideInView';
import UVCurveChart from '../components/forecast/UVCurveChart';
import WeekForecastStrip from '../components/forecast/WeekForecastStrip';
import { useScrollToTop } from '../context/ScrollToTopContext';

function currentHourLabel() {
  const h = new Date().getHours();
  if (h === 0) return '12a';
  if (h < 12) return `${h}a`;
  if (h === 12) return '12p';
  return `${h - 12}p`;
}

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
  // peakStartIndex/peakEndIndex come pre-computed from WeatherService —
  // peakWindow.start/end are a human-readable "11 AM" format for the text
  // below, a deliberately different format from hourly[].hour's compact
  // chart-axis labels ('11a'), so they can't be string-matched against
  // each other to find the chart index.
  const { peakStartIndex, peakEndIndex } = today;
  // Clamped to 0 (the day's first tracked hour) if the real current time
  // falls outside the tracked daylight window (e.g. checking the forecast
  // late at night) — there's no "now" to mark on the chart in that case,
  // so it defaults to the start rather than crashing on a -1 index.
  const nowIndex = Math.max(0, today.hourly.findIndex((h) => h.hour === currentHourLabel()));
  // A fresh nowcast, not today.hourly[nowIndex] — that array's UV values
  // come from EPA's once-daily forecast (accurate for the day's peak, but
  // never updated intraday), which can go stale for "right now" if real
  // sky conditions have shifted since this morning. currentUV is a
  // separately-sourced live reading for exactly that reason.
  const nowUV = today.currentUV;
  const now = uvLevel(nowUV);
  const peak = uvLevel(today.peakUV);

  return (
    <SectionCard glass icon="sunny" title="Today's UV Forecast" subtitle={`${location} · updated ${updated}`}>
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
          nowUV={today.currentUV}
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
    <SectionCard glass icon="shield-checkmark" title="Recommended Setup" subtitle="Tuned to your skin & today's conditions">
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
    <SectionCard glass icon="calendar" title="This Week" subtitle="Risk level for your skin, 7-day outlook">
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
      <CleanGlassSurface borderRadius={28} />
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
  const { userProfile } = useAuth();
  // null = still loading. Weather-fetch failure (permission denied, no
  // network) is common enough here that it gets its own visible state
  // rather than silently falling back to fake LA weather forever.
  const [forecast, setForecast] = useState(null);
  const [error, setError] = useState(null); // 'denied' | 'error' | null

  const loadForecast = useCallback(async () => {
    setError(null);
    try {
      const profile = engineProfileFor({}, userProfile);
      const result = await getForecast(profile.fitzpatrickType);
      if (result?.error === 'location_denied') {
        setError('denied');
        return;
      }
      setForecast(result);
    } catch {
      setError('error');
    }
  }, [userProfile]);
  useEffect(() => { loadForecast(); }, [loadForecast]);

  const scrollRef = useRef(null);
  const scrollToTop = useCallback(
    () => scrollRef.current?.scrollTo({ y: 0, animated: true }),
    []
  );
  useScrollToTop('forecast', scrollToTop);

  if (error) {
    return (
      <View style={st.root}>
        <SafeAreaView style={st.safe}>
          <StatusBar style="dark" />
          <View style={st.topBar}>
            <View style={st.titleBlock}>
              <Text style={st.kicker}>Forecast & Planning</Text>
              <Text style={st.heading}>Plan your sun</Text>
            </View>
          </View>
          <View style={st.stateWrap}>
            <Ionicons name={error === 'denied' ? 'location-outline' : 'cloud-offline-outline'} size={36} color={colors.border} />
            <Text style={st.stateText}>
              {error === 'denied'
                ? 'Enable location access to see your personalized UV and temperature forecast.'
                : "Couldn't load the forecast. Check your connection and try again."}
            </Text>
            <TouchableOpacity style={st.retryBtn} onPress={loadForecast} activeOpacity={0.85}>
              <Text style={st.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!forecast) {
    return (
      <View style={st.root}>
        <SafeAreaView style={st.safe}>
          <StatusBar style="dark" />
          <View style={st.stateWrap}>
            <ActivityIndicator size="large" color={colors.orange} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const { today, recommendedSetup, week, alert, location, updated } = forecast;

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
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.muted,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  heading: {
    fontFamily: 'Outfit-Regular',
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
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.orangeDark,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 120,
  },
  stateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  stateText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 21,
  },
  retryBtn: {
    backgroundColor: colors.orange,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.white,
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
    fontFamily: 'Outfit-Regular',
    fontSize: 34,
    letterSpacing: -1,
  },
  statPill: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statPillText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
  },
  statLabel: {
    fontFamily: 'Outfit-Regular',
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
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.danger,
  },
  peakLine: {
    fontFamily: 'Outfit-Regular',
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
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.inkMid,
  },
  specValue: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  specValueAccent: {
    fontFamily: 'Outfit-Regular',
    fontSize: 17,
    color: colors.orange,
  },
  recoLine: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.inkMid,
    marginBottom: 16,
  },
  whyLabel: {
    fontFamily: 'Outfit-Regular',
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
    fontFamily: 'Outfit-Regular',
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
    fontFamily: 'Outfit-Regular',
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
    fontFamily: 'Outfit-Regular',
    fontSize: 16,
    color: colors.onDark,
    letterSpacing: -0.3,
  },
  alertLine: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13.5,
    lineHeight: 21,
    color: colors.onDarkMuted,
  },

  // Best time
  bestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 28,
    padding: 18,
    overflow: 'hidden',
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
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
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.muted,
  },
  bestText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    lineHeight: 21,
    color: colors.ink,
    letterSpacing: -0.2,
  },
});
