/**
 * Firestore Security Rules — Emulator Test Suite
 *
 * Validates that:
 *  - Unauthenticated users cannot access any data
 *  - Unverified-email users cannot create issues or comments
 *  - Users cannot read/write other users' private data
 *  - Regular users cannot access admin-only collections
 *  - Report system works correctly
 *  - Rate-limit documents are read-only for users
 *
 * Run with: firebase emulators:exec --only firestore "cd tests && npx jest --ci --forceExit"
 */

const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');
const { readFileSync } = require('fs');
const { resolve } = require('path');

const PROJECT_ID = 'civic-test-project';

let testEnv;

beforeAll(async () => {
  const rulesPath = resolve(__dirname, '..', 'firestore.rules');
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(rulesPath, 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

afterEach(async () => {
  if (testEnv) await testEnv.clearFirestore();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Authenticated user with verified email */
function verifiedUser(uid = 'user1') {
  return testEnv.authenticatedContext(uid, { email_verified: true });
}

/** Authenticated user with UNVERIFIED email */
function unverifiedUser(uid = 'unverified1') {
  return testEnv.authenticatedContext(uid, { email_verified: false });
}

/** Admin user */
function adminUser(uid = 'admin1') {
  return testEnv.authenticatedContext(uid, {
    admin: true,
    email_verified: true,
  });
}

/** Unauthenticated context */
function unauthUser() {
  return testEnv.unauthenticatedContext();
}

/** Seed an issue document via admin context (bypasses rules) */
async function seedIssue(issueId, data) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await ctx
      .firestore()
      .collection('issues')
      .doc(issueId)
      .set({
        title: 'Test Issue',
        description: 'A test issue',
        category: 'Pothole',
        status: 'Open',
        authorId: 'user1',
        authorName: 'Test User',
        votes: 0,
        voters: [],
        solvers: [],
        commentsCount: 0,
        createdAt: new Date().toISOString(),
        ...data,
      });
  });
}

/** Seed a user document */
async function seedUser(userId, data) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await ctx
      .firestore()
      .collection('users')
      .doc(userId)
      .set({
        displayName: 'Test User',
        email: 'test@example.com',
        trustScore: 0,
        rank: 0,
        reported: 0,
        solved: 0,
        ...data,
      });
  });
}

/** Seed a comment */
async function seedComment(issueId, commentId, data) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await ctx
      .firestore()
      .collection('issues')
      .doc(issueId)
      .collection('comments')
      .doc(commentId)
      .set({
        authorId: 'user1',
        authorName: 'Test User',
        text: 'A test comment',
        createdAt: new Date().toISOString(),
        ...data,
      });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNAUTHENTICATED ACCESS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Unauthenticated access', () => {
  test('cannot read issues', async () => {
    await seedIssue('issue1', {});
    const db = unauthUser().firestore();
    await assertFails(db.collection('issues').doc('issue1').get());
  });

  test('cannot create issues', async () => {
    const db = unauthUser().firestore();
    await assertFails(
      db.collection('issues').doc('newIssue').set({
        title: 'Hack',
        authorId: 'anon',
      }),
    );
  });

  test('cannot read users', async () => {
    await seedUser('user1', {});
    const db = unauthUser().firestore();
    await assertFails(db.collection('users').doc('user1').get());
  });

  test('cannot read notifications', async () => {
    const db = unauthUser().firestore();
    await assertFails(db.collection('notifications').doc('n1').get());
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// UNVERIFIED EMAIL
// ═══════════════════════════════════════════════════════════════════════════════

describe('Unverified email user', () => {
  test('cannot create an issue', async () => {
    const db = unverifiedUser('unverified1').firestore();
    await assertFails(
      db.collection('issues').doc('issue1').set({
        title: 'Test Issue',
        description: 'Testing',
        category: 'Pothole',
        status: 'Open',
        authorId: 'unverified1',
        authorName: 'Unverified',
        votes: 0,
        voters: [],
        solvers: [],
        commentsCount: 0,
        createdAt: new Date().toISOString(),
      }),
    );
  });

  test('cannot create a comment', async () => {
    await seedIssue('issue1', {});
    const db = unverifiedUser('unverified1').firestore();
    await assertFails(
      db.collection('issues').doc('issue1').collection('comments').add({
        authorId: 'unverified1',
        authorName: 'Unverified',
        text: 'Hello',
        createdAt: new Date().toISOString(),
      }),
    );
  });

  test('cannot report an issue', async () => {
    await seedIssue('issue1', {});
    const db = unverifiedUser('unverified1').firestore();
    await assertFails(
      db
        .collection('issues')
        .doc('issue1')
        .collection('reports')
        .doc('unverified1')
        .set({
          reporterId: 'unverified1',
          reason: 'Spam',
          createdAt: new Date().toISOString(),
        }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFIED USER — ISSUES
// ═══════════════════════════════════════════════════════════════════════════════

describe('Verified user — issues', () => {
  test('can create an issue with own authorId', async () => {
    const db = verifiedUser('user1').firestore();
    await assertSucceeds(
      db.collection('issues').doc('issue1').set({
        title: 'Pothole on Main St',
        description: 'Big hole',
        category: 'Pothole',
        status: 'Open',
        authorId: 'user1',
        authorName: 'Citizen',
        votes: 0,
        voters: [],
        solvers: [],
        commentsCount: 0,
        createdAt: new Date().toISOString(),
      }),
    );
  });

  test("cannot create an issue with someone else's authorId", async () => {
    const db = verifiedUser('user1').firestore();
    await assertFails(
      db.collection('issues').doc('issue1').set({
        title: 'Pothole on Main St',
        description: 'Big hole',
        category: 'Pothole',
        status: 'Open',
        authorId: 'user2',
        authorName: 'Spoof',
        votes: 0,
        voters: [],
        solvers: [],
        commentsCount: 0,
        createdAt: new Date().toISOString(),
      }),
    );
  });

  test('cannot create an issue with empty title', async () => {
    const db = verifiedUser('user1').firestore();
    await assertFails(
      db.collection('issues').doc('issue1').set({
        title: '',
        description: 'Big hole',
        category: 'Pothole',
        status: 'Open',
        authorId: 'user1',
        authorName: 'Citizen',
        votes: 0,
        voters: [],
        solvers: [],
        commentsCount: 0,
        createdAt: new Date().toISOString(),
      }),
    );
  });

  test('can read non-hidden issues', async () => {
    await seedIssue('issue1', { hidden: false });
    const db = verifiedUser('user1').firestore();
    await assertSucceeds(db.collection('issues').doc('issue1').get());
  });

  test('cannot read hidden issues', async () => {
    await seedIssue('issue1', { hidden: true });
    const db = verifiedUser('user1').firestore();
    await assertFails(db.collection('issues').doc('issue1').get());
  });

  test('can delete own issue', async () => {
    await seedIssue('issue1', { authorId: 'user1' });
    const db = verifiedUser('user1').firestore();
    await assertSucceeds(db.collection('issues').doc('issue1').delete());
  });

  test("cannot delete another user's issue", async () => {
    await seedIssue('issue1', { authorId: 'user2' });
    const db = verifiedUser('user1').firestore();
    await assertFails(db.collection('issues').doc('issue1').delete());
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFIED USER — COMMENTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Verified user — comments', () => {
  test('can create a comment with own authorId', async () => {
    await seedIssue('issue1', {});
    const db = verifiedUser('user1').firestore();
    await assertSucceeds(
      db.collection('issues').doc('issue1').collection('comments').add({
        authorId: 'user1',
        authorName: 'Citizen',
        text: 'This needs urgent attention!',
        createdAt: new Date().toISOString(),
      }),
    );
  });

  test("cannot create a comment with someone else's authorId", async () => {
    await seedIssue('issue1', {});
    const db = verifiedUser('user1').firestore();
    await assertFails(
      db.collection('issues').doc('issue1').collection('comments').add({
        authorId: 'user2',
        authorName: 'Spoof',
        text: 'Impersonation!',
        createdAt: new Date().toISOString(),
      }),
    );
  });

  test('cannot create a comment longer than 1000 chars', async () => {
    await seedIssue('issue1', {});
    const db = verifiedUser('user1').firestore();
    await assertFails(
      db
        .collection('issues')
        .doc('issue1')
        .collection('comments')
        .add({
          authorId: 'user1',
          authorName: 'Citizen',
          text: 'x'.repeat(1001),
          createdAt: new Date().toISOString(),
        }),
    );
  });

  test("cannot delete another user's comment", async () => {
    await seedIssue('issue1', {});
    await seedComment('issue1', 'c1', { authorId: 'user2' });
    const db = verifiedUser('user1').firestore();
    await assertFails(
      db
        .collection('issues')
        .doc('issue1')
        .collection('comments')
        .doc('c1')
        .delete(),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// REPORTING SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

describe('Reporting system', () => {
  test('verified user can report an issue', async () => {
    await seedIssue('issue1', {});
    const db = verifiedUser('user1').firestore();
    await assertSucceeds(
      db
        .collection('issues')
        .doc('issue1')
        .collection('reports')
        .doc('user1')
        .set({
          reporterId: 'user1',
          reason: 'Spam',
          createdAt: new Date().toISOString(),
        }),
    );
  });

  test('cannot report with empty reason', async () => {
    await seedIssue('issue1', {});
    const db = verifiedUser('user1').firestore();
    await assertFails(
      db
        .collection('issues')
        .doc('issue1')
        .collection('reports')
        .doc('user1')
        .set({
          reporterId: 'user1',
          reason: '',
          createdAt: new Date().toISOString(),
        }),
    );
  });

  test("cannot report with someone else's reporterId", async () => {
    await seedIssue('issue1', {});
    const db = verifiedUser('user1').firestore();
    await assertFails(
      db
        .collection('issues')
        .doc('issue1')
        .collection('reports')
        .doc('user1')
        .set({
          reporterId: 'user2',
          reason: 'Spam',
          createdAt: new Date().toISOString(),
        }),
    );
  });

  test('regular user cannot read reports', async () => {
    await seedIssue('issue1', {});
    const db = verifiedUser('user1').firestore();
    await assertFails(
      db
        .collection('issues')
        .doc('issue1')
        .collection('reports')
        .doc('r1')
        .get(),
    );
  });

  test('admin can read reports', async () => {
    await seedIssue('issue1', {});
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx
        .firestore()
        .collection('issues')
        .doc('issue1')
        .collection('reports')
        .doc('r1')
        .set({
          reporterId: 'user1',
          reason: 'Spam',
          createdAt: new Date().toISOString(),
        });
    });
    const db = adminUser('admin1').firestore();
    await assertSucceeds(
      db
        .collection('issues')
        .doc('issue1')
        .collection('reports')
        .doc('r1')
        .get(),
    );
  });

  test('verified user can report a comment', async () => {
    await seedIssue('issue1', {});
    await seedComment('issue1', 'c1', {});
    const db = verifiedUser('user1').firestore();
    await assertSucceeds(
      db
        .collection('issues')
        .doc('issue1')
        .collection('comments')
        .doc('c1')
        .collection('reports')
        .doc('user1')
        .set({
          reporterId: 'user1',
          reason: 'inappropriate',
          createdAt: new Date().toISOString(),
        }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN-ONLY COLLECTIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Admin-only collections', () => {
  test('regular user cannot read reportedContent', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('reportedContent').doc('rc1').set({
        issueId: 'issue1',
        reportCount: 3,
      });
    });
    const db = verifiedUser('user1').firestore();
    await assertFails(db.collection('reportedContent').doc('rc1').get());
  });

  test('admin can read reportedContent', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('reportedContent').doc('rc1').set({
        issueId: 'issue1',
        reportCount: 3,
      });
    });
    const db = adminUser('admin1').firestore();
    await assertSucceeds(db.collection('reportedContent').doc('rc1').get());
  });

  test('admin can delete reportedContent', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('reportedContent').doc('rc1').set({
        issueId: 'issue1',
        reportCount: 3,
      });
    });
    const db = adminUser('admin1').firestore();
    await assertSucceeds(db.collection('reportedContent').doc('rc1').delete());
  });

  test('regular user cannot write to userRateLimits', async () => {
    const db = verifiedUser('user1').firestore();
    await assertFails(
      db.collection('userRateLimits').doc('user1').set({
        issuesThisHour: 0,
      }),
    );
  });

  test('regular user can read own rate limits', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('userRateLimits').doc('user1').set({
        issuesThisHour: 2,
      });
    });
    const db = verifiedUser('user1').firestore();
    await assertSucceeds(db.collection('userRateLimits').doc('user1').get());
  });

  test("regular user cannot read another user's rate limits", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('userRateLimits').doc('user2').set({
        issuesThisHour: 2,
      });
    });
    const db = verifiedUser('user1').firestore();
    await assertFails(db.collection('userRateLimits').doc('user2').get());
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// USER PROFILE SECURITY
// ═══════════════════════════════════════════════════════════════════════════════

describe('User profile security', () => {
  test('user can write own profile', async () => {
    await seedUser('user1', {});
    const db = verifiedUser('user1').firestore();
    await assertSucceeds(
      db.collection('users').doc('user1').set({
        displayName: 'Updated Name',
        email: 'test@example.com',
        bio: 'Hello world',
      }),
    );
  });

  test("user cannot read another user's full profile", async () => {
    await seedUser('user2', { displayName: 'Other User' });
    const db = verifiedUser('user1').firestore();
    await assertFails(db.collection('users').doc('user2').get());
  });

  test("user can read another user's publicProfile", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx
        .firestore()
        .collection('users')
        .doc('user2')
        .collection('publicProfile')
        .doc('profile')
        .set({
          displayName: 'Public User',
          photoURL: 'https://example.com/avatar.jpg',
          trustScore: 100,
          rank: 5,
        });
    });
    const db = verifiedUser('user1').firestore();
    await assertSucceeds(
      db
        .collection('users')
        .doc('user2')
        .collection('publicProfile')
        .doc('profile')
        .get(),
    );
  });

  test('user can write own publicProfile', async () => {
    const db = verifiedUser('user1').firestore();
    await assertSucceeds(
      db
        .collection('users')
        .doc('user1')
        .collection('publicProfile')
        .doc('profile')
        .set({
          displayName: 'Public Name',
          photoURL: 'https://example.com/me.jpg',
          bio: 'Hello',
        }),
    );
  });

  test('user cannot set trustScore on own profile', async () => {
    await seedUser('user1', {});
    const db = verifiedUser('user1').firestore();
    await assertFails(
      db.collection('users').doc('user1').set({
        displayName: 'Cheater',
        trustScore: 99999,
      }),
    );
  });

  test('user cannot set isAdmin on own profile', async () => {
    await seedUser('user1', {});
    const db = verifiedUser('user1').firestore();
    await assertFails(
      db.collection('users').doc('user1').set({
        displayName: 'Hacker',
        isAdmin: true,
      }),
    );
  });

  test("user cannot write another user's profile", async () => {
    await seedUser('user2', {});
    const db = verifiedUser('user1').firestore();
    await assertFails(
      db.collection('users').doc('user2').set({
        displayName: 'Hacked',
      }),
    );
  });

  test('user can read/write own private data', async () => {
    const db = verifiedUser('user1').firestore();
    await assertSucceeds(
      db
        .collection('users')
        .doc('user1')
        .collection('private')
        .doc('data')
        .set({
          fcmToken: 'test-token',
        }),
    );
  });

  test("user cannot read another user's private data", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx
        .firestore()
        .collection('users')
        .doc('user2')
        .collection('private')
        .doc('data')
        .set({ fcmToken: 'secret-token' });
    });
    const db = verifiedUser('user1').firestore();
    await assertFails(
      db
        .collection('users')
        .doc('user2')
        .collection('private')
        .doc('data')
        .get(),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Notifications', () => {
  test('user can read own notification', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('notifications').doc('n1').set({
        userId: 'user1',
        title: 'Test',
        body: 'Test body',
        read: false,
      });
    });
    const db = verifiedUser('user1').firestore();
    await assertSucceeds(db.collection('notifications').doc('n1').get());
  });

  test("user cannot read another user's notification", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('notifications').doc('n1').set({
        userId: 'user2',
        title: 'Private',
        body: 'Not yours',
        read: false,
      });
    });
    const db = verifiedUser('user1').firestore();
    await assertFails(db.collection('notifications').doc('n1').get());
  });

  test('user can mark own notification as read', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('notifications').doc('n1').set({
        userId: 'user1',
        title: 'Test',
        body: 'Test',
        read: false,
      });
    });
    const db = verifiedUser('user1').firestore();
    await assertSucceeds(
      db.collection('notifications').doc('n1').update({ read: true }),
    );
  });

  test('user cannot create notifications', async () => {
    const db = verifiedUser('user1').firestore();
    await assertFails(
      db.collection('notifications').add({
        userId: 'user1',
        title: 'Fake',
        body: 'Injected',
        read: false,
      }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN — FULL ACCESS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Admin capabilities', () => {
  test('admin can read hidden issues', async () => {
    await seedIssue('issue1', { hidden: true });
    const db = adminUser('admin1').firestore();
    await assertSucceeds(db.collection('issues').doc('issue1').get());
  });

  test('admin can update any issue', async () => {
    await seedIssue('issue1', { authorId: 'user2' });
    const db = adminUser('admin1').firestore();
    await assertSucceeds(
      db.collection('issues').doc('issue1').update({ status: 'Solved' }),
    );
  });

  test('admin can delete any issue', async () => {
    await seedIssue('issue1', { authorId: 'user2' });
    const db = adminUser('admin1').firestore();
    await assertSucceeds(db.collection('issues').doc('issue1').delete());
  });
});
