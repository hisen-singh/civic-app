import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, deleteUser } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCWFEouXZQHNYFZPCeqBE6q3VpokIWnJ4A",
  authDomain: "civic-d0574.firebaseapp.com",
  projectId: "civic-d0574",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const email = "test_bot_" + Date.now() + "@civic.app";
const password = "Password123!";

async function run() {
  try {
    console.log("Creating user...");
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    console.log("User created! UID:", userCred.user.uid);

    console.log("Signing in...");
    await signInWithEmailAndPassword(auth, email, password);
    console.log("Sign in successful!");

    console.log("Cleaning up...");
    await deleteUser(auth.currentUser);
    console.log("Done!");
    process.exit(0);
  } catch (error) {
    console.error("Firebase Error:", error.code, error.message);
    process.exit(1);
  }
}

run();
