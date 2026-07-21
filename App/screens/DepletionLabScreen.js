import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Modal, View, Text, ScrollView, TouchableOpacity, SafeAreaView, StyleSheet, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { engineProfileFor } from '../components/activeSession/sessionMath';
import { runLab, scenarioName } from '../services/DepletionLabService';
import PressableScale from '../components/PressableScale';
import SlideInView from '../components/SlideInView';
import LabPresetChips from '../components/depletionLab/LabPresetChips';
import LabEnvironmentControls from '../components/depletionLab/LabEnvironmentControls';
import LabProtectionControls from '../components/depletionLab/LabProtectionControls';
import LabTimelapseChart from '../components/depletionLab/LabTimelapseChart';
import LabResultsSummary from '../components/depletionLab/LabResultsSummary';
import LabInsights from '../components/depletionLab/LabInsights';
import LabActions from '../components/depletionLab/LabActions';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W = SCREEN_W - 16 * 2 - 18 * 2; // screen padding + card padding
const SAVED_KEY = 'depletionLabScenarios';

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

// The Depletion Lab: set hypothetical conditions, run an animated
// timelapse of how protection would deplete, and learn the exact
// reapplication schedule that earns a perfect score. Standalone — needs
// no past session, only the user's skin profile.
export default function DepletionLabScreen({ visible, onClose }) {
  const { userProfile } = useAuth();
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [phase, setPhase] = useState('setup'); // 'setup' | 'lab'
  const [lab, setLab] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [runId, setRunId] = useState(0);
  const [saveState, setSaveState] = useState('idle'); // idle | saved | error
  const [saved, setSaved] = useState([]);

  // Lock the scroll while a slider/marker knob is held so a drag can't
  // scroll the page or have its gesture stolen (same pattern as the
  // What If simulator).
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

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={st.safe}>
        <View style={st.header}>
          <View style={st.headerText}>
            <Text style={st.title}>Depletion Lab</Text>
            <Text style={st.subtitle}>
              {phase === 'setup' ? 'Set the conditions, then run the timelapse' : 'Simulated session · your skin profile'}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={st.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={26} color={colors.ink} />
          </TouchableOpacity>
        </View>

        <ScrollView ref={scrollRef} style={st.scroll} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>
          {phase === 'setup' ? (
            <>
              <LabPresetChips saved={saved} onSelect={handlePreset} />
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
});
