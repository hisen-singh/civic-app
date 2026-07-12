const admin = require("firebase-admin");

// Initialize without explicit credentials - if this runs in an environment
// with GOOGLE_APPLICATION_CREDENTIALS or Firebase CLI auth, it might work.
try {
  admin.initializeApp({
    projectId: "civic-d0574",
  });
} catch (e) {
  console.log("Initialize error:", e.message);
}

const uid = "80F9ythfWSPNDsmf2FQGoCVk3hZ2";

async function grantAdmin() {
  try {
    console.log(`Granting admin to ${uid}...`);
    await admin.auth().setCustomUserClaims(uid, { admin: true });

    // Update Firestore so the UI knows
    const db = admin.firestore();
    await db
      .collection("users")
      .doc(uid)
      .set(
        { isAdmin: true, adminGrantedAt: new Date().toISOString() },
        { merge: true },
      );
    console.log("Successfully granted admin role!");
    process.exit(0);
  } catch (error) {
    console.error("Error granting admin:", error);
    process.exit(1);
  }
}

grantAdmin();
