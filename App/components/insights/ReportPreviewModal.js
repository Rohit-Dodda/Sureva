import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Modal, SafeAreaView,
  ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import colors from '../../constants/colors';
import { shareReport } from '../../services/ReportService';

export default function ReportPreviewModal({ visible, uri, onDismiss }) {
  const [sharing, setSharing] = useState(false);

  const handleShare = useCallback(async () => {
    if (sharing || !uri) return;
    setSharing(true);
    try {
      const result = await shareReport(uri);
      if (!result.ok) {
        Alert.alert('Share Report', result.message);
      }
    } finally {
      setSharing(false);
    }
  }, [sharing, uri]);

  if (!visible || !uri) return null;

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" onRequestClose={onDismiss}>
      <SafeAreaView style={st.safe}>
        <View style={st.topBar}>
          <TouchableOpacity style={st.closeBtn} onPress={onDismiss} activeOpacity={0.6}>
            <Text style={st.closeText}>Close</Text>
          </TouchableOpacity>
          <Text style={st.topTitle}>Your Sun Profile</Text>
          <TouchableOpacity style={st.shareBtn} onPress={handleShare} activeOpacity={0.85}>
            {sharing ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={st.shareText}>Share</Text>
            )}
          </TouchableOpacity>
        </View>
        <WebView
          source={{ uri }}
          originWhitelist={['*']}
          allowFileAccess
          style={st.webview}
          startInLoadingState
          renderLoading={() => (
            <View style={st.loading}>
              <ActivityIndicator size="large" color={colors.orange} />
            </View>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const st = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeBtn: {
    width: 72,
    paddingVertical: 8,
  },
  closeText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    color: colors.inkMid,
  },
  topTitle: {
    fontFamily: 'Outfit-Regular',
    fontSize: 16,
    color: colors.ink,
  },
  shareBtn: {
    width: 72,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: colors.white,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
});
