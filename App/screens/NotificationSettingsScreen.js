import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Pressable, Switch,
  Animated, ScrollView, Linking, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureDetector } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../constants/colors';
import { ensureNotificationPermission, sendTestNotification } from '../services/NotificationService';
import { useSlideOverScreen } from '../hooks/useSlideOverScreen';

const REAPPLY_ALERTS_KEY = 'sureva_notify_reapply_enabled';

export default function NotificationSettingsScreen({ visible, onClose }) {
  const { screenTranslateX, gesture, handleClose } = useSlideOverScreen({ visible, onClose });
  const [reapplyAlertsEnabled, setReapplyAlertsEnabled] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!visible) return;
    AsyncStorage.getItem(REAPPLY_ALERTS_KEY)
      .then((v) => { if (v != null) setReapplyAlertsEnabled(v === '1'); })
      .catch(() => {});
  }, [visible]);

  const toggleReapplyAlerts = useCallback((next) => {
    setReapplyAlertsEnabled(next);
    AsyncStorage.setItem(REAPPLY_ALERTS_KEY, next ? '1' : '0').catch(() => {});
  }, []);

  const handleTestNotification = useCallback(async () => {
    setSending(true);
    try {
      const granted = await ensureNotificationPermission();
      if (!granted) {
        Alert.alert(
          'Notifications Off',
          'Turn on notifications for Sureva in system settings to receive reapply alerts.',
          [{ text: 'Cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]
        );
        return;
      }
      await sendTestNotification();
    } catch {
      Alert.alert('Notifications', 'Couldn’t send a test notification. Please try again.');
    } finally {
      setSending(false);
    }
  }, []);

  if (!visible) return null;

  return (
    <GestureDetector gesture={gesture}>
    <Animated.View style={[st.root, { transform: [{ translateX: screenTranslateX }] }]}>
      <SafeAreaView style={st.safe}>
        <StatusBar style="dark" />
        <View style={st.header}>
          <Pressable onPress={handleClose} hitSlop={12} style={st.backBtn}>
            <Text style={st.backArrow}>←</Text>
          </Pressable>
          <Text style={st.headerTitle}>Notifications</Text>
        </View>

        <ScrollView style={st.scroll} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={st.intro}>
            Reapply alerts are local to your device, they work even when Sureva is backgrounded or your
            phone is locked, so you never miss the moment your protection actually runs out.
          </Text>

          <Text style={st.sectionHeading}>DURING A SESSION</Text>
          <View style={st.card}>
            <View style={st.row}>
              <View style={st.rowTextGroup}>
                <Text style={st.rowLabel}>Reapply alerts</Text>
                <Text style={st.rowSublabel}>Notify me when it's time to reapply sunscreen</Text>
              </View>
              <Switch
                value={reapplyAlertsEnabled}
                onValueChange={toggleReapplyAlerts}
                trackColor={{ false: colors.border, true: colors.orangeLight }}
                thumbColor={reapplyAlertsEnabled ? colors.orange : colors.white}
              />
            </View>
          </View>

          <Text style={st.sectionHeading}>TROUBLESHOOTING</Text>
          <View style={st.card}>
            <Pressable onPress={handleTestNotification} disabled={sending}>
              <View style={[st.row, st.rowBorder]}>
                <Text style={st.rowLabel}>{sending ? 'Sending…' : 'Send test notification'}</Text>
                <Text style={st.chevron}>›</Text>
              </View>
            </Pressable>
            <Pressable onPress={() => Linking.openSettings()}>
              <View style={st.row}>
                <Text style={st.rowLabel}>Open system notification settings</Text>
                <Text style={st.chevron}>›</Text>
              </View>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
    </GestureDetector>
  );
}

const st = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.canvas,
    zIndex: 10,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontFamily: 'Outfit-Regular',
    fontSize: 18,
    color: colors.ink,
    textAlign: 'center',
    includeFontPadding: false,
  },
  headerTitle: {
    fontFamily: 'Outfit-Regular',
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 48,
  },
  intro: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
    marginBottom: 8,
  },
  sectionHeading: {
    fontFamily: 'Outfit-Regular',
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 22,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowTextGroup: {
    flex: 1,
    gap: 2,
    marginRight: 12,
  },
  rowLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    color: colors.ink,
  },
  rowSublabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.muted,
  },
  chevron: {
    fontSize: 20,
    color: colors.muted,
    lineHeight: 22,
  },
});
