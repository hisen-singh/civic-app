import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyCWFEouXZQHNYFZPCeqBE6q3VpokIWnJ4A",
  authDomain: "civic-d0574.firebaseapp.com",
  projectId: "civic-d0574",
  storageBucket: "civic-d0574.firebasestorage.app",
  messagingSenderId: "1045062367632",
  appId: "1:1045062367632:web:5cf44682d92d1bdcdc5b15",
  measurementId: "G-KJ8V6BMD86"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
