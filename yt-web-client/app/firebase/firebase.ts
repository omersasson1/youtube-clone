//  


import { initializeApp } from "firebase/app";

import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { getFunctions } from "firebase/functions";

// My web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB0zfIHFVEotTg0w3YvxPeqi1VB_bPwHfU",
  authDomain: "yt-clone-9790a.firebaseapp.com",
  projectId: "yt-clone-9790a",
  appId: "1:509177885128:web:047294543462a91b2550fd",
  // probably not needed
  measurementId: "G-V8ZDQNQMNZ",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

// Export functions for use in other parts of the app
export const functions = getFunctions(app);

/**
 * Signs the user in with a Google popup.
 * @returns A promise that resolves with the user's credentials.
 */
export function signInWithGoogle() {
  return signInWithPopup(auth, new GoogleAuthProvider());
}

/**
 * Signs the user out.
 * @returns A promise that resolves when the user is signed out.
 */
export default function signOutWithGoogle() {
  return auth.signOut();
}

/**
 * Trigger a callback when user auth state changes.
 * @returns A function to unsubscribe callback.
 */
export function onAuthStateChangedHelper(
  callback: (user: User | null) => void
) {
  return onAuthStateChanged(auth, callback);
}
