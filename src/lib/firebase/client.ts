"use client";

import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  connectAuthEmulator,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
} from "firebase/firestore";

export const firebaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID
);

// The Firebase Auth SDK validates the *shape* of the API key as soon as
// getAuth() is called, even before any network request is made — so
// without a syntactically plausible key, local builds and prerenders would
// crash before a developer ever gets the chance to add real credentials.
// These placeholders are inert: they satisfy the shape check but every
// real Firebase call will fail (clearly) until real env vars are set.
const PLACEHOLDER: FirebaseOptions = {
  apiKey: "AIzaSyD-placeholder-not-a-real-key-000",
  authDomain: "vitalis-placeholder.firebaseapp.com",
  projectId: "vitalis-placeholder",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000000000",
};

const firebaseConfig: FirebaseOptions = firebaseConfigured
  ? {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    }
  : PLACEHOLDER;

if (!firebaseConfigured && typeof window !== "undefined") {
  console.warn(
    "[Vitalis] Firebase env vars are not set — running with an inert placeholder config. " +
      "Sign-in and data storage will not work until you add NEXT_PUBLIC_FIREBASE_* to .env.local. See README.md."
  );
}

// Avoid re-initializing during Next.js hot-reload / multiple imports.
export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const googleProvider = new GoogleAuthProvider();

// Optional local emulator support for `firebase emulators:start` during development.
if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true" && typeof window !== "undefined") {
  const w = window as unknown as { __VITALIS_EMULATORS_CONNECTED__?: boolean };
  if (!w.__VITALIS_EMULATORS_CONNECTED__) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    w.__VITALIS_EMULATORS_CONNECTED__ = true;
  }
}
