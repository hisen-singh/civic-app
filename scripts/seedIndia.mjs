import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyCWFEouXZQHNYFZPCeqBE6q3VpokIWnJ4A',
  authDomain: 'civic-d0574.firebaseapp.com',
  projectId: 'civic-d0574',
  storageBucket: 'civic-d0574.firebasestorage.app',
  messagingSenderId: '1045062367632',
  appId: '1:1045062367632:web:5cf44682d92d1bdcdc5b15',
  measurementId: 'G-KJ8V6BMD86',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const BASE_LAT = 28.6139;
const BASE_LNG = 77.209;
const randomOffset = () => (Math.random() - 0.5) * 0.05;

async function getOrCreateUser(email, password, displayName) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return cred.user.uid;
  } catch (e) {
    if (e.code === 'auth/email-already-in-use') {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return cred.user.uid;
    }
    throw e;
  }
}

async function seedDatabase() {
  console.log('Authenticating and seeding users...');
  try {
    const aaravId = await getOrCreateUser(
      'aarav@civic.app',
      'CivicSeed123!',
      'Aarav Patel',
    );
    const aaravIssue = {
      title: 'Broken Streetlight near Metro',
      category: 'Safety',
      urgency: 'high',
      status: 'Open',
      location: 'Rajiv Chowk Metro Station',
      description:
        'The streetlights near gate 3 are completely off, making it very unsafe at night.',
      authorName: 'Aarav Patel',
      authorId: aaravId,
      solvers: [],
      latitude: BASE_LAT + randomOffset(),
      longitude: BASE_LNG + randomOffset(),
      createdAt: new Date().toISOString(),
      voters: [],
      votes: 0,
      commentsCount: 0,
      photo: null,
    };
    await addDoc(collection(db, 'issues'), aaravIssue);

    const priyaId = await getOrCreateUser(
      'priya@civic.app',
      'CivicSeed123!',
      'Priya Sharma',
    );
    const priyaIssue = {
      title: 'Water pipe leaking',
      category: 'Water Supply',
      urgency: 'critical',
      status: 'In Progress',
      location: 'Connaught Place',
      description: 'A major water pipe burst causing water logging.',
      authorName: 'Priya Sharma',
      authorId: priyaId,
      solvers: [aaravId],
      latitude: BASE_LAT + randomOffset(),
      longitude: BASE_LNG + randomOffset(),
      createdAt: new Date().toISOString(),
      voters: [],
      votes: 0,
      commentsCount: 0,
      photo: null,
    };
    await addDoc(collection(db, 'issues'), priyaIssue);

    const vikramId = await getOrCreateUser(
      'vikram@civic.app',
      'CivicSeed123!',
      'Vikram Singh',
    );
    const vikramIssue = {
      title: 'Pothole on Main Road',
      category: 'Infrastructure',
      urgency: 'medium',
      status: 'Open',
      location: 'India Gate Circle',
      description: 'Huge pothole damaging vehicles.',
      authorName: 'Vikram Singh',
      authorId: vikramId,
      solvers: [],
      latitude: BASE_LAT + randomOffset(),
      longitude: BASE_LNG + randomOffset(),
      createdAt: new Date().toISOString(),
      voters: [],
      votes: 0,
      commentsCount: 0,
      photo: null,
    };
    await addDoc(collection(db, 'issues'), vikramIssue);

    console.log(`\nSuccessfully seeded India mock issues to Firestore.`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
