import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import mockData from '../constants/mockData';
import SessionDetailScreen from './SessionDetailScreen';

// Builds a single searchable string per session covering all searchable fields
function buildSearchIndex(s) {
  return [
    s.date, s.startTime, s.endTime, s.duration,
    s.location, s.environment, `spf ${s.spf}`, `${s.durationMinutes}`,
  ].join(' ').toLowerCase();
}

const SessionCard = React.memo(function SessionCard({ session, onPress }) {
  return (
    <TouchableOpacity style={st.card} onPress={() => onPress(session)} activeOpacity={0.75}>
      <View style={st.cardTop}>
        <Text style={st.envTag}>{session.environment}</Text>
        <Text style={st.cardDate}>{session.date}</Text>
      </View>
      <Text style={st.cardLocation}>{session.location}</Text>
      <View style={st.cardBottom}>
        <View style={st.pill}>
          <Ionicons name="time-outline" size={13} color={colors.muted} />
          <Text style={st.pillText}>{session.startTime} – {session.endTime}</Text>
        </View>
        <View style={st.pill}>
          <Ionicons name="hourglass-outline" size={13} color={colors.muted} />
          <Text style={st.pillText}>{session.duration}</Text>
        </View>
        <View style={[st.scoreDot, {
          backgroundColor:
            session.score >= 85 ? colors.protected :
            session.score >= 65 ? colors.warning : colors.danger,
        }]}>
          <Text style={st.scoreText}>{session.score}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default function HistoryScreen() {
  const [query, setQuery] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);

  const handleCardPress = useCallback((session) => setSelectedSession(session), []);
  const handleBack = useCallback(() => setSelectedSession(null), []);
  const handleClear = useCallback(() => setQuery(''), []);

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
        <Text style={st.count}>{filtered.length} of {mockData.sessions.length}</Text>
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

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SessionCard session={item} onPress={handleCardPress} />}
        contentContainerStyle={st.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={st.empty}>
            <Ionicons name="search-outline" size={36} color={colors.border} />
            <Text style={st.emptyText}>No sessions match "{query}"</Text>
          </View>
        }
      />

      {/* Detail overlay — always mounted when a session is selected so list shows through during swipe-back */}
      {selectedSession && (
        <View style={st.detailOverlay}>
          <SessionDetailScreen session={selectedSession} onBack={handleBack} />
        </View>
      )}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  detailOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  title: {
    fontFamily: 'SFProDisplay-Black',
    fontSize: 32,
    color: colors.ink,
    letterSpacing: -1,
  },
  count: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 13,
    color: colors.muted,
  },

  searchWrap: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 48,
    gap: 8,
  },
  searchIcon: {
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 14,
    color: colors.ink,
    height: '100%',
  },

  list: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    gap: 12,
  },

  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  envTag: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 11,
    color: colors.orange,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  cardDate: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 13,
    color: colors.muted,
  },
  cardLocation: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 20,
    color: colors.ink,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  pillText: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 12,
    color: colors.muted,
  },
  scoreDot: {
    marginLeft: 'auto',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 12,
    color: colors.white,
  },

  empty: {
    alignItems: 'center',
    paddingTop: 64,
    gap: 12,
  },
  emptyText: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  },
});
