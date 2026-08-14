const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

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
    const tokenDoc = await db
      .collection('users')
      .doc(userId)
      .collection('private')
      .doc('data')
      .get();
    return tokenDoc.exists ? tokenDoc.data().fcmToken || null : null;
  } catch (_) {
    return null;
  }
}

/** Send a push notification + persist to Firestore */
async function createNotification({ userId, title, body, type, issueId }) {
  // 1. Persist to Firestore (in-app notifications)
  await db.collection('notifications').add({
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
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: expoPushToken,
          sound: 'default',
          title: title,
          body: body,
          data: { type, issueId: issueId || '' },
        }),
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
  .document('issues/{issueId}')
  .onCreate(async (snapshot, context) => {
    const issue = snapshot.data();
    const issueId = context.params.issueId;

    if (!issue.latitude || !issue.longitude) {
      console.info(`Issue ${issueId} has no coordinates – skipping.`);
      return null;
    }

    try {
      const areasSnap = await db
        .collection('watchAreas')
        .where('active', '==', true)
        .get();

      const jobs = [];
      areasSnap.forEach((doc) => {
        const area = doc.data();
        if (area.userId === issue.authorId) return;
        const dist = haversine(
          issue.latitude,
          issue.longitude,
          area.latitude,
          area.longitude,
        );
        if (dist <= area.radius) {
          jobs.push(
            createNotification({
              userId: area.userId,
              title: '📍 New Issue in your Watch Area',
              body: `${issue.category} reported nearby: ${issue.title}`,
              type: 'WATCH_AREA_ALERT',
              issueId,
            }),
          );
        }
      });

      await Promise.all(jobs);
      console.info(
        `[onIssueCreated] ${jobs.length} notifications sent for issue ${issueId}.`,
      );
      return null;
    } catch (err) {
      console.error('[onIssueCreated] Error:', err);
      return null;
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// 2. ON ISSUE STATUS UPDATED
//    • When status → "Solved", notify the reporter + all solvers
//    • When status → "In Progress", notify the reporter that someone joined
// ─────────────────────────────────────────────────────────────────────────────
exports.onIssueUpdated = functions.firestore
  .document('issues/{issueId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const issueId = context.params.issueId;

    // Status change: → Solved
    if (before.status !== 'Solved' && after.status === 'Solved') {
      const jobs = [];

      // Notify reporter
      if (after.authorId && after.authorId !== 'anonymous') {
        jobs.push(
          createNotification({
            userId: after.authorId,
            title: '✅ Your Issue Was Resolved!',
            body: `"${after.title}" has been marked as solved by the community.`,
            type: 'ISSUE_SOLVED',
            issueId,
          }),
        );
      }

      // Notify all solvers
      for (const solverId of after.solvers || []) {
        if (solverId === after.authorId) continue;
        jobs.push(
          createNotification({
            userId: solverId,
            title: '🏆 Issue Resolved!',
            body: `An issue you helped with ("${after.title}") has been marked solved!`,
            type: 'ISSUE_SOLVED',
            issueId,
          }),
        );
      }

      await Promise.all(jobs);
      console.info(
        `[onIssueUpdated] Sent ${jobs.length} SOLVED notifications for ${issueId}.`,
      );
    }

    // A new solver joined
    const newSolvers = (after.solvers || []).filter(
      (id) => !(before.solvers || []).includes(id),
    );
    if (
      newSolvers.length > 0 &&
      after.authorId &&
      after.authorId !== 'anonymous'
    ) {
      await createNotification({
        userId: after.authorId,
        title: '🤝 Someone is helping!',
        body: `A community member just joined your issue: "${after.title}"`,
        type: 'SOLVER_JOINED',
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
  .document('issues/{issueId}/comments/{commentId}')
  .onCreate(async (snap, context) => {
    const latestComment = snap.data();
    const issueId = context.params.issueId;

    // Fetch the parent issue to get the authorId and title
    const issueDoc = await db.collection('issues').doc(issueId).get();
    if (!issueDoc.exists) return null;
    const issue = issueDoc.data();

    if (
      latestComment &&
      issue.authorId &&
      latestComment.authorId !== issue.authorId &&
      issue.authorId !== 'anonymous'
    ) {
      await createNotification({
        userId: issue.authorId,
        title: '💬 New Comment',
        body: `${latestComment.authorName || 'Someone'} commented on "${issue.title}"`,
        type: 'NEW_COMMENT',
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
  .schedule('0 0 * * *')
  .timeZone('Asia/Kolkata')
  .onRun(async () => {
    console.info('[recalculateTrustScores] Starting...');

    const issuesSnap = await db.collection('issues').get();
    const userScores = {};

    issuesSnap.forEach((doc) => {
      const issue = doc.data();
      const reporter = issue.authorId;
      if (reporter && reporter !== 'anonymous') {
        if (!userScores[reporter])
          userScores[reporter] = { reported: 0, solved: 0, score: 0 };
        userScores[reporter].reported += 1;
        userScores[reporter].score += 50;
      }
      (issue.solvers || []).forEach((solverId) => {
        if (!userScores[solverId])
          userScores[solverId] = { reported: 0, solved: 0, score: 0 };
        userScores[solverId].score += 30;
        if (issue.status === 'Solved') {
          userScores[solverId].solved += 1;
          userScores[solverId].score += 100;
        }
      });
    });

    // Sort and add rank
    const sorted = Object.entries(userScores).sort(
      ([, a], [, b]) => b.score - a.score,
    );

    // Firestore batches can hold up to 500 operations
    const chunks = [];
    for (let i = 0; i < sorted.length; i += 500) {
      chunks.push(sorted.slice(i, i + 500));
    }

    for (const chunk of chunks) {
      const batch = db.batch();
      chunk.forEach(([uid, data]) => {
        const index = sorted.findIndex(([id]) => id === uid);
        const ref = db.collection('users').doc(uid);
        batch.set(
          ref,
          {
            trustScore: data.score,
            reported: data.reported,
            solved: data.solved,
            rank: index + 1,
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );
        batch.set(
          ref.collection('publicProfile').doc('profile'),
          {
            trustScore: data.score,
            rank: index + 1,
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );
      });
      await batch.commit();
    }
    console.info(`[recalculateTrustScores] Updated ${sorted.length} users.`);
    return null;
  });

// ─────────────────────────────────────────────────────────────────────────────
// 5. ARCHIVE OLD SOLVED ISSUES (Scheduled – runs weekly on Sunday)
//    • Moves issues solved more than 30 days ago to 'archivedIssues'
// ─────────────────────────────────────────────────────────────────────────────
exports.archiveOldIssues = functions.pubsub
  .schedule('0 0 * * 0') // Every Sunday midnight
  .timeZone('Asia/Kolkata')
  .onRun(async () => {
    console.info('[archiveOldIssues] Starting...');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoff = thirtyDaysAgo.toISOString();

    const snap = await db
      .collection('issues')
      .where('status', '==', 'Solved')
      .where('statusUpdatedAt', '<', cutoff)
      .get();

    const batch = db.batch();
    snap.forEach((doc) => {
      const archiveRef = db.collection('archivedIssues').doc(doc.id);
      batch.set(archiveRef, {
        ...doc.data(),
        archivedAt: new Date().toISOString(),
      });
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.info(`[archiveOldIssues] Archived ${snap.size} issues.`);
    return null;
  });

// ─────────────────────────────────────────────────────────────────────────────
// 6. CLEANUP OLD READ NOTIFICATIONS (Scheduled – runs daily)
//    • Deletes read notifications older than 7 days
// ─────────────────────────────────────────────────────────────────────────────
exports.cleanupNotifications = functions.pubsub
  .schedule('0 1 * * *') // 1am every day
  .timeZone('Asia/Kolkata')
  .onRun(async () => {
    console.info('[cleanupNotifications] Starting...');

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoff = sevenDaysAgo.toISOString();

    const snap = await db
      .collection('notifications')
      .where('read', '==', true)
      .where('createdAt', '<', cutoff)
      .get();

    const batch = db.batch();
    snap.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    console.info(
      `[cleanupNotifications] Deleted ${snap.size} old notifications.`,
    );
    return null;
  });

// ─────────────────────────────────────────────────────────────────────────────
// 7. SAVE / UPDATE FCM TOKEN (HTTPS callable)
//    • Called from the app when user logs in or token refreshes
// ─────────────────────────────────────────────────────────────────────────────
exports.saveFcmToken = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be signed in.',
    );
  }
  const { token } = data;
  if (!token || typeof token !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'A valid FCM token is required.',
    );
  }

  await db
    .collection('users')
    .doc(context.auth.uid)
    .collection('private')
    .doc('data')
    .set(
      { fcmToken: token, fcmUpdatedAt: new Date().toISOString() },
      { merge: true },
    );

  return { success: true };
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. GET LEADERBOARD (HTTPS callable)
//    • Returns top 20 users ranked by trust score
// ─────────────────────────────────────────────────────────────────────────────
exports.getLeaderboard = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be signed in.',
    );
  }

  const snap = await db
    .collection('users')
    .orderBy('trustScore', 'desc')
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
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be signed in.',
    );
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
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be signed in.',
    );
  }
  if (context.auth.token.admin !== true) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can grant admin role.',
    );
  }

  const { targetUid } = data;
  if (!targetUid || typeof targetUid !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'A valid targetUid is required.',
    );
  }

  await admin.auth().setCustomUserClaims(targetUid, { admin: true });

  // Also mark in Firestore for easy querying
  await db
    .collection('users')
    .doc(targetUid)
    .set(
      { isAdmin: true, adminGrantedAt: new Date().toISOString() },
      { merge: true },
    );

  console.info(
    `[setAdminRole] Admin role granted to ${targetUid} by ${context.auth.uid}`,
  );
  return { success: true };
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. UPDATE ISSUE STATUS (Admin-only HTTPS callable)
//     • Allows admins to change any issue's status
// ─────────────────────────────────────────────────────────────────────────────
exports.adminUpdateIssueStatus = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Must be signed in.',
      );
    }
    if (context.auth.token.admin !== true) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only admins can update issue status.',
      );
    }

    const { issueId, newStatus } = data;
    if (!issueId || !newStatus) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'issueId and newStatus are required.',
      );
    }

    const validStatuses = ['Open', 'In Progress', 'Solved', 'Failed'];
    if (!validStatuses.includes(newStatus)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Status must be one of: ${validStatuses.join(', ')}`,
      );
    }

    await db.collection('issues').doc(issueId).update({ status: newStatus });
    console.info(
      `[adminUpdateIssueStatus] Issue ${issueId} → ${newStatus} by admin ${context.auth.uid}`,
    );
    return { success: true };
  },
);

exports.logAppCrash = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  try {
    const errorData = req.body;
    console.error(
      '[logAppCrash] CLIENT CRASH DETECTED:',
      JSON.stringify(errorData, null, 2),
    );
    await db.collection('client_crashes').add({
      ...errorData,
      timestamp: new Date().toISOString(),
    });
    res.status(200).send({ success: true });
  } catch (err) {
    console.error('Failed to log crash:', err);
    res.status(500).send({ error: err.message });
  }
});

exports.getClientCrashes = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  try {
    const snapshot = await db
      .collection('client_crashes')
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();
    const crashes = [];
    snapshot.forEach((doc) => {
      crashes.push({ id: doc.id, ...doc.data() });
    });
    res.status(200).send({ crashes });
  } catch (err) {
    console.error('Failed to get crashes:', err);
    res.status(500).send({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 14. CALCULATE TRUST SCORE (on issue created)
// ─────────────────────────────────────────────────────────────────────────────
exports.calculateTrustScore = functions.firestore
  .document('issues/{issueId}')
  .onCreate(async (snap, context) => {
    const newIssue = snap.data();
    const authorId = newIssue.authorId || newIssue.userId;

    if (!authorId) {
      console.info(
        '[WARNING] No authorId found on issue. Skipping trust score calculation.',
      );
      return null;
    }

    const userRef = db.collection('users').doc(authorId);

    try {
      await userRef.set(
        {
          trustScore: admin.firestore.FieldValue.increment(10),
        },
        { merge: true },
      );
      console.info(`[SUCCESS] Trust score incremented for user: ${authorId}`);
      return null;
    } catch (error) {
      console.error('[ERROR] Failed to update trust score:', error);
      return null;
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// 15. ON ISSUE REPORTED
//     • When a user reports an issue, count reports
//     • If reports >= REPORT_THRESHOLD, auto-hide and add to admin queue
// ─────────────────────────────────────────────────────────────────────────────
const REPORT_THRESHOLD = 3;

exports.onIssueReported = functions.firestore
  .document('issues/{issueId}/reports/{reportId}')
  .onCreate(async (snap, context) => {
    const { issueId, reportId } = context.params;
    const reportData = snap.data();

    try {
      // Count total reports on this issue
      const reportsSnap = await db
        .collection('issues')
        .doc(issueId)
        .collection('reports')
        .get();
      const reportCount = reportsSnap.size;

      console.info(
        `[onIssueReported] Issue ${issueId} now has ${reportCount} report(s).`,
      );

      if (reportCount >= REPORT_THRESHOLD) {
        // Fetch the issue data
        const issueDoc = await db.collection('issues').doc(issueId).get();
        if (!issueDoc.exists) return null;
        const issueData = issueDoc.data();

        // Collect all report reasons
        const reasons = [];
        reportsSnap.forEach((doc) => {
          reasons.push({
            reporterId: doc.data().reporterId,
            reason: doc.data().reason,
            createdAt: doc.data().createdAt,
          });
        });

        const batch = db.batch();

        // 1. Hide the issue
        batch.update(db.collection('issues').doc(issueId), { hidden: true });

        // 2. Add to reportedContent queue for admin review
        batch.set(db.collection('reportedContent').doc(issueId), {
          type: 'issue',
          issueId,
          title: issueData.title,
          description: issueData.description,
          category: issueData.category,
          authorId: issueData.authorId,
          authorName: issueData.authorName,
          reportCount,
          reports: reasons,
          hiddenAt: new Date().toISOString(),
          status: 'pending', // pending | dismissed | removed
        });

        await batch.commit();
        console.info(
          `[onIssueReported] Issue ${issueId} auto-hidden (${reportCount} reports) and queued for admin review.`,
        );
      }

      return null;
    } catch (err) {
      console.error('[onIssueReported] Error:', err);
      return null;
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// 16. ON COMMENT REPORTED
//     • Same auto-hide logic for reported comments
// ─────────────────────────────────────────────────────────────────────────────
exports.onCommentReported = functions.firestore
  .document('issues/{issueId}/comments/{commentId}/reports/{reportId}')
  .onCreate(async (snap, context) => {
    const { issueId, commentId } = context.params;

    try {
      const reportsSnap = await db
        .collection('issues')
        .doc(issueId)
        .collection('comments')
        .doc(commentId)
        .collection('reports')
        .get();
      const reportCount = reportsSnap.size;

      console.info(
        `[onCommentReported] Comment ${commentId} on issue ${issueId} now has ${reportCount} report(s).`,
      );

      if (reportCount >= REPORT_THRESHOLD) {
        const commentDoc = await db
          .collection('issues')
          .doc(issueId)
          .collection('comments')
          .doc(commentId)
          .get();
        if (!commentDoc.exists) return null;
        const commentData = commentDoc.data();

        const reasons = [];
        reportsSnap.forEach((doc) => {
          reasons.push({
            reporterId: doc.data().reporterId,
            reason: doc.data().reason,
            createdAt: doc.data().createdAt,
          });
        });

        const batch = db.batch();

        // 1. Mark comment as hidden
        batch.update(
          db
            .collection('issues')
            .doc(issueId)
            .collection('comments')
            .doc(commentId),
          { hidden: true },
        );

        // 2. Add to admin queue
        const queueId = `${issueId}_${commentId}`;
        batch.set(db.collection('reportedContent').doc(queueId), {
          type: 'comment',
          issueId,
          commentId,
          text: commentData.text,
          authorId: commentData.authorId,
          authorName: commentData.authorName,
          reportCount,
          reports: reasons,
          hiddenAt: new Date().toISOString(),
          status: 'pending',
        });

        await batch.commit();
        console.info(
          `[onCommentReported] Comment ${commentId} auto-hidden and queued.`,
        );
      }

      return null;
    } catch (err) {
      console.error('[onCommentReported] Error:', err);
      return null;
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// 17. RATE LIMIT – TRACK ISSUE CREATION
//     • On each new issue, increment the author's hourly counter
//     • If over limit, hide the issue and notify the user
// ─────────────────────────────────────────────────────────────────────────────
const ISSUES_PER_HOUR = 5;
const COMMENTS_PER_HOUR = 20;

exports.trackIssueRate = functions.firestore
  .document('issues/{issueId}')
  .onCreate(async (snap, context) => {
    const issue = snap.data();
    const authorId = issue.authorId;
    if (!authorId || authorId === 'anonymous') return null;

    const rateLimitRef = db.collection('userRateLimits').doc(authorId);

    try {
      const rateLimitDoc = await rateLimitRef.get();
      const currentCount = rateLimitDoc.exists
        ? rateLimitDoc.data().issuesThisHour || 0
        : 0;

      if (currentCount >= ISSUES_PER_HOUR) {
        // Over the limit — hide the issue and notify user
        console.warn(
          `[trackIssueRate] User ${authorId} exceeded rate limit (${currentCount}/${ISSUES_PER_HOUR}). Hiding issue ${context.params.issueId}.`,
        );

        await db
          .collection('issues')
          .doc(context.params.issueId)
          .update({ hidden: true, rateLimited: true });

        await createNotification({
          userId: authorId,
          title: '⏳ Posting Limit Reached',
          body: `You've reached the limit of ${ISSUES_PER_HOUR} reports per hour. Please wait before posting again.`,
          type: 'RATE_LIMITED',
          issueId: context.params.issueId,
        });

        return null;
      }

      // Increment counter
      await rateLimitRef.set(
        {
          issuesThisHour: admin.firestore.FieldValue.increment(1),
          lastIssueAt: new Date().toISOString(),
        },
        { merge: true },
      );

      return null;
    } catch (err) {
      console.error('[trackIssueRate] Error:', err);
      return null;
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// 18. RATE LIMIT – TRACK COMMENT CREATION
// ─────────────────────────────────────────────────────────────────────────────
exports.trackCommentRate = functions.firestore
  .document('issues/{issueId}/comments/{commentId}')
  .onCreate(async (snap, context) => {
    const comment = snap.data();
    const authorId = comment.authorId;
    if (!authorId || authorId === 'anonymous') return null;

    const rateLimitRef = db.collection('userRateLimits').doc(authorId);

    try {
      const rateLimitDoc = await rateLimitRef.get();
      const currentCount = rateLimitDoc.exists
        ? rateLimitDoc.data().commentsThisHour || 0
        : 0;

      if (currentCount >= COMMENTS_PER_HOUR) {
        console.warn(
          `[trackCommentRate] User ${authorId} exceeded comment rate limit.`,
        );

        // Delete the comment that exceeded the limit
        await db
          .collection('issues')
          .doc(context.params.issueId)
          .collection('comments')
          .doc(context.params.commentId)
          .delete();

        await createNotification({
          userId: authorId,
          title: '⏳ Comment Limit Reached',
          body: `You've reached the limit of ${COMMENTS_PER_HOUR} comments per hour. Please wait before commenting again.`,
          type: 'RATE_LIMITED',
        });

        return null;
      }

      await rateLimitRef.set(
        {
          commentsThisHour: admin.firestore.FieldValue.increment(1),
          lastCommentAt: new Date().toISOString(),
        },
        { merge: true },
      );

      return null;
    } catch (err) {
      console.error('[trackCommentRate] Error:', err);
      return null;
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// 19. RESET RATE LIMITS (Scheduled – runs every hour)
//     • Clears all hourly counters in userRateLimits
// ─────────────────────────────────────────────────────────────────────────────
exports.resetRateLimits = functions.pubsub
  .schedule('0 * * * *') // top of every hour
  .timeZone('Asia/Kolkata')
  .onRun(async () => {
    console.info('[resetRateLimits] Starting hourly reset...');

    try {
      const snap = await db.collection('userRateLimits').get();

      if (snap.empty) {
        console.info('[resetRateLimits] No rate limit docs to reset.');
        return null;
      }

      // Batch delete / reset in chunks of 500
      const chunks = [];
      const docs = snap.docs;
      for (let i = 0; i < docs.length; i += 500) {
        chunks.push(docs.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        const batch = db.batch();
        chunk.forEach((doc) => {
          batch.set(doc.ref, {
            issuesThisHour: 0,
            commentsThisHour: 0,
            resetAt: new Date().toISOString(),
          });
        });
        await batch.commit();
      }

      console.info(
        `[resetRateLimits] Reset ${snap.size} user rate limit docs.`,
      );
      return null;
    } catch (err) {
      console.error('[resetRateLimits] Error:', err);
      return null;
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// 20. ADMIN RESOLVE REPORT (HTTPS callable)
//     • Admin can dismiss reports (unhide content) or remove content entirely
//     • Pass { contentId, action: "dismiss" | "remove" }
// ─────────────────────────────────────────────────────────────────────────────
exports.adminResolveReport = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be signed in.',
    );
  }
  if (context.auth.token.admin !== true) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can resolve reports.',
    );
  }

  const { contentId, action } = data;
  if (!contentId || !action) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'contentId and action are required.',
    );
  }
  if (!['dismiss', 'remove'].includes(action)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      "action must be 'dismiss' or 'remove'.",
    );
  }

  const reportDoc = await db.collection('reportedContent').doc(contentId).get();
  if (!reportDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Report not found.');
  }

  const report = reportDoc.data();
  const batch = db.batch();

  if (action === 'dismiss') {
    // Unhide the content
    if (report.type === 'issue') {
      batch.update(db.collection('issues').doc(report.issueId), {
        hidden: false,
      });
    } else if (report.type === 'comment') {
      batch.update(
        db
          .collection('issues')
          .doc(report.issueId)
          .collection('comments')
          .doc(report.commentId),
        { hidden: false },
      );
    }

    // Mark report as dismissed
    batch.update(db.collection('reportedContent').doc(contentId), {
      status: 'dismissed',
      resolvedBy: context.auth.uid,
      resolvedAt: new Date().toISOString(),
    });
  } else if (action === 'remove') {
    // Delete the content permanently
    if (report.type === 'issue') {
      batch.delete(db.collection('issues').doc(report.issueId));
    } else if (report.type === 'comment') {
      batch.delete(
        db
          .collection('issues')
          .doc(report.issueId)
          .collection('comments')
          .doc(report.commentId),
      );
    }

    // Mark report as removed
    batch.update(db.collection('reportedContent').doc(contentId), {
      status: 'removed',
      resolvedBy: context.auth.uid,
      resolvedAt: new Date().toISOString(),
    });
  }

  await batch.commit();
  console.info(
    `[adminResolveReport] Report ${contentId} ${action}ed by admin ${context.auth.uid}`,
  );
  return { success: true };
});
