import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, Animated, PanResponder, Pressable,
  TouchableOpacity, SafeAreaView, ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import SEARCH_INDEX, { SEARCH_PAGES } from '../../constants/searchIndex';
import { useQuickSearch } from '../../context/QuickSearchContext';
import { useHideTabBar } from '../../context/TabBarVisibilityContext';
import { useTabSwipeLock } from '../../context/SwipeNavContext';
import QuickSearchResultRow from './QuickSearchResultRow';

// Matches the card/page name, the page it lives on, and any keywords, so
// "sunscreen", "insights", or "spf" all surface the right cards.
function matchEntry(e, q) {
  if (e.title.toLowerCase().includes(q)) return true;
  if (e.page.toLowerCase().includes(q)) return true;
  return e.keywords?.some((k) => k.includes(q)) ?? false;
}

// Full-app "jump to a page" search, opened by a downward swipe on the
// Home profile bar (see HomeScreen.js) — a dark blurred takeover in the
// spirit of iOS Spotlight: a search bar with live results underneath,
// tap a result and it neatly hands off to that tab/screen.
export default function QuickSearchOverlay() {
  const {
    reveal, isOpen, setFocusHandler, closeSearch, navigateTo,
    onClosingGestureMove, onClosingGestureEnd,
  } = useQuickSearch();

  // Same locks the rest of the app uses for full-screen takeovers — the
  // tab bar shouldn't show through the blur, and a stray horizontal drag
  // shouldn't page the tabs underneath while this is up.
  useHideTabBar(isOpen);
  useTabSwipeLock(isOpen);

  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) setQuery('');
  }, [isOpen]);

  // The context fires this (via a ref, so it triggers no re-render) once the
  // open animation is under way; it schedules the keyboard itself.
  useEffect(() => {
    setFocusHandler(() => inputRef.current?.focus());
    return () => setFocusHandler(null);
  }, [setFocusHandler]);

  // Empty query shows just the pages as suggestions; typing searches every
  // card header across the whole app.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SEARCH_PAGES;
    return SEARCH_INDEX.filter((e) => matchEntry(e, q));
  }, [query]);

  const handleSelect = useCallback((entry) => {
    inputRef.current?.blur();
    navigateTo(entry);
  }, [navigateTo]);

  const handleCancel = useCallback(() => {
    inputRef.current?.blur();
    closeSearch();
  }, [closeSearch]);

  const handleClear = useCallback(() => setQuery(''), []);

  // A plain tap or a swipe-up on the empty backdrop dismisses, mirroring
  // the open gesture in reverse — live-tracked the same way, and if it
  // doesn't clear the threshold it springs back to fully open rather than
  // leaving the panel stuck half-shut.
  const handleCancelRef = useRef(handleCancel);
  handleCancelRef.current = handleCancel;
  const onClosingMoveRef = useRef(onClosingGestureMove);
  onClosingMoveRef.current = onClosingGestureMove;
  const onClosingEndRef = useRef(onClosingGestureEnd);
  onClosingEndRef.current = onClosingGestureEnd;

  const backdropPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, { dy }) => onClosingMoveRef.current(dy),
      onPanResponderRelease: (_, { dy, vy }) => {
        if (Math.abs(dy) < 6 && Math.abs(vy) < 0.1) handleCancelRef.current();
        else onClosingEndRef.current(dy, vy);
      },
      onPanResponderTerminate: () => onClosingEndRef.current(0, 0),
    })
  ).current;

  if (!isOpen) return null;

  // Opacity fades in over the first half of the reveal, then holds at 1.
  // Clamped so the spring's overshoot past 1 can't push it back down.
  const panelOpacity = reveal.interpolate({
    inputRange: [0, 0.5],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  // Plain linear maps with NO clamp. When the spring overshoots `reveal`
  // past 1, these carry the panel naturally a touch past its resting
  // position and glide straight back as `reveal` settles — the overshoot
  // itself IS the bounce, in one continuous motion. The earlier clamped
  // three-point ranges plateaued at the overshoot peak, which is what
  // froze the panel at the top of the bounce.
  const panelTranslateY = reveal.interpolate({ inputRange: [0, 1], outputRange: [46, 0] });
  const panelScale = reveal.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });

  return (
    <View style={st.root} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: reveal }]} pointerEvents="none">
        <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFillObject} />
        <View style={st.scrim} />
      </Animated.View>

      <View style={StyleSheet.absoluteFillObject} {...backdropPan.panHandlers} />

      <SafeAreaView style={st.panelWrap} pointerEvents="box-none">
        <Animated.View
          style={[
            st.panel,
            { opacity: panelOpacity, transform: [{ translateY: panelTranslateY }, { scale: panelScale }] },
          ]}
        >
          <View style={st.searchRow}>
            <View style={st.searchBar}>
              <Ionicons name="search" size={18} color={colors.onDarkMuted} style={st.searchIcon} />
              <TextInput
                ref={inputRef}
                style={st.searchInput}
                placeholder="Search Sureva"
                placeholderTextColor={colors.onDarkMuted}
                value={query}
                onChangeText={setQuery}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={handleClear} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close-circle" size={18} color={colors.onDarkMuted} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={handleCancel} hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }}>
              <Text style={st.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={st.results}
            contentContainerStyle={st.resultsContent}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
          >
            <Text style={st.sectionLabel}>{query.length === 0 ? 'Suggestions' : 'Results'}</Text>
            {results.length === 0 ? (
              <Text style={st.empty}>No matches for "{query}"</Text>
            ) : (
              results.map((e) => (
                <QuickSearchResultRow key={e.id} entry={e} onPress={handleSelect} />
              ))
            )}
            {/* Fills whatever space is left below a short results list so
                tapping there dismisses too, instead of doing nothing. */}
            <Pressable style={st.emptyFiller} onPress={handleCancel} />
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,9,7,0.35)',
  },
  panelWrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  // Capped and centered rather than stretched full-bleed — on top of the
  // wrap's own padding, this is what actually keeps it reading as a neat
  // centered card instead of edge-to-edge on any phone-width screen.
  panel: {
    flex: 1,
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchIcon: {
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: colors.onDark,
    height: '100%',
  },
  cancelText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 15,
    color: colors.orangeLight,
  },
  results: {
    flex: 1,
    marginTop: 20,
  },
  resultsContent: {
    flexGrow: 1,
  },
  emptyFiller: {
    flex: 1,
    minHeight: 24,
  },
  sectionLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.onDarkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  empty: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.onDarkMuted,
    textAlign: 'center',
    marginTop: 24,
  },
});
