import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../services/firebaseConfig';
import FirebaseService from '../services/FirebaseService';

const PROFILE_IMAGE_KEY = '@sureva_profile_image';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // undefined = still checking, null = signed out, object = signed in
  const [user, setUser] = useState(undefined);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [userProfile, setUserProfile] = useState(null); // { firstName, lastName }
  const [profileImage, setProfileImageState] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem(PROFILE_IMAGE_KEY).then((uri) => {
      if (uri) setProfileImageState(uri);
    }).catch(() => {});
  }, []);

  const setProfileImage = useCallback(async (uri) => {
    try {
      if (uri) {
        await AsyncStorage.setItem(PROFILE_IMAGE_KEY, uri);
      } else {
        await AsyncStorage.removeItem(PROFILE_IMAGE_KEY);
      }
    } catch {}
    setProfileImageState(uri);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await FirebaseService.getUserDocument(firebaseUser.uid);
          setOnboardingComplete(userDoc?.onboardingComplete ?? false);
          setUserProfile({
            firstName: userDoc?.firstName ?? '',
            lastName: userDoc?.lastName ?? '',
          });
        } catch {
          setOnboardingComplete(false);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
        setProfileImageState(null);
        AsyncStorage.removeItem(PROFILE_IMAGE_KEY).catch(() => {});
      }
      setUser(firebaseUser ?? null);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, onboardingComplete, setOnboardingComplete, userProfile, profileImage, setProfileImage }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
