const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Haversine formula – returns distance in metres */
function haversine(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371e3;
    const f1 = (lat1 * Math.PI) / 180;
    const f2 = (lat2 * Math.PI) / 180;
    const df = ((lat2 - lat1) * Math.PI) / 180;
    const dl = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(df / 2) * Math.sin(df / 2) +
        Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Lookup a user's stored FCM token */
async function getFcmToken(userId) {
    try {
        const userDoc = await db.collection("users").doc(userId).get();
        return userDoc.exists ? userDoc.data().fcmToken || null : null;
    } catch (_) {
        return null;
    }
}

/** Send a push notification + persist to Firestore */
async function createNotification({ userId, title, body, type, issueId }) {
    // 1. Persist to Firestore (in-app notifications)
    await db.collection("notifications").add({
        userId,
        title,
        body,
        type,
        issueId: issueId || null,
        read: false,
        createdAt: new Date().toISOString(),
    });

    // 2. Send push notification if user has FCM token
    const fcmToken = await getFcmToken(userId);
    if (fcmToken) {
        await messaging
            .send({
                token: fcmToken,
                notification: { title, body },
                data: { type, issueId: issueId || "" },
                android: { priority: "high" },
                apns: { payload: { aps: { sound: "default" } } },
            })
            .catch((err) =>
                console.warn(`FCM send failed for user ${userId}:`, err.message)
            );
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. ON ISSUE CREATED
//    • Notifies users whose Watch Areas contain the new issue
// ─────────────────────────────────────────────────────────────────────────────
exports.onIssueCreated = functions.firestore
    .document("issues/{issueId}")
    .onCreate(async (snapshot, context) => {
        const issue = snapshot.data();
        const issueId = context.params.issueId;

        if (!issue.latitude || !issue.longitude) {
            console.log(`Issue ${issueId} has no coordinates – skipping.`);
            return null;
        }

        try {
            const areasSnap = await db
                .collection("watchAreas")
                .where("active", "==", true)
                .get();

            const jobs = [];
            areasSnap.forEach((doc) => {
                const area = doc.data();
                if (area.userId === issue.authorId) return;
                const dist = haversine(
                    issue.latitude,
                    issue.longitude,
                    area.latitude,
                    area.longitude
                );
                if (dist <= area.radius) {
                    jobs.push(
                        createNotification({
                            userId: area.userId,
                            title: "📍 New Issue in your Watch Area",
                            body: `${issue.category} reported nearby: ${issue.title}`,
                            type: "WATCH_AREA_ALERT",
                            issueId,
                        })
                    );
                }
            });

            await Promise.all(jobs);
            console.log(`[onIssueCreated] ${jobs.length} notifications sent for issue ${issueId}.`);
            return null;
        } catch (err) {
            console.error("[onIssueCreated] Error:", err);
            return null;
        }
    });

// ─────────────────────────────────────────────────────────────────────────────
// 2. ON ISSUE STATUS UPDATED
//    • When status → "Solved", notify the reporter + all solvers
//    • When status → "In Progress", notify the reporter that someone joined
// ─────────────────────────────────────────────────────────────────────────────
exports.onIssueUpdated = functions.firestore
    .document("issues/{issueId}")
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after = change.after.data();
        const issueId = context.params.issueId;

        // Status change: → Solved
        if (before.status !== "Solved" && after.status === "Solved") {
            const jobs = [];

            // Notify reporter
            if (after.authorId && after.authorId !== "anonymous") {
                jobs.push(
                    createNotification({
                        userId: after.authorId,
                        title: "✅ Your Issue Was Resolved!",
                        body: `"${after.title}" has been marked as solved by the community.`,
                        type: "ISSUE_SOLVED",
                        issueId,
                    })
                );
            }

            // Notify all solvers
            for (const solverId of after.solvers || []) {
                if (solverId === after.authorId) continue;
                jobs.push(
                    createNotification({
                        userId: solverId,
                        title: "🏆 Issue Resolved!",
                        body: `An issue you helped with ("${after.title}") has been marked solved!`,
                        type: "ISSUE_SOLVED",
                        issueId,
                    })
                );
            }

            await Promise.all(jobs);
            console.log(`[onIssueUpdated] Sent ${jobs.length} SOLVED notifications for ${issueId}.`);
        }

        // A new solver joined
        const newSolvers = (after.solvers || []).filter(
            (id) => !(before.solvers || []).includes(id)
        );
        if (newSolvers.length > 0 && after.authorId && after.authorId !== "anonymous") {
            await createNotification({
                userId: after.authorId,
                title: "🤝 Someone is helping!",
                body: `A community member just joined your issue: "${after.title}"`,
                type: "SOLVER_JOINED",
                issueId,
            });
        }

        return null;
    });

// ─────────────────────────────────────────────────────────────────────────────
// 3. ON COMMENT ADDED
//    • Notify the issue author when someone comments (unless it's themselves)
// ─────────────────────────────────────────────────────────────────────────────
exports.onCommentAdded = functions.firestore
    .document("issues/{issueId}")
    .onUpdate(async (change, context) => {
        const before = change.before.data();
        const after = change.after.data();
        const issueId = context.params.issueId;

        const prevCount = (before.comments || []).length;
        const nextCount = (after.comments || []).length;

        if (nextCount <= prevCount) return null; // no new comment

        const latestComment = after.comments[nextCount - 1];

        if (
            latestComment &&
            after.authorId &&
            latestComment.authorId !== after.authorId &&
            after.authorId !== "anonymous"
        ) {
            await createNotification({
                userId: after.authorId,
                title: "💬 New Comment",
                body: `${latestComment.authorName || "Someone"} commented on "${after.title}"`,
                type: "NEW_COMMENT",
                issueId,
            });
        }

        return null;
    });

// ─────────────────────────────────────────────────────────────────────────────
// 4. RECALCULATE USER TRUST SCORES (Scheduled – runs daily at midnight IST)
//    • Computes each user's trust score from Firestore data
//    • Writes the result back to the 'users' collection
// ─────────────────────────────────────────────────────────────────────────────
exports.recalculateTrustScores = functions.pubsub
    .schedule("0 0 * * *")
    .timeZone("Asia/Kolkata")
    .onRun(async () => {
        console.log("[recalculateTrustScores] Starting...");

        const issuesSnap = await db.collection("issues").get();
        const userScores = {};

        issuesSnap.forEach((doc) => {
            const issue = doc.data();
            const reporter = issue.authorId;
            if (reporter && reporter !== "anonymous") {
                if (!userScores[reporter]) userScores[reporter] = { reported: 0, solved: 0, score: 0 };
                userScores[reporter].reported += 1;
                userScores[reporter].score += 50;
            }
            (issue.solvers || []).forEach((solverId) => {
                if (!userScores[solverId]) userScores[solverId] = { reported: 0, solved: 0, score: 0 };
                userScores[solverId].score += 30;
                if (issue.status === "Solved") {
                    userScores[solverId].solved += 1;
                    userScores[solverId].score += 100;
                }
            });
        });

        // Sort and add rank
        const sorted = Object.entries(userScores).sort(([, a], [, b]) => b.score - a.score);
        const batch = db.batch();
        sorted.forEach(([uid, data], index) => {
            const ref = db.collection("users").doc(uid);
            batch.set(ref, {
                trustScore: data.score,
                reported: data.reported,
                solved: data.solved,
                rank: index + 1,
                updatedAt: new Date().toISOString(),
            }, { merge: true });
        });

        await batch.commit();
        console.log(`[recalculateTrustScores] Updated ${sorted.length} users.`);
        return null;
    });

// ─────────────────────────────────────────────────────────────────────────────
// 5. ARCHIVE OLD SOLVED ISSUES (Scheduled – runs weekly on Sunday)
//    • Moves issues solved more than 30 days ago to 'archivedIssues'
// ─────────────────────────────────────────────────────────────────────────────
exports.archiveOldIssues = functions.pubsub
    .schedule("0 0 * * 0") // Every Sunday midnight
    .timeZone("Asia/Kolkata")
    .onRun(async () => {
        console.log("[archiveOldIssues] Starting...");

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoff = thirtyDaysAgo.toISOString();

        const snap = await db
            .collection("issues")
            .where("status", "==", "Solved")
            .where("createdAt", "<", cutoff)
            .get();

        const batch = db.batch();
        snap.forEach((doc) => {
            const archiveRef = db.collection("archivedIssues").doc(doc.id);
            batch.set(archiveRef, { ...doc.data(), archivedAt: new Date().toISOString() });
            batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`[archiveOldIssues] Archived ${snap.size} issues.`);
        return null;
    });

// ─────────────────────────────────────────────────────────────────────────────
// 6. CLEANUP OLD READ NOTIFICATIONS (Scheduled – runs daily)
//    • Deletes read notifications older than 7 days
// ─────────────────────────────────────────────────────────────────────────────
exports.cleanupNotifications = functions.pubsub
    .schedule("0 1 * * *") // 1am every day
    .timeZone("Asia/Kolkata")
    .onRun(async () => {
        console.log("[cleanupNotifications] Starting...");

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const cutoff = sevenDaysAgo.toISOString();

        const snap = await db
            .collection("notifications")
            .where("read", "==", true)
            .where("createdAt", "<", cutoff)
            .get();

        const batch = db.batch();
        snap.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();

        console.log(`[cleanupNotifications] Deleted ${snap.size} old notifications.`);
        return null;
    });

// ─────────────────────────────────────────────────────────────────────────────
// 7. SAVE / UPDATE FCM TOKEN (HTTPS callable)
//    • Called from the app when user logs in or token refreshes
// ─────────────────────────────────────────────────────────────────────────────
exports.saveFcmToken = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be signed in.");
    }
    const { token } = data;
    if (!token || typeof token !== "string") {
        throw new functions.https.HttpsError("invalid-argument", "A valid FCM token is required.");
    }

    await db.collection("users").doc(context.auth.uid).set(
        { fcmToken: token, fcmUpdatedAt: new Date().toISOString() },
        { merge: true }
    );

    return { success: true };
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. GET LEADERBOARD (HTTPS callable)
//    • Returns top 20 users ranked by trust score
// ─────────────────────────────────────────────────────────────────────────────
exports.getLeaderboard = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be signed in.");
    }

    const snap = await db
        .collection("users")
        .orderBy("trustScore", "desc")
        .limit(20)
        .get();

    const leaderboard = snap.docs.map((doc, i) => ({
        id: doc.id,
        rank: i + 1,
        ...doc.data(),
    }));

    return { leaderboard };
});
