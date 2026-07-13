import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { AuthProvider, useAuth } from './context/AuthContext';
import SupabaseService from './services/SupabaseService';
import SplashIntroScreen from './screens/SplashIntroScreen';
import AuthScreen from './screens/AuthScreen';
import CheckEmailScreen from './screens/CheckEmailScreen';
import SignInScreen from './screens/SignInScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import GetStartedScreen from './screens/GetStartedScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import BluetoothPairingScreen from './screens/BluetoothPairingScreen';
import DeviceOnboardingScreen from './screens/DeviceOnboardingScreen';
import HomeScreen from './screens/HomeScreen';
import ForecastScreen from './screens/ForecastScreen';
import HistoryScreen from './screens/HistoryScreen';
import InsightsScreen from './screens/InsightsScreen';
import FloatingTabBar from './components/FloatingTabBar';
import TabPager from './components/TabPager';
import { SwipeNavProvider } from './context/SwipeNavContext';
import { TabBarVisibilityProvider } from './context/TabBarVisibilityContext';
import ScrollToTopContext, { ScrollToTopProvider } from './context/ScrollToTopContext';
import { QuickSearchProvider } from './context/QuickSearchContext';
import QuickSearchOverlay from './components/quickSearch/QuickSearchOverlay';
import { AppTourProvider } from './context/AppTourContext';
import TourOverlay from './components/tour/TourOverlay';

const TAB_ORDER = ['home', 'forecast', 'history', 'insights'];

function MainAppContent({ onSignOut }) {
  const [activeTab, setActiveTab] = useState('home');
  // >0 while a full-screen overlay (e.g. session detail) owns the back gesture.
  const swipeLockRef = useRef(0);
  const activeIndex = TAB_ORDER.indexOf(activeTab);
  const { scrollToTop } = React.useContext(ScrollToTopContext);
  // Tracks the last tab tap so a quick second tap on the same tab counts as a
  // double-tap (scroll-to-top) without a stale-state dependency.
  const lastTapRef = useRef({ key: null, time: 0 });
  const DOUBLE_TAP_MS = 300;

  const handleTabPress = React.useCallback((key) => {
    const now = Date.now();
    const last = lastTapRef.current;
    const isDouble = last.key === key && now - last.time < DOUBLE_TAP_MS;
    lastTapRef.current = { key, time: isDouble ? 0 : now };

    if (isDouble) scrollToTop(key); // double-tap → smooth scroll to top
    else setActiveTab(key);         // single tap → switch tabs
  }, [scrollToTop]);
  const handleIndexChange = React.useCallback((i) => setActiveTab(TAB_ORDER[i]), []);

  // Every tab stays mounted for smooth swiping (see TabPager), so screens
  // that need to know whether they're the one actually on-screen right
  // now — e.g. before measuring an element for a coach mark — need this
  // explicitly; mounted alone doesn't mean visible.
  const tabs = React.useMemo(
    () => [
      {
        key: 'home',
        render: () => (
          <HomeScreen onSignOut={onSignOut} onNavigateTab={handleTabPress} isActiveTab={activeTab === 'home'} />
        ),
      },
      { key: 'forecast', render: () => <ForecastScreen /> },
      { key: 'history', render: () => <HistoryScreen isActiveTab={activeTab === 'history'} /> },
      { key: 'insights', render: () => <InsightsScreen isActiveTab={activeTab === 'insights'} /> },
    ],
    [onSignOut, handleTabPress, activeTab]
  );

  return (
    <SwipeNavProvider lockRef={swipeLockRef}>
      <QuickSearchProvider activeTab={activeTab} setActiveTab={setActiveTab}>
        <AppTourProvider onNavigateTab={setActiveTab}>
          <View style={appSt.root}>
            <TabPager
              tabs={tabs}
              activeIndex={activeIndex}
              onIndexChange={handleIndexChange}
              swipeLockRef={swipeLockRef}
            />
            <FloatingTabBar activeTab={activeTab} onTabPress={handleTabPress} />
            <QuickSearchOverlay />
            <TourOverlay />
          </View>
        </AppTourProvider>
      </QuickSearchProvider>
    </SwipeNavProvider>
  );
}

function MainApp(props) {
  return (
    <ScrollToTopProvider>
      <TabBarVisibilityProvider>
        <MainAppContent {...props} />
      </TabBarVisibilityProvider>
    </ScrollToTopProvider>
  );
}

const appSt = StyleSheet.create({
  root: { flex: 1 },
});

function AppNavigator() {
  const { user, onboardingComplete, setOnboardingComplete, passwordRecoveryPending } = useAuth();

  const [screen, setScreen] = useState('signup');
  const [splashDone, setSplashDone] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  // Holds the previous render's value so the effect below can tell "was
  // this sign-out the result of finishing a password reset" apart from
  // any other sign-out, without ResetPasswordScreen needing to reach into
  // this component's own screen state directly.
  const wasRecoveryPendingRef = useRef(passwordRecoveryPending);
  useEffect(() => {
    if (user === null) {
      setScreen(wasRecoveryPendingRef.current ? 'signin' : 'signup');
      setSignupError('');
    }
    wasRecoveryPendingRef.current = passwordRecoveryPending;
  }, [user, passwordRecoveryPending]);

  // Route to the correct screen. This renders underneath the splash so the
  // splash can fade away to reveal whichever screen the user belongs on.
  const renderRoutedScreen = () => {
  if (user === undefined) return null;

  // A password-reset link takes priority over everything else — an
  // existing, already-onboarded user tapping it should land on setting a
  // new password, not get routed straight into the normal signed-in app.
  if (passwordRecoveryPending) return <ResetPasswordScreen />;

  // ── Signed in ─────────────────────────────────────────────────
  if (user !== null) {
    if (screen === 'bluetoothPairing') {
      return <BluetoothPairingScreen onComplete={() => setScreen('deviceOnboarding')} />;
    }

    if (screen === 'deviceOnboarding') {
      return <DeviceOnboardingScreen onComplete={() => setScreen('home')} />;
    }

    if (onboardingComplete) {
      return (
        <MainApp onSignOut={async () => { await SupabaseService.signOut(); }} />
      );
    }

    if (screen === 'onboarding') {
      return (
        <OnboardingScreen
          onBack={() => setScreen('getStarted')}
          onContinue={async (answers) => {
            try {
              const { error } = await SupabaseService.completeOnboarding(user, answers);
              if (error) throw error;
              setOnboardingComplete(true);
            } catch {
              setOnboardingComplete(true);
            }
            setScreen('bluetoothPairing');
          }}
        />
      );
    }

    // Default for a signed-in, not-yet-onboarded user.
    return (
      <GetStartedScreen
        onContinue={() => setScreen('onboarding')}
        onBack={async () => { await SupabaseService.signOut(); }}
      />
    );
  }

  // ── Not signed in ─────────────────────────────────────────────
  if (screen === 'signin') {
    return (
      <SignInScreen
        onNavigateToSignUp={() => setScreen('signup')}
        onForgotPassword={() => setScreen('forgotPassword')}
      />
    );
  }

  if (screen === 'forgotPassword') {
    return <ForgotPasswordScreen onBack={() => setScreen('signin')} />;
  }

  if (screen === 'checkEmail') {
    return (
      <CheckEmailScreen
        email={pendingEmail}
        onBack={() => setScreen('signup')}
      />
    );
  }

  // Default: signup
  return (
    <AuthScreen
      onNavigateToSignIn={() => setScreen('signin')}
      onAccountCreated={async ({ email, password, firstName, lastName }) => {
        const { error } = await SupabaseService.createUser(email, password, firstName, lastName);
        if (error) throw error;
        setPendingEmail(email);
        setScreen('checkEmail');
      }}
      prefillError={signupError}
    />
  );
  };

  return (
    <View style={appSt.root}>
      {renderRoutedScreen()}
      {!splashDone && <SplashIntroScreen onComplete={() => setSplashDone(true)} />}
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    'SpaceGrotesk-Medium': SpaceGrotesk_500Medium,
    'SpaceGrotesk-SemiBold': SpaceGrotesk_600SemiBold,
    'SpaceGrotesk-Bold': SpaceGrotesk_700Bold,
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
