import React, { useState, useCallback, useRef } from 'react';
import { View, Text, ScrollView, SafeAreaView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../constants/colors';
import mockData from '../constants/mockData';
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
import { useScrollToTop } from '../context/ScrollToTopContext';

export default function InsightsScreen() {
  const insights = mockData.insights;
  const [exportVisible, setExportVisible] = useState(false);

  const openExport = useCallback(() => setExportVisible(true), []);
  const closeExport = useCallback(() => setExportVisible(false), []);

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
