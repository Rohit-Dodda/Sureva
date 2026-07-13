import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, SafeAreaView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../constants/colors';
import mockData from '../constants/mockData';
import mockPassportSessions from '../constants/mockPassportData';
import { clusterSessions } from '../components/passport/passportUtils';
import { SKIN_AGE_SCRATCHED_KEY } from '../constants/skinAgeStorage';
import { useTourTarget, useAutoStartTour } from '../context/AppTourContext';
import { MILESTONE_TOURS } from '../constants/tourSteps';
import SkinProfileCard from '../components/insights/SkinProfileCard';
import PatternsCard from '../components/insights/PatternsCard';
import HistoryCard from '../components/insights/HistoryCard';
import SeasonalCard from '../components/insights/SeasonalCard';
import SunscreenCard from '../components/insights/SunscreenCard';
import BodyIntelCard from '../components/insights/BodyIntelCard';
import ComplianceIntelCard from '../components/insights/ComplianceIntelCard';
import RiskIntelCard from '../components/insights/RiskIntelCard';
import SurevaTakeCard from '../components/sessionDetail/SurevaTakeCard';
import ExportReportSheet from '../components/insights/ExportReportSheet';
import PressableScale from '../components/PressableScale';
import RevealSkinAgeButton from '../components/skinAge/RevealSkinAgeButton';
import SkinAgeScreen from './SkinAgeScreen';
import { useScrollToTop } from '../context/ScrollToTopContext';
import { useRegisterOpener } from '../context/QuickSearchContext';

export default function InsightsScreen({ isActiveTab }) {
  const insights = mockData.insights;
  const [exportVisible, setExportVisible] = useState(false);
  const [skinAgeOpen, setSkinAgeOpen] = useState(false);
  // Once revealed it stays revealed — no reason to send a returning user
  // through the scratch-off again, so the entry button should read as
  // "go look at it" rather than "reveal it" from then on.
  const [skinAgeRevealed, setSkinAgeRevealed] = useState(false);
  const checkSkinAgeRevealed = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(SKIN_AGE_SCRATCHED_KEY);
      setSkinAgeRevealed(stored === '1');
    } catch {
      // Can't confirm — leave the button reading whatever it already did.
    }
  }, []);
  useEffect(() => { checkSkinAgeRevealed(); }, [checkSkinAgeRevealed]);

  const openExport = useCallback(() => setExportVisible(true), []);
  const closeExport = useCallback(() => setExportVisible(false), []);
  const openSkinAge = useCallback(() => setSkinAgeOpen(true), []);
  // Re-checked on close, not just on mount — this screen stays mounted the
  // whole time (it's a tab), so a first-time reveal that just happened
  // inside SkinAgeScreen wouldn't otherwise be picked up until next launch.
  const closeSkinAge = useCallback(() => {
    setSkinAgeOpen(false);
    checkSkinAgeRevealed();
  }, [checkSkinAgeRevealed]);
  useRegisterOpener('skinAge', openSkinAge);

  // Same 3-visits threshold progressStats() already uses to unlock a
  // location's "your progress here" comparison — reused here so the
  // coach mark's promise ("you've logged enough") lines up with a real
  // gate elsewhere in the app, not an arbitrary separate number.
  const revealButtonTourRef = useTourTarget('revealButton');
  // `isActiveTab` flips true right as the tab pager *starts* its settle
  // spring, not once it's landed — waiting a beat past that avoids
  // measuring the button mid-swipe.
  const [tabSettled, setTabSettled] = useState(false);
  useEffect(() => {
    if (!isActiveTab) { setTabSettled(false); return undefined; }
    const id = setTimeout(() => setTabSettled(true), 450);
    return () => clearTimeout(id);
  }, [isActiveTab]);
  const hasEnoughForSkinAge = useMemo(
    () => clusterSessions(mockPassportSessions).some((c) => c.sessions.length > 3),
    []
  );
  const skinAgeMilestone = MILESTONE_TOURS.skinAgeUnlocked;
  useAutoStartTour(
    skinAgeMilestone.id, skinAgeMilestone.steps,
    tabSettled && hasEnoughForSkinAge && !skinAgeRevealed
  );

  const scrollRef = useRef(null);
  const scrollToTop = useCallback(
    () => scrollRef.current?.scrollTo({ y: 0, animated: true }),
    []
  );
  useScrollToTop('insights', scrollToTop);

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar style="dark" />
      <ScrollView ref={scrollRef} contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        <View style={st.hero}>
          <View style={st.heroRow}>
            <Text style={st.title}>Insights</Text>
            <PressableScale onPress={openExport} scaleTo={0.94} style={st.exportShadow}>
              <LinearGradient
                colors={[colors.gradOrangeStart, colors.gradOrangeEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={st.exportBtn}
              >
                <Text style={st.exportBtnText}>Export PDF</Text>
              </LinearGradient>
            </PressableScale>
          </View>
          <Text style={st.subtitle}>
            What Sureva has learned from {insights.sessionsAnalyzed} sessions with your skin
          </Text>
        </View>

        <View ref={revealButtonTourRef}>
          <RevealSkinAgeButton onPress={openSkinAge} revealed={skinAgeRevealed} />
        </View>

        <SkinProfileCard profile={insights.skinProfile} />
        <PatternsCard patterns={insights.patterns} />
        <HistoryCard history={insights.history} />
        <SeasonalCard seasonal={insights.seasonal} />
        <SunscreenCard sunscreen={insights.sunscreen} />
        <BodyIntelCard body={insights.body} />
        <ComplianceIntelCard compliance={insights.compliance} />
        <RiskIntelCard risk={insights.risk} />
        <SurevaTakeCard title="Sureva's Read On You" take={insights.aiRead} />
      </ScrollView>
      <ExportReportSheet visible={exportVisible} onDismiss={closeExport} />

      {/* Skin Age — full-screen push over Insights */}
      {skinAgeOpen && (
        <View style={StyleSheet.absoluteFill}>
          <SkinAgeScreen onBack={closeSkinAge} />
        </View>
      )}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 130,
  },
  hero: {
    marginBottom: 22,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  exportShadow: {
    borderRadius: 24,
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.30,
    shadowRadius: 10,
    elevation: 4,
  },
  exportBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  exportBtnText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 13,
    color: colors.white,
    letterSpacing: 0.2,
  },
  title: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 32,
    color: colors.ink,
    letterSpacing: -1,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
});
