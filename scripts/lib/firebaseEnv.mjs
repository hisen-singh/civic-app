/**
 * Shared Firebase environment loader for seed and maintenance scripts.
 *
 * Reads Firebase config and seed credentials from environment variables
 * (loaded via dotenv). Throws on any missing required variable so a
 * misconfigured environment stops the script immediately.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import {
  getAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import dotenv from 'dotenv';

dotenv.config();

// ── Required environment variables ──────────────────────────────────────────

const REQUIRED_FIREBASE_VARS = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
];

const REQUIRED_SEED_VARS = ['SEED_EMAIL', 'SEED_PASSWORD'];

function requireEnv(keys) {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(
      `ERROR: Missing required environment variables:\n  ${missing.join('\n  ')}\n\nCopy .env.example to .env and fill in the values.`,
    );
    process.exit(1);
  }
}

requireEnv(REQUIRED_FIREBASE_VARS);
requireEnv(REQUIRED_SEED_VARS);

// ── Firebase config from env ────────────────────────────────────────────────

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID, // optional
};

// ── Initialise Firebase ─────────────────────────────────────────────────────

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ── Emulator / production guard ─────────────────────────────────────────────

if (process.env.USE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099');
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  console.log('[firebaseEnv] Connected to local emulators.');
} else if (process.env.ALLOW_PROD_SEED !== 'true') {
  console.error(
    'ERROR: Refusing to write to production database.\n' +
      'Set ALLOW_PROD_SEED=true to override, or USE_EMULATOR=true to use local emulators.',
  );
  process.exit(1);
}

// ── Seed credential helpers ─────────────────────────────────────────────────

const SEED_EMAIL = process.env.SEED_EMAIL;
const SEED_PASSWORD = process.env.SEED_PASSWORD;

/**
 * Sign in with the seed account, creating it first if it does not exist.
 * Returns the Firebase User object.
 */
export async function getOrCreateSeedUser(
  email = SEED_EMAIL,
  password = SEED_PASSWORD,
) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return cred.user;
  } catch (e) {
    if (e.code === 'auth/email-already-in-use') {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return cred.user;
    }
    throw e;
  }
}

/**
 * Sign in with the seed account. Does not attempt to create it.
 * Returns the Firebase User object.
 */
export async function signInSeedUser(
  email = SEED_EMAIL,
  password = SEED_PASSWORD,
) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export { app, db, auth, firebaseConfig, SEED_EMAIL, SEED_PASSWORD };
