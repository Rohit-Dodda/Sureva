import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import { AuthProvider, useAuth } from './context/AuthContext';
import FirebaseService from './services/FirebaseService';
import SplashIntroScreen from './screens/SplashIntroScreen';
import AuthScreen from './screens/AuthScreen';
import SignInScreen from './screens/SignInScreen';
import GetStartedScreen from './screens/GetStartedScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import BluetoothPairingScreen from './screens/BluetoothPairingScreen';
import HomeScreen from './screens/HomeScreen';
import HistoryScreen from './screens/HistoryScreen';
import InsightsScreen from './screens/InsightsScreen';
import FloatingTabBar from './components/FloatingTabBar';
import AnimatedTabScreen from './components/AnimatedTabScreen';

const TAB_ORDER = ['home', 'history', 'insights'];

function MainApp({ onSignOut }) {
  const [activeTab, setActiveTab] = useState('home');
  const directionRef = React.useRef(0);

  const handleTabPress = React.useCallback((key) => {
    setActiveTab((prev) => {
      if (key === prev) return prev;
      directionRef.current =
        TAB_ORDER.indexOf(key) > TAB_ORDER.indexOf(prev) ? 1 : -1;
      return key;
    });
  }, []);

  const direction = directionRef.current;

  return (
    <View style={appSt.root}>
      <AnimatedTabScreen active={activeTab === 'home'} direction={direction}>
        <HomeScreen onSignOut={onSignOut} />
      </AnimatedTabScreen>
      <AnimatedTabScreen active={activeTab === 'history'} direction={direction}>
        <HistoryScreen />
      </AnimatedTabScreen>
      <AnimatedTabScreen active={activeTab === 'insights'} direction={direction}>
        <InsightsScreen />
      </AnimatedTabScreen>
      <FloatingTabBar activeTab={activeTab} onTabPress={handleTabPress} />
    </View>
  );
}

const appSt = StyleSheet.create({
  root: { flex: 1 },
});

function AppNavigator() {
  const { user, onboardingComplete, setOnboardingComplete } = useAuth();
  const [screen, setScreen] = useState('splash');
  const [signupError, setSignupError] = useState('');
  useEffect(() => {
    if (user === null) {
      setScreen('signup');
      setSignupError('');
    }
  }, [user]);

  if (user === undefined) return null;

  // ── Signed in ─────────────────────────────────────────────────
  if (user !== null) {
    if (screen === 'bluetoothPairing') {
      return <BluetoothPairingScreen onComplete={() => setScreen('home')} />;
    }

    if (onboardingComplete) {
      return (
        <MainApp onSignOut={async () => { await FirebaseService.signOut(); }} />
      );
    }

    if (screen === 'getStarted') {
      return (
        <GetStartedScreen
          onContinue={() => setScreen('onboarding')}
          onBack={async () => { await FirebaseService.signOut(); }}
        />
      );
    }

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

  // ── Not signed in ─────────────────────────────────────────────
  if (screen === 'splash') {
    return <SplashIntroScreen onComplete={() => setScreen('signup')} />;
  }

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
    'SFProDisplay-Black': require('./assets/fonts/SF-Pro-Display-Black.otf'),
    'SFProDisplay-Bold': require('./assets/fonts/SF-Pro-Display-Bold.otf'),
    'SFProDisplay-Regular': require('./assets/fonts/SF-Pro-Display-Regular.otf'),
  });

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
