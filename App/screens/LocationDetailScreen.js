import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, SafeAreaView, StyleSheet, Animated, Dimensions, Easing,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import { scoreColor, uvEnvironment, progressStats } from '../components/passport/passportUtils';
import {
  modalStartHourLabel, modalUvPeakTimeBucket, uvDistribution, peakUvRecord, locationRankLine,
  globalAverages, bestWorstSession, protectionGapRate, avgAlertResponse,
  mostCommonDayOfWeek, mostCommonActivityLevel, longestVisitStreak, firstLastVisit,
  avgTempHumidity, waterEventFrequency, mostCommonSeason, dominantConditionPhrase, skinResponseSummary,
} from '../components/passport/locationDetailUtils';
import ExpandableCard from '../components/ExpandableCard';
import LocationHeroStats from '../components/passport/LocationHeroStats';
import LocationStatGrid from '../components/passport/LocationStatGrid';
import LocationStatTile from '../components/passport/LocationStatTile';
import LocationCompareTile from '../components/passport/LocationCompareTile';
import LocationNote from '../components/passport/LocationNote';
import LocationUvDistribution from '../components/passport/LocationUvDistribution';
import SessionCard from '../components/SessionCard';
import SessionDetailScreen from './SessionDetailScreen';

const SCREEN_W = Dimensions.get('window').width;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const INITIAL_SESSION_LIMIT = 10;

// Full location breakdown, pushed from a hotspot ranking card's "View Full
// Details" button. Receives the cluster (its sessions) plus the full
// cluster list and all-locations session list, needed for the
// cross-location ranking line and the global-average comparisons.
export default function LocationDetailScreen({ cluster, clusters, allSessions, onBack }) {
  const translateX = useRef(new Animated.Value(SCREEN_W)).current;
  useEffect(() => {
    Animated.timing(translateX, { toValue: 0, duration: 380, easing: EASE_OUT, useNativeDriver: true }).start();
  }, [translateX]);
  const handleBack = useCallback(() => {
    Animated.timing(translateX, { toValue: SCREEN_W, duration: 260, easing: EASE_OUT, useNativeDriver: true }).start(onBack);
  }, [translateX, onBack]);

  const [selectedSession, setSelectedSession] = useState(null);
  const [openKey, setOpenKey] = useState(0);
  const handleSessionPress = useCallback((session) => {
    setOpenKey((k) => k + 1);
    setSelectedSession(session);
  }, []);
  const handleDetailBack = useCallback(() => setSelectedSession(null), []);

  const [showAllSessions, setShowAllSessions] = useState(false);
  const toggleShowAll = useCallback(() => setShowAllSessions(true), []);

  const sessions = cluster.sessions; // already newest-first
  const country = cluster.region.includes(',') ? cluster.region.split(',').pop().trim() : cluster.region;

  const uv = uvEnvironment(cluster.avgPeakUV);
  const peakRecord = useMemo(() => peakUvRecord(sessions), [sessions]);
  const rankLine = useMemo(() => locationRankLine(clusters, cluster.key), [clusters, cluster.key]);
  const uvPeakTime = useMemo(() => modalUvPeakTimeBucket(sessions), [sessions]);
  const distribution = useMemo(() => uvDistribution(sessions), [sessions]);

  const avgScore = Math.round(sessions.reduce((a, s) => a + s.score, 0) / sessions.length);
  const globals = useMemo(() => globalAverages(allSessions), [allSessions]);
  const bestWorst = useMemo(() => bestWorstSession(sessions), [sessions]);
  const gapRate = useMemo(() => protectionGapRate(sessions), [sessions]);
  const alertResponse = useMemo(() => avgAlertResponse(sessions), [sessions]);
  const progress = useMemo(() => progressStats(cluster), [cluster]);

  const avgDurationHere = Math.round(sessions.reduce((a, s) => a + s.durationMinutes, 0) / sessions.length);
  const timeOfDayLabel = useMemo(() => modalStartHourLabel(sessions), [sessions]);
  const dayOfWeek = useMemo(() => mostCommonDayOfWeek(sessions), [sessions]);
  const activity = useMemo(() => mostCommonActivityLevel(sessions), [sessions]);
  const streak = useMemo(() => longestVisitStreak(sessions), [sessions]);
  const visits = useMemo(() => firstLastVisit(sessions), [sessions]);

  const conditionsPhrase = useMemo(() => dominantConditionPhrase(sessions), [sessions]);
  const { avgTemp, avgHumidity } = useMemo(() => avgTempHumidity(sessions), [sessions]);
  const waterPct = useMemo(() => waterEventFrequency(sessions), [sessions]);
  const season = useMemo(() => mostCommonSeason(sessions), [sessions]);

  const skinResponse = useMemo(() => skinResponseSummary(sessions), [sessions]);

  const heroStats = [
    { label: 'Total Sessions', value: sessions.length },
    { label: 'Best Score', value: cluster.bestScore, valueColor: colors.protected },
    { label: 'UV Environment', value: uv.label, valueColor: uv.color },
  ];

  const visibleSessions = showAllSessions ? sessions : sessions.slice(0, INITIAL_SESSION_LIMIT);
  const hasMoreSessions = sessions.length > INITIAL_SESSION_LIMIT && !showAllSessions;

  return (
    <Animated.View style={[st.flex, { transform: [{ translateX }] }]}>
      <SafeAreaView style={st.safe}>
        <StatusBar style="dark" />

        <View style={st.header}>
          <TouchableOpacity onPress={handleBack} style={st.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={26} color={colors.ink} />
          </TouchableOpacity>
          <Text style={st.headerTitle} numberOfLines={1}>{cluster.city}, {country}</Text>
          <View style={st.backBtn} />
        </View>

        <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
          <LocationHeroStats stats={heroStats} />

          <ExpandableCard
            icon="sunny"
            title="UV Environment"
            subtitle={`Avg UV ${cluster.avgPeakUV}`}
            expandedContent={
              <View style={st.stack}>
                <LocationStatGrid>
                  <LocationStatTile label="Peak UV ever recorded" value={peakRecord.value} sub={peakRecord.date} />
                  <LocationStatTile label="Average UV here" value={cluster.avgPeakUV} />
                  {uvPeakTime && <LocationStatTile label="UV typically peaks" value={uvPeakTime} />}
                </LocationStatGrid>
                {rankLine && <LocationNote icon="podium-outline" text={rankLine} />}
                <LocationUvDistribution distribution={distribution} />
              </View>
            }
          >
            <View style={[st.headerPill, { backgroundColor: uv.color }]}>
              <Text style={st.headerPillText}>{uv.label}</Text>
            </View>
          </ExpandableCard>

          <ExpandableCard
            icon="stats-chart"
            title="Your Performance Here"
            subtitle="Average session score"
            expandedContent={
              <View style={st.stack}>
                <LocationCompareTile
                  leftLabel="Here" leftValue={avgScore}
                  rightLabel="Global average" rightValue={globals.avgScore}
                  delta={avgScore - globals.avgScore}
                />
                <LocationStatGrid>
                  <LocationStatTile label="Best ever session" value={bestWorst.best.score} sub={bestWorst.best.date} valueColor={colors.protected} />
                  <LocationStatTile label="Worst ever session" value={bestWorst.worst.score} sub={bestWorst.worst.date} valueColor={colors.danger} />
                  {alertResponse != null && (
                    <LocationStatTile label="Avg alert response" value={`${alertResponse} min`} />
                  )}
                </LocationStatGrid>
                <LocationNote
                  icon="alert-circle-outline"
                  warn
                  text={`You had a protection gap in ${gapRate.gaps} of every ${gapRate.total} sessions here.`}
                />
                {progress && (
                  <>
                    <Text style={st.subHeading}>Your progress here</Text>
                    <LocationCompareTile
                      leftLabel="First 3 visits avg" leftValue={progress.firstAvg}
                      rightLabel="Recent 3 visits avg" rightValue={progress.recentAvg}
                      delta={progress.delta}
                    />
                  </>
                )}
              </View>
            }
          >
            <Text style={[st.headerNumber, { color: scoreColor(avgScore) }]}>{avgScore}</Text>
          </ExpandableCard>

          <ExpandableCard
            icon="calendar-outline"
            title="Session Patterns"
            subtitle={`${sessions.length} session${sessions.length === 1 ? '' : 's'}${timeOfDayLabel ? ` · Usually ${timeOfDayLabel}` : ''}`}
            expandedContent={
              <View style={st.stack}>
                <LocationCompareTile
                  leftLabel="Duration here" leftValue={`${avgDurationHere}m`}
                  rightLabel="Global average" rightValue={`${globals.avgDurationMinutes}m`}
                  delta={avgDurationHere - globals.avgDurationMinutes}
                  tone="neutral"
                />
                <LocationStatGrid>
                  {dayOfWeek && <LocationStatTile label="Most common day" value={dayOfWeek} />}
                  {activity && <LocationStatTile label="Most common activity" value={activity.label} sub={`${activity.pct}% of sessions`} />}
                  <LocationStatTile label="First visited" value={visits.first} />
                  <LocationStatTile label="Last visited" value={visits.last} />
                </LocationStatGrid>
                <LocationNote icon="flame-outline" text={`Your best streak: ${streak} visit${streak === 1 ? '' : 's'} in a row.`} />
              </View>
            }
          />

          <ExpandableCard
            icon="thermometer-outline"
            title="Conditions Profile"
            subtitle={conditionsPhrase}
            expandedContent={
              <LocationStatGrid>
                {avgTemp != null && <LocationStatTile label="Average temperature" value={`${avgTemp}°F`} />}
                {avgHumidity != null && <LocationStatTile label="Average humidity" value={`${avgHumidity}%`} />}
                {waterPct != null && <LocationStatTile label="Water event frequency" value={`${waterPct}%`} />}
                {activity && <LocationStatTile label="Most common activity" value={activity.label} sub={`${activity.pct}% of sessions`} />}
                {season && <LocationStatTile label="Most common season" value={season} />}
              </LocationStatGrid>
            }
          />

          {skinResponse && (
            <ExpandableCard
              icon="body-outline"
              title="Skin Response"
              subtitle={skinResponse.reactiveCount === 0
                ? `No reactions reported in ${skinResponse.total} sessions`
                : `Reaction reported in ${skinResponse.reactiveCount} of ${skinResponse.total} sessions`}
              expandedContent={
                <View style={st.stack}>
                  <LocationStatGrid>
                    {skinResponse.mostCommonAfter && (
                      <LocationStatTile label="Most common feeling after" value={skinResponse.mostCommonAfter} />
                    )}
                    {skinResponse.mostCommonBefore && (
                      <LocationStatTile label="Most common feeling before" value={skinResponse.mostCommonBefore} />
                    )}
                  </LocationStatGrid>
                  {skinResponse.correlationLine && (
                    <LocationNote icon="analytics-outline" text={skinResponse.correlationLine} />
                  )}
                  <Text style={st.completeness}>
                    Based on {skinResponse.checkinCount} of {skinResponse.total} sessions with check-in data
                  </Text>
                </View>
              }
            />
          )}

          <View style={st.sessionsHeader}>
            <Text style={st.sessionsTitle}>All Sessions Here</Text>
            <Text style={st.sessionsCount}>{sessions.length}</Text>
          </View>
          {visibleSessions.map((s) => (
            <SessionCard key={s.id} session={s} onPress={handleSessionPress} />
          ))}
          {hasMoreSessions && (
            <TouchableOpacity onPress={toggleShowAll} style={st.showAllBtn}>
              <Text style={st.showAllText}>Show all {sessions.length} sessions</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {selectedSession && (
          <View style={st.detailOverlay}>
            <SessionDetailScreen key={openKey} session={selectedSession} onBack={handleDetailBack} scrollKey="locationDetail" />
          </View>
        )}
      </SafeAreaView>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.canvas,
  },
  backBtn: {
    width: 36,
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Outfit-Regular',
    fontSize: 17,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 48,
    gap: 14,
  },
  // Vertical rhythm inside an expanded card's content — grid, note,
  // and distribution blocks all share the same gap.
  stack: {
    gap: 12,
  },
  headerPill: {
    alignSelf: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  headerPillText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.white,
  },
  headerNumber: {
    fontFamily: 'Outfit-Regular',
    fontSize: 28,
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  subHeading: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12.5,
    color: colors.ink,
    textAlign: 'center',
  },
  completeness: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
  },
  sessionsHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 4,
  },
  sessionsTitle: {
    fontFamily: 'Outfit-Regular',
    fontSize: 20,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  sessionsCount: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.muted,
  },
  showAllBtn: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  showAllText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.orange,
  },
  detailOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
