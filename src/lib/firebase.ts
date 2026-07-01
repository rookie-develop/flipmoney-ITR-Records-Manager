import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
});

// Initialize Firestore with custom databaseId if provided
const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
export const db = initializeFirestore(app, {}, dbId);

// Initialize Auth
export const auth = getAuth(app);

// Set session persistence so users are not automatically kept logged in from previous visits
setPersistence(auth, browserSessionPersistence).catch((err) => {
  console.error('Failed to set Auth session persistence:', err);
});
