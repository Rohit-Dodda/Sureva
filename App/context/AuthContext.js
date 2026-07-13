import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { supabase } from '../services/supabase';
import SupabaseService from '../services/SupabaseService';

// Per-uid "finished onboarding" flag. Once a user has onboarded, this
// keeps them routed to Home even when the Supabase read fails on a cold
// start (or the original onboarding write never landed) — a signed-in,
// onboarded user must never be bounced back to the onboarding flow by a
// flaky network.
const ONBOARDED_KEY_PREFIX = '@sureva_onboarded_';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // undefined = still checking, null = signed out, object = signed in
  const [user, setUser] = useState(undefined);
  const [onboardingComplete, setOnboardingCompleteState] = useState(false);
  const currentUserIdRef = React.useRef(null);

  // Same signature App.js already uses; additionally persists `true` so
  // the next cold start doesn't depend on Supabase answering in time.
  const setOnboardingComplete = useCallback((value) => {
    setOnboardingCompleteState(value);
    const uid = currentUserIdRef.current;
    if (value && uid) {
      AsyncStorage.setItem(ONBOARDED_KEY_PREFIX + uid, '1').catch(() => {});
    }
  }, []);
  const [userProfile, setUserProfile] = useState(null); // { firstName, lastName }
  const [profileImage, setProfileImageState] = useState(null);
  // True from the moment a password-reset link opens the app until the
  // user actually sets a new password — App.js checks this before its
  // normal signed-in/not-signed-in routing, so a recovery session lands
  // on ResetPasswordScreen instead of being treated as a normal sign-in.
  const [passwordRecoveryPending, setPasswordRecoveryPending] = useState(false);

  // Cloud-backed so the picture follows the account across devices and
  // reinstalls, not just this one's local storage. Updates the local
  // state optimistically (the locally-picked URI paints instantly) while
  // the real upload/removal happens in the background.
  const setProfileImage = useCallback(async (uri) => {
    const uid = currentUserIdRef.current;
    if (!uid) return;
    if (uri) {
      setProfileImageState(uri);
      const { data: hostedUrl, error } = await SupabaseService.uploadAvatar(uid, uri);
      if (!error && hostedUrl) setProfileImageState(hostedUrl);
    } else {
      setProfileImageState(null);
      await SupabaseService.removeAvatar(uid);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const authUser = session?.user ?? null;
      currentUserIdRef.current = authUser?.id ?? null;
      if (event === 'PASSWORD_RECOVERY') setPasswordRecoveryPending(true);
      if (authUser) {
        let cachedOnboarded = false;
        try {
          cachedOnboarded =
            (await AsyncStorage.getItem(ONBOARDED_KEY_PREFIX + authUser.id)) === '1';
        } catch {}
        try {
          const { data: userRow, error } = await SupabaseService.getUserProfile(authUser.id);
          // PGRST116 = no row found — expected for a signed-in user who
          // hasn't finished onboarding yet, since their public.users row
          // isn't created until that step. Not an error case.
          if (error && error.code !== 'PGRST116') throw error;
          const fromRow = userRow?.onboarding_complete ?? false;
          // Either source saying "onboarded" wins — the cache covers the
          // case where the original onboarding write never reached
          // Supabase; the row covers a fresh install on a new device.
          setOnboardingCompleteState(fromRow || cachedOnboarded);
          if (fromRow && !cachedOnboarded) {
            AsyncStorage.setItem(ONBOARDED_KEY_PREFIX + authUser.id, '1').catch(() => {});
          }
          setUserProfile(
            userRow ? { firstName: userRow.first_name ?? '', lastName: userRow.last_name ?? '' } : null
          );
          setProfileImageState(userRow?.avatar_url ?? null);
        } catch {
          // Supabase unreachable — fall back to the cached flag instead
          // of dumping an onboarded user back into onboarding.
          setOnboardingCompleteState(cachedOnboarded);
          setUserProfile(null);
          setProfileImageState(null);
        }
      } else {
        setUserProfile(null);
        setProfileImageState(null);
        setPasswordRecoveryPending(false);
      }
      setUser(authUser);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Catches the emailed confirmation link (sureva://auth-callback?code=...)
  // both when it opens the app fresh and when the app is already running.
  // Exchanging the code completes the PKCE flow started by signUp() and
  // produces a session, which the listener above picks up automatically.
  useEffect(() => {
    const handleUrl = (url) => {
      if (!url) return;
      console.log('[deep link] received:', url);
      const { queryParams } = Linking.parse(url);
      const code = queryParams?.code;
      if (code) {
        supabase.auth.exchangeCodeForSession(code)
          .then(({ error }) => {
            if (error) console.log('[deep link] exchangeCodeForSession error:', error.message);
            else console.log('[deep link] session exchanged successfully');
          })
          .catch((e) => console.log('[deep link] exchangeCodeForSession threw:', e?.message));
      } else {
        console.log('[deep link] no code param found, queryParams:', JSON.stringify(queryParams));
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => subscription.remove();
  }, []);

  return (
    <AuthContext.Provider value={{
      user, onboardingComplete, setOnboardingComplete, userProfile, profileImage, setProfileImage,
      passwordRecoveryPending, clearPasswordRecoveryPending: () => setPasswordRecoveryPending(false),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
