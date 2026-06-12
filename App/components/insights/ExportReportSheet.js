import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Modal, Animated, Switch,
  ActivityIndicator, PanResponder, StyleSheet, Dimensions, Alert,
} from 'react-native';
import colors from '../../constants/colors';
import { REPORT_RANGES, generateReport } from '../../services/ReportService';
import ReportPreviewModal from './ReportPreviewModal';

const { height: SCREEN_H } = Dimensions.get('window');

function PreviewThumbnail() {
  return (
    <View style={st.preview}>
      <View style={st.previewHeaderRow}>
        <Text style={st.previewLogo}>SUREVA</Text>
        <Text style={st.previewTitle}>Sun Exposure Report</Text>
      </View>
      <View style={st.previewRule} />
      <View style={[st.previewLine, { width: '62%' }]} />
      <View style={[st.previewLine, { width: '88%' }]} />
      <View style={[st.previewLine, { width: '80%' }]} />
      <View style={st.previewTable}>
        {[0, 1, 2].map((r) => (
          <View key={r} style={st.previewTableRow}>
            {[0, 1, 2, 3].map((c) => (
              <View key={c} style={st.previewCell} />
            ))}
          </View>
        ))}
      </View>
      <View style={[st.previewLine, { width: '84%' }]} />
      <View style={[st.previewLine, { width: '70%' }]} />
    </View>
  );
}

export default function ExportReportSheet({ visible, onDismiss }) {
  const [rangeKey, setRangeKey] = useState('30d');
  const [includeDetails, setIncludeDetails] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [previewUri, setPreviewUri] = useState(null);
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
      const result = await generateReport(rangeKey, includeDetails);
      if (!result.ok) {
        Alert.alert('Export Report', result.message);
      } else {
        setPreviewUri(result.uri);
      }
    } finally {
      setGenerating(false);
    }
  }, [generating, rangeKey, includeDetails]);

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

          <Text style={st.heading}>Export Report</Text>
          <Text style={st.sub}>A clinical PDF summary you can share with your dermatologist</Text>

          <Text style={st.fieldLabel}>Date range</Text>
          <View style={st.rangeWrap}>
            {REPORT_RANGES.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[st.rangeChip, rangeKey === key && st.rangeChipSelected]}
                onPress={() => setRangeKey(key)}
                activeOpacity={0.8}
              >
                <Text style={[st.rangeChipText, rangeKey === key && st.rangeChipTextSelected]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={st.toggleRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={st.toggleLabel}>Detailed session breakdowns</Text>
              <Text style={st.toggleHelper}>
                Include per-session depletion charts and event narratives. Off = summary tables only.
              </Text>
            </View>
            <Switch
              value={includeDetails}
              onValueChange={setIncludeDetails}
              trackColor={{ false: colors.surface, true: colors.navy }}
              thumbColor={colors.white}
            />
          </View>

          <Text style={st.fieldLabel}>Preview</Text>
          <PreviewThumbnail />

          <TouchableOpacity
            style={[st.generateBtn, generating && st.generateBtnDisabled]}
            onPress={handleGenerate}
            activeOpacity={0.85}
          >
            {generating ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={st.generateBtnText}>Generate Report</Text>
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
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  heading: {
    fontFamily: 'SFProDisplay-Black',
    fontSize: 26,
    color: colors.ink,
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  sub: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
    marginBottom: 20,
  },
  fieldLabel: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 13,
    color: colors.inkMid,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  rangeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  rangeChip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  rangeChipSelected: {
    borderColor: colors.navy,
    backgroundColor: colors.navyLight + '30',
  },
  rangeChipText: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 13,
    color: colors.muted,
  },
  rangeChipTextSelected: {
    color: colors.navy,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 18,
  },
  toggleLabel: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 14,
    color: colors.ink,
    marginBottom: 3,
  },
  toggleHelper: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
  },
  preview: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 14,
    width: 150,
    height: 196,
    alignSelf: 'center',
    marginBottom: 22,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  previewLogo: {
    fontFamily: 'SFProDisplay-Black',
    fontSize: 8,
    letterSpacing: 1.5,
    color: colors.ink,
  },
  previewTitle: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 6,
    color: colors.inkMid,
  },
  previewRule: {
    height: 1,
    backgroundColor: colors.ink,
    marginVertical: 7,
  },
  previewLine: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surface,
    marginBottom: 5,
  },
  previewTable: {
    borderWidth: 0.5,
    borderColor: colors.border,
    marginVertical: 7,
  },
  previewTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderColor: colors.border,
  },
  previewCell: {
    flex: 1,
    height: 9,
    borderRightWidth: 0.5,
    borderColor: colors.border,
  },
  generateBtn: {
    height: 56,
    borderRadius: 17,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 5,
  },
  generateBtnDisabled: {
    backgroundColor: colors.navyLight,
    shadowOpacity: 0,
    elevation: 0,
  },
  generateBtnText: {
    fontFamily: 'SFProDisplay-Bold',
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
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 14,
    color: colors.muted,
  },
});
