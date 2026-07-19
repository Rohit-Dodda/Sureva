import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import mockData from '../constants/mockData';
import { useAuth } from '../context/AuthContext';
import SupabaseService from '../services/SupabaseService';
import { onSessionSaved } from '../services/SessionEventsService';
import { buildSessionHero } from '../services/SessionDetailMapper';
import { engineProfileFor } from '../components/activeSession/sessionMath';
import SessionCard from '../components/SessionCard';
import PressableScale from '../components/PressableScale';
import SessionDetailScreen from './SessionDetailScreen';
import PassportScreen from './PassportScreen';
import { useScrollToTop } from '../context/ScrollToTopContext';
import { useRegisterOpener, useQuickSearch } from '../context/QuickSearchContext';
import { useTourTarget, useAutoStartTour } from '../context/AppTourContext';
import { MILESTONE_TOURS } from '../constants/tourSteps';

// Builds a single searchable string per session covering all searchable fields
function buildSearchIndex(s) {
  return [
    s.date, s.startTime, s.endTime, s.duration,
    s.location, s.environment, `spf ${s.spf}`, `${s.durationMinutes}`,
  ].join(' ').toLowerCase();
}

export default function HistoryScreen({ isActiveTab, onNavigateTab }) {
  const { user, userProfile } = useAuth();
  const { navigateTo } = useQuickSearch();
  const [query, setQuery] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [openKey, setOpenKey] = useState(0);
  const [passportOpen, setPassportOpen] = useState(false);

  // null = still loading (mock is the placeholder); a resolved array —
  // even an empty one — is the real, honest answer, same pattern as
  // PassportScreen/SkinAgeScreen.
  const [realSessions, setRealSessions] = useState(null);
  const loadSessions = useCallback(async () => {
    if (!user?.id) { setRealSessions([]); return; }
    try {
      const { data } = await SupabaseService.getSessions(user.id);
      const profile = engineProfileFor({}, userProfile);
      setRealSessions((data ?? []).map((row) => buildSessionHero(row, profile.fitzpatrickType)));
    } catch {
      setRealSessions([]);
    }
  }, [user, userProfile]);
  useEffect(() => { loadSessions(); }, [loadSessions]);
  // TabPager keeps every tab (including this one) mounted for the app's
  // whole lifetime for smooth swiping — without this, a session ending
  // while History isn't the active tab would never be seen here, since
  // the mount-time fetch above only ever runs once.
  useEffect(() => onSessionSaved(loadSessions), [loadSessions]);
  const sessions = realSessions === null ? mockData.sessions : realSessions;

  const listRef = useRef(null);
  const scrollToTop = useCallback(
    () => listRef.current?.scrollTo({ y: 0, animated: true }),
    []
  );
  useScrollToTop('history', scrollToTop);

  const handleCardPress = useCallback((session) => {
    setOpenKey((k) => k + 1); // force a fresh mount + entrance on every open
    setSelectedSession(session);
  }, []);
  const handleBack = useCallback(() => setSelectedSession(null), []);
  const handleClear = useCallback(() => setQuery(''), []);
  const handleOpenPassport = useCallback(() => setPassportOpen(true), []);
  const handleClosePassport = useCallback(() => setPassportOpen(false), []);
  useRegisterOpener('passport', handleOpenPassport);

  // Empty-state CTA: starting a session is Home's job (it owns the
  // SessionSetupSheet). onNavigateTab flips the visible tab to Home, then
  // navigateTo resolves and fires Home's registered 'startSession' opener —
  // the same registry + 320ms cross-tab settle delay Quick Search uses for
  // every other tab→open-something jump. navigateTo's own tab-set is an
  // idempotent repeat of the switch above, so the sheet only opens once the
  // pager has landed on Home.
  const handleStartSession = useCallback(() => {
    onNavigateTab?.('home');
    navigateTo({ tab: 'home', opener: 'startSession' });
  }, [onNavigateTab, navigateTo]);

  // Fires once, the first time this tab is opened after the user's first
  // logged session — the same real "do they have any history yet?"
  // condition that'll gate this once mock data is replaced with Firestore.
  // `isActiveTab` flips true right as the tab pager *starts* its settle
  // spring, not once it's landed — waiting a beat past that avoids
  // measuring the card mid-swipe.
  const firstSessionCardRef = useTourTarget('firstSessionCard');
  const [tabSettled, setTabSettled] = useState(false);
  useEffect(() => {
    if (!isActiveTab) { setTabSettled(false); return undefined; }
    const id = setTimeout(() => setTabSettled(true), 450);
    return () => clearTimeout(id);
  }, [isActiveTab]);
  const milestone = MILESTONE_TOURS.historyFirstSession;
  useAutoStartTour(milestone.id, milestone.steps, tabSettled && sessions.length > 0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => buildSearchIndex(s).includes(q));
  }, [query, sessions]);

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={st.header}>
        <Text style={st.title}>Sessions</Text>
        <TouchableOpacity
          onPress={handleOpenPassport}
          style={st.mapBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="map-outline" size={22} color={colors.ink} />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={st.searchWrap}>
        <View style={st.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.muted} style={st.searchIcon} />
          <TextInput
            style={st.searchInput}
            placeholder="Search by date, location, time, or duration…"
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="never"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* List — ScrollView (not FlatList): the sessions list is short, and
          FlatList's virtualized cells were swallowing the first tap on iOS. */}
      <ScrollView
        ref={listRef}
        style={st.scroll}
        contentContainerStyle={st.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="on-drag"
      >
        {sessions.length === 0 ? (
          // Genuinely zero sessions (realSessions resolved to an empty array,
          // not the still-loading mock placeholder). Distinct from the
          // search-no-matches state below, which only applies once sessions
          // exist but none match the query.
          <View style={st.emptyCardWrap}>
            <View style={st.emptyCard}>
              <Text style={st.emptyCardTitle}>No sessions yet</Text>
              <Text style={st.emptyCardBody}>
                Your sun sessions will show up here. Start your first outdoor session to begin
                building your history.
              </Text>
              <PressableScale style={st.emptyCardButton} onPress={handleStartSession}>
                <Text style={st.emptyCardButtonLabel}>Start Session</Text>
              </PressableScale>
            </View>
          </View>
        ) : filtered.length === 0 ? (
          <View style={st.empty}>
            <Ionicons name="search-outline" size={36} color={colors.border} />
            <Text style={st.emptyText}>No sessions match "{query}"</Text>
          </View>
        ) : (
          filtered.map((item, i) => (
            <View key={item.id} ref={i === 0 ? firstSessionCardRef : undefined}>
              <SessionCard session={item} onPress={handleCardPress} />
            </View>
          ))
        )}
      </ScrollView>

      {/* Detail overlay — always mounted when a session is selected so list shows through during swipe-back */}
      {selectedSession && (
        <View style={st.detailOverlay}>
          <SessionDetailScreen key={openKey} session={selectedSession} onBack={handleBack} scrollKey="history" />
        </View>
      )}

      {/* Passport — full-screen push over the sessions list */}
      {passportOpen && (
        <View style={st.detailOverlay}>
          <PassportScreen onBack={handleClosePassport} />
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
    flex: 1,
  },
  detailOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  title: {
    fontFamily: 'Outfit-Regular',
    fontSize: 32,
    color: colors.ink,
    letterSpacing: -1,
  },
  mapBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchWrap: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    height: 48,
    gap: 8,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  searchIcon: {
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.ink,
    height: '100%',
  },

  list: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    gap: 12,
  },

  empty: {
    alignItems: 'center',
    paddingTop: 64,
    gap: 12,
  },
  emptyText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  },

  // Zero-sessions card — mirrors PassportEmptyCard's floating-card look
  // (28px radius, border, soft shadow, orange CTA) for visual consistency.
  emptyCardWrap: {
    paddingTop: 72,
    paddingHorizontal: 12,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 22,
    paddingVertical: 24,
    alignItems: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
  emptyCardTitle: {
    fontFamily: 'Outfit-Regular',
    fontSize: 20,
    color: colors.ink,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  emptyCardBody: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkMid,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyCardButton: {
    backgroundColor: colors.orange,
    borderRadius: 22,
    paddingVertical: 13,
    paddingHorizontal: 36,
    alignItems: 'center',
  },
  emptyCardButtonLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.white,
  },
});
