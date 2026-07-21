import React from 'react';
import {
  Modal, View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import PressableScale from '../components/PressableScale';

// Archive of past recaps. Each row replays its recap exactly as generated
// (recaps are stored whole, never recomputed). A preview button builds one
// on demand from all sessions when there's nothing archived yet.
export default function RecapHistoryScreen({ visible, recaps, onClose, onPlay, onPreview, onSample, previewing }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={st.root}>
        <SafeAreaView style={st.safe}>
          <View style={st.header}>
            <View>
              <Text style={st.kicker}>Sun Recaps</Text>
              <Text style={st.title}>Your chapters</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={26} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
            {recaps.length === 0 ? (
              <View style={st.empty}>
                <View style={st.emptyIcon}>
                  <Ionicons name="sparkles" size={26} color={colors.orange} />
                </View>
                <Text style={st.emptyTitle}>No recaps yet</Text>
                <Text style={st.emptyMsg}>
                  Once you’ve logged enough sessions and a chapter of activity wraps up, a recap of your sun exposure will appear here automatically.
                </Text>
              </View>
            ) : (
              recaps.map((r) => (
                <PressableScale key={r.id} style={st.row} scaleTo={0.98} onPress={() => onPlay(r)}>
                  <View style={st.rowIcon}>
                    <Ionicons name="sunny" size={20} color={colors.orange} />
                  </View>
                  <View style={st.rowText}>
                    <Text style={st.rowTitle}>{r.dominantLocation ? `${r.dominantLocation} & beyond` : 'Your chapter'}</Text>
                    <Text style={st.rowSub}>{r.dateRangeLabel} · {r.cardCount} cards</Text>
                  </View>
                  <View style={st.rowScore}>
                    <Text style={st.rowScoreVal}>{r.avgScore}</Text>
                    <Text style={st.rowScoreLabel}>avg</Text>
                  </View>
                </PressableScale>
              ))
            )}

            <PressableScale style={st.previewBtn} onPress={onPreview} disabled={previewing}>
              <Ionicons name="play-circle-outline" size={18} color={colors.orangeDark} />
              <Text style={st.previewLabel}>{previewing ? 'Building preview…' : 'Preview a recap from your data'}</Text>
            </PressableScale>

            {onSample && (
              <PressableScale style={st.sampleBtn} onPress={onSample}>
                <Ionicons name="flask-outline" size={16} color={colors.muted} />
                <Text style={st.sampleLabel}>See a sample recap (test data)</Text>
              </PressableScale>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  kicker: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.muted,
    letterSpacing: 0.2,
  },
  title: {
    fontFamily: 'Outfit-Regular',
    fontSize: 26,
    color: colors.ink,
    letterSpacing: -0.6,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: colors.orangeWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: 'Outfit-Regular',
    fontSize: 18,
    color: colors.ink,
  },
  emptyMsg: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.orangeWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: {
    fontFamily: 'Outfit-Regular',
    fontSize: 16,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  rowSub: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12.5,
    color: colors.muted,
  },
  rowScore: { alignItems: 'center' },
  rowScoreVal: {
    fontFamily: 'Outfit-Regular',
    fontSize: 22,
    color: colors.orange,
    letterSpacing: -0.5,
  },
  rowScoreLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 0.5,
  },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.orangeWash,
    borderRadius: 22,
    paddingVertical: 15,
    marginTop: 8,
  },
  previewLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.orangeDark,
  },
  sampleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 12,
    marginTop: 8,
  },
  sampleLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.muted,
  },
});
