import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import PressableScale from '../PressableScale';
import CleanGlassSurface from '../CleanGlassSurface';
import { useAuth } from '../../context/AuthContext';
import { loadRecaps } from '../../services/SunRecapStore';
import { buildPreview, runAutoTrigger, buildSampleRecap } from '../../services/SunRecapController';
import RecapHistoryScreen from '../../screens/RecapHistoryScreen';
import SunRecapScreen from '../../screens/SunRecapScreen';

// Self-contained Sun Recap entry point — drop-in card for the Insights
// screen. Owns the archive list, the preview builder, and the player, so no
// other screen needs to wire recap plumbing.
export default React.memo(function SunRecapEntry() {
  const { user } = useAuth();
  const [recaps, setRecaps] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [playing, setPlaying] = useState(null); // recap being played
  const [previewing, setPreviewing] = useState(false);
  const [hasNew, setHasNew] = useState(false);

  const refresh = useCallback(async () => {
    setRecaps(await loadRecaps());
  }, []);

  // On mount, evaluate the automatic trigger. If a chapter has closed and
  // all gates pass, a recap is generated and surfaced as a "new" state on
  // the card — never a surprise modal. Fully passive: no-ops when the
  // conditions aren't met, and never throws.
  useEffect(() => {
    let alive = true;
    (async () => {
      const fresh = await runAutoTrigger(user?.id);
      if (!alive) return;
      await refresh();
      if (fresh) setHasNew(true);
    })();
    return () => { alive = false; };
  }, [user, refresh]);

  const openHistory = useCallback(async () => {
    await refresh();
    setHistoryOpen(true);
  }, [refresh]);

  const play = useCallback((recap) => {
    setHistoryOpen(false);
    setPlaying(recap);
  }, []);

  const preview = useCallback(async () => {
    setPreviewing(true);
    const recap = await buildPreview(user?.id);
    setPreviewing(false);
    if (recap) play(recap);
  }, [user, play]);

  const sample = useCallback(() => play(buildSampleRecap()), [play]);

  const latest = recaps[0];

  // A freshly generated recap plays straight away; otherwise the card opens
  // the archive.
  const onCardPress = useCallback(() => {
    if (hasNew && latest) {
      setHasNew(false);
      play(latest);
    } else {
      openHistory();
    }
  }, [hasNew, latest, play, openHistory]);

  return (
    <>
      <PressableScale style={[st.card, hasNew && st.cardNew]} scaleTo={0.98} onPress={onCardPress}>
        <CleanGlassSurface borderRadius={28} />
        <View style={st.iconWrap}>
          <Ionicons name="sparkles" size={20} color={colors.orange} />
          {hasNew && <View style={st.newDot} />}
        </View>
        <View style={st.textWrap}>
          <Text style={st.title}>Sun Recap</Text>
          <Text style={st.line}>
            {hasNew
              ? 'Your new recap is ready — tap to open ✨'
              : latest
                ? `Your latest chapter · ${latest.dateRangeLabel}`
                : 'Your season in the sun, wrapped — tap to explore.'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </PressableScale>

      {historyOpen && (
        <RecapHistoryScreen
          visible={historyOpen}
          recaps={recaps}
          previewing={previewing}
          onClose={() => setHistoryOpen(false)}
          onPlay={play}
          onPreview={preview}
          onSample={sample}
        />
      )}

      {playing && (
        <SunRecapScreen
          visible={!!playing}
          recap={playing}
          onClose={() => { setPlaying(null); refresh(); }}
        />
      )}
    </>
  );
});

const st = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 28,
    padding: 18,
    marginBottom: 14,
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 2,
  },
  cardNew: {
    borderColor: colors.orange,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.orangeWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.orange,
    borderWidth: 2,
    borderColor: colors.white,
  },
  textWrap: { flex: 1, gap: 2 },
  title: {
    fontFamily: 'Outfit-Regular',
    fontSize: 16,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  line: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.muted,
  },
});
