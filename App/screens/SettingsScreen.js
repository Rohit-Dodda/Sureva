import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Pressable,
  Modal, Animated, Dimensions, Easing, ScrollView, Image, PanResponder, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import colors from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import mockData from '../constants/mockData';
import SupabaseService from '../services/SupabaseService';
import { exportAndShareAccountData } from '../services/DataExportService';
import { authenticateWithDevice } from '../utils/deviceAuth';
import ProfileScreen from './ProfileScreen';
import HelpSupportScreen from './HelpSupportScreen';
import AboutSurevaScreen from './AboutSurevaScreen';
import NotificationSettingsScreen from './NotificationSettingsScreen';
import EditSkinProfileScreen from './EditSkinProfileScreen';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAppTour } from '../context/AppTourContext';
import { WELCOME_TOUR_ID, WELCOME_TOUR_STEPS } from '../constants/tourSteps';

const SCREEN_W = Dimensions.get('window').width;
// Strong ease-out: starts fast, lands smoothly. Never ease-in on UI elements.
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

function usePressScale(toValue = 0.97) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn  = () => Animated.spring(scale, { toValue,    useNativeDriver: true, tension: 280, friction: 12 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }).start();
  return { scale, onPressIn, onPressOut };
}

const ProfileHero = React.memo(function ProfileHero({ initials, name, email, profileImage, onPress }) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.985);
  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[st.profileCard, { transform: [{ scale }] }]}>
        {profileImage ? (
          <Image source={{ uri: profileImage }} style={st.profileAvatarImage} />
        ) : (
          <View style={st.profileAvatar}>
            <Text style={st.profileInitials}>{initials}</Text>
          </View>
        )}
        <View style={st.profileInfo}>
          <Text style={st.profileName}>{name}</Text>
          {!!email && <Text style={st.profileEmail} numberOfLines={1}>{email}</Text>}
        </View>
        <Text style={st.profileChevron}>›</Text>
      </Animated.View>
    </Pressable>
  );
});

const SettingsRow = React.memo(function SettingsRow({
  label, sublabel, danger, isLast, onPress, hideChevron,
}) {
  const { scale, onPressIn, onPressOut } = usePressScale();
  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[st.row, !isLast && st.rowBorder, { transform: [{ scale }] }]}>
        <View style={st.rowTextGroup}>
          <Text style={[st.rowLabel, danger && { color: colors.danger }]}>{label}</Text>
          {sublabel != null && <Text style={st.rowSublabel}>{sublabel}</Text>}
        </View>
        {!hideChevron && <Text style={st.chevron}>›</Text>}
      </Animated.View>
    </Pressable>
  );
});

export default function SettingsScreen({ visible, onClose, onSignOut }) {
  const { user, userProfile, profileImage, setProfileImage } = useAuth();
  const firstName = userProfile?.firstName || mockData.user.firstName;
  const lastName  = userProfile?.lastName  || mockData.user.lastName;
  const email     = user?.email || '';
  const initials  = `${firstName[0]}${lastName[0]}`.toUpperCase();
  const [profileVisible, setProfileVisible] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
  const [notificationSettingsVisible, setNotificationSettingsVisible] = useState(false);
  const openNotificationSettings = useCallback(() => setNotificationSettingsVisible(true), []);
  const [editSkinProfileVisible, setEditSkinProfileVisible] = useState(false);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { restartTour } = useAppTour();

  // The tour's spotlight targets live on Home, underneath this modal — so
  // close first, then start it once this has had time to animate away,
  // rather than layering the tour overlay behind a still-closing sheet.
  const handleReplayTour = useCallback(() => {
    onClose();
    setTimeout(() => restartTour(WELCOME_TOUR_ID, WELCOME_TOUR_STEPS), 450);
  }, [onClose, restartTour]);

  const [confirmFinalVisible, setConfirmFinalVisible] = useState(false);

  const openDeleteConfirm = useCallback(() => setConfirmDeleteVisible(true), []);
  const cancelDelete = useCallback(() => setConfirmDeleteVisible(false), []);
  const cancelFinalDelete = useCallback(() => setConfirmFinalVisible(false), []);

  // First tap starts device authentication (Face ID/Touch ID/passcode —
  // see utils/deviceAuth); a second, explicit confirmation follows only
  // once that succeeds — two separate deliberate steps before anything
  // is actually deleted.
  const confirmDelete = useCallback(async () => {
    setConfirmDeleteVisible(false);
    const authenticated = await authenticateWithDevice('Confirm it’s you before deleting your account');
    if (!authenticated) return;
    setConfirmFinalVisible(true);
  }, []);

  // Deletes the account's auth credential itself via the server-side
  // Edge Function (cascades to every row of app data automatically),
  // then signs out.
  const finalConfirmDelete = useCallback(async () => {
    setConfirmFinalVisible(false);
    if (!user?.id) return;
    setDeleting(true);
    const { error } = await SupabaseService.deleteAccountData();
    setDeleting(false);
    if (error) {
      Alert.alert('Delete Account', 'Couldn’t delete your account. Please try again.');
      return;
    }
    onSignOut?.();
  }, [user, onSignOut]);

  // "Export your data" user right — gathers the full account (profile,
  // sessions, readings, events, skin age history) into JSON and hands it to
  // the OS share sheet.
  const handleExportData = useCallback(async () => {
    if (exporting || !user?.id) return;
    setExporting(true);
    try {
      const result = await exportAndShareAccountData(user.id);
      if (!result.ok && result.message) {
        Alert.alert('Export My Data', result.message);
      }
    } finally {
      setExporting(false);
    }
  }, [exporting, user]);

  const slideAnim = useRef(new Animated.Value(SCREEN_W)).current;
  const fade0  = useRef(new Animated.Value(0)).current;
  const fade1  = useRef(new Animated.Value(0)).current;
  const fade2  = useRef(new Animated.Value(0)).current;
  const fade3  = useRef(new Animated.Value(0)).current;
  const fade4  = useRef(new Animated.Value(0)).current;
  const slide0 = useRef(new Animated.Value(14)).current;
  const slide1 = useRef(new Animated.Value(14)).current;
  const slide2 = useRef(new Animated.Value(14)).current;
  const slide3 = useRef(new Animated.Value(14)).current;
  const slide4 = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    if (!visible) {
      [fade0, fade1, fade2, fade3, fade4].forEach(a => a.setValue(0));
      [slide0, slide1, slide2, slide3, slide4].forEach(a => a.setValue(14));
      return;
    }

    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 320,
      easing: EASE_OUT,
      useNativeDriver: true,
    }).start();

    [fade0, fade1, fade2, fade3, fade4].forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        delay: 80 + i * 55,
        easing: EASE_OUT,
        useNativeDriver: true,
      }).start();
    });
    [slide0, slide1, slide2, slide3, slide4].forEach((anim, i) => {
      Animated.spring(anim, {
        toValue: 0,
        tension: 70,
        friction: 12,
        delay: 80 + i * 55,
        useNativeDriver: true,
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

  const isBackSwipe = (dx, dy) => dx > 10 && Math.abs(dx) > Math.abs(dy) * 1.5;
  const panResponder = useRef(
    PanResponder.create({
      // Same gesture math as the active-session swipe-back: claim only a clear
      // rightward drag (the *Capture handler wins over the inner ScrollView),
      // and don't let it be stolen back mid-swipe.
      onMoveShouldSetPanResponder: (_, { dx, dy }) => isBackSwipe(dx, dy),
      onMoveShouldSetPanResponderCapture: (_, { dx, dy }) => isBackSwipe(dx, dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, { dx }) => {
        if (dx > 0) dragX.setValue(dx); // track the finger, right-only
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        if (dx > SCREEN_W * 0.35 || vx > 0.5) {
          Animated.timing(dragX, {
            toValue: SCREEN_W,
            duration: 240,
            easing: EASE_OUT,
            useNativeDriver: true,
          }).start(() => {
            slideAnim.setValue(SCREEN_W);
            dragX.setValue(0);
            onClose();
          });
        } else {
          Animated.spring(dragX, {
            toValue: 0, tension: 140, friction: 10, useNativeDriver: true,
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

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[st.root, { transform: [{ translateX: screenTranslateX }] }]} {...panResponder.panHandlers}>
        <SafeAreaView style={st.safe}>
          <StatusBar style="dark" />

          <View style={st.header}>
            <Pressable onPress={handleClose} hitSlop={12} style={st.backBtn}>
              <Text style={st.backArrow}>←</Text>
            </Pressable>
            <Text style={st.headerTitle}>Settings</Text>
          </View>

          <ScrollView
            style={st.scroll}
            contentContainerStyle={st.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={{ opacity: fade0, transform: [{ translateY: slide0 }] }}>
              <ProfileHero
                initials={initials}
                name={`${firstName} ${lastName}`}
                email={email}
                profileImage={profileImage}
                onPress={() => setProfileVisible(true)}
              />
            </Animated.View>

            <Animated.View style={{ opacity: fade1, transform: [{ translateY: slide1 }] }}>
              <Text style={st.sectionHeading}>ACCOUNT</Text>
              <View style={st.card}>
                <SettingsRow label="Notifications" isLast onPress={openNotificationSettings} />
              </View>
            </Animated.View>

            <Animated.View style={{ opacity: fade2, transform: [{ translateY: slide2 }] }}>
              <Text style={st.sectionHeading}>DEVICE</Text>
              <View style={st.card}>
                <SettingsRow
                  label="Sureva S1"
                  sublabel="Connected · 82%"
                  onPress={() => {}}
                />
                <SettingsRow label="Pair New Device" isLast onPress={() => {}} />
              </View>
            </Animated.View>

            <Animated.View style={{ opacity: fade3, transform: [{ translateY: slide3 }] }}>
              <Text style={st.sectionHeading}>APP</Text>
              <View style={st.card}>
                <SettingsRow
                  label="Skin Profile"
                  sublabel="Update your onboarding answers"
                  isLast
                  onPress={() => setEditSkinProfileVisible(true)}
                />
              </View>
            </Animated.View>

            <Animated.View style={{ opacity: fade4, transform: [{ translateY: slide4 }] }}>
              <Text style={st.sectionHeading}>SUPPORT</Text>
              <View style={st.card}>
                <SettingsRow label="Help & Support" onPress={() => setHelpVisible(true)} />
                <SettingsRow label="Replay App Tour" onPress={handleReplayTour} />
                <SettingsRow
                  label="About Sureva"
                  sublabel="Version 1.0.0"
                  isLast
                  onPress={() => setAboutVisible(true)}
                />
              </View>

              <Text style={st.sectionHeading}>PRIVACY</Text>
              <View style={st.card}>
                <SettingsRow
                  label={exporting ? 'Preparing export…' : 'Export My Data'}
                  sublabel="Download everything Sureva has on your account"
                  isLast
                  onPress={exporting ? undefined : handleExportData}
                />
              </View>

              <Text style={[st.sectionHeading, st.dangerHeading]}>DANGER ZONE</Text>
              <View style={[st.card, st.dangerCard]}>
                <SettingsRow
                  label={deleting ? 'Deleting…' : 'Delete Account'}
                  danger
                  hideChevron
                  isLast
                  onPress={deleting ? undefined : openDeleteConfirm}
                />
              </View>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </Animated.View>

      {/* ProfileScreen slides over settings within the same Modal */}
      <ProfileScreen
        visible={profileVisible}
        onClose={() => setProfileVisible(false)}
        initials={initials}
        name={`${firstName} ${lastName}`}
        firstName={firstName}
        lastName={lastName}
        onSignOut={onSignOut}
        email={email}
        profileImage={profileImage}
        onProfileImageChange={setProfileImage}
      />

      {/* HelpSupportScreen slides over settings within the same Modal */}
      <HelpSupportScreen
        visible={helpVisible}
        onClose={() => setHelpVisible(false)}
      />

      {/* NotificationSettingsScreen slides over settings within the same Modal */}
      <NotificationSettingsScreen
        visible={notificationSettingsVisible}
        onClose={() => setNotificationSettingsVisible(false)}
      />

      {/* EditSkinProfileScreen slides over settings within the same Modal */}
      <EditSkinProfileScreen
        visible={editSkinProfileVisible}
        onClose={() => setEditSkinProfileVisible(false)}
      />

      {/* AboutSurevaScreen slides over settings within the same Modal */}
      <AboutSurevaScreen
        visible={aboutVisible}
        onClose={() => setAboutVisible(false)}
      />

      <ConfirmDialog
        visible={confirmDeleteVisible}
        title="Delete your account?"
        message="This permanently deletes your session history, skin profile, and all Sureva data. This cannot be undone."
        confirmLabel="Continue"
        cancelLabel="Cancel"
        danger
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      <ConfirmDialog
        visible={confirmFinalVisible}
        title="Are you absolutely sure?"
        message="This is the last step: once deleted, your data cannot be recovered."
        confirmLabel="Yes, Delete Everything"
        cancelLabel="Cancel"
        danger
        onConfirm={finalConfirmDelete}
        onCancel={cancelFinalDelete}
      />
    </Modal>
  );
}

const st = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
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
  profileCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  profileInitials: {
    fontFamily: 'Outfit-Regular',
    fontSize: 18,
    color: colors.white,
    letterSpacing: 0.5,
  },
  profileInfo: {
    flex: 1,
    gap: 3,
  },
  profileName: {
    fontFamily: 'Outfit-Regular',
    fontSize: 17,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  profileEmail: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: colors.muted,
  },
  profileChevron: {
    fontSize: 22,
    color: colors.muted,
    lineHeight: 24,
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
  dangerHeading: {
    color: colors.danger,
  },
  dangerCard: {
    borderColor: colors.danger,
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
