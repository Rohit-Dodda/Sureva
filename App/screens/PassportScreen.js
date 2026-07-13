import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Dimensions, Easing, Platform, StatusBar as RNStatusBar, LayoutAnimation,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import colors from '../constants/colors';
import { useTabSwipeLock } from '../context/SwipeNavContext';
import { useHideTabBar } from '../context/TabBarVisibilityContext';
import { useTourTarget, useAutoStartTour } from '../context/AppTourContext';
import { MILESTONE_TOURS } from '../constants/tourSteps';
// MOCK: varied multi-country session locations until real Supabase data
// is wired. TODO: fetch pin summaries via SupabaseService (coords, score,
// UV only — never full readings arrays on this screen).
import mockPassportSessions from '../constants/mockPassportData';
import {
  clusterSessions,
  passportStats,
  bestClusterKey,
  uvRanking,
  fastestDepletionCluster,
  loyaltyLine,
  consistencyExtremes,
  dominantConditionLine,
} from '../components/passport/passportUtils';
import PassportMap from '../components/passport/PassportMap';
import PassportStatsCard from '../components/passport/PassportStatsCard';
import HotspotRankingsSection from '../components/passport/HotspotRankingsSection';
import PassportEmptyCard from '../components/passport/PassportEmptyCard';
import LocationPermissionCard from '../components/passport/LocationPermissionCard';
import SessionDetailScreen from './SessionDetailScreen';
import LocationDetailScreen from './LocationDetailScreen';

const STAMPS_KEY = 'sureva_passport_stamps';
const PERM_PROMPTED_KEY = 'sureva_passport_perm_prompted';
const COUNTRY_ZOOM = { latitudeDelta: 7, longitudeDelta: 7 };
const WORLD_ZOOM = { latitudeDelta: 120, longitudeDelta: 120 };
const FOCUS_ZOOM = { latitudeDelta: 1.6, longitudeDelta: 1.6 };
const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;
const PREVIEW_H = Math.round(SCREEN_H * 0.45);
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
// The map preview runs edge-to-edge under the status bar, so its floating
// buttons clear the notch themselves.
const TOP_INSET = Platform.OS === 'ios' ? 58 : (RNStatusBar.currentHeight ?? 24) + 12;

// Pushed full-screen from the History header's map button; the back
// button floating over the map slides it back out.
export default function PassportScreen({ onBack }) {
  const mapRef = useRef(null);
  const listRef = useRef(null);
  const cardOffsets = useRef({});

  // Push-style entrance, matching the session detail's slide-in.
  const translateX = useRef(new Animated.Value(SCREEN_W)).current;
  useEffect(() => {
    Animated.timing(translateX, { toValue: 0, duration: 380, easing: EASE_OUT, useNativeDriver: true }).start();
  }, [translateX]);
  const handleBack = useCallback(() => {
    Animated.timing(translateX, { toValue: SCREEN_W, duration: 260, easing: EASE_OUT, useNativeDriver: true }).start(onBack);
  }, [translateX, onBack]);

  // The map owns horizontal pans — suspend the root tab-swipe while open.
  useTabSwipeLock();
  // Full-screen immersive map: the floating tab bar would fight the
  // bottom panel for the same space, so hide it while open.
  useHideTabBar(true);

  const [mapExpanded, setMapExpanded] = useState(false);
  const mapHeight = useRef(new Animated.Value(PREVIEW_H)).current;
  useEffect(() => {
    Animated.timing(mapHeight, {
      toValue: mapExpanded ? SCREEN_H : PREVIEW_H,
      duration: 380,
      easing: EASE_OUT,
      useNativeDriver: false, // height isn't a native-driver-supported property
    }).start();
  }, [mapExpanded, mapHeight]);
  const expandMap = useCallback(() => setMapExpanded(true), []);
  const collapseMap = useCallback(() => setMapExpanded(false), []);
  const toggleMap = useCallback(() => setMapExpanded((e) => !e), []);
  // Rounds down to a square full-bleed edge as it grows, so no sliver of
  // the canvas background peeks through the corners at full height.
  const mapRadius = mapHeight.interpolate({
    inputRange: [PREVIEW_H, SCREEN_H],
    outputRange: [28, 0],
    extrapolate: 'clamp',
  });

  const [expandedKey, setExpandedKey] = useState(null);
  const [rankingsExpanded, setRankingsExpanded] = useState(false);
  const toggleRankings = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setRankingsExpanded((e) => !e);
  }, []);
  const [selectedSession, setSelectedSession] = useState(null);
  const [viewingCluster, setViewingCluster] = useState(null);
  const [stamped, setStamped] = useState(null); // Set of stamped cluster keys
  const [stampingKey, setStampingKey] = useState(null);
  const [showPermissionCard, setShowPermissionCard] = useState(false);

  const sessions = mockPassportSessions;

  // First-ever visit with at least one located session — points out the
  // map before the stats/rankings below it, since that's the whole idea
  // of this screen. Delayed past this screen's own 380ms push-in so the
  // map isn't measured mid-slide.
  const passportMapRef = useTourTarget('passportMap');
  const [tourReady, setTourReady] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setTourReady(true), 450);
    return () => clearTimeout(id);
  }, []);
  const passportMilestone = MILESTONE_TOURS.passportFirstPin;
  useAutoStartTour(passportMilestone.id, passportMilestone.steps, tourReady && sessions.length > 0);

  const clusters = useMemo(() => clusterSessions(sessions), [sessions]);
  const stats = useMemo(() => passportStats(clusters), [clusters]);
  const bestKey = useMemo(() => bestClusterKey(clusters), [clusters]);

  // Cross-location aggregates — each returns null when the data can't
  // support the insight, and the UI hides that piece entirely.
  const ranking = useMemo(() => uvRanking(clusters), [clusters]);
  const sortedClusters = ranking || clusters;
  const maxUv = useMemo(
    () => Math.max(...sortedClusters.map((c) => c.avgPeakUV), 0.1),
    [sortedClusters]
  );
  const depletionCluster = useMemo(() => fastestDepletionCluster(clusters), [clusters]);
  const loyalty = useMemo(() => (clusters.length ? loyaltyLine(clusters) : null), [clusters]);
  const extremes = useMemo(() => consistencyExtremes(clusters), [clusters]);
  const patternLine = useMemo(() => dominantConditionLine(sessions), [sessions]);

  // Open centered on the most recent session at country-level zoom;
  // world view when the passport is empty.
  const initialRegion = useMemo(() => {
    if (!sessions.length) return { latitude: 20, longitude: 0, ...WORLD_ZOOM };
    const latest = [...sessions].sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1))[0];
    return { latitude: latest.lat, longitude: latest.lng, ...COUNTRY_ZOOM };
  }, [sessions]);

  // Load stamped locations + decide whether to show the permission explainer.
  useEffect(() => {
    (async () => {
      try {
        const [stampsRaw, prompted, perm] = await Promise.all([
          AsyncStorage.getItem(STAMPS_KEY),
          AsyncStorage.getItem(PERM_PROMPTED_KEY),
          Location.getForegroundPermissionsAsync(),
        ]);
        setStamped(new Set(stampsRaw ? JSON.parse(stampsRaw) : []));
        if (!prompted && !perm.granted) setShowPermissionCard(true);
      } catch {
        setStamped(new Set());
      }
    })();
  }, []);

  // Pans the map to a cluster and opens its card in the bottom list —
  // forcing the rankings section open first if it's collapsed — then
  // scrolls it into view. Shared by pin taps, card taps, and the
  // "depletes fastest" shortcut chip.
  const focusCluster = useCallback((cluster) => {
    setExpandedKey(cluster.key);
    setRankingsExpanded((was) => {
      if (!was) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      return true;
    });
    mapRef.current?.animateToRegion(
      { latitude: cluster.lat, longitude: cluster.lng, ...FOCUS_ZOOM },
      350
    );
    // Give the (possibly just-expanded) section a moment to lay out its
    // cards before reading their measured offsets.
    setTimeout(() => {
      const y = cardOffsets.current[cluster.key];
      if (y != null) listRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
    }, 60);
  }, []);

  // Tapping a pin (only possible while the map is expanded) collapses it
  // back down and hands off straight to that location's card.
  const handlePinPress = useCallback((cluster) => {
    setMapExpanded(false);
    focusCluster(cluster);
    // First-ever tap on this location → play the stamp once, then persist.
    setStamped((prev) => {
      if (!prev || prev.has(cluster.key)) return prev;
      setStampingKey(cluster.key);
      const next = new Set(prev).add(cluster.key);
      AsyncStorage.setItem(STAMPS_KEY, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, [focusCluster]);

  const handleStampDone = useCallback(() => setStampingKey(null), []);
  const handleDepletionPress = useCallback(() => {
    if (depletionCluster) focusCluster(depletionCluster);
  }, [depletionCluster, focusCluster]);

  // Accordion toggle for a bottom-list card: opening one also pans the
  // (already-visible) map preview to it, closing just closes.
  const handleCardToggle = useCallback((key) => {
    setExpandedKey((prev) => {
      const next = prev === key ? null : key;
      if (next) {
        const cluster = clusters.find((c) => c.key === key);
        if (cluster) {
          mapRef.current?.animateToRegion(
            { latitude: cluster.lat, longitude: cluster.lng, ...FOCUS_ZOOM },
            350
          );
        }
      }
      return next;
    });
  }, [clusters]);

  const handleSessionPress = useCallback((session) => setSelectedSession(session), []);
  const handleDetailBack = useCallback(() => setSelectedSession(null), []);
  const handleViewDetails = useCallback((cluster) => setViewingCluster(cluster), []);
  const handleLocationDetailBack = useCallback(() => setViewingCluster(null), []);
  // Empty state's CTA: with no sessions there's nothing to see here, so
  // "Go to Home" simply pops back to the sessions list.
  const handleGoHome = useCallback(() => handleBack(), [handleBack]);

  const handleAllowLocation = useCallback(async () => {
    setShowPermissionCard(false);
    AsyncStorage.setItem(PERM_PROMPTED_KEY, '1').catch(() => {});
    try {
      await Location.requestForegroundPermissionsAsync();
    } catch {
      // Denied or unavailable — the map still works from stored session pins.
    }
  }, []);
  const handleDismissPermission = useCallback(() => {
    setShowPermissionCard(false);
    AsyncStorage.setItem(PERM_PROMPTED_KEY, '1').catch(() => {});
  }, []);

  return (
    <Animated.View style={[st.root, { transform: [{ translateX }] }]}>
      <StatusBar style="dark" />

      <Animated.View
        ref={passportMapRef}
        style={[
          st.mapPanel,
          { height: mapHeight, borderBottomLeftRadius: mapRadius, borderBottomRightRadius: mapRadius },
        ]}
      >
        <PassportMap
          mapRef={mapRef}
          initialRegion={initialRegion}
          clusters={clusters}
          bestKey={bestKey}
          stampingKey={stampingKey}
          onStampDone={handleStampDone}
          onPinPress={handlePinPress}
          expanded={mapExpanded}
          onExpand={expandMap}
          onCollapse={collapseMap}
        />
        <TouchableOpacity
          onPress={handleBack}
          style={[st.floatingBtn, st.backBtn, { top: TOP_INSET }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={toggleMap}
          style={[st.floatingBtn, st.expandBtn, { top: TOP_INSET }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name={mapExpanded ? 'contract' : 'expand'} size={18} color={colors.ink} />
          <Text style={st.expandBtnText}>{mapExpanded ? 'Double-tap to close' : 'Tap to explore'}</Text>
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        ref={listRef}
        style={st.bottomPanel}
        contentContainerStyle={st.bottomContent}
        showsVerticalScrollIndicator={false}
      >
        <PassportStatsCard
          places={stats.places}
          regions={stats.regions}
          topUvCluster={ranking ? ranking[0] : null}
          depletionCluster={depletionCluster}
          onDepletionPress={handleDepletionPress}
          loyaltyLine={loyalty}
          patternLine={patternLine}
        />

        <HotspotRankingsSection
          clusters={sortedClusters}
          maxUv={maxUv}
          expanded={rankingsExpanded}
          onToggleSection={toggleRankings}
          expandedKey={expandedKey}
          onCardToggle={handleCardToggle}
          onSessionPress={handleSessionPress}
          onViewDetails={handleViewDetails}
          extremes={extremes}
          onCardLayout={(key, y) => { cardOffsets.current[key] = y; }}
        />
      </ScrollView>

      {sessions.length === 0 && <PassportEmptyCard onGoHome={handleGoHome} />}
      {showPermissionCard && (
        <LocationPermissionCard onAllow={handleAllowLocation} onDismiss={handleDismissPermission} />
      )}

      {/* Existing session detail slides over everything, as on History. */}
      {selectedSession && (
        <View style={st.detailOverlay}>
          <SessionDetailScreen session={selectedSession} onBack={handleDetailBack} scrollKey="passport" />
        </View>
      )}

      {/* Location Detail — pushed from a hotspot card's "View Full Details". */}
      {viewingCluster && (
        <View style={st.detailOverlay}>
          <LocationDetailScreen
            cluster={viewingCluster}
            clusters={clusters}
            allSessions={sessions}
            onBack={handleLocationDetailBack}
          />
        </View>
      )}
    </Animated.View>
  );
}

const st = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  mapPanel: {
    width: '100%',
    overflow: 'hidden',
  },
  floatingBtn: {
    position: 'absolute',
    backgroundColor: colors.white,
    borderRadius: 20,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 6,
  },
  backBtn: {
    left: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandBtn: {
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
  },
  expandBtnText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 12,
    color: colors.ink,
  },
  bottomPanel: {
    flex: 1,
  },
  bottomContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  detailOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
