import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { fetchWorldUv } from '../../services/WorldUvService';
import { getGridUvForRegion } from '../../services/WorldUvHeatmapService';
import { WORLD_UV_HEATMAP_HTML } from './worldUvHeatmapHtml';

// Same continuous UV color scale as worldUvHeatmapHtml.js (duplicated
// there — see that file's header for why: it runs in a separate JS
// context with no module bridge back to this file). Only used here for
// the legend gradient bar, which is native RN UI, not the map itself.
const UV_COLOR_STOPS = [
  { uv: 0, rgb: [46, 204, 113] },
  { uv: 3, rgb: [255, 221, 51] },
  { uv: 6, rgb: [243, 156, 18] },
  { uv: 8, rgb: [231, 76, 60] },
  { uv: 11, rgb: [155, 66, 214] },
];

// Hard backstop independent of the WebView's own 500ms debounce (belt
// and suspenders) — no grid fetch fires more often than this regardless
// of how messages arrive. Deliberately well under that 500ms so it
// should never actually block a normal debounced message.
const MIN_FETCH_INTERVAL_MS = 300;

// A different feature from PassportMap above it in the tree — that one
// plots the user's OWN session history; this plots LIVE UV around the
// world, decoupled from personal history (trip planning: "what's UV
// like in Bali right now"). Rendered as a WebView running Leaflet + a
// custom canvas heatmap (worldUvHeatmapHtml.js) rather than native
// react-native-maps overlays — see that file's header comment for why:
// a soft, organic, blurred color field with no visible shapes isn't
// achievable with Marker/Circle/Polygon, which are always geometrically
// crisp. Grid math/caching/fetch (WorldUvHeatmapService.js) and the
// curated-destination fetch (WorldUvService.js) are unchanged from the
// native-map version — only the rendering layer is different. Values
// are always fetched live, never a hardcoded seasonal-average table, so
// a high-latitude region correctly shows low/zero in its own winter
// rather than a stale guess.
export default React.memo(function WorldUvMap({ onBack }) {
  const webViewRef = useRef(null);
  const [webViewReady, setWebViewReady] = useState(false);

  const [destinations, setDestinations] = useState(null); // null = loading
  const [error, setError] = useState(false);

  const [gridPoints, setGridPoints] = useState([]);
  const [gridLoading, setGridLoading] = useState(true);

  const requestIdRef = useRef(0);
  const lastFetchAtRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    fetchWorldUv()
      .then((results) => { if (!cancelled) setDestinations(results); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  const runGridFetch = useCallback(async (region) => {
    const requestId = ++requestIdRef.current;
    lastFetchAtRef.current = Date.now();
    setGridLoading(true);
    try {
      const { points } = await getGridUvForRegion(region);
      if (requestId !== requestIdRef.current) return; // superseded by a later pan
      setGridPoints(points);
    } catch {
      // Keep whatever heatmap is already on screen — a failed refresh
      // shouldn't blank out data the user can already see.
    } finally {
      if (requestId === requestIdRef.current) setGridLoading(false);
    }
  }, []);

  // Leaflet's own page JS already debounces (500ms after a pan/zoom
  // settles) before posting a regionChange message — this is just the
  // backstop against a pathological rapid-message edge case.
  const handleMessage = useCallback((event) => {
    let msg;
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'ready') setWebViewReady(true);
    if (msg.type !== 'ready' && msg.type !== 'regionChange') return;
    if (Date.now() - lastFetchAtRef.current < MIN_FETCH_INTERVAL_MS) return;

    const region = {
      latitude: (msg.south + msg.north) / 2,
      longitude: (msg.west + msg.east) / 2,
      latitudeDelta: msg.north - msg.south,
      longitudeDelta: msg.east - msg.west,
    };
    runGridFetch(region);
  }, [runGridFetch]);

  // Pushes fresh data into the page whenever either changes — harmless
  // to call again if it's already current, and covers the case where
  // data resolves before the page finishes loading (webViewReady false)
  // by re-firing once it does.
  useEffect(() => {
    if (!webViewReady || !webViewRef.current) return;
    const points = gridPoints.map((p) => ({ lat: p.lat, lng: p.lng, uv: p.uvIndex }));
    webViewRef.current.injectJavaScript(`window.setGridPoints(${JSON.stringify(points)}); true;`);
  }, [gridPoints, webViewReady]);

  useEffect(() => {
    if (!webViewReady || !webViewRef.current || !destinations) return;
    webViewRef.current.injectJavaScript(`window.setDestinations(${JSON.stringify(destinations)}); true;`);
  }, [destinations, webViewReady]);

  return (
    <View style={st.root}>
      <WebView
        ref={webViewRef}
        source={{ html: WORLD_UV_HEATMAP_HTML }}
        style={StyleSheet.absoluteFill}
        onMessage={handleMessage}
        originWhitelist={['*']}
        scrollEnabled={false}
        bounces={false}
      />

      <TouchableOpacity
        onPress={onBack}
        style={st.backBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="chevron-back" size={22} color={colors.ink} />
      </TouchableOpacity>

      {gridLoading && gridPoints.length > 0 && (
        <View style={st.refreshPill} pointerEvents="none">
          <ActivityIndicator size="small" color={colors.orange} />
        </View>
      )}

      <View style={st.legend}>
        <Text style={st.legendLabel}>Low</Text>
        <LinearGradient
          colors={UV_COLOR_STOPS.map((s) => `rgb(${s.rgb[0]},${s.rgb[1]},${s.rgb[2]})`)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={st.legendBar}
        />
        <Text style={st.legendLabel}>Extreme</Text>
      </View>

      {!webViewReady && !error && (
        <View style={st.statusWrap} pointerEvents="none">
          <ActivityIndicator color={colors.orange} />
          <Text style={st.statusText}>Loading live UV around the world…</Text>
        </View>
      )}
      {error && (
        <View style={st.statusWrap} pointerEvents="none">
          <Text style={st.statusText}>Couldn't load world UV data. Check your connection.</Text>
        </View>
      )}
    </View>
  );
});

const st = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  backBtn: {
    position: 'absolute',
    top: 58,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  refreshPill: {
    position: 'absolute',
    top: 58,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  legend: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  legendBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: colors.inkMid,
  },
  statusWrap: {
    position: 'absolute',
    top: '45%',
    left: 40,
    right: 40,
    alignItems: 'center',
    gap: 10,
  },
  statusText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
  },
});
