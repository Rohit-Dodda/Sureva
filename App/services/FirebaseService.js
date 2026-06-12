import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

// Step 1 of signup: create the auth account and write a minimal profile doc.
async function createUser(email, password, firstName, lastName) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const { user } = credential;
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    email,
    firstName,
    lastName,
    createdAt: serverTimestamp(),
    onboardingComplete: false,
  });
  return user;
}

// Step 2 of signup: called after onboarding answers are collected.
async function completeOnboarding(uid, onboardingAnswers) {
  await updateDoc(doc(db, 'users', uid), {
    ...onboardingAnswers,
    onboardingComplete: true,
  });
}

// Legacy: creates the Firebase auth account and writes the full user doc
// (including all onboarding answers) in one shot.
async function createUserWithOnboarding(email, password, firstName, lastName, onboardingAnswers) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const { uid } = credential.user;
  await setDoc(doc(db, 'users', uid), {
    uid,
    email,
    firstName,
    lastName,
    createdAt: serverTimestamp(),
    ...onboardingAnswers,
    onboardingComplete: true,
  });
  return credential.user;
}

async function signIn(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

async function signOut() {
  await firebaseSignOut(auth);
}

async function getUserDocument(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

// Edge-case fallback: signed-in user whose onboarding doc is incomplete
async function saveOnboardingData(uid, answers) {
  await updateDoc(doc(db, 'users', uid), {
    ...answers,
    onboardingComplete: true,
  });
}

export default {
  createUser,
  completeOnboarding,
  createUserWithOnboarding,
  signIn,
  signOut,
  getUserDocument,
  saveOnboardingData,
};
