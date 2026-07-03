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
    limit,
    startAfter,
    where,
    serverTimestamp,
    onSnapshot
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebaseConfig';

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

        // If there's already a request in flight, wait for it unless force refresh is requested
        if (_pendingRequest && !forceRefresh) {
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
     * Fetch a single issue by ID directly from Firestore.
     * Much more efficient than getAllIssues().find() for detail screens.
     */
    getIssueById: async (issueId) => {
        if (!issueId) return null;
        try {
            const docRef = doc(db, ISSUES_COLLECTION, issueId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            }
            return null;
        } catch (error) {
            console.error("Error fetching issue by ID:", error);
            // Fallback: check cache
            const cached = _issueCache.find(i => i.id === issueId);
            return cached || null;
        }
    },

    /**
     * Fetch issues with pagination and optional category filtering.
     * Reduces data transfer by limiting document count per request.
     */
    getIssuesPaginated: async (pageSize = 10, lastDocSnap = null, category = 'All', userId = null) => {
        try {
            let constraints = [];
            
            if (category === 'Solved') {
                constraints.push(where('status', '==', 'Solved'));
            } else if (category === 'My Reports' && userId) {
                constraints.push(where('authorId', '==', userId));
            } else if (category === 'Urgent') {
                constraints.push(where('urgency', 'in', ['critical', 'high']));
            }
            
            // "Nearby" requires Geo-queries, so we skip adding a 'where' clause here 
            // and rely on client-side filtering if they select Nearby, or we just fetch 'All'.
            
            constraints.push(orderBy('createdAt', 'desc'));
            
            if (lastDocSnap) {
                constraints.push(startAfter(lastDocSnap));
            }
            
            constraints.push(limit(pageSize));

            const q = query(collection(db, ISSUES_COLLECTION), ...constraints);
            const snapshot = await getDocs(q);
            
            const issues = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            }));
            
            return {
                data: issues,
                lastDoc: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null
            };
        } catch (error) {
            console.error("Error fetching paginated issues. You may need to create a Firestore index. Check console for the link:", error.message);
            throw error;
        }
    },

    /**
     * Upload image to Firebase Storage and return the download URL.
     */
    uploadImage: async (uri) => {
        try {
            const response = await fetch(uri);
            const blob = await response.blob();
            const filename = `issues/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
            const storageRef = ref(storage, filename);
            await uploadBytes(storageRef, blob);
            return await getDownloadURL(storageRef);
        } catch (error) {
            console.error("Error uploading image:", error);
            throw new Error("Failed to upload image.");
        }
    },

    /**
     * Add new issue to Firestore.
     */
    addIssue: async (issueData) => {
        // We now use Firebase Storage, so issueData.photo will be a URL instead of base64.

        try {
            const newIssue = {
                ...issueData,
                votes: 0,
                voters: [],
                solvers: [],
                commentsCount: 0,
                createdAt: new Date().toISOString()
            };
            
            const docRef = await addDoc(collection(db, ISSUES_COLLECTION), {
                ...newIssue,
                timestamp: serverTimestamp()
            });

            IssueService.invalidateCache();
            return { id: docRef.id, ...newIssue };
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
                status: 'In Progress',
                statusUpdatedAt: new Date().toISOString()
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
                status: newStatus,
                statusUpdatedAt: new Date().toISOString()
            });
            IssueService.invalidateCache();
            return { success: true };
        } catch (error) {
            console.error("Error updating issue status:", error);
            throw error;
        }
    },

    /**
     * Fetch comments from subcollection.
     */
    getComments: async (id) => {
        try {
            const commentsRef = collection(db, ISSUES_COLLECTION, id, 'comments');
            const q = query(commentsRef, orderBy('createdAt', 'asc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            }));
        } catch (error) {
            console.error("Error fetching comments:", error);
            return [];
        }
    },

    /**
     * Add a comment to an issue's subcollection.
     */
    addComment: async (id, commentData) => {
        try {
            const newComment = {
                createdAt: new Date().toISOString(),
                ...commentData,
                timestamp: serverTimestamp()
            };
            const commentsRef = collection(db, ISSUES_COLLECTION, id, 'comments');
            const docRef = await addDoc(commentsRef, newComment);
            
            const issueRef = doc(db, ISSUES_COLLECTION, id);
            await updateDoc(issueRef, {
                commentsCount: increment(1)
            });
            
            IssueService.invalidateCache();
            return { id: docRef.id, ...newComment };
        } catch (error) {
            console.error("Error adding comment:", error);
            throw error;
        }
    },

    /**
     * Delete an issue.
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
    },

    /**
     * Subscribe to the full issues feed in real-time.
     * Updates the internal cache reactively and calls the callback with the latest data.
     * Returns an unsubscribe function.
     */
    subscribeToIssues: (onUpdate, onError) => {
        const q = query(
            collection(db, ISSUES_COLLECTION),
            orderBy('createdAt', 'desc'),
            limit(50)
        );
        return onSnapshot(q, (snapshot) => {
            const issues = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            }));
            // Update the internal cache
            _issueCache = issues;
            _lastFetchTime = Date.now();
            onUpdate(issues, snapshot.docChanges());
        }, (error) => {
            console.error('[IssueService] Real-time feed error:', error);
            if (onError) onError(error);
        });
    },

    /**
     * Subscribe to new issues only (lightweight — for "new issues" pill).
     * Returns an unsubscribe function.
     */
    subscribeToNewIssues: (onNewIssue) => {
        const q = query(
            collection(db, ISSUES_COLLECTION),
            orderBy('createdAt', 'desc'),
            limit(1)
        );
        let isFirstSnapshot = true;
        return onSnapshot(q, (snapshot) => {
            // Skip the initial snapshot (it's existing data)
            if (isFirstSnapshot) {
                isFirstSnapshot = false;
                return;
            }
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const issue = { id: change.doc.id, ...change.doc.data() };
                    onNewIssue(issue);
                }
            });
        }, (error) => {
            console.error('[IssueService] Real-time listener error:', error);
        });
    },

    /**
     * Upload and attach an "after" photo to a solved issue.
     */
    addAfterPhoto: async (issueId, photoUri) => {
        try {
            const response = await fetch(photoUri);
            const blob = await response.blob();
            const filename = `issues/after_${issueId}_${Date.now()}.jpg`;
            const storageRef = ref(storage, filename);
            await uploadBytes(storageRef, blob);
            const url = await getDownloadURL(storageRef);
            const issueRef = doc(db, ISSUES_COLLECTION, issueId);
            await updateDoc(issueRef, { afterPhoto: url });
            IssueService.invalidateCache();
            return url;
        } catch (error) {
            console.error('Error adding after photo:', error);
            throw error;
        }
    },
};
