import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  TouchableOpacity, Animated, Dimensions, Easing, LayoutAnimation,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import mockData from '../constants/mockData';
import SupabaseService from '../services/SupabaseService';
import { buildTrends } from '../services/TrendsMapper';
import { useAuth } from '../context/AuthContext';
import CircleIconButton from '../components/CircleIconButton';
import SegmentedControl from '../components/SegmentedControl';
import TrendsChart from '../components/TrendsChart';
import StatGrid from '../components/StatGrid';
import SectionCard from '../components/SectionCard';
import SlideInView from '../components/SlideInView';
import CountUpText from '../components/CountUpText';
import { useTabSwipeLock } from '../context/SwipeNavContext';

const SCREEN_W = Dimensions.get('window').width;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const BURN_THRESHOLD = 2.5; // MEDs — mild burn threshold for the user's skin type

const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const MODES = [
  { key: 'weeks',  label: 'Weeks' },
  { key: 'months', label: 'Months' },
  { key: 'year',   label: 'Year' },
];

const SELECT_SPRING = {
  duration: 300,
  create: { type: 'spring', springDamping: 0.9, property: 'scaleXY' },
  update: { type: 'spring', springDamping: 0.9 },
  delete: { type: 'spring', springDamping: 0.9, property: 'scaleXY' },
};

export default function TrendsScreen({ onBack }) {
  const { user } = useAuth();
  const slide = useRef(new Animated.Value(SCREEN_W)).current;

  // Full-screen overlay: disable the root tab-swipe so horizontal swipes on the
  // chart/chips don't bleed into a tab change.
  useTabSwipeLock();

  // null = fetch in flight (mock shown as a placeholder); a resolved array —
  // even an empty one — is the real, honest answer, not a permanent fallback.
  const [realSessions, setRealSessions] = useState(null);
  useEffect(() => {
    if (!user?.id) { setRealSessions([]); return undefined; }
    let cancelled = false;
    SupabaseService.getSessions(user.id)
      .then((res) => { if (!cancelled) setRealSessions(res.data ?? []); })
      // getSessions already swallows its own errors into { data: null }; this
      // guards the rejection path too so a fetch failure degrades to an honest
      // empty state rather than a raw error on screen.
      .catch(() => { if (!cancelled) setRealSessions([]); });
    return () => { cancelled = true; };
  }, [user]);

  // While loading, mock stands in; once resolved, real dose aggregates take
  // over — grouped by day/week/month from the user's own sessions.
  const trends = useMemo(
    () => (realSessions === null ? mockData.trends : buildTrends(realSessions)),
    [realSessions]
  );

  useEffect(() => {
    Animated.timing(slide, { toValue: 0, duration: 340, easing: EASE_OUT, useNativeDriver: true }).start();
  }, []);

  const handleBack = useCallback(() => {
    Animated.timing(slide, { toValue: SCREEN_W, duration: 280, easing: EASE_OUT, useNativeDriver: true })
      .start(() => onBack());
  }, [onBack]);

  const [mode, setMode]           = useState('weeks');
  const [weekId, setWeekId]       = useState(trends.weeks[0].id);
  const [monthId, setMonthId]     = useState(trends.months[trends.months.length - 1].id);
  const [selectedBar, setSelectedBar] = useState(null);

  const changeMode   = useCallback((key) => { setMode(key); setSelectedBar(null); }, []);
  const changeWeek   = useCallback((id) => { setWeekId(id); setSelectedBar(null); }, []);
  const changeMonth  = useCallback((id) => { setMonthId(id); setSelectedBar(null); }, []);
  const handleSelectBar = useCallback((i) => {
    LayoutAnimation.configureNext(SELECT_SPRING);
    setSelectedBar(i);
  }, []);

  // When the mock→real swap lands, the previously selected id no longer exists;
  // fall back to the same default bucket the initial state picked.
  const week  = trends.weeks.find((w) => w.id === weekId) ?? trends.weeks[0];
  const month = trends.months.find((m) => m.id === monthId) ?? trends.months[trends.months.length - 1];

  // The swapped dataset may be shorter than the old one, so drop any stale bar
  // selection when the underlying trends object changes.
  useEffect(() => { setSelectedBar(null); }, [trends]);

  let dataset, datasetId, insight, periodLabel, labelEvery, unitNoun;
  if (mode === 'weeks') {
    dataset = week.days.map((v, i) => ({ label: trends.dayLabels[i], value: v }));
    datasetId = week.id; insight = week.insight; periodLabel = week.label;
    labelEvery = 1; unitNoun = 'day';
  } else if (mode === 'months') {
    dataset = month.days.map((v, i) => ({ label: String(i + 1), value: v }));
    datasetId = month.id; insight = month.insight;
    periodLabel = `${month.label} 2026${month.partial ? ' · so far' : ''}`;
    labelEvery = 5; unitNoun = 'day';
  } else {
    dataset = trends.year.months.map((m) => ({ label: m.label, value: m.meds }));
    datasetId = 'year'; insight = trends.year.insight; periodLabel = '2026 · year to date';
    labelEvery = 1; unitNoun = 'month';
  }

  const values  = dataset.map((d) => d.value).filter((v) => v != null);
  const total   = values.reduce((a, b) => a + b, 0);
  const active  = values.filter((v) => v > 0).length;
  const peak    = Math.max(...values, 0);
  const average = values.length ? total / values.length : 0;

  const stats = [
    { label: `Active ${unitNoun}s`,        value: `${active} of ${values.length}` },
    { label: `Peak ${unitNoun}`,           value: `${peak.toFixed(1)} MEDs` },
    { label: `Average per ${unitNoun}`,    value: `${average.toFixed(2)} MEDs` },
    { label: 'Burn threshold',             value: `${BURN_THRESHOLD} MEDs` },
  ];

  const selected = selectedBar != null ? dataset[selectedBar] : null;
  const selectedPct = selected ? Math.min(Math.round((selected.value / BURN_THRESHOLD) * 100), 100) : 0;
  const selectedColor =
    selectedPct < 50 ? colors.protected :
    selectedPct < 80 ? colors.warning : colors.danger;

  const chips = mode === 'weeks' ? trends.weeks : mode === 'months' ? trends.months : null;
  const activeChipId = mode === 'weeks' ? weekId : monthId;
  const onChipPress  = mode === 'weeks' ? changeWeek : changeMonth;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, st.root, { transform: [{ translateX: slide }] }]}>
      <SafeAreaView style={st.safe}>
        <View style={st.header}>
          <CircleIconButton icon="chevron-back" onPress={handleBack} size={38} />
          <View style={st.headerText}>
            <Text style={st.title}>Exposure Trends</Text>
            <Text style={st.subtitle}>Your UV dose over time</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
          <SlideInView delay={30}>
            <SegmentedControl options={MODES} value={mode} onChange={changeMode} style={st.segmented} />
          </SlideInView>

          {chips && (
            <SlideInView delay={80}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chipRow}>
                {chips.map((c) => {
                  const activeChip = c.id === activeChipId;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[st.chip, activeChip && st.chipActive]}
                      onPress={() => onChipPress(c.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={[st.chipText, activeChip && st.chipTextActive]}>
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </SlideInView>
          )}

          <SlideInView delay={130}>
            <View style={st.chartCard}>
              <Text style={st.eyebrow}>{periodLabel}</Text>
              <View style={st.heroRow}>
                <CountUpText
                  value={total}
                  format={(v) => v.toFixed(1)}
                  style={st.heroVal}
                />
                <Text style={st.heroUnit}>MEDs total dose</Text>
              </View>

              <TrendsChart
                key={datasetId}
                data={dataset}
                selectedIndex={selectedBar}
                onSelectBar={handleSelectBar}
                labelEvery={labelEvery}
              />

              {selected && selected.value != null && (
                <View style={st.detailStrip}>
                  <View style={st.detailTextRow}>
                    <Text style={st.detailLabel}>
                      {mode === 'weeks' ? DAY_FULL[selectedBar]
                        : mode === 'months' ? `${month.label} ${selected.label}`
                        : MONTH_FULL[selectedBar]}
                      {mode === 'year' ? ' · month total' : ` · vs ${BURN_THRESHOLD} MED burn threshold`}
                    </Text>
                    <Text style={[st.detailPct, { color: selectedColor }]}>
                      {mode === 'year' ? `${selected.value.toFixed(1)} MEDs` : `${selectedPct}%`}
                    </Text>
                  </View>
                  {mode !== 'year' && (
                    <View style={st.detailTrack}>
                      <View style={[st.detailFill, { width: `${selectedPct}%`, backgroundColor: selectedColor }]} />
                    </View>
                  )}
                </View>
              )}
            </View>
          </SlideInView>

          <SlideInView delay={190}>
            <View style={st.statsCard}>
              <StatGrid stats={stats} />
            </View>
          </SlideInView>

          <SlideInView delay={250}>
            <SectionCard icon="sparkles" title="Sureva's Read">
              <Text style={st.insight}>{insight}</Text>
            </SectionCard>
          </SlideInView>
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  root: {
    backgroundColor: colors.canvas,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontFamily: 'Outfit-Regular',
    fontSize: 24,
    color: colors.ink,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 130,
  },
  segmented: {
    marginBottom: 14,
  },
  chipRow: {
    gap: 8,
    paddingBottom: 14,
  },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipActive: {
    backgroundColor: colors.charcoal,
    borderColor: colors.charcoal,
  },
  chipText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.inkMid,
  },
  chipTextActive: {
    color: colors.onDark,
  },
  chartCard: {
    backgroundColor: colors.white,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    marginBottom: 12,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  eyebrow: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 10,
  },
  heroVal: {
    fontFamily: 'Outfit-Regular',
    fontSize: 40,
    color: colors.ink,
    letterSpacing: -1.2,
  },
  heroUnit: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.muted,
  },
  detailStrip: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  detailTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.muted,
  },
  detailPct: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
  },
  detailTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  detailFill: {
    height: 8,
    borderRadius: 4,
  },
  statsCard: {
    marginBottom: 12,
  },
  insight: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.ink,
    lineHeight: 21,
  },
});
