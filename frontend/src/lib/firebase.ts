import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth } from "firebase/auth";
import { isReaderMode } from "./mode";

// In reader mode (GitHub Pages), Firebase is not needed — skip initialization
// to avoid auth/invalid-api-key errors when env vars are absent.
const app = isReaderMode ? null : initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const auth = app ? getAuth(app) : null!;
export const googleProvider = app ? new GoogleAuthProvider() : null!;
