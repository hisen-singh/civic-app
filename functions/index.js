const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const geofire = require("geofire-common");

admin.initializeApp();
const db = admin.firestore();

// ────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ────────────────────────────────────────────────────────────────────────────

const VIRAL_THRESHOLD = 50;
const TRUST_SCORE = {
  ISSUE_REPORTED: 10,
  ISSUE_SOLVED_AUTHOR: 25,
  JOINED_SOLVE: 15,
  SOLVE_HELPED: 50,
  FOLLOW_RECEIVED: 5,
  VIRAL_REACHED: 100,
  BADGE_EARNED: 20,
};

// ────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────

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

/** Chunk an array into batches of max 500 (Firestore limit) */
function chunkArray(arr, size = 500) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/** Lookup a user's stored FCM token */
async function getFcmToken(userId) {
  try {
    const tokenDoc = await db
      .collection("users")
      .doc(userId)
      .collection("private")
      .doc("data")
      .get();
    return tokenDoc.exists ? tokenDoc.data().fcmToken || null : null;
  } catch {
    return null;
  }
}

/** Send a push notification via Expo + persist to Firestore */
async function notifyUser(
  db,
  admin,
  { userId, title, body, type, issueId, actorId },
) {
  if (!userId) return;
  try {
    const notifRef = db.collection("notifications").doc();
    await notifRef.set({
      userId,
      title,
      body,
      type,
      issueId: issueId || null,
      actorId: actorId || null,
      read: false,
      createdAt: new Date().toISOString(),
    });

    const expoPushToken = await getFcmToken(userId);
    if (expoPushToken) {
      try {
        const response = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Accept-encoding": "gzip, deflate",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: expoPushToken,
            sound: "default",
            title,
            body,
            data: { type, issueId: issueId || "" },
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
  } catch (err) {
    console.error(`Failed to notify user ${userId}:`, err);
  }
}

/** Award impact points to a user */
async function awardImpactPoints(userId, points, reason) {
  if (!userId || points === 0) return;
  await db
    .collection("users")
    .doc(userId)
    .update({
      impactScore: admin.firestore.FieldValue.increment(points),
    });
  console.log(`[Impact] +${points} for ${reason} → user ${userId}`);
}

/** Log an audit entry */
async function auditLog(action, adminUid, targetUid = null, details = {}) {
  await db.collection("audit_logs").add({
    action,
    adminUid,
    targetUid,
    details,
    timestamp: new Date().toISOString(),
  });
}

/** Check and award a badge idempotently */
async function checkAndAwardBadge(userId, badgeId, tier = 0) {
  if (!userId || !badgeId) return false;
  const userBadgesRef = db
    .collection("userBadges")
    .doc(userId)
    .collection("badges");
  const existing = await userBadgesRef.doc(badgeId).get();
  if (existing.exists) return false; // already awarded

  const now = new Date().toISOString();
  await userBadgesRef.doc(badgeId).set({ awardedAt: now, tier });
  // Also add to user's badges array
  await db
    .collection("users")
    .doc(userId)
    .update({
      badges: admin.firestore.FieldValue.arrayUnion(badgeId),
    });
  // Award impact points for earning a badge
  await awardImpactPoints(
    userId,
    TRUST_SCORE.BADGE_EARNED,
    `Badge: ${badgeId}`,
  );
  console.log(`[Badge] Awarded ${badgeId} to user ${userId}`);
  return true;
}

/** Check all badge criteria for a user after an action */
async function checkAchievements(userId) {
  if (!userId) return;
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) return;

    const checks = [
      { badgeId: "first_report", condition: (u) => u.issueCount >= 1 },
      { badgeId: "problem_solver", condition: (u) => u.solveCount >= 1 },
      { badgeId: "community_hero", condition: (u) => u.solveCount >= 10 },
      { badgeId: "viral_voice", condition: (u) => u.viralIssues >= 1 },
      { badgeId: "follower", condition: (u) => u.followerCount >= 10 },
      { badgeId: "influencer", condition: (u) => u.followerCount >= 100 },
      { badgeId: "impact_maker", condition: (u) => u.impactScore >= 1000 },
      { badgeId: "helping_hand", condition: (u) => u.uniqueSolversHelped >= 5 },
      {
        badgeId: "transformation_agent",
        condition: (u) => u.transformations >= 5,
      },
    ];

    for (const check of checks) {
      await checkAndAwardBadge(userId, check.badgeId);
    }
  } catch (err) {
    console.error("[checkAchievements] Error:", err);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// RATE LIMITER
// ────────────────────────────────────────────────────────────────────────────

const RATE_BUCKET = new Map(); // uid -> { count, resetAt }
function enforceRateLimit(context, name, limit, windowMs) {
  if (!context?.auth?.uid) return; // unauthenticated throws elsewhere
  const now = Date.now();
  const key = `${name}:${context.auth.uid}`;
  const b = RATE_BUCKET.get(key);
  if (!b || now > b.resetAt) {
    // Periodic cleanup: prune expired entries when map grows too large
    if (RATE_BUCKET.size > 10000) {
      for (const [k, v] of RATE_BUCKET) {
        if (now > v.resetAt) RATE_BUCKET.delete(k);
      }
    }
    RATE_BUCKET.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  b.count += 1;
  if (b.count > limit) {
    throw new functions.https.HttpsError(
      "resource-exhausted",
      `Rate limit exceeded for ${name}`,
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 1. ON ISSUE CREATED
// ────────────────────────────────────────────────────────────────────────────
exports.onIssueCreated = functions.firestore
  .document("issues/{issueId}")
  .onCreate(async (snapshot, context) => {
    const issue = snapshot.data();
    const issueId = context.params.issueId;

    // Generate geohash for new issues and reverse geocode location
    if (issue.latitude && issue.longitude) {
      try {
        const hash = geofire.geohashForLocation([Number(issue.latitude), Number(issue.longitude)]);
        const updateData = { geohash: hash };
        
        // Reverse Geocode if no text location exists
        if (!issue.location || issue.location.trim() === "") {
          try {
             const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${issue.latitude}&lon=${issue.longitude}&zoom=14`;
             const res = await fetch(url, { headers: { 'User-Agent': 'CivicHeroApp/1.0' } });
             const data = await res.json();
             if (data && data.address) {
                const city = data.address.city || data.address.town || data.address.village || data.address.county || "";
                const state = data.address.state || "";
                updateData.location = city ? `${city}, ${state}`.trim().replace(/(^,)|(,$)/g, "") : data.display_name.split(",").slice(0,2).join(",");
             }
          } catch(e) {
             console.error("Reverse geocoding failed:", e);
          }
        }
        
        await snapshot.ref.update(updateData);
      } catch (err) {
        console.error("Failed to generate geohash or geocode:", err);
      }
    }

    // Award impact points to author
    if (issue.authorId && issue.authorId !== "anonymous") {
      await awardImpactPoints(
        issue.authorId,
        TRUST_SCORE.ISSUE_REPORTED,
        "Issue reported",
      );
      await db
        .collection("users")
        .doc(issue.authorId)
        .update({
          issueCount: admin.firestore.FieldValue.increment(1),
          issuesReported: admin.firestore.FieldValue.increment(1),
          reported: admin.firestore.FieldValue.increment(1),
        });
      await checkAchievements(issue.authorId);
    }

    // Notify Watch Area users
    if (issue.latitude && issue.longitude) {
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
          area.longitude,
        );
        if (dist <= area.radius) {
          jobs.push(
            notifyUser(db, admin, {
              userId: area.userId,
              title: "📍 New Issue in your Watch Area",
              body: `${issue.category} reported nearby: ${issue.title}`,
              type: "WATCH_AREA_ALERT",
              issueId,
              actorId: issue.authorId,
            }),
          );
        }
      });
      await Promise.all(jobs);
    }

    return null;
  });

// ────────────────────────────────────────────────────────────────────────────
// 2. ON ISSUE UPDATED
// ────────────────────────────────────────────────────────────────────────────
exports.onIssueUpdated = functions.firestore
  .document("issues/{issueId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const issueId = context.params.issueId;

    // Status → Solved
    if (before.status !== "Solved" && after.status === "Solved") {
      const jobs = [];

      if (after.authorId && after.authorId !== "anonymous") {
        await awardImpactPoints(
          after.authorId,
          TRUST_SCORE.ISSUE_SOLVED_AUTHOR,
          "Issue solved (author)",
        );
        await db
          .collection("users")
          .doc(after.authorId)
          .update({
            solveCount: admin.firestore.FieldValue.increment(1),
            solved: admin.firestore.FieldValue.increment(1),
          });
        jobs.push(
          notifyUser(db, admin, {
            userId: after.authorId,
            title: "✅ Your Issue Was Resolved!",
            body: `"${after.title}" has been marked as solved by the community.`,
            type: "ISSUE_SOLVED",
            issueId,
          }),
        );
      }

      // Notify solvers
      for (const solverId of after.solvers || []) {
        if (solverId === after.authorId) continue;
        await awardImpactPoints(
          solverId,
          TRUST_SCORE.SOLVE_HELPED,
          "Issue solved (helper)",
        );
        await db
          .collection("users")
          .doc(solverId)
          .update({
            solveCount: admin.firestore.FieldValue.increment(1),
            solved: admin.firestore.FieldValue.increment(1),
          });
        jobs.push(
          notifyUser(db, admin, {
            userId: solverId,
            title: "🏆 Issue Resolved!",
            body: `An issue you helped with ("${after.title}") has been marked solved!`,
            type: "ISSUE_SOLVED",
            issueId,
          }),
        );
      }

      // Check achievements for all involved
      await checkAchievements(after.authorId);
      for (const solverId of after.solvers || []) {
        await checkAchievements(solverId);
      }

      await Promise.all(jobs);
    }

    // New solver joined
    const newSolvers = (after.solvers || []).filter(
      (id) => !(before.solvers || []).includes(id),
    );
    if (
      newSolvers.length > 0 &&
      after.authorId &&
      after.authorId !== "anonymous"
    ) {
      await awardImpactPoints(
        after.authorId,
        TRUST_SCORE.JOINED_SOLVE,
        "Someone joined your issue",
      );
      await notifyUser(db, admin, {
        userId: after.authorId,
        title: "🤝 Someone is helping!",
        body: `A community member just joined your issue: "${after.title}"`,
        type: "SOLVER_JOINED",
        issueId,
        actorId: newSolvers[0],
      });

      for (const solverId of newSolvers) {
        // Skip author — they should not earn JOINED_SOLVE on their own issue
        if (solverId === after.authorId) continue;
        await awardImpactPoints(
          solverId,
          TRUST_SCORE.JOINED_SOLVE,
          "Joined solve",
        );
      }
    }

    return null;
  });

// ────────────────────────────────────────────────────────────────────────────
// 3. ON COMMENT ADDED
// ────────────────────────────────────────────────────────────────────────────
exports.onCommentAdded = functions.firestore
  .document("issues/{issueId}/comments/{commentId}")
  .onCreate(async (snap, context) => {
    const latestComment = snap.data();
    const issueId = context.params.issueId;

    const issueDoc = await db.collection("issues").doc(issueId).get();
    if (!issueDoc.exists) return null;
    const issue = issueDoc.data();

    if (
      latestComment &&
      issue.authorId &&
      latestComment.authorId !== issue.authorId &&
      issue.authorId !== "anonymous"
    ) {
      await notifyUser(db, admin, {
        userId: issue.authorId,
        title: "💬 New Comment",
        body: `${latestComment.authorName || "Someone"} commented on "${issue.title}"`,
        type: "NEW_COMMENT",
        issueId,
        actorId: latestComment.authorId,
      });
    }

    // Increment recentActivity for trending
    await db
      .collection("issues")
      .doc(issueId)
      .update({
        recentActivity: admin.firestore.FieldValue.increment(3),
      });

    return null;
  });

// ────────────────────────────────────────────────────────────────────────────
// 4. ON REACTION ADDED
// ────────────────────────────────────────────────────────────────────────────
exports.onReactionAdded = functions.firestore
  .document("issues/{issueId}/reactions/{userId}")
  .onCreate(async (snap, context) => {
    const { issueId, userId: reactorId } = context.params;

    const issueDoc = await db.collection("issues").doc(issueId).get();
    if (!issueDoc.exists) return null;
    const issue = issueDoc.data();

    // Increment recentActivity
    await db
      .collection("issues")
      .doc(issueId)
      .update({
        recentActivity: admin.firestore.FieldValue.increment(5),
      });

    // Award impact points to issue author
    if (
      issue.authorId &&
      issue.authorId !== "anonymous" &&
      reactorId !== issue.authorId
    ) {
      await awardImpactPoints(
        issue.authorId,
        2,
        "Reaction received on your issue",
      );
    }

    // Notify author of reaction (throttle — only notify on first few reactions)
    if (issue.authorId && reactorId !== issue.authorId) {
      const reactionCount = (issue.reactionsCount || 0) + 1;
      if (reactionCount <= 5 || reactionCount % 10 === 0) {
        await notifyUser(db, admin, {
          userId: issue.authorId,
          title: "🔥 Your issue is getting attention!",
          body: `${reactionCount} people reacted to "${issue.title}"`,
          type: "REACTION",
          issueId,
          actorId: reactorId,
        });
      }
    }

    return null;
  });

// ────────────────────────────────────────────────────────────────────────────
// 5. ON FOLLOW CREATED
// ────────────────────────────────────────────────────────────────────────────
exports.onFollowCreated = functions.firestore
  .document("users/{userId}/following/{targetId}")
  .onCreate(async (snap, context) => {
    const { userId: followerId, targetId } = context.params;

    // Increment counts on both users
    const batch = db.batch();
    batch.update(db.collection("users").doc(followerId), {
      followingCount: admin.firestore.FieldValue.increment(1),
    });
    batch.update(db.collection("users").doc(targetId), {
      followerCount: admin.firestore.FieldValue.increment(1),
    });
    await batch.commit();

    // Award impact points to the followed user
    await awardImpactPoints(
      targetId,
      TRUST_SCORE.FOLLOW_RECEIVED,
      "New follower",
    );

    // Notify the followed user
    const followerDoc = await db.collection("users").doc(followerId).get();
    const followerName = followerDoc.exists
      ? followerDoc.data().displayName
      : "Someone";
    await notifyUser(db, admin, {
      userId: targetId,
      title: "🎉 New Follower!",
      body: `${followerName} started following you`,
      type: "NEW_FOLLOWER",
      actorId: followerId,
    });

    // Check badge achievements
    await checkAchievements(targetId); // followerCount increased
    await checkAchievements(followerId); // followingCount (optional badge)

    // Fan-out: write to target's followers' feeds (for large accounts, use chunking)
    const targetFollowersSnap = await db
      .collection("users")
      .doc(targetId)
      .collection("followers")
      .get();
    const followerIds = targetFollowersSnap.docs.map((d) => d.id);

    if (followerIds.length > 0) {
      const feedItem = {
        type: "user_followed",
        actorId: followerId,
        actorName: followerName,
        targetId,
        createdAt: new Date().toISOString(),
      };
      const chunks = chunkArray(followerIds);
      for (const chunk of chunks) {
        const batch2 = db.batch();
        for (const fid of chunk) {
          const feedRef = db
            .collection("userFeed")
            .doc(fid)
            .collection("timeline")
            .doc();
          batch2.set(feedRef, feedItem);
        }
        await batch2.commit();
      }
    }

    return null;
  });

// ────────────────────────────────────────────────────────────────────────────
// 6. ON FOLLOW DELETED
// ────────────────────────────────────────────────────────────────────────────
exports.onFollowDeleted = functions.firestore
  .document("users/{userId}/following/{targetId}")
  .onDelete(async (snap, context) => {
    const { userId: followerId, targetId } = context.params;

    // Decrement counts
    const batch = db.batch();
    batch.update(db.collection("users").doc(followerId), {
      followingCount: admin.firestore.FieldValue.increment(-1),
    });
    batch.update(db.collection("users").doc(targetId), {
      followerCount: admin.firestore.FieldValue.increment(-1),
    });
    await batch.commit();

    return null;
  });

// ────────────────────────────────────────────────────────────────────────────
// SCHEDULED: RECALCULATE IMPACT SCORES (daily)
// ────────────────────────────────────────────────────────────────────────────
exports.recalculateImpactScores = functions.pubsub
  .schedule("0 0 * * *")
  .timeZone(process.env.TIMEZONE || "Asia/Kolkata")
  .onRun(async () => {
    console.log("[recalculateImpactScores] Starting...");

    const issuesSnap = await db.collection("issues").get();
    const userScores = {};

    issuesSnap.forEach((doc) => {
      const issue = doc.data();
      const reporter = issue.authorId;
      if (reporter && reporter !== "anonymous") {
        if (!userScores[reporter])
          userScores[reporter] = { score: 0, reported: 0, solved: 0 };
        userScores[reporter].reported += 1;
        userScores[reporter].score += TRUST_SCORE.ISSUE_REPORTED;
        if (issue.status === "Solved") {
          userScores[reporter].score += TRUST_SCORE.ISSUE_SOLVED_AUTHOR;
          userScores[reporter].solved += 1;
        }
      }
      (issue.solvers || []).forEach((solverId) => {
        if (!userScores[solverId])
          userScores[solverId] = { score: 0, reported: 0, solved: 0 };
        userScores[solverId].score += TRUST_SCORE.JOINED_SOLVE;
        if (issue.status === "Solved") {
          userScores[solverId].score += TRUST_SCORE.SOLVE_HELPED;
          userScores[solverId].solved += 1;
        }
      });
    });

    const sorted = Object.entries(userScores).sort(
      ([, a], [, b]) => b.score - a.score,
    );

    for (const chunk of chunkArray(sorted)) {
      const batch = db.batch();
      chunk.forEach(([uid, data]) => {
        const index = sorted.findIndex(([id]) => id === uid);
        const ref = db.collection("users").doc(uid);
        batch.set(
          ref,
          {
            impactScore: data.score,
            reported: data.reported,
            solved: data.solved,
            rank: index + 1,
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );
      });
      await batch.commit();
    }

    console.log(`[recalculateImpactScores] Updated ${sorted.length} users.`);
    return null;
  });

// ────────────────────────────────────────────────────────────────────────────
// SCHEDULED: CALCULATE TRENDING SCORES (every 15 minutes)
// ────────────────────────────────────────────────────────────────────────────
exports.calculateTrendingScores = functions.pubsub
  .schedule("*/15 * * * *")
  .timeZone(process.env.TIMEZONE || "Asia/Kolkata")
  .onRun(async () => {
    console.log("[calculateTrendingScores] Starting...");

    const URGENCY_WEIGHT = { critical: 4, high: 3, medium: 2, low: 1 };
    const now = Date.now();

    const issuesSnap = await db
      .collection("issues")
      .where("recentActivity", ">", 0)
      .get();

    const batches = [];
    let batch = db.batch();
    let batchCount = 0;

    for (const doc of issuesSnap.docs) {
      const issue = doc.data();
      const hoursOld = (now - issue.createdAt.toMillis()) / 3600000 || 1;
      const urgencyW = URGENCY_WEIGHT[issue.urgency] || 1;
      const trendingScore =
        (issue.recentActivity * urgencyW) / Math.sqrt(hoursOld);

      batch.update(doc.ref, {
        trendingScore,
        recentActivity: 0,
      });
      batchCount++;

      if (batchCount >= 400) {
        batches.push(batch.commit());
        batch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) batches.push(batch.commit());
    await Promise.all(batches);
    console.log(`[calculateTrendingScores] Updated ${issuesSnap.size} issues.`);
    return null;
  });

// ────────────────────────────────────────────────────────────────────────────
// SCHEDULED: CHECK VIRAL ISSUES (hourly)
// ────────────────────────────────────────────────────────────────────────────
exports.checkViralIssues = functions.pubsub
  .schedule("0 * * * *")
  .timeZone(process.env.TIMEZONE || "Asia/Kolkata")
  .onRun(async () => {
    console.log("[checkViralIssues] Starting...");

    const viralSnap = await db
      .collection("issues")
      .where("votes", ">=", VIRAL_THRESHOLD)
      .where("isViral", "==", false)
      .get();

    const batches = [];
    for (const chunk of chunkArray(viralSnap.docs)) {
      const batch = db.batch();
      for (const doc of chunk) {
        batch.update(doc.ref, { isViral: true });
      }
      batches.push(batch.commit());
    }
    await Promise.all(batches);

    // Award viral points to authors
    for (const doc of viralSnap.docs) {
      const issue = doc.data();
      if (issue.authorId && issue.authorId !== "anonymous") {
        await awardImpactPoints(
          issue.authorId,
          TRUST_SCORE.VIRAL_REACHED,
          "Issue went viral",
        );
        await db
          .collection("users")
          .doc(issue.authorId)
          .update({
            viralIssues: admin.firestore.FieldValue.increment(1),
          });
        await notifyUser(db, admin, {
          userId: issue.authorId,
          title: "🚀 Your issue went viral!",
          body: `"${issue.title}" reached ${VIRAL_THRESHOLD}+ votes!`,
          type: "ISSUE_VIRAL",
          issueId: doc.id,
        });
        await checkAchievements(issue.authorId);
      }
    }

    console.log(`[checkViralIssues] Marked ${viralSnap.size} issues as viral.`);
    return null;
  });

// ────────────────────────────────────────────────────────────────────────────
// SCHEDULED: ARCHIVE OLD ISSUES (weekly)
// ────────────────────────────────────────────────────────────────────────────
exports.archiveOldIssues = functions.pubsub
  .schedule("0 0 * * 0")
  .timeZone(process.env.TIMEZONE || "Asia/Kolkata")
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
      batch.set(archiveRef, {
        ...doc.data(),
        archivedAt: new Date().toISOString(),
      });
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log(`[archiveOldIssues] Archived ${snap.size} issues.`);
    return null;
  });

// ────────────────────────────────────────────────────────────────────────────
// SCHEDULED: CLEANUP NOTIFICATIONS (daily)
// ────────────────────────────────────────────────────────────────────────────
exports.cleanupNotifications = functions.pubsub
  .schedule("0 1 * * *")
  .timeZone(process.env.TIMEZONE || "Asia/Kolkata")
  .onRun(async () => {
    console.log("[cleanupNotifications] Starting...");

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoff = sevenDaysAgo.toISOString();

// ────────────────────────────────────────────────────────────────────────────
// 7. GET NEARBY ISSUES (CALLABLE)
// ────────────────────────────────────────────────────────────────────────────
exports.getNearbyIssues = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in to search nearby.");
  }

  const { latitude, longitude, radiusInMeters = 50000, category = "All" } = data;
  if (!latitude || !longitude) {
    throw new functions.https.HttpsError("invalid-argument", "Missing latitude or longitude.");
  }

  const center = [Number(latitude), Number(longitude)];
  const radiusInM = Number(radiusInMeters);
  const bounds = geofire.geohashQueryBounds(center, radiusInM);
  const promises = [];

  for (const b of bounds) {
    let q = db.collection("issues")
      .orderBy("geohash")
      .startAt(b[0])
      .endAt(b[1])
      .limit(200); // Cap per bound to prevent massive reads
    promises.push(q.get());
  }

  const snapshots = await Promise.all(promises);
  const matchingDocs = [];
  const addedIds = new Set();

  for (const snap of snapshots) {
    for (const doc of snap.docs) {
      if (addedIds.has(doc.id)) continue;
      
      const issue = doc.data();
      if (category !== "All" && issue.category !== category) continue;
      
      if (!issue.latitude || !issue.longitude) continue;

      const lat = Number(issue.latitude);
      const lng = Number(issue.longitude);
      const distanceInKm = geofire.distanceBetween([lat, lng], center);
      const distanceInM = distanceInKm * 1000;
      
      if (distanceInM <= radiusInM) {
        matchingDocs.push({ id: doc.id, ...issue });
        addedIds.add(doc.id);
      }
    }
  }

  // Sort by createdAt descending
  matchingDocs.sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  // Cap at 100 results for payload efficiency
  return { data: matchingDocs.slice(0, 100) };
});

    const snap = await db
      .collection("notifications")
      .where("read", "==", true)
      .where("createdAt", "<", cutoff)
      .get();

    const batch = db.batch();
    snap.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log(
      `[cleanupNotifications] Deleted ${snap.size} old notifications.`,
    );
    return null;
  });

// ────────────────────────────────────────────────────────────────────────────
// SCHEDULED: CLEANUP OLD FEED ITEMS (daily)
// ────────────────────────────────────────────────────────────────────────────
exports.cleanupOldFeedItems = functions.pubsub
  .schedule("0 2 * * *")
  .timeZone(process.env.TIMEZONE || "Asia/Kolkata")
  .onRun(async () => {
    console.log("[cleanupOldFeedItems] Starting...");

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoff = thirtyDaysAgo.toISOString();

    const feedSnap = await db
      .collectionGroup("timeline")
      .where("createdAt", "<", cutoff)
      .where("type", "in", ["issue_created", "issue_solved", "user_followed"])
      .limit(5000)
      .get();

    const batch = db.batch();
    let count = 0;
    feedSnap.forEach((doc) => {
      batch.delete(doc.ref);
      count++;
    });
    if (count > 0) await batch.commit();
    console.log(`[cleanupOldFeedItems] Deleted ${count} old feed items.`);
    return null;
  });

// ────────────────────────────────────────────────────────────────────────────
// HTTPS CALLABLE: FOLLOW USER
// ────────────────────────────────────────────────────────────────────────────
exports.followUser = functions.https.onCall(async (data, context) => {
  enforceRateLimit(context, "followUser", 10, 60000);
  if (!context.auth)
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be signed in.",
    );
  const { targetUid } = data;
  if (!targetUid || typeof targetUid !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "targetUid is required.",
    );
  }
  if (targetUid === context.auth.uid) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Cannot follow yourself.",
    );
  }

  const followingRef = db
    .collection("users")
    .doc(context.auth.uid)
    .collection("following")
    .doc(targetUid);
  const existing = await followingRef.get();
  if (existing.exists) {
    return { success: false, reason: "Already following" };
  }

  await followingRef.set({ createdAt: new Date().toISOString() });
  return { success: true };
});

// ────────────────────────────────────────────────────────────────────────────
// HTTPS CALLABLE: UNFOLLOW USER
// ────────────────────────────────────────────────────────────────────────────
exports.unfollowUser = functions.https.onCall(async (data, context) => {
  enforceRateLimit(context, "unfollowUser", 10, 60000);
  if (!context.auth)
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be signed in.",
    );
  const { targetUid } = data;
  if (!targetUid)
    throw new functions.https.HttpsError(
      "invalid-argument",
      "targetUid is required.",
    );

  const followingRef = db
    .collection("users")
    .doc(context.auth.uid)
    .collection("following")
    .doc(targetUid);
  await followingRef.delete();
  return { success: true };
});

// ────────────────────────────────────────────────────────────────────────────
// HTTPS CALLABLE: GET HOME FEED
// ────────────────────────────────────────────────────────────────────────────
exports.getHomeFeed = functions.https.onCall(async (data, context) => {
  enforceRateLimit(context, "getHomeFeed", 30, 60000);
  if (!context.auth)
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be signed in.",
    );
  const { city, pageSize = 20 } = data;

  // Get user's following list
  const followingSnap = await db
    .collection("users")
    .doc(context.auth.uid)
    .collection("following")
    .get();
  const followedIds = followingSnap.docs.map((d) => d.id);

  // Fetch trending + recent issues as base
  const issuesSnap = await db
    .collection("issues")
    .orderBy("trendingScore", "desc")
    .orderBy("createdAt", "desc")
    .limit(pageSize * 2)
    .get();

  const issues = issuesSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((issue) => {
      // Include if: trending OR from followed users OR in same city
      const isFollowed = followedIds.includes(issue.authorId);
      const isOwn = issue.authorId === context.auth.uid;
      const isSameCity =
        city && issue.city && issue.city.toLowerCase() === city.toLowerCase();
      return issue.isViral || isFollowed || isOwn || isSameCity;
    })
    .slice(0, pageSize);

  return { issues };
});

// ────────────────────────────────────────────────────────────────────────────
// HTTPS CALLABLE: GET TRENDING ISSUES
// ────────────────────────────────────────────────────────────────────────────
exports.getTrendingIssues = functions.https.onCall(async (data, context) => {
  enforceRateLimit(context, "getTrendingIssues", 30, 60000);
  if (!context.auth)
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be signed in.",
    );
  const { city, category, pageSize = 20 } = data;

  let q = db
    .collection("issues")
    .where("status", "in", ["Open", "In Progress"])
    .orderBy("trendingScore", "desc")
    .limit(pageSize);

  const snapshot = await q.get();
  let issues = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Client-side filter for city/category (can be moved to composite index)
  if (city)
    issues = issues.filter(
      (i) => (i.city || "").toLowerCase() === city.toLowerCase(),
    );
  if (category) issues = issues.filter((i) => i.category === category);

  return { issues };
});

// ────────────────────────────────────────────────────────────────────────────
// HTTPS CALLABLE: GET LEADERBOARD
// ────────────────────────────────────────────────────────────────────────────
exports.getLeaderboard = functions.https.onCall(async (data, context) => {
  enforceRateLimit(context, "getLeaderboard", 30, 60000);
  if (!context.auth)
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be signed in.",
    );
  const { city, pageSize = 20 } = data;

  let q;
  if (city) {
    q = db
      .collection("users")
      .where("city", "==", city)
      .orderBy("impactScore", "desc")
      .limit(pageSize);
  } else {
    q = db.collection("users").orderBy("impactScore", "desc").limit(pageSize);
  }

  const snap = await q.get();
  const leaderboard = snap.docs.map((d, i) => ({
    id: d.id,
    rank: i + 1,
    ...d.data(),
  }));

  return { leaderboard };
});

// ────────────────────────────────────────────────────────────────────────────
// HTTPS CALLABLE: GET USER RANK
// ────────────────────────────────────────────────────────────────────────────
exports.getUserRank = functions.https.onCall(async (data, context) => {
  enforceRateLimit(context, "getUserRank", 30, 60000);
  if (!context.auth)
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be signed in.",
    );

  const userDoc = await db.collection("users").doc(context.auth.uid).get();
  const user = userDoc.data();
  if (!user) return { ranks: {} };

  // Global rank
  const globalSnap = await db
    .collection("users")
    .where("impactScore", ">", user.impactScore || 0)
    .count()
    .get();
  const globalRank = globalSnap.data().count + 1;

  // City rank
  let cityRank = 0;
  if (user.city) {
    const citySnap = await db
      .collection("users")
      .where("city", "==", user.city)
      .where("impactScore", ">", user.impactScore || 0)
      .count()
      .get();
    cityRank = citySnap.data().count + 1;
  }

  return {
    ranks: {
      global: globalRank,
      city: cityRank || null,
      impactScore: user.impactScore || 0,
    },
  };
});

// ────────────────────────────────────────────────────────────────────────────
// HTTPS CALLABLE: GET ACHIEVEMENTS (badge progress for a user)
// ────────────────────────────────────────────────────────────────────────────
exports.getAchievements = functions.https.onCall(async (data, context) => {
  enforceRateLimit(context, "getAchievements", 30, 60000);
  if (!context.auth)
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be signed in.",
    );
  const { userId } = data;
  const targetId = userId || context.auth.uid;

  const userDoc = await db.collection("users").doc(targetId).get();
  if (!userDoc.exists)
    throw new functions.https.HttpsError("not-found", "User not found");
  const user = userDoc.data();

  const userBadgesSnap = await db
    .collection("userBadges")
    .doc(targetId)
    .collection("badges")
    .get();
  const earnedIds = new Set(userBadgesSnap.docs.map((d) => d.id));

  const badgesData = [
    {
      id: "first_report",
      name: "First Report",
      icon: "flag-outline",
      color: "#6366F1",
    },
    {
      id: "problem_solver",
      name: "Problem Solver",
      icon: "check-circle-outline",
      color: "#10B981",
    },
    {
      id: "community_hero",
      name: "Community Hero",
      icon: "shield-star-outline",
      color: "#F59E0B",
    },
    {
      id: "viral_voice",
      name: "Viral Voice",
      icon: "trend-up",
      color: "#EF4444",
    },
    {
      id: "follower",
      name: "Follower",
      icon: "account-multiple-outline",
      color: "#3B82F6",
    },
    {
      id: "influencer",
      name: "Influencer",
      icon: "megaphone-outline",
      color: "#8B5CF6",
    },
    {
      id: "city_leader",
      name: "Voice of the City",
      icon: "map-marker-star-outline",
      color: "#F97316",
    },
    {
      id: "early_adopter",
      name: "Early Adopter",
      icon: "rocket-launch-outline",
      color: "#EC4899",
    },
    {
      id: "helping_hand",
      name: "Helping Hand",
      icon: "hand-heart-outline",
      color: "#06B6D4",
    },
    {
      id: "consistent_reporter",
      name: "Consistent Reporter",
      icon: "calendar-check-outline",
      color: "#84CC16",
    },
    {
      id: "transformation_agent",
      name: "Transformation Agent",
      icon: "image-filter-drama-outline",
      color: "#A855F7",
    },
    {
      id: "impact_maker",
      name: "Impact Maker",
      icon: "lightning-bolt-outline",
      color: "#FBBF24",
    },
  ];
  return {
    badges: badgesData.map((badge) => ({
      ...badge,
      earned: earnedIds.has(badge.id),
    })),
    userStats: {
      impactScore: user.impactScore || 0,
      issueCount: user.issueCount || 0,
      solveCount: user.solveCount || 0,
      followerCount: user.followerCount || 0,
      followingCount: user.followingCount || 0,
      viralIssues: user.viralIssues || 0,
    },
  };
});

// ────────────────────────────────────────────────────────────────────────────
// HTTPS CALLABLE: SAVE FCM TOKEN
// ────────────────────────────────────────────────────────────────────────────
exports.saveFcmToken = functions.https.onCall(async (data, context) => {
  enforceRateLimit(context, "saveFcmToken", 10, 60000);
  if (!context.auth)
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be signed in.",
    );
  const { token } = data;
  if (!token || typeof token !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "A valid FCM token is required.",
    );
  }

  await db
    .collection("users")
    .doc(context.auth.uid)
    .collection("private")
    .doc("data")
    .set(
      { fcmToken: token, fcmUpdatedAt: new Date().toISOString() },
      { merge: true },
    );

  return { success: true };
});

// ────────────────────────────────────────────────────────────────────────────
// HTTPS CALLABLE: CHECK ADMIN STATUS
// ────────────────────────────────────────────────────────────────────────────
exports.checkAdminStatus = functions.https.onCall(async (data, context) => {
  enforceRateLimit(context, "checkAdminStatus", 30, 60000);
  if (!context.auth)
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be signed in.",
    );
  return { isAdmin: context.auth.token.admin === true };
});

// ────────────────────────────────────────────────────────────────────────────
// HTTPS CALLABLE: SET ADMIN ROLE
// ────────────────────────────────────────────────────────────────────────────
exports.setAdminRole = functions.https.onCall(async (data, context) => {
  enforceRateLimit(context, "setAdminRole", 10, 60000);
  if (!context.auth)
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be signed in.",
    );
  if (context.auth.token.admin !== true) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can grant admin role.",
    );
  }

  const { targetUid } = data;
  if (!targetUid || typeof targetUid !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "A valid targetUid is required.",
    );
  }

  await admin.auth().setCustomUserClaims(targetUid, { admin: true });
  await db
    .collection("users")
    .doc(targetUid)
    .set(
      { isAdmin: true, adminGrantedAt: new Date().toISOString() },
      { merge: true },
    );

  await auditLog("setAdminRole", context.auth.uid, targetUid, {
    action: "Grant admin role",
  });
  return { success: true };
});

// ────────────────────────────────────────────────────────────────────────────
// HTTPS CALLABLE: ADMIN UPDATE ISSUE STATUS
// ────────────────────────────────────────────────────────────────────────────
exports.adminUpdateIssueStatus = functions.https.onCall(
  async (data, context) => {
    enforceRateLimit(context, "adminUpdateIssueStatus", 10, 60000);
    if (!context.auth)
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in.",
      );
    if (context.auth.token.admin !== true) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only admins can update issue status.",
      );
    }

    const { issueId, newStatus } = data;
    if (!issueId || !newStatus) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "issueId and newStatus are required.",
      );
    }

    const validStatuses = ["Open", "In Progress", "Solved", "Failed"];
    if (!validStatuses.includes(newStatus)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Status must be one of: ${validStatuses.join(", ")}`,
      );
    }

    await auditLog("adminUpdateIssueStatus", context.auth.uid, null, {
      issueId,
      newStatus,
    });
    await db.collection("issues").doc(issueId).update({
      status: newStatus,
      statusUpdatedAt: new Date().toISOString(),
    });
    return { success: true };
  },
);

// ────────────────────────────────────────────────────────────────────────────
// HTTPS CALLABLE: REPORT CONTENT
// ────────────────────────────────────────────────────────────────────────────
exports.reportContent = functions.https.onCall(async (data, context) => {
  enforceRateLimit(context, "reportContent", 10, 60000);
  if (!context.auth)
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be signed in.",
    );
  const { issueId, reason } = data;
  if (!issueId || !reason) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "issueId and reason are required.",
    );
  }
  if (reason.length > 500) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "reason must not exceed 500 characters.",
    );
  }

  const flagRef = db
    .collection("flaggedContent")
    .doc(issueId)
    .collection("flags")
    .doc();
  await flagRef.set({
    reporterId: context.auth.uid,
    reason,
    createdAt: new Date().toISOString(),
  });

  // Increment report count on issue
  await db
    .collection("issues")
    .doc(issueId)
    .update({
      reportCount: admin.firestore.FieldValue.increment(1),
    });

  return { success: true };
});

// ────────────────────────────────────────────────────────────────────────────
// HTTPS CALLABLE: LOG APP CRASH
// ────────────────────────────────────────────────────────────────────────────
exports.logAppCrash = functions.https.onCall(async (data, context) => {
  enforceRateLimit(context, "logAppCrash", 10, 60000);
  if (!context.auth)
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be signed in to report crashes.",
    );

  await db.collection("client_crashes").add({
    ...data,
    userId: context.auth.uid,
    timestamp: new Date().toISOString(),
  });
  return { success: true };
});

// ────────────────────────────────────────────────────────────────────────────
// HTTPS CALLABLE: GET CLIENT CRASHES (admin)
// ────────────────────────────────────────────────────────────────────────────
exports.getClientCrashes = functions.https.onCall(async (data, context) => {
  enforceRateLimit(context, "getClientCrashes", 30, 60000);
  if (!context.auth)
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be signed in.",
    );
  if (context.auth.token.admin !== true) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can view crash logs.",
    );
  }

  const snapshot = await db
    .collection("client_crashes")
    .orderBy("timestamp", "desc")
    .limit(50)
    .get();

  return { crashes: snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) };
});
