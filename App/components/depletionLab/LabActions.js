import React, { useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Share } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import colors from '../../constants/colors';
import PressableScale from '../PressableScale';
import ShareCard from '../whatIf/ShareCard';
import { clockAtMinute, formatLabDuration } from '../../services/DepletionLabService';

export function buildLabHeadline(lab) {
  const { config, perfectReapps, startTime } = lab;
  const setting = `Under UV ${config.uvIndex} at ${config.temperature}°C for ${formatLabDuration(config.durationMinutes)}`;
  if (!perfectReapps.length) {
    return `${setting}, SPF ${config.spf} holds the whole session with no reapplication.`;
  }
  const times = perfectReapps.map((m) => clockAtMinute(startTime, m)).join(', ');
  return `${setting}, SPF ${config.spf} needs ${perfectReapps.length} reapplication${perfectReapps.length > 1 ? 's' : ''} — ${times} — for a perfect score.`;
}

// Adjust / Save / Share row under the Lab results, plus the off-screen
// share card view-shot captures.
export default React.memo(function LabActions({ lab, saveState, onAdjust, onSave }) {
  const shareViewRef = useRef(null);
  const headline = useMemo(() => buildLabHeadline(lab), [lab]);

  const handleShare = useCallback(async () => {
    try {
      const uri = await captureRef(shareViewRef, { format: 'png', quality: 1 });
      await Share.share({ url: uri, message: headline });
    } catch {
      // Image capture unavailable — fall back to sharing the text insight.
      try {
        await Share.share({ message: `${headline} (Sureva)` });
      } catch {
        // User dismissed the sheet; nothing to do.
      }
    }
  }, [headline]);

  const saveLabel =
    saveState === 'saved' ? 'Scenario saved'
    : saveState === 'error' ? 'Couldn’t save, tap to retry'
    : 'Save this scenario';

  return (
    <View style={st.wrap}>
      <PressableScale style={st.outlineBtn} onPress={onAdjust}>
        <Text style={st.outlineLabel}>Adjust conditions</Text>
      </PressableScale>
      <PressableScale style={st.outlineBtn} onPress={onSave} disabled={saveState === 'saved'}>
        <Text style={st.outlineLabel}>{saveLabel}</Text>
      </PressableScale>
      <PressableScale style={st.shareBtn} onPress={handleShare}>
        <Text style={st.shareLabel}>Share</Text>
      </PressableScale>

      {/* Rendered off-screen only so view-shot has pixels to capture. */}
      <View style={st.offscreen} pointerEvents="none">
        <View ref={shareViewRef} collapsable={false}>
          <ShareCard
            headline={headline}
            actualResult={lab.yourResult}
            simResult={lab.perfectResult}
            kicker="DEPLETION LAB"
            labelA="Your plan"
            labelB="Perfect plan"
            strokeA={colors.orange}
            strokeB={colors.protected}
          />
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
  outlineBtn: {
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.charcoal,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  outlineLabel: {
    fontFamily: 'Outfit-Regular',
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
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    color: colors.white,
  },
  offscreen: {
    position: 'absolute',
    left: -1000,
    top: 0,
  },
});
