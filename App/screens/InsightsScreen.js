import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
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

export default function InsightsScreen() {
  const insights = mockData.insights;
  const [exportVisible, setExportVisible] = useState(false);

  const openExport = useCallback(() => setExportVisible(true), []);
  const closeExport = useCallback(() => setExportVisible(false), []);

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        <View style={st.hero}>
          <View style={st.heroRow}>
            <Text style={st.title}>Insights</Text>
            <TouchableOpacity style={st.exportBtn} onPress={openExport} activeOpacity={0.8}>
              <Text style={st.exportBtnText}>Export PDF</Text>
            </TouchableOpacity>
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
    backgroundColor: colors.white,
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
  exportBtn: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.orange,
  },
  exportBtnText: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 13,
    color: colors.white,
    letterSpacing: 0.2,
  },
  title: {
    fontFamily: 'SFProDisplay-Black',
    fontSize: 32,
    color: colors.ink,
    letterSpacing: -1,
  },
  subtitle: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
});
