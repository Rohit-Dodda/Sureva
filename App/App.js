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
import FirebaseService from './services/FirebaseService';
import SplashIntroScreen from './screens/SplashIntroScreen';
import AuthScreen from './screens/AuthScreen';
import SignInScreen from './screens/SignInScreen';
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
import ScrollToTopContext, { ScrollToTopProvider } from './context/ScrollToTopContext';

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

  const tabs = React.useMemo(
    () => [
      {
        key: 'home',
        render: () => <HomeScreen onSignOut={onSignOut} onNavigateTab={handleTabPress} />,
      },
      { key: 'forecast', render: () => <ForecastScreen /> },
      { key: 'history', render: () => <HistoryScreen /> },
      { key: 'insights', render: () => <InsightsScreen /> },
    ],
    [onSignOut, handleTabPress]
  );

  return (
    <SwipeNavProvider lockRef={swipeLockRef}>
      <View style={appSt.root}>
        <TabPager
          tabs={tabs}
          activeIndex={activeIndex}
          onIndexChange={handleIndexChange}
          swipeLockRef={swipeLockRef}
        />
        <FloatingTabBar activeTab={activeTab} onTabPress={handleTabPress} />
      </View>
    </SwipeNavProvider>
  );
}

function MainApp(props) {
  return (
    <ScrollToTopProvider>
      <MainAppContent {...props} />
    </ScrollToTopProvider>
  );
}

const appSt = StyleSheet.create({
  root: { flex: 1 },
});

function AppNavigator() {
  const { user, onboardingComplete, setOnboardingComplete } = useAuth();

  const [screen, setScreen] = useState('signup');
  const [splashDone, setSplashDone] = useState(false);
  const [signupError, setSignupError] = useState('');
  useEffect(() => {
    if (user === null) {
      setScreen('signup');
      setSignupError('');
    }
  }, [user]);

  // Play the splash on every cold load, regardless of auth state, before routing.
  if (!splashDone) {
    return <SplashIntroScreen onComplete={() => setSplashDone(true)} />;
  }

  if (user === undefined) return null;

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
        <MainApp onSignOut={async () => { await FirebaseService.signOut(); }} />
      );
    }

    if (screen === 'onboarding') {
      return (
        <OnboardingScreen
          onBack={() => setScreen('getStarted')}
          onContinue={async (answers) => {
            try {
              await FirebaseService.completeOnboarding(user.uid, answers);
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
        onBack={async () => { await FirebaseService.signOut(); }}
      />
    );
  }

  // ── Not signed in ─────────────────────────────────────────────
  if (screen === 'signin') {
    return <SignInScreen onNavigateToSignUp={() => setScreen('signup')} />;
  }

  // Default: signup
  return (
    <AuthScreen
      onNavigateToSignIn={() => setScreen('signin')}
      onAccountCreated={async ({ email, password, firstName, lastName }) => {
        await FirebaseService.createUser(email, password, firstName, lastName);
        setScreen('getStarted');
      }}
      prefillError={signupError}
    />
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
