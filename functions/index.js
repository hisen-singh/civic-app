const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

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
        const tokenDoc = await db.collection("users").doc(userId).collection("private").doc("data").get();
        return tokenDoc.exists ? tokenDoc.data().fcmToken || null : null;
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

    // 2. Send push notification if user has Expo Push token (stored in fcmToken field)
    const expoPushToken = await getFcmToken(userId);
    if (expoPushToken) {
        try {
            const response = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Accept-encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: expoPushToken,
                    sound: 'default',
                    title: title,
                    body: body,
                    data: { type, issueId: issueId || "" },
                })
            });
            const receipt = await response.json();
            if (receipt.errors) {
                console.warn(`Expo push failed for user ${userId}:`, receipt.errors);
            }
        } catch (err) {
            console.warn(`Expo push fetch failed for user ${userId}:`, err.message);
        }
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
    .document("issues/{issueId}/comments/{commentId}")
    .onCreate(async (snap, context) => {
        const latestComment = snap.data();
        const issueId = context.params.issueId;

        // Fetch the parent issue to get the authorId and title
        const issueDoc = await db.collection("issues").doc(issueId).get();
        if (!issueDoc.exists) return null;
        const issue = issueDoc.data();

        if (
            latestComment &&
            issue.authorId &&
            latestComment.authorId !== issue.authorId &&
            issue.authorId !== "anonymous"
        ) {
            await createNotification({
                userId: issue.authorId,
                title: "💬 New Comment",
                body: `${latestComment.authorName || "Someone"} commented on "${issue.title}"`,
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
        
        // Firestore batches can hold up to 500 operations
        const chunks = [];
        for (let i = 0; i < sorted.length; i += 500) {
            chunks.push(sorted.slice(i, i + 500));
        }

        for (const chunk of chunks) {
            const batch = db.batch();
            chunk.forEach(([uid, data]) => {
                const index = sorted.findIndex(([id]) => id === uid);
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
        }
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
            .where("statusUpdatedAt", "<", cutoff)
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

    await db.collection("users").doc(context.auth.uid).collection("private").doc("data").set(
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

// ─────────────────────────────────────────────────────────────────────────────
// 9. CHECK ADMIN STATUS (HTTPS callable)
//    • Returns whether the calling user has admin custom claim
// ─────────────────────────────────────────────────────────────────────────────
exports.checkAdminStatus = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be signed in.");
    }
    return { isAdmin: context.auth.token.admin === true };
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. SET ADMIN ROLE (HTTPS callable)
//     • Only existing admins can grant admin role to other users
//     • Pass { targetUid: "user-id-here" } to grant admin
// ─────────────────────────────────────────────────────────────────────────────
exports.setAdminRole = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be signed in.");
    }
    if (context.auth.token.admin !== true) {
        throw new functions.https.HttpsError("permission-denied", "Only admins can grant admin role.");
    }

    const { targetUid } = data;
    if (!targetUid || typeof targetUid !== "string") {
        throw new functions.https.HttpsError("invalid-argument", "A valid targetUid is required.");
    }

    await admin.auth().setCustomUserClaims(targetUid, { admin: true });
    
    // Also mark in Firestore for easy querying
    await db.collection("users").doc(targetUid).set(
        { isAdmin: true, adminGrantedAt: new Date().toISOString() },
        { merge: true }
    );

    console.log(`[setAdminRole] Admin role granted to ${targetUid} by ${context.auth.uid}`);
    return { success: true };
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. UPDATE ISSUE STATUS (Admin-only HTTPS callable)
//     • Allows admins to change any issue's status
// ─────────────────────────────────────────────────────────────────────────────
exports.adminUpdateIssueStatus = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be signed in.");
    }
    if (context.auth.token.admin !== true) {
        throw new functions.https.HttpsError("permission-denied", "Only admins can update issue status.");
    }

    const { issueId, newStatus } = data;
    if (!issueId || !newStatus) {
        throw new functions.https.HttpsError("invalid-argument", "issueId and newStatus are required.");
    }

    const validStatuses = ["Open", "In Progress", "Solved", "Failed"];
    if (!validStatuses.includes(newStatus)) {
        throw new functions.https.HttpsError("invalid-argument", `Status must be one of: ${validStatuses.join(", ")}`);
    }

    await db.collection("issues").doc(issueId).update({ status: newStatus });
    console.log(`[adminUpdateIssueStatus] Issue ${issueId} → ${newStatus} by admin ${context.auth.uid}`);
    return { success: true };
});
