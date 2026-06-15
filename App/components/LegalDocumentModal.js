import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import { LEGAL_EFFECTIVE_DATE, LEGAL_LAST_UPDATED } from '../constants/legalContent';

const Block = React.memo(function Block({ block }) {
  switch (block.kind) {
    case 'h':
      return <Text style={st.heading}>{block.text}</Text>;
    case 'sub':
      return <Text style={st.subheading}>{block.text}</Text>;
    case 'p':
      return <Text style={st.paragraph}>{block.text}</Text>;
    case 'callout':
      return (
        <View style={st.callout}>
          <Text style={st.calloutText}>{block.text}</Text>
        </View>
      );
    case 'bullets':
      return (
        <View style={st.bulletList}>
          {block.items.map((item, i) => (
            <View key={i} style={st.bulletRow}>
              <View style={st.bulletDot} />
              <Text style={st.bulletText}>{item}</Text>
            </View>
          ))}
        </View>
      );
    default:
      return null;
  }
});

function LegalDocumentModal({ visible, document, onClose }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      Animated.spring(anim, { toValue: 1, tension: 70, friction: 13, useNativeDriver: true }).start();
    }
  }, [visible, anim]);

  const dismiss = useCallback(() => {
    Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setMounted(false);
      onClose();
    });
  }, [anim, onClose]);

  if (!mounted || !document) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={dismiss}>
      <View style={st.fill}>
        <Animated.View
          style={[
            st.sheet,
            {
              transform: [
                {
                  translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [600, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <SafeAreaView style={st.safe}>
            {/* Header */}
            <View style={st.header}>
              <View style={st.handle} />
              <View style={st.headerRow}>
                <Text style={st.title}>{document.title}</Text>
                <TouchableOpacity
                  onPress={dismiss}
                  style={st.closeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={22} color={colors.ink} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              ref={scrollRef}
              style={st.scroll}
              contentContainerStyle={st.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={st.dateLine}>Effective {LEGAL_EFFECTIVE_DATE}</Text>
              <Text style={st.dateLine}>Last updated {LEGAL_LAST_UPDATED}</Text>

              {!!document.intro && <Text style={st.intro}>{document.intro}</Text>}

              {document.blocks.map((block, i) => (
                <Block key={i} block={block} />
              ))}

              <View style={st.footerSpace} />
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default React.memo(LegalDocumentModal);

const st = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: colors.ink + '59',
    justifyContent: 'flex-end',
  },
  sheet: {
    height: '92%',
    backgroundColor: colors.canvas,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  safe: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingHorizontal: 24,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.canvas,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 24,
    color: colors.ink,
    letterSpacing: -0.6,
    flex: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  dateLine: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.muted,
    marginBottom: 2,
  },
  intro: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 22,
    color: colors.inkMid,
    marginTop: 16,
  },
  heading: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 17,
    color: colors.orange,
    letterSpacing: -0.3,
    marginTop: 28,
    marginBottom: 10,
  },
  subheading: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 15,
    color: colors.ink,
    marginTop: 16,
    marginBottom: 6,
  },
  paragraph: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 22,
    color: colors.inkMid,
    marginTop: 8,
  },
  callout: {
    backgroundColor: colors.amberWash,
    borderRadius: 14,
    padding: 16,
    marginTop: 14,
  },
  calloutText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    lineHeight: 20,
    color: colors.orangeDark,
  },
  bulletList: {
    marginTop: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.orangeMid,
    marginTop: 8,
    marginRight: 12,
  },
  bulletText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 21,
    color: colors.inkMid,
  },
  footerSpace: {
    height: 48,
  },
});
