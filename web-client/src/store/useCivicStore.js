import { create } from 'zustand';
import {
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { io } from 'socket.io-client';

// ─── Seed Data Generator ─────────────────────────────────────────────────────
// Pre-generates realistic civic issues around a coordinate for the "Cold Start"
// requirement. Only used when Firestore is empty or unreachable.

const generateDummyIssues = (baseLat, baseLng) => {
  const issues = [];
  const categories = ['Pothole', 'Streetlight', 'Sanitation', 'Vandalism'];
  const titles = [
    'Massive Crater on Main St',
    'Streetlight out for 3 weeks',
    'Illegal dumping site',
    'Graffiti on stop sign',
  ];

  for (let i = 0; i < 20; i++) {
    const latOffset = (Math.random() - 0.5) * 0.02;
    const lngOffset = (Math.random() - 0.5) * 0.02;

    issues.push({
      id: `seeded-${i}`,
      title: titles[Math.floor(Math.random() * titles.length)],
      category: categories[Math.floor(Math.random() * categories.length)],
      latitude: baseLat + latOffset,
      longitude: baseLng + lngOffset,
      status: Math.random() > 0.8 ? 'Solved' : 'Open',
      createdAt: Date.now() - Math.floor(Math.random() * 10000000000),
      daysOpen: Math.floor(Math.random() * 180),
      reports: Math.floor(Math.random() * 50) + 1,
    });
  }

  return issues.sort((a, b) => b.createdAt - a.createdAt);
};

// ─── Request Deduplication ───────────────────────────────────────────────────
// Prevents multiple simultaneous Firestore fetches when components mount at the
// same time.
let _pendingFetch = null;

// ─── Store ───────────────────────────────────────────────────────────────────

export const useCivicStore = create((set, get) => ({
  issues: [],
  user: null,
  isLoading: false,
  isSeeded: false,
  error: null,

  login: (user) => set({ user }),
  logout: () => set({ user: null }),

  // ── Fetch issues from Firestore, fallback to seed data if empty/error ──
  fetchIssues: async (lat, lng) => {
    // Deduplication: if a fetch is already in-flight, return the same promise
    if (_pendingFetch) return _pendingFetch;

    set({ isLoading: true });

    _pendingFetch = (async () => {
      try {
        const q = query(collection(db, 'issues'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          // Firestore has no data — seed the map so it's never empty on day one
          const fallbackLat = lat ?? 40.7128;
          const fallbackLng = lng ?? -74.006;
          const seededData = generateDummyIssues(fallbackLat, fallbackLng);
          set({ issues: seededData, isSeeded: true, isLoading: false });
        } else {
          // Real data from Firestore — use it directly
          const issues = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          set({ issues, isLoading: false });
        }
      } catch (err) {
        console.error('Failed to fetch issues from Firestore:', err);
        // Network failure — seed locally so the user still sees a populated map
        const fallbackLat = lat ?? 40.7128;
        const fallbackLng = lng ?? -74.006;
        const seededData = generateDummyIssues(fallbackLat, fallbackLng);
        set({
          issues: seededData,
          isSeeded: true,
          isLoading: false,
          error: err.message,
        });
      } finally {
        _pendingFetch = null;
      }
    })();

    return _pendingFetch;
  },

  // ── Legacy seedMap — still used by MapScreen when no Firestore fetch ──
  seedMap: (lat, lng) => {
    if (get().isSeeded) return;
    const seededData = generateDummyIssues(lat, lng);
    set({ issues: seededData, isSeeded: true });
  },

  // ── Add issue: optimistic local update + async Firestore persist ──
  addIssue: (newIssue) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const issueWithTempId = { ...newIssue, id: tempId };
    const currentUser = get().user;

    // Step 1: Optimistic update — add to local state BEFORE Firestore responds
    // Optimized for fine-grained reactivity by maintaining immutable references
    set((state) => ({ issues: [issueWithTempId, ...state.issues] }));

    // Step 2: Persist to Firestore asynchronously
    const writePromise = (async () => {
      try {
        const payload = {
          ...newIssue,
          createdAt: serverTimestamp(),
        };
        // Set both userId and authorId for test and Cloud Functions compatibility
        if (currentUser) {
          payload.userId = currentUser.uid;
          payload.authorId = currentUser.uid;
        }

        const docRef = await addDoc(collection(db, 'issues'), payload);
        // Step 3: Swap the temp ID with the real Firestore document ID
        set((state) => ({
          issues: state.issues.map((i) =>
            i.id === tempId ? { ...i, id: docRef.id } : i,
          ),
        }));
      } catch (err) {
        console.error('Failed to persist issue to Firestore:', err);
        // Keep the issue in local state (offline-first), but surface the error
        set({ error: err.message });
      }
    })();

    return writePromise;
  },

  // ── Deep Binding: Real-Time Infrastructure ────────────────────────────────
  initializeRealtimeFeed: () => {
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000');

    socket.on('connect', () => {
      console.info('WebSocket feed connected:', socket.id);
    });

    socket.on('issue_created', (newIssue) => {
      set((state) => {
        // Prevent duplicate issues if we already added it optimistically
        if (state.issues.some((i) => i.id === newIssue.id)) return state;
        return { issues: [newIssue, ...state.issues] };
      });
    });

    socket.on('disconnect', () => {
      console.info('WebSocket feed disconnected');
    });
  },
}));
