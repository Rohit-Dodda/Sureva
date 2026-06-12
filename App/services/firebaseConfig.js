import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Paste your Firebase project config here (Firebase console → Project settings → Your apps)
const firebaseConfig = {
  apiKey: 'AIzaSyBd4whyjKvTJrv0CuxBVuI-Diuh3dLX_Sc',
  authDomain: 'sureva-d577a.firebaseapp.com',
  projectId: 'sureva-d577a',
  storageBucket: 'sureva-d577a.firebasestorage.app',
  messagingSenderId: '247478976479',
  appId: '1:247478976479:ios:9e1eb0a80e5c08bee64e6a',
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
