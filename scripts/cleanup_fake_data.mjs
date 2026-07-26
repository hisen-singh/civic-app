import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

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

async function run() {
  console.log('Authenticating...');
  const userCredential = await signInWithEmailAndPassword(auth, 'seed_data@civic.app', 'CivicSeed123!');
  const uid = userCredential.user.uid;
  console.log(`Authenticated with UID: ${uid}`);

  console.log("Fetching issues...");
  const snapshot = await getDocs(collection(db, 'issues'));
  let deletedCount = 0;
  
  // Create an array of promises for deleting documents individually
  const deletePromises = [];

  snapshot.forEach((document) => {
    const issue = document.data();
    
    // If it's a seed issue (from Chicago) or any other fake non-India issue, delete it.
    // We can just delete anything authored by the seed user to be safe
    let isFake = false;
    
    if (issue.authorId === uid) {
      isFake = true;
    }
    
    // Or if it matches Chicago locations
    if (issue.location && issue.location.toLowerCase().includes('chicago')) {
      isFake = true;
    }
    
    // If it's fake and we have permission (authorId == uid allows delete in rules)
    if (isFake && issue.authorId === uid) {
      deletePromises.push(deleteDoc(document.ref));
      deletedCount++;
    }
  });

  if (deletePromises.length > 0) {
    console.log(`Deleting ${deletePromises.length} fake issues...`);
    await Promise.all(deletePromises);
  }
  
  console.log(`Deleted ${deletedCount} non-India mock issues!`);
  process.exit(0);
}

run().catch(console.error);
