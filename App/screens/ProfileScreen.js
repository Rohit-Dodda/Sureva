import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Pressable,
  Animated, Dimensions, Easing, Alert, Image, PanResponder,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import ActionSheet from '../components/ActionSheet';

const SCREEN_W = Dimensions.get('window').width;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

function usePressScale(toValue = 0.97) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn  = () => Animated.spring(scale, { toValue,    useNativeDriver: true, tension: 280, friction: 12 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }).start();
  return { scale, onPressIn, onPressOut };
}

const ProfileRow = React.memo(function ProfileRow({ label, sublabel, isLast, onPress, destructive }) {
  const { scale, onPressIn, onPressOut } = usePressScale();
  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[st.row, !isLast && st.rowBorder, { transform: [{ scale }] }]}>
        <View style={st.rowText}>
          <Text style={[st.rowLabel, destructive && { color: colors.danger }]}>{label}</Text>
          {sublabel != null && <Text style={st.rowSublabel}>{sublabel}</Text>}
        </View>
        {!destructive && <Text style={st.chevron}>›</Text>}
      </Animated.View>
    </Pressable>
  );
});

async function requestAndPick(type) {
  if (type === 'camera') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { 
      Alert.alert('Camera Access', 'Please allow camera access in Settings to take a photo.');
      return null;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    return result.canceled ? null : result.assets[0].uri;
  } else {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Photo Access', 'Please allow photo library access in Settings to choose a photo.');
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    return result.canceled ? null : result.assets[0].uri;
  }
}

export default function ProfileScreen({ visible, onClose, initials, name, email, profileImage, onProfileImageChange }) {
  const slideAnim = useRef(new Animated.Value(SCREEN_W)).current;
  const fade0  = useRef(new Animated.Value(0)).current;
  const fade1  = useRef(new Animated.Value(0)).current;
  const slide0 = useRef(new Animated.Value(12)).current;
  const slide1 = useRef(new Animated.Value(12)).current;
  const [pickerVisible, setPickerVisible] = useState(false);

  useEffect(() => {
    if (!visible) {
      [fade0, fade1].forEach(a => a.setValue(0));
      [slide0, slide1].forEach(a => a.setValue(12));
      return;
    }
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 320,
      easing: EASE_OUT,
      useNativeDriver: true,
    }).start();
    [fade0, fade1].forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: 1, duration: 300, delay: 80 + i * 60, easing: EASE_OUT, useNativeDriver: true,
      }).start();
    });
    [slide0, slide1].forEach((anim, i) => {
      Animated.spring(anim, {
        toValue: 0, tension: 70, friction: 12, delay: 80 + i * 60, useNativeDriver: true,
      }).start();
    });
  }, [visible]);

  const handleClose = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_W,
      duration: 260,
      easing: EASE_OUT,
      useNativeDriver: true,
    }).start(() => onClose());
  }, [onClose, slideAnim]);

  const dragX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      // Capture phase — steals the gesture from child Pressables once
      // horizontal movement is clearly intentional.
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        dx > 8 && Math.abs(dx) > Math.abs(dy),
      onMoveShouldSetPanResponderCapture: (_, { dx, dy }) =>
        dx > 8 && Math.abs(dx) > Math.abs(dy),
      onPanResponderMove: (_, { dx }) => {
        dragX.setValue(Math.max(0, dx));
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        if (dx > SCREEN_W * 0.35 || vx > 0.5) {
          Animated.timing(dragX, {
            toValue: SCREEN_W,
            duration: 240,
            easing: EASE_OUT,
            useNativeDriver: true,
          }).start(() => {
            // Keep screen off-screen by moving slideAnim, then reset dragX.
            slideAnim.setValue(SCREEN_W);
            dragX.setValue(0);
            onClose();
          });
        } else {
          Animated.spring(dragX, {
            toValue: 0,
            tension: 140,
            friction: 10,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(dragX, {
          toValue: 0, tension: 140, friction: 10, useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const screenTranslateX = Animated.add(slideAnim, dragX);

  const handlePickPhoto = useCallback(() => setPickerVisible(true), []);

  const [viewerVisible, setViewerVisible] = useState(false);
  const viewerFade  = useRef(new Animated.Value(0)).current;
  const viewerScale = useRef(new Animated.Value(0.6)).current;
  const [viewerRendered, setViewerRendered] = useState(false);

  const openViewer = useCallback(() => {
    setViewerRendered(true);
    viewerFade.setValue(0);
    viewerScale.setValue(0.6);
    setViewerVisible(true);
    Animated.parallel([
      Animated.timing(viewerFade,  { toValue: 1, duration: 220, easing: EASE_OUT, useNativeDriver: true }),
      Animated.spring(viewerScale, { toValue: 1, tension: 80, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  const closeViewer = useCallback(() => {
    Animated.parallel([
      Animated.timing(viewerFade,  { toValue: 0, duration: 180, easing: EASE_OUT, useNativeDriver: true }),
      Animated.timing(viewerScale, { toValue: 0.6, duration: 180, easing: EASE_OUT, useNativeDriver: true }),
    ]).start(() => { setViewerVisible(false); setViewerRendered(false); });
  }, []);

  const { scale: avatarScale, onPressIn: avatarPressIn, onPressOut: avatarPressOut } = usePressScale(0.95);

  const pickFrom = useCallback(async (type) => {
    const uri = await requestAndPick(type);
    if (uri) onProfileImageChange(uri);
  }, [onProfileImageChange]);

  const photoSheetOptions = [
    { label: 'Take Photo',          onPress: () => pickFrom('camera')  },
    { label: 'Choose from Library', onPress: () => pickFrom('library') },
    ...(profileImage ? [{ label: 'Remove Photo', destructive: true, onPress: () => onProfileImageChange(null) }] : []),
  ];

  const { scale: camScale, onPressIn: camPressIn, onPressOut: camPressOut } = usePressScale(0.88);

  return (
    <Animated.View style={[st.root, { transform: [{ translateX: screenTranslateX }] }]} {...panResponder.panHandlers}>
      <SafeAreaView style={st.safe}>
        <StatusBar style="dark" />

        <View style={st.header}>
          <Pressable onPress={handleClose} hitSlop={12} style={st.backBtn}>
            <Text style={st.backArrow}>←</Text>
          </Pressable>
          <Text style={st.headerTitle}>Profile</Text>
        </View>

        {/* Avatar hero */}
        <Animated.View style={[st.avatarSection, { opacity: fade0, transform: [{ translateY: slide0 }] }]}>
          <View style={st.avatarWrap}>
            {/* Main avatar — pressable to view full size */}
            <Pressable onPressIn={avatarPressIn} onPressOut={avatarPressOut} onPress={openViewer}>
              <Animated.View style={{ transform: [{ scale: avatarScale }] }}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={st.avatarImage} />
                ) : (
                  <View style={st.avatarCircle}>
                    <Text style={st.avatarInitials}>{initials}</Text>
                  </View>
                )}
              </Animated.View>
            </Pressable>

            {/* Edit badge — top right */}
            <Pressable
              onPress={handlePickPhoto}
              onPressIn={camPressIn}
              onPressOut={camPressOut}
              style={st.editBadge}
              hitSlop={6}
            >
              <Animated.View style={[st.editBadgeInner, { transform: [{ scale: camScale }] }]}>
                <Ionicons name="pencil" size={13} color={colors.ink} />
              </Animated.View>
            </Pressable>
          </View>
          <Text style={st.avatarName}>{name}</Text>
          {!!email && <Text style={st.avatarEmail}>{email}</Text>}
        </Animated.View>

        {/* Options */}
        <Animated.View style={[st.section, { opacity: fade1, transform: [{ translateY: slide1 }] }]}>
          <View style={st.card}>
            <ProfileRow
              label="Edit Name"
              sublabel="Coming soon"
              onPress={() => {}}
            />
            <ProfileRow
              label="Notification Preferences"
              isLast
              onPress={() => {}}
            />
          </View>
        </Animated.View>
      </SafeAreaView>

      <ActionSheet
        visible={pickerVisible}
        options={photoSheetOptions}
        onClose={() => setPickerVisible(false)}
      />

      {/* Full-size image viewer */}
      {viewerRendered && (
        <Pressable style={StyleSheet.absoluteFill} onPress={closeViewer}>
          <Animated.View style={[st.viewerBackdrop, { opacity: viewerFade }]} />
          <Animated.View style={[st.viewerContent, { opacity: viewerFade, transform: [{ scale: viewerScale }] }]}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={st.viewerImage} />
            ) : (
              <View style={st.viewerInitialsCircle}>
                <Text style={st.viewerInitials}>{initials}</Text>
              </View>
            )}
          </Animated.View>
        </Pressable>
      )}
    </Animated.View>
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
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 18,
    color: colors.ink,
    lineHeight: 22,
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.4,
  },
  avatarSection: {
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 28,
  },
  avatarWrap: {
    width: 96,
    height: 96,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarInitials: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 32,
    color: colors.white,
    letterSpacing: 0.5,
  },
  editBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  editBadgeInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarName: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 20,
    color: colors.ink,
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  avatarEmail: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.muted,
  },
  section: {
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
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
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 15,
    color: colors.ink,
  },
  rowSublabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.muted,
  },
  chevron: {
    fontSize: 20,
    color: colors.muted,
    lineHeight: 22,
  },
  viewerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  viewerContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImage: {
    width: 260,
    height: 260,
    borderRadius: 130,
  },
  viewerInitialsCircle: {
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerInitials: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 88,
    color: colors.white,
    letterSpacing: 1,
  },
});
