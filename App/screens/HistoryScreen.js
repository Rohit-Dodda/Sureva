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
import SessionCard from '../components/SessionCard';
import SessionDetailScreen from './SessionDetailScreen';
import PassportScreen from './PassportScreen';
import { useScrollToTop } from '../context/ScrollToTopContext';
import { useRegisterOpener } from '../context/QuickSearchContext';
import { useTourTarget, useAutoStartTour } from '../context/AppTourContext';
import { MILESTONE_TOURS } from '../constants/tourSteps';

// Builds a single searchable string per session covering all searchable fields
function buildSearchIndex(s) {
  return [
    s.date, s.startTime, s.endTime, s.duration,
    s.location, s.environment, `spf ${s.spf}`, `${s.durationMinutes}`,
  ].join(' ').toLowerCase();
}

export default function HistoryScreen({ isActiveTab }) {
  const [query, setQuery] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [openKey, setOpenKey] = useState(0);
  const [passportOpen, setPassportOpen] = useState(false);

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
  useAutoStartTour(milestone.id, milestone.steps, tabSettled && mockData.sessions.length > 0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mockData.sessions;
    return mockData.sessions.filter((s) => buildSearchIndex(s).includes(q));
  }, [query]);

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
        {filtered.length === 0 ? (
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
    fontFamily: 'SpaceGrotesk-Bold',
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
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  },
});
