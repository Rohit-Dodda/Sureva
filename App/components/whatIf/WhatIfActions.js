import React, { useRef, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Share } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import colors from '../../constants/colors';
import PressableScale from '../PressableScale';
import SupabaseService from '../../services/SupabaseService';
import { useAuth } from '../../context/AuthContext';
import ShareCard from './ShareCard';

function formatDelta(mins) {
  const abs = Math.abs(mins);
  if (abs >= 60) return `${Math.floor(abs / 60)} hour${abs >= 120 ? 's' : ''} ${abs % 60 ? `${abs % 60} minutes` : ''}`.trim();
  return `${abs} minutes`;
}

function buildHeadline(overrides, actuals, comparison) {
  const changes = [];
  if (overrides.spf !== actuals.spf) changes.push(`SPF ${overrides.spf}`);
  if (overrides.waterResistanceRating !== actuals.waterResistanceRating) {
    changes.push(overrides.waterResistanceRating ? `${overrides.waterResistanceRating}-min water resistance` : 'no water resistance');
  }
  if (overrides.applicationDelayMinutes !== (actuals.applicationDelayMinutes ?? 0)) {
    changes.push(overrides.applicationDelayMinutes === 0 ? 'an on-time application' : 'a later application');
  }
  const actualReapps = (actuals.reapplicationMinutes ?? []).length;
  if (overrides.reapplicationMinutes.length !== actualReapps) {
    changes.push(overrides.reapplicationMinutes.length > actualReapps ? 'an extra reapplication' : 'fewer reapplications');
  } else if (String(overrides.reapplicationMinutes) !== String(actuals.reapplicationMinutes ?? [])) {
    changes.push('better reapplication timing');
  }
  if (overrides.activityLevel && overrides.activityLevel !== actuals.dominantActivity) changes.push(`${overrides.activityLevel} activity`);

  const withPart = changes.length ? `With ${changes.slice(0, 2).join(' and ')}, ` : 'Replaying this session unchanged, ';
  const d = comparison.deltaProtectedMinutes;
  if (d > 0) return `${withPart}I would have stayed protected ${formatDelta(d)} longer.`;
  if (d < 0) return `${withPart}my protection would have run out ${formatDelta(d)} sooner.`;
  return `${withPart}my protection would have played out the same.`;
}

// Save + Share actions at the bottom of the simulator, plus the off-screen
// share card that gets captured to an image.
export default React.memo(function WhatIfActions({ session, overrides, actuals, comparison, actualResult, simResult }) {
  const { user } = useAuth();
  const shareViewRef = useRef(null);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error

  const headline = useMemo(() => buildHeadline(overrides, actuals, comparison), [overrides, actuals, comparison]);

  const handleSave = useCallback(async () => {
    setSaveState('saving');
    try {
      const { error } = await SupabaseService.saveWhatIfScenario(user?.id, session.id, {
        overrides,
        deltaProtectedMinutes: comparison.deltaProtectedMinutes,
        deltaReapplicationsNeeded: comparison.deltaReapplicationsNeeded,
        headline,
      });
      if (error) throw error;
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }, [user, session.id, overrides, comparison, headline]);

  const handleShare = useCallback(async () => {
    try {
      const uri = await captureRef(shareViewRef, { format: 'png', quality: 1 });
      await Share.share({ url: uri, message: headline });
    } catch {
      // Image capture unavailable — fall back to sharing the text insight.
      try {
        await Share.share({ message: `${headline} — Sureva` });
      } catch {
        // User dismissed the sheet; nothing to do.
      }
    }
  }, [headline]);

  const saveLabel =
    saveState === 'saving' ? 'Saving…'
    : saveState === 'saved' ? 'Scenario saved'
    : saveState === 'error' ? 'Couldn’t save — tap to retry'
    : 'Save this scenario';

  return (
    <View style={st.wrap}>
      <PressableScale style={st.saveBtn} onPress={handleSave} disabled={saveState === 'saving' || saveState === 'saved'}>
        <Text style={st.saveLabel}>{saveLabel}</Text>
      </PressableScale>
      <PressableScale style={st.shareBtn} onPress={handleShare}>
        <Text style={st.shareLabel}>Share</Text>
      </PressableScale>

      {/* Rendered off-screen only so view-shot has pixels to capture. */}
      <View style={st.offscreen} pointerEvents="none">
        <View ref={shareViewRef} collapsable={false}>
          <ShareCard headline={headline} actualResult={actualResult} simResult={simResult} />
        </View>
      </View>
    </View>
  );
});

const st = StyleSheet.create({
  wrap: {
    marginTop: 6,
    marginBottom: 24,
  },
  saveBtn: {
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.charcoal,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  saveLabel: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 15,
    color: colors.ink,
  },
  shareBtn: {
    borderRadius: 24,
    backgroundColor: colors.orange,
    paddingVertical: 16,
    alignItems: 'center',
  },
  shareLabel: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 15,
    color: colors.white,
  },
  offscreen: {
    position: 'absolute',
    left: -1000,
    top: 0,
  },
});
