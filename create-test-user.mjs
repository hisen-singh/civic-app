import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCWFEouXZQHNYFZPCeqBE6q3VpokIWnJ4A",
  authDomain: "civic-d0574.firebaseapp.com",
  projectId: "civic-d0574",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const email = "test@civichero.app";
const password = "Test123456";

async function run() {
  try {
    console.log("Creating test user for Maestro E2E...");
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    console.log("User created! UID:", userCred.user.uid);
    process.exit(0);
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
        console.log("Test user already exists!");
        process.exit(0);
    }
    console.error("Firebase Error:", error.code, error.message);
    process.exit(1);
  }
}

run();
