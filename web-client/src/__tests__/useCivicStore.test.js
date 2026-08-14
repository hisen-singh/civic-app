/**
 * useCivicStore — Firestore Integration Test Suite
 *
 * Agentic TDD: These tests define the contract for Firebase integration.
 * The store must:
 *   1. Fetch real issues from Firestore on initialization
 *   2. Fall back to seedMap() dummy data ONLY if Firestore is empty or errors
 *   3. Push newly reported issues to Firestore
 *   4. Add issues to local state optimistically while the write is in-flight
 *
 * We mock the Firebase SDK entirely — no real network calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Firebase Mocks ──────────────────────────────────────────────────────────
// These mocks simulate the Firestore SDK. The implementation must import from
// a local `../lib/firebase` module that re-exports these functions.

const mockGetDocs = vi.fn();
const mockAddDoc = vi.fn();
const mockCollection = vi.fn(() => 'issues-collection-ref');
const mockOrderBy = vi.fn(() => 'order-constraint');
const mockQuery = vi.fn(() => 'query-ref');
const mockServerTimestamp = vi.fn(() => ({ _type: 'serverTimestamp' }));

vi.mock('../lib/firebase', () => ({
  db: { type: 'mock-firestore-db' },
}));

vi.mock('firebase/firestore', () => ({
  collection: (...args) => mockCollection(...args),
  getDocs: (...args) => mockGetDocs(...args),
  addDoc: (...args) => mockAddDoc(...args),
  query: (...args) => mockQuery(...args),
  orderBy: (...args) => mockOrderBy(...args),
  serverTimestamp: () => mockServerTimestamp(),
}));

// ─── Store Import ────────────────────────────────────────────────────────────
// Must be imported AFTER mocks are registered so the store picks up the mocked
// Firebase modules.

let useCivicStore;

beforeEach(async () => {
  vi.resetModules();
  mockGetDocs.mockReset();
  mockAddDoc.mockReset();
  mockCollection.mockReset().mockReturnValue('issues-collection-ref');
  mockOrderBy.mockReset().mockReturnValue('order-constraint');
  mockQuery.mockReset().mockReturnValue('query-ref');
  mockServerTimestamp.mockReset().mockReturnValue({ _type: 'serverTimestamp' });

  // Re-import to get a fresh Zustand store for each test
  const mod = await import('../store/useCivicStore.js');
  useCivicStore = mod.useCivicStore;
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST GROUP 1: Fetching issues from Firestore
// ═══════════════════════════════════════════════════════════════════════════════

describe('fetchIssues — loading real data from Firestore', () => {
  it('should populate issues[] with documents from Firestore', async () => {
    const firestoreIssues = [
      {
        id: 'fs-1',
        data: () => ({
          title: 'Broken pipe on 5th Ave',
          category: 'Sanitation',
          latitude: 40.71,
          longitude: -74.01,
          status: 'Open',
          createdAt: Date.now(),
        }),
      },
      {
        id: 'fs-2',
        data: () => ({
          title: 'Pothole near school',
          category: 'Pothole',
          latitude: 40.72,
          longitude: -74.0,
          status: 'Open',
          createdAt: Date.now(),
        }),
      },
    ];
    mockGetDocs.mockResolvedValueOnce({ docs: firestoreIssues, empty: false });

    await useCivicStore.getState().fetchIssues();

    const state = useCivicStore.getState();
    expect(state.issues).toHaveLength(2);
    expect(state.issues[0].id).toBe('fs-1');
    expect(state.issues[0].title).toBe('Broken pipe on 5th Ave');
    expect(state.issues[1].id).toBe('fs-2');
  });

  it('should set isLoading to true while fetching, then false when done', async () => {
    let resolvePromise;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockGetDocs.mockReturnValueOnce(pendingPromise);

    const fetchPromise = useCivicStore.getState().fetchIssues();

    // While the fetch is in-flight, isLoading must be true
    expect(useCivicStore.getState().isLoading).toBe(true);

    resolvePromise({ docs: [], empty: true });
    await fetchPromise;

    // After resolution, isLoading must be false
    expect(useCivicStore.getState().isLoading).toBe(false);
  });

  it('should query Firestore with orderBy("createdAt", "desc")', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [], empty: true });

    await useCivicStore.getState().fetchIssues();

    expect(mockCollection).toHaveBeenCalledWith(expect.anything(), 'issues');
    expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc');
    expect(mockQuery).toHaveBeenCalled();
    expect(mockGetDocs).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST GROUP 2: Fallback to seed data
// ═══════════════════════════════════════════════════════════════════════════════

describe('fetchIssues — fallback to seedMap() when Firestore is empty or fails', () => {
  it('should call seedMap() and populate with dummy data when Firestore returns 0 documents', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [], empty: true });

    await useCivicStore.getState().fetchIssues(40.7128, -74.006);

    const state = useCivicStore.getState();
    // seedMap generates 20 issues
    expect(state.issues.length).toBeGreaterThanOrEqual(20);
    expect(state.isSeeded).toBe(true);
    // All seeded issues should have IDs starting with "seeded-"
    state.issues.forEach((issue) => {
      expect(issue.id).toMatch(/^seeded-/);
    });
  });

  it('should call seedMap() when Firestore throws a network error', async () => {
    mockGetDocs.mockRejectedValueOnce(
      new Error('FirebaseError: Failed to get documents'),
    );

    await useCivicStore.getState().fetchIssues(40.7128, -74.006);

    const state = useCivicStore.getState();
    expect(state.issues.length).toBeGreaterThanOrEqual(20);
    expect(state.isSeeded).toBe(true);
    expect(state.error).toBeTruthy();
  });

  it('should NOT call seedMap() when Firestore returns real documents', async () => {
    const firestoreIssues = [
      {
        id: 'fs-1',
        data: () => ({
          title: 'Real issue',
          category: 'Pothole',
          latitude: 40.71,
          longitude: -74.01,
          status: 'Open',
          createdAt: Date.now(),
        }),
      },
    ];
    mockGetDocs.mockResolvedValueOnce({ docs: firestoreIssues, empty: false });

    await useCivicStore.getState().fetchIssues(40.7128, -74.006);

    const state = useCivicStore.getState();
    expect(state.isSeeded).toBe(false);
    expect(state.issues).toHaveLength(1);
    expect(state.issues[0].id).toBe('fs-1');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST GROUP 3: Reporting (pushing issues to Firestore)
// ═══════════════════════════════════════════════════════════════════════════════

describe('addIssue — pushing reported issues to Firestore', () => {
  it('should add the issue to local state immediately (optimistic update)', async () => {
    // Make addDoc hang so we can test the optimistic local update
    mockAddDoc.mockReturnValueOnce(new Promise(() => {}));

    const newIssue = {
      title: 'Giant sinkhole',
      category: 'Pothole',
      latitude: 40.71,
      longitude: -74.01,
      imageUrl: 'data:image/jpeg;base64,abc123',
      status: 'Open',
    };

    // Don't await — we want to check local state before Firestore resolves
    useCivicStore.getState().addIssue(newIssue);

    const state = useCivicStore.getState();
    expect(state.issues.length).toBeGreaterThanOrEqual(1);

    const added = state.issues.find((i) => i.title === 'Giant sinkhole');
    expect(added).toBeDefined();
    expect(added.status).toBe('Open');
  });

  it('should call addDoc to persist the issue to Firestore', async () => {
    mockAddDoc.mockResolvedValueOnce({ id: 'fs-new-1' });

    const newIssue = {
      title: 'Broken streetlight',
      category: 'Streetlight',
      latitude: 40.72,
      longitude: -74.0,
      imageUrl: null,
      status: 'Open',
    };

    await useCivicStore.getState().addIssue(newIssue);

    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    // The first argument to addDoc should be the collection reference
    expect(mockAddDoc).toHaveBeenCalledWith(
      expect.anything(), // collection ref
      expect.objectContaining({
        title: 'Broken streetlight',
        category: 'Streetlight',
        latitude: 40.72,
        longitude: -74.0,
        status: 'Open',
      }),
    );
  });

  it('should include a serverTimestamp in the Firestore document', async () => {
    mockAddDoc.mockResolvedValueOnce({ id: 'fs-new-2' });

    await useCivicStore.getState().addIssue({
      title: 'Graffiti',
      category: 'Vandalism',
      latitude: 40.73,
      longitude: -73.99,
      status: 'Open',
    });

    const writtenDoc = mockAddDoc.mock.calls[0][1];
    expect(writtenDoc.createdAt).toEqual({ _type: 'serverTimestamp' });
  });

  it('should update the local issue ID with the Firestore document ID after write', async () => {
    mockAddDoc.mockResolvedValueOnce({ id: 'fs-persisted-id' });

    await useCivicStore.getState().addIssue({
      title: 'Water main break',
      category: 'Sanitation',
      latitude: 40.74,
      longitude: -73.98,
      status: 'Open',
    });

    const state = useCivicStore.getState();
    const persisted = state.issues.find((i) => i.title === 'Water main break');
    expect(persisted).toBeDefined();
    expect(persisted.id).toBe('fs-persisted-id');
  });

  it('should keep the issue in local state but set an error flag if Firestore write fails', async () => {
    mockAddDoc.mockRejectedValueOnce(
      new Error('FirebaseError: Permission denied'),
    );

    await useCivicStore.getState().addIssue({
      title: 'Unsafe building',
      category: 'Safety',
      latitude: 40.75,
      longitude: -73.97,
      status: 'Open',
    });

    const state = useCivicStore.getState();
    // Issue should still be in local state (offline-first)
    const local = state.issues.find((i) => i.title === 'Unsafe building');
    expect(local).toBeDefined();
    // Store should surface the error
    expect(state.error).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST GROUP 4: Edge cases & data integrity
// ═══════════════════════════════════════════════════════════════════════════════

describe('data integrity and edge cases', () => {
  it('should not duplicate issues if fetchIssues is called twice rapidly', async () => {
    const firestoreIssues = [
      {
        id: 'fs-1',
        data: () => ({
          title: 'Issue A',
          category: 'Pothole',
          latitude: 40.71,
          longitude: -74.01,
          status: 'Open',
          createdAt: Date.now(),
        }),
      },
    ];
    mockGetDocs.mockResolvedValue({ docs: firestoreIssues, empty: false });

    await Promise.all([
      useCivicStore.getState().fetchIssues(),
      useCivicStore.getState().fetchIssues(),
    ]);

    const state = useCivicStore.getState();
    // Should have exactly 1 issue, not 2 duplicates
    expect(state.issues).toHaveLength(1);
  });

  it('should preserve existing user-reported issues when fetching from Firestore', async () => {
    // First, user reports an issue locally
    mockAddDoc.mockResolvedValueOnce({ id: 'local-report-1' });
    await useCivicStore.getState().addIssue({
      title: 'My local report',
      category: 'Pothole',
      latitude: 40.71,
      longitude: -74.01,
      status: 'Open',
    });

    // Then a fetch from Firestore should include that issue (since it was persisted)
    const firestoreIssues = [
      {
        id: 'local-report-1',
        data: () => ({
          title: 'My local report',
          category: 'Pothole',
          latitude: 40.71,
          longitude: -74.01,
          status: 'Open',
          createdAt: Date.now(),
        }),
      },
      {
        id: 'fs-other',
        data: () => ({
          title: 'Other issue',
          category: 'Sanitation',
          latitude: 40.72,
          longitude: -74.0,
          status: 'Open',
          createdAt: Date.now(),
        }),
      },
    ];
    mockGetDocs.mockResolvedValueOnce({ docs: firestoreIssues, empty: false });

    await useCivicStore.getState().fetchIssues();

    const state = useCivicStore.getState();
    expect(state.issues).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST GROUP 5: Authentication
// ═══════════════════════════════════════════════════════════════════════════════

describe('Authentication', () => {
  it('should store the user object in state when logging in', () => {
    const mockUser = { uid: 'user-123', email: 'hero@civic.app' };

    useCivicStore.getState().login(mockUser);

    const state = useCivicStore.getState();
    expect(state.user).toEqual(mockUser);
  });

  it('should clear the user object from state when logging out', () => {
    const mockUser = { uid: 'user-123', email: 'hero@civic.app' };
    useCivicStore.getState().login(mockUser);

    useCivicStore.getState().logout();

    const state = useCivicStore.getState();
    expect(state.user).toBeNull();
  });

  it('should attach userId to the Firestore document when adding a new issue', async () => {
    mockAddDoc.mockResolvedValueOnce({ id: 'fs-auth-issue' });

    const mockUser = { uid: 'user-456', email: 'citizen@civic.app' };
    useCivicStore.getState().login(mockUser);

    const newIssue = {
      title: 'Pothole on Main St',
      category: 'Pothole',
      latitude: 40.71,
      longitude: -74.01,
      status: 'Open',
    };

    await useCivicStore.getState().addIssue(newIssue);

    expect(mockAddDoc).toHaveBeenCalledTimes(1);

    const writtenDoc = mockAddDoc.mock.calls[0][1];
    expect(writtenDoc.userId).toBe('user-456');
  });

  it('should not attach userId if the user is not logged in', async () => {
    mockAddDoc.mockResolvedValueOnce({ id: 'fs-anon-issue' });

    useCivicStore.getState().logout(); // Ensure not logged in

    const newIssue = {
      title: 'Anonymous report',
      category: 'Sanitation',
      latitude: 40.71,
      longitude: -74.01,
      status: 'Open',
    };

    await useCivicStore.getState().addIssue(newIssue);

    expect(mockAddDoc).toHaveBeenCalledTimes(1);

    const writtenDoc = mockAddDoc.mock.calls[0][1];
    expect(writtenDoc.userId).toBeUndefined();
  });
});
