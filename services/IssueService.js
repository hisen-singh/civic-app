import {
    collection,
    getDocs,
    getDoc,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    arrayUnion,
    increment,
    query,
    orderBy,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

const ISSUES_COLLECTION = 'issues';

// In-memory cache to reduce redundant Firestore reads
let _issueCache = [];
let _lastFetchTime = 0;
const CACHE_TTL = 30000; // 30 seconds (was 10s — too aggressive)

// Request deduplication — prevents multiple simultaneous Firestore fetches
// when screens mount/focus at the same time
let _pendingRequest = null;

export const IssueService = {
    /**
     * Fetch all issues from Firestore.
     * Uses a short TTL cache to avoid hammering Firestore on rapid screen transitions.
     * Deduplicates concurrent requests to prevent multiple network calls.
     */
    getAllIssues: async (forceRefresh = false) => {
        const now = Date.now();
        if (!forceRefresh && _issueCache.length > 0 && (now - _lastFetchTime) < CACHE_TTL) {
            return _issueCache;
        }

        // If there's already a request in flight, wait for it instead of making a new one
        if (_pendingRequest) {
            return _pendingRequest;
        }

        _pendingRequest = (async () => {
            try {
                const q = query(
                    collection(db, ISSUES_COLLECTION),
                    orderBy('createdAt', 'desc')
                );
                const snapshot = await getDocs(q);
                _issueCache = snapshot.docs.map(d => ({
                    id: d.id,
                    ...d.data()
                }));
                _lastFetchTime = Date.now();
                return _issueCache;
            } catch (error) {
                console.error("Error fetching issues from Firestore:", error);
                // Return stale cache if available, empty array otherwise
                return _issueCache.length > 0 ? _issueCache : [];
            } finally {
                _pendingRequest = null;
            }
        })();

        return _pendingRequest;
    },

    /** Invalidate cache (call after mutations) */
    invalidateCache: () => {
        _lastFetchTime = 0;
    },

    /**
     * Add new issue to Firestore.
     * Validates photo size to prevent exceeding Firestore's 1MB document limit.
     */
    addIssue: async (issueData) => {
        // Guard: reject base64 photos larger than ~700KB to stay under Firestore 1MB doc limit
        if (issueData.photo && issueData.photo.length > 700000) {
            throw new Error("Photo is too large. Please use a lower quality or smaller image.");
        }

        try {
            const docRef = await addDoc(collection(db, ISSUES_COLLECTION), {
                ...issueData,
                votes: 0,
                voters: [],
                solvers: [],
                comments: [],
                createdAt: new Date().toISOString(),
                timestamp: serverTimestamp()
            });

            IssueService.invalidateCache();
            return { id: docRef.id, ...issueData };
        } catch (error) {
            console.error("Error adding issue to Firestore:", error);
            throw new Error("Failed to save issue. Please try again.");
        }
    },

    /**
     * Upvote an issue (idempotent — each user can only vote once).
     * Server-side: arrayUnion ensures deduplication.
     * Client-side: we also do a fresh read to verify before incrementing.
     */
    upvoteIssue: async (id, userId) => {
        try {
            // Fresh read to verify the user hasn't already voted
            const issueRef = doc(db, ISSUES_COLLECTION, id);
            const snap = await getDoc(issueRef);
            if (snap.exists()) {
                const data = snap.data();
                if ((data.voters || []).includes(userId)) {
                    return false; // Already voted — no-op
                }
            }

            await updateDoc(issueRef, {
                votes: increment(1),
                voters: arrayUnion(userId)
            });
            IssueService.invalidateCache();
            return true;
        } catch (error) {
            console.error("Error upvoting issue:", error);
            throw error;
        }
    },

    /**
     * Join/Solve an issue.
     * Uses arrayUnion so calling twice is safe.
     */
    joinIssue: async (id, userId) => {
        try {
            const issueRef = doc(db, ISSUES_COLLECTION, id);
            await updateDoc(issueRef, {
                solvers: arrayUnion(userId),
                status: 'In Progress'
            });
            IssueService.invalidateCache();
            return { success: true };
        } catch (error) {
            console.error("Error joining issue:", error);
            throw error;
        }
    },

    /**
     * Update issue status (Solved, Failed).
     */
    updateIssueStatus: async (id, newStatus) => {
        try {
            const issueRef = doc(db, ISSUES_COLLECTION, id);
            await updateDoc(issueRef, {
                status: newStatus
            });
            IssueService.invalidateCache();
            return { success: true };
        } catch (error) {
            console.error("Error updating issue status:", error);
            throw error;
        }
    },

    /**
     * Add a comment to an issue.
     */
    addComment: async (id, commentData) => {
        try {
            const newComment = {
                id: 'comment_' + Date.now().toString(),
                createdAt: new Date().toISOString(),
                ...commentData
            };
            const issueRef = doc(db, ISSUES_COLLECTION, id);
            await updateDoc(issueRef, {
                comments: arrayUnion(newComment)
            });
            IssueService.invalidateCache();
            return newComment;
        } catch (error) {
            console.error("Error adding comment:", error);
            throw error;
        }
    },

    /**
     * Delete an issue.
     * deleteDoc is now properly imported at the top of the file.
     */
    deleteIssue: async (id) => {
        try {
            const issueRef = doc(db, ISSUES_COLLECTION, id);
            await deleteDoc(issueRef);
            IssueService.invalidateCache();
            return true;
        } catch (error) {
            console.error("Error deleting issue:", error);
            throw error;
        }
    }
};
