import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  Modal, View, Text, ScrollView, TouchableOpacity, SafeAreaView, StyleSheet, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { engineProfileFor } from '../components/activeSession/sessionMath';
import { runLab, scenarioName, nearestValue } from '../services/DepletionLabService';
import { getForecast } from '../services/WeatherService';
import SupabaseService from '../services/SupabaseService';
import { buildSessionHero, buildWhatIfSimData } from '../services/SessionDetailMapper';
import { simulateSession, overridesFromActuals, compareResults } from '../services/SimulationService';
import PressableScale from '../components/PressableScale';
import SlideInView from '../components/SlideInView';
import OptionToggleRow from '../components/whatIf/OptionToggleRow';
import SimulationCharts from '../components/whatIf/SimulationCharts';
import ResultStrip from '../components/whatIf/ResultStrip';
import WhatIfActions from '../components/whatIf/WhatIfActions';
import LabSessionPicker from '../components/depletionLab/LabSessionPicker';
import LabPresetChips from '../components/depletionLab/LabPresetChips';
import LabEnvironmentControls, { UV_VALUES, TEMP_VALUES, HUMIDITY_VALUES } from '../components/depletionLab/LabEnvironmentControls';
import LabProtectionControls from '../components/depletionLab/LabProtectionControls';
import LabTimelapseChart from '../components/depletionLab/LabTimelapseChart';
import LabResultsSummary from '../components/depletionLab/LabResultsSummary';
import LabInsights from '../components/depletionLab/LabInsights';
import LabActions from '../components/depletionLab/LabActions';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W = SCREEN_W - 16 * 2 - 18 * 2; // screen padding + card padding
const SAVED_KEY = 'depletionLabScenarios';
// SimulationCharts was built to fill a flex:1 background layer on its own
// full-screen Modal (the old standalone Session Simulator screen) — here
// it's one card inside a ScrollView, so it needs an explicit height instead.
const PAST_CHART_H = 420;

const DEFAULT_CONFIG = {
  durationMinutes: 120,
  uvIndex: 8,
  temperature: 30,
  humidity: 50,
  activityLevel: 'moderate',
  spf: 30,
  waterResistanceRating: 40,
  reapplicationMinutes: [],
  waterBreakMinutes: [],
  waterBreakType: 'swim',
};

const MODE_OPTIONS = [
  { label: 'Custom Conditions', value: 'custom' },
  { label: 'Past Session', value: 'past' },
];

// The Lab: two ways to explore the depletion algorithm under one roof.
// Custom Conditions sets hypothetical constant weather and runs an
// animated timelapse — needs no past session. Past Session replays a real
// completed session with different choices (SPF, water resistance,
// reapplication timing) and shows how the score would have changed —
// this used to be the standalone "Session Simulator" screen, merged in
// here rather than living as a second, separate what-if tool. Real
// weather from a past session can't be rewritten, only your own choices
// can — Past Session mode's environment stays read-only for exactly that
// reason (see the render branch below).
// initialSessionId deep-links straight into Past Session mode for that
// session. initialSimData/initialHero are optional pre-built data (see
// SessionDetailScreen's whatIfData — mock/demo sessions resolve their
// simulation inputs from a local constants file, not Supabase, so this
// screen can't always self-fetch by id alone); when provided, they're
// used as-is instead of triggering a fetch.
export default function DepletionLabScreen({
  visible, onClose, initialSessionId, initialSimData, initialHero,
}) {
  const { user, userProfile } = useAuth();
  const [mode, setMode] = useState(initialSessionId ? 'past' : 'custom');

  // ── Custom Conditions state ──────────────────────────────────
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [phase, setPhase] = useState('setup'); // 'setup' | 'lab'
  const [lab, setLab] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [runId, setRunId] = useState(0);
  const [saveState, setSaveState] = useState('idle'); // idle | saved | error
  const [saved, setSaved] = useState([]);
  const [conditionsState, setConditionsState] = useState('idle'); // idle | loading | error

  // ── Past Session state ────────────────────────────────────────
  const [pastSessions, setPastSessions] = useState(null); // null = not fetched yet
  const [pastLoading, setPastLoading] = useState(false);
  const [pastLoadError, setPastLoadError] = useState(false);
  const [pastSession, setPastSession] = useState(null); // hero shape
  const [simData, setSimData] = useState(null); // { readings, userProfile, actuals }
  const [overrides, setOverrides] = useState(null);

  // Lock the scroll while a slider/marker knob is held so a drag can't
  // scroll the page or have its gesture stolen.
  const scrollRef = useRef(null);
  const handleDraggingChange = useCallback((dragging) => {
    scrollRef.current?.setNativeProps({ scrollEnabled: !dragging });
  }, []);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SAVED_KEY);
        if (raw) setSaved(JSON.parse(raw));
      } catch {
        // Saved scenarios are a convenience — a read failure just means none show.
      }
    })();
  }, [visible]);

  // Every fresh open starts clean — a deep-linked open (initialSessionId
  // set, from SessionDetailScreen's entry card) always lands in Past
  // Session mode, not wherever mode was last left from a previous visit.
  useEffect(() => {
    if (!visible) return;
    setMode(initialSessionId ? 'past' : 'custom');
    setPastSession(null);
    setSimData(null);
    setOverrides(null);
    setPastLoadError(false);
  }, [visible, initialSessionId]);

  // Picker list — fetched once, the first time Past Session mode is
  // actually reached, not on every open (no network cost for users who
  // stay in Custom Conditions).
  useEffect(() => {
    if (!visible || mode !== 'past' || pastSessions !== null || !user?.id) return;
    setPastLoading(true);
    (async () => {
      try {
        const { data: rows } = await SupabaseService.getSessions(user.id);
        const profile = engineProfileFor({}, userProfile);
        const heroes = (rows ?? [])
          .map((r) => buildSessionHero(r, profile.fitzpatrickType))
          .filter((h) => h.durationMinutes > 0);
        setPastSessions(heroes);
      } catch {
        setPastSessions([]);
      } finally {
        setPastLoading(false);
      }
    })();
  }, [visible, mode, pastSessions, user, userProfile]);

  // Loads one session's full readings and builds the What If inputs —
  // shared by the picker (already has a hero row) and the deep-linked
  // initialSessionId path (doesn't yet, so heroFallback is omitted there
  // and built fresh off the same fetched row).
  const loadPastSession = useCallback(async (sessionId, heroFallback) => {
    setPastLoading(true);
    setPastLoadError(false);
    try {
      const { data: row } = await SupabaseService.getSessionById(sessionId);
      if (!row) throw new Error('Session not found');
      const profile = engineProfileFor({}, userProfile);
      const built = buildWhatIfSimData(row, profile);
      if (!built) throw new Error('No readings to replay');
      setSimData(built);
      setOverrides(overridesFromActuals(built.actuals));
      setPastSession(heroFallback ?? buildSessionHero(row, profile.fitzpatrickType));
    } catch {
      setPastLoadError(true);
    } finally {
      setPastLoading(false);
    }
  }, [userProfile]);

  useEffect(() => {
    if (!visible || !initialSessionId || pastSession || simData) return;
    if (initialSimData) {
      setSimData(initialSimData);
      setOverrides(overridesFromActuals(initialSimData.actuals));
      setPastSession(initialHero ?? null);
      return;
    }
    loadPastSession(initialSessionId);
  }, [visible, initialSessionId, initialSimData, initialHero, pastSession, simData, loadPastSession]);

  const handleSelectPastSession = useCallback((hero) => {
    loadPastSession(hero.id, hero);
  }, [loadPastSession]);

  const handleChangeSession = useCallback(() => {
    setPastSession(null);
    setSimData(null);
    setOverrides(null);
  }, []);

  // The actual line is recomputed through the same engine path as the
  // simulation (not read from stored session columns), so Reset makes the
  // two lines exactly identical — same guarantee the old Session Simulator had.
  const actualResult = useMemo(() => {
    if (!simData) return null;
    return simulateSession({
      readings: simData.readings,
      overrides: overridesFromActuals(simData.actuals),
      userProfile: simData.userProfile,
    });
  }, [simData]);
  const simResult = useMemo(() => {
    if (!simData || !overrides) return null;
    return simulateSession({ readings: simData.readings, overrides, userProfile: simData.userProfile });
  }, [simData, overrides]);
  const comparison = useMemo(() => {
    if (!actualResult || !simResult) return null;
    return compareResults(actualResult, simResult);
  }, [actualResult, simResult]);

  const handlePastOverrideChange = useCallback((partial) => {
    setOverrides((prev) => ({ ...prev, ...partial }));
  }, []);
  const handlePastReset = useCallback(() => {
    if (simData) setOverrides(overridesFromActuals(simData.actuals));
  }, [simData]);

  // ── Custom Conditions handlers ────────────────────────────────
  const handleChange = useCallback((partial) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      if (partial.durationMinutes && partial.durationMinutes !== prev.durationMinutes) {
        // Markers must stay inside a shrunken session.
        const cap = Math.max(5, next.durationMinutes - 5);
        next.reapplicationMinutes = next.reapplicationMinutes.map((m) => Math.min(m, cap));
        next.waterBreakMinutes = next.waterBreakMinutes.map((m) => Math.min(m, cap));
      }
      return next;
    });
  }, []);

  const handlePreset = useCallback((preset) => {
    setConfig({
      ...preset,
      reapplicationMinutes: [...preset.reapplicationMinutes],
      waterBreakMinutes: [...preset.waterBreakMinutes],
    });
  }, []);

  // Fills just the environment sliders (UV, temperature, humidity) from the
  // user's real current location/weather — everything else (duration,
  // activity, protection setup) stays whatever they already had, since
  // those aren't weather-derived. Snapped onto each slider's own benchmark
  // values so the thumb lands on a real tick, not just the displayed number.
  const handleConditionsNow = useCallback(async () => {
    setConditionsState('loading');
    try {
      const forecast = await getForecast(userProfile?.fitzpatrickType);
      if (forecast?.error) {
        setConditionsState('error');
        return;
      }
      const { currentUV, currentTemp, currentHumidity } = forecast.today;
      handleChange({
        uvIndex: nearestValue(UV_VALUES, currentUV),
        temperature: nearestValue(TEMP_VALUES, currentTemp),
        humidity: nearestValue(HUMIDITY_VALUES, currentHumidity),
      });
      setConditionsState('idle');
    } catch {
      setConditionsState('error');
    }
  }, [userProfile, handleChange]);

  const handleRun = useCallback(() => {
    const profile = engineProfileFor(
      { spf: config.spf, waterResistance: config.waterResistanceRating },
      userProfile
    );
    const labConfig = {
      ...config,
      waterBreaks: config.waterBreakMinutes.map((minute) => ({ minute, type: config.waterBreakType })),
    };
    setLab({ ...runLab(labConfig, profile), profile });
    setPhase('lab');
    setShowResults(false);
    setSaveState('idle');
    setRunId((id) => id + 1);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [config, userProfile]);

  const handleAnimationDone = useCallback(() => setShowResults(true), []);
  const handleReplay = useCallback(() => setRunId((id) => id + 1), []);
  const handleAdjust = useCallback(() => setPhase('setup'), []);

  const handleSave = useCallback(async () => {
    try {
      const entry = { name: scenarioName(config), config, savedAt: Date.now() };
      const next = [entry, ...saved.filter((s) => s.name !== entry.name)].slice(0, 6);
      await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(next));
      setSaved(next);
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }, [config, saved]);

  const subtitle = mode === 'custom'
    ? (phase === 'setup' ? 'Set the conditions, then run the timelapse' : 'Simulated session · your skin profile')
    : (pastSession ? `${pastSession.location} · ${pastSession.date}` : 'Replay a real session with different choices');

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={st.safe}>
        <View style={st.header}>
          <View style={st.headerText}>
            <Text style={st.title}>The Lab</Text>
            <Text style={st.subtitle}>{subtitle}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={st.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={26} color={colors.ink} />
          </TouchableOpacity>
        </View>

        <ScrollView ref={scrollRef} style={st.scroll} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={st.modeGap}>
            <OptionToggleRow options={MODE_OPTIONS} value={mode} onChange={setMode} />
          </View>

          {mode === 'custom' ? (
            phase === 'setup' ? (
              <>
                <LabPresetChips
                  conditionsState={conditionsState}
                  onSelect={handlePreset}
                  onConditionsNow={handleConditionsNow}
                />
                <View style={st.presetGap} />
                <LabEnvironmentControls config={config} onChange={handleChange} onDraggingChange={handleDraggingChange} />
                <LabProtectionControls config={config} onChange={handleChange} onDraggingChange={handleDraggingChange} />
                <PressableScale style={st.runBtn} onPress={handleRun}>
                  <Ionicons name="play" size={18} color={colors.white} />
                  <Text style={st.runLabel}>Run the timelapse</Text>
                </PressableScale>
              </>
            ) : (
              lab && (
                <>
                  <View style={st.chartCard}>
                    <View style={st.chartHeader}>
                      <Text style={st.chartTitle}>Protection over the session</Text>
                      <TouchableOpacity onPress={handleReplay} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="refresh" size={18} color={colors.orangeDark} />
                      </TouchableOpacity>
                    </View>
                    <LabTimelapseChart lab={lab} runId={runId} width={CHART_W} onComplete={handleAnimationDone} />
                  </View>
                  {showResults && (
                    <>
                      <SlideInView delay={40}>
                        <LabResultsSummary lab={lab} />
                      </SlideInView>
                      <SlideInView delay={130}>
                        <LabInsights lab={lab} fitzpatrickType={lab.profile.fitzpatrickType} />
                      </SlideInView>
                      <SlideInView delay={220}>
                        <LabActions lab={lab} saveState={saveState} onAdjust={handleAdjust} onSave={handleSave} />
                      </SlideInView>
                    </>
                  )}
                </>
              )
            )
          ) : !simData || !comparison ? (
            pastLoadError ? (
              <View style={st.errorWrap}>
                <Ionicons name="alert-circle-outline" size={28} color={colors.muted} />
                <Text style={st.errorText}>Couldn't load that session. Try another one.</Text>
              </View>
            ) : (
              <LabSessionPicker sessions={pastSessions ?? []} loading={pastLoading} onSelect={handleSelectPastSession} />
            )
          ) : (
            <>
              <TouchableOpacity onPress={handleChangeSession} style={st.changeSessionBtn} hitSlop={{ top: 8, bottom: 8 }}>
                <Ionicons name="chevron-back" size={16} color={colors.orangeDark} />
                <Text style={st.changeSessionText}>Pick a different session</Text>
              </TouchableOpacity>

              <View style={st.chartCard}>
                <View style={{ height: PAST_CHART_H }}>
                  <SimulationCharts
                    actualResult={actualResult}
                    simResult={simResult}
                    startTime={pastSession.startTime}
                    endTime={pastSession.endTime}
                  />
                </View>
              </View>

              <View style={st.stripGap}>
                <ResultStrip comparison={comparison} />
              </View>

              <LabProtectionControls
                config={{ ...overrides, durationMinutes: actualResult.durationMinutes }}
                onChange={handlePastOverrideChange}
                onDraggingChange={handleDraggingChange}
                showWaterBreaks={false}
              />
              <TouchableOpacity onPress={handlePastReset} style={st.resetBtn}>
                <Text style={st.resetText}>Reset to what actually happened</Text>
              </TouchableOpacity>

              <WhatIfActions
                session={pastSession}
                overrides={overrides}
                actuals={simData.actuals}
                comparison={comparison}
                actualResult={actualResult}
                simResult={simResult}
              />
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const st = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontFamily: 'Outfit-Regular',
    fontSize: 28,
    color: colors.ink,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  closeBtn: {
    marginTop: 6,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  modeGap: {
    marginBottom: 16,
  },
  presetGap: {
    height: 14,
  },
  runBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.orange,
    borderRadius: 24,
    paddingVertical: 16,
    marginTop: 4,
    marginBottom: 24,
  },
  runLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 16,
    color: colors.white,
  },
  chartCard: {
    backgroundColor: colors.white,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 14,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  chartTitle: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  changeSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 14,
    alignSelf: 'flex-start',
  },
  changeSessionText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.orangeDark,
  },
  stripGap: {
    marginBottom: 14,
  },
  resetBtn: {
    alignSelf: 'center',
    marginTop: -4,
    marginBottom: 16,
  },
  resetText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.muted,
    textDecorationLine: 'underline',
  },
  errorWrap: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  errorText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
  },
});
