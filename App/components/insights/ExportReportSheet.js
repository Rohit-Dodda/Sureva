import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Modal, Animated, Switch, ScrollView,
  ActivityIndicator, PanResponder, StyleSheet, Dimensions, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { generateReport } from '../../services/ReportService';
import { useAuth } from '../../context/AuthContext';
import ReportPreviewModal from './ReportPreviewModal';

const { height: SCREEN_H } = Dimensions.get('window');

// What the profile PDF covers — shown so the user knows it's the whole picture.
const CONTENTS = [
  { icon: 'medkit-outline', label: 'Medical summary', detail: 'Skin type, burn pattern, medications, conditions' },
  { icon: 'time-outline', label: 'Skin Age', detail: 'Computed model, not narrated — with its full breakdown' },
  { icon: 'stats-chart-outline', label: 'Your numbers', detail: 'Lifetime exposure, alerts, best & hardest' },
  { icon: 'trending-up-outline', label: 'Your trends', detail: 'How your skin changes through the year' },
  { icon: 'sparkles-outline', label: 'Your patterns', detail: 'Habits, weak spots, reapplication' },
  { icon: 'shield-checkmark-outline', label: 'Outlook & advice', detail: 'Where you stand and what helps most' },
  { icon: 'code-slash-outline', label: 'Structured data', detail: 'Machine-readable, for a doctor’s tool or another AI' },
];

export default function ExportReportSheet({ visible, onDismiss }) {
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [previewUri, setPreviewUri] = useState(null);
  const [includeFullLog, setIncludeFullLog] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const dragYVal = useRef(0);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const close = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(dragY, { toValue: SCREEN_H, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      dragY.setValue(0);
      slideAnim.setValue(SCREEN_H);
      onDismiss();
    });
  }, [onDismiss]);

  const handleGenerate = useCallback(async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const result = await generateReport(user?.id, { includeFullLog });
      if (!result.ok) {
        Alert.alert('Export Report', result.message);
      } else {
        setPreviewUri(result.uri);
      }
    } finally {
      setGenerating(false);
    }
  }, [generating, includeFullLog, user]);

  const closePreview = useCallback(() => setPreviewUri(null), []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 0,
      onPanResponderGrant: () => { dragYVal.current = 0; },
      onPanResponderMove: (_, g) => {
        if (g.dy < 0) return;
        dragYVal.current = g.dy;
        dragY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (dragYVal.current > 100 || g.vy > 0.6) {
          close();
        } else {
          Animated.spring(dragY, { toValue: 0, tension: 140, friction: 10, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const sheetTranslate = Animated.add(slideAnim, dragY);
  const overlayOpacity = Animated.multiply(
    fadeAnim,
    dragY.interpolate({ inputRange: [0, 200], outputRange: [1, 0], extrapolate: 'clamp' })
  );

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" onRequestClose={close}>
      <Animated.View style={[st.overlay, { opacity: overlayOpacity }]}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={close} />
      </Animated.View>
      <View style={st.positioner} pointerEvents="box-none">
        <Animated.View style={[st.sheet, { transform: [{ translateY: sheetTranslate }] }]}>
          <View style={st.handleWrap} {...panResponder.panHandlers}>
            <View style={st.handle} />
          </View>

          <Text style={st.heading}>Your Sun Profile</Text>
          <Text style={st.sub}>One PDF with everything Sureva knows about you — your skin, trends, patterns, and what helps most. Yours to keep or share.</Text>

          <Text style={st.fieldLabel}>What's inside</Text>
          <ScrollView
            style={st.scrollArea}
            contentContainerStyle={st.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={st.contentsList}>
              {CONTENTS.map((c, idx) => (
                <View key={c.label} style={[st.contentRow, idx < CONTENTS.length - 1 && st.contentRowBorder]}>
                  <View style={st.contentIcon}>
                    <Ionicons name={c.icon} size={17} color={colors.orangeDark} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.contentLabel}>{c.label}</Text>
                    <Text style={st.contentDetail}>{c.detail}</Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={st.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={st.toggleLabel}>Include full session-by-session log</Text>
              <Text style={st.toggleDetail}>Every session, not just your best & hardest — makes the PDF longer.</Text>
            </View>
            <Switch
              value={includeFullLog}
              onValueChange={setIncludeFullLog}
              trackColor={{ false: colors.border, true: colors.orangeLight }}
              thumbColor={includeFullLog ? colors.orange : colors.white}
            />
          </View>

          <TouchableOpacity
            style={[st.generateBtn, generating && st.generateBtnDisabled]}
            onPress={handleGenerate}
            activeOpacity={0.85}
          >
            {generating ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={st.generateBtnText}>Generate Profile</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={st.cancelBtn} onPress={close} activeOpacity={0.6}>
            <Text style={st.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
      <ReportPreviewModal visible={!!previewUri} uri={previewUri} onDismiss={closePreview} />
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  positioner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 24,
    paddingBottom: 48,
    maxHeight: SCREEN_H * 0.86,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 16,
  },
  scrollArea: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  heading: {
    fontFamily: 'Outfit-Regular',
    fontSize: 26,
    color: colors.ink,
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  sub: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
    marginBottom: 20,
  },
  fieldLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.inkMid,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  contentsList: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingHorizontal: 14,
    marginBottom: 22,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  contentRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  contentIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.orangeWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.ink,
  },
  contentDetail: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    marginBottom: 18,
  },
  toggleLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.ink,
  },
  toggleDetail: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },
  generateBtn: {
    height: 56,
    borderRadius: 17,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 5,
  },
  generateBtnDisabled: {
    backgroundColor: colors.orangeLight,
    shadowOpacity: 0,
    elevation: 0,
  },
  generateBtnText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 17,
    color: colors.white,
    letterSpacing: 0.2,
  },
  cancelBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  cancelText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.muted,
  },
});
