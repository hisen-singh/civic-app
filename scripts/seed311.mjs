import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

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

// Generic City Coordinates (Metropolis - approx Chicago/NYC blend, using Chicago center)
const BASE_LAT = 41.8781;
const BASE_LNG = -87.6298;

const randomOffset = () => (Math.random() - 0.5) * 0.05;

const MOCK_ISSUES = [
  {
    title: 'Massive Pothole on Main St',
    category: 'Infrastructure',
    urgency: 'critical',
    status: 'Open',
    location: '1200 Main St',
    description: 'There is a massive pothole in the right lane that has damaged at least 3 cars today. Needs immediate filling before a major accident occurs.',
    authorName: 'City 311 Open Data',
  },
  {
    title: 'Traffic Light Out at 4th and Elm',
    category: 'Safety',
    urgency: 'high',
    status: 'In Progress',
    location: 'Intersection of 4th Ave and Elm St',
    description: 'The traffic light is completely out in all directions. Currently treating it as a 4-way stop but traffic is backing up severely.',
    authorName: 'City 311 Open Data',
  },
  {
    title: 'Graffiti on Memorial Statue',
    category: 'Vandalism',
    urgency: 'medium',
    status: 'Open',
    location: 'Central Park Plaza',
    description: 'Someone spray painted tags all over the bronze memorial statue last night.',
    authorName: 'City 311 Open Data',
  },
  {
    title: 'Illegal Dumping in Alleyway',
    category: 'Sanitation',
    urgency: 'high',
    status: 'Open',
    location: 'Alley behind 450 W Lake St',
    description: 'Several mattresses, broken furniture, and construction debris dumped illegally, blocking the alley for garbage trucks.',
    authorName: 'City 311 Open Data',
  },
  {
    title: 'Broken Water Main',
    category: 'Infrastructure',
    urgency: 'critical',
    status: 'In Progress',
    location: '700 Block of State St',
    description: 'Water is gushing out from under the pavement, flooding the street and freezing. Dangerous driving conditions.',
    authorName: 'City 311 Open Data',
  },
  {
    title: 'Fallen Tree branch on power lines',
    category: 'Safety',
    urgency: 'critical',
    status: 'Open',
    location: '2100 N Lincoln Ave',
    description: 'Large oak branch snapped during the storm and is resting directly on the power lines. Sparks visible.',
    authorName: 'City 311 Open Data',
  },
  {
    title: 'Overflowing Public Trash Cans',
    category: 'Sanitation',
    urgency: 'low',
    status: 'Open',
    location: 'Lakefront Trail near Belmont',
    description: 'All public trash bins along the trail are overflowing, trash blowing into the water.',
    authorName: 'City 311 Open Data',
  },
  {
    title: 'Sidewalk severely buckled',
    category: 'Infrastructure',
    urgency: 'medium',
    status: 'Open',
    location: '1432 W Fullerton Ave',
    description: 'Tree roots have buckled the sidewalk by over 4 inches. Major trip hazard for elderly residents.',
    authorName: 'City 311 Open Data',
  },
  {
    title: 'Streetlights out on entire block',
    category: 'Safety',
    urgency: 'high',
    status: 'Open',
    location: '1000-1100 Block of S Michigan Ave',
    description: 'Pitch black on this block for the last 3 nights. Very unsafe for pedestrians.',
    authorName: 'City 311 Open Data',
  },
  {
    title: 'Abandoned Vehicle',
    category: 'Other',
    urgency: 'low',
    status: 'Open',
    location: 'Underpass at 18th St',
    description: 'Silver sedan with no plates has been abandoned here for 3 weeks.',
    authorName: 'City 311 Open Data',
  }
];

async function seedDatabase() {
  console.log('Authenticating...');
  try {
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, 'seed_data@civic.app', 'CivicSeed123!');
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        userCredential = await signInWithEmailAndPassword(auth, 'seed_data@civic.app', 'CivicSeed123!');
      } else {
        throw e;
      }
    }
    const uid = userCredential.user.uid;
    console.log(`Authenticated with UID: ${uid}`);

    console.log('Seeding 311 Data...');
    const issuesRef = collection(db, 'issues');
    
    let count = 0;
    for (const data of MOCK_ISSUES) {
      const issue = {
        ...data,
        latitude: BASE_LAT + randomOffset(),
        longitude: BASE_LNG + randomOffset(),
        authorId: uid, 
        createdAt: new Date().toISOString(),
        voters: [],
        votes: 0,
        solvers: [],
        commentsCount: 0,
        photo: null 
      };

      await addDoc(issuesRef, issue);
      console.log(`Seeded: ${issue.title}`);
      count++;
    }

    console.log(`\nSuccessfully seeded ${count} issues to Firestore.`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
