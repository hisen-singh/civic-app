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
    onSnapshot,
    getCountFromServer
} from 'firebase/firestore';
import { ref, uploadBytes, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebaseConfig';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

const ISSUES_COLLECTION = 'issues';

// In-memory cache to reduce redundant Firestore reads
let _issueCache = [];
let _lastFetchTime = 0;
let _cacheGeneration = 0;
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
            const currentGen = _cacheGeneration;
            try {
                const q = query(
                    collection(db, ISSUES_COLLECTION),
                    orderBy('createdAt', 'desc')
                );
                const snapshot = await getDocs(q);
                
                // If cache was invalidated while fetching, discard this fetch's result 
                // to avoid overwriting cache with stale data.
                if (currentGen !== _cacheGeneration) {
                    return _issueCache.length > 0 ? _issueCache : snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                }

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

    getAppStats: async () => {
        try {
            const totalSnap = await getCountFromServer(collection(db, ISSUES_COLLECTION));
            const solvedSnap = await getCountFromServer(query(collection(db, ISSUES_COLLECTION), where('status', '==', 'Solved')));
            const inProgressSnap = await getCountFromServer(query(collection(db, ISSUES_COLLECTION), where('status', '==', 'In Progress')));
            const criticalSnap = await getCountFromServer(query(collection(db, ISSUES_COLLECTION), where('urgency', 'in', ['critical', 'high'])));
            
            return {
                total: totalSnap.data().count,
                solved: solvedSnap.data().count,
                inProgress: inProgressSnap.data().count,
                critical: criticalSnap.data().count,
                categories: [] // Categories require full scan or cloud function, leaving empty for now
            };
        } catch (e) {
            console.error("Error fetching app stats:", e);
            return { total: 0, solved: 0, inProgress: 0, critical: 0, categories: [] };
        }
    },

    getUserStats: async (uid) => {
        if (!uid) return { reported: 0, supported: 0, solved: 0, roadsSolved: 0, ecoSolved: 0 };
        try {
            const reportedSnap = await getCountFromServer(query(collection(db, ISSUES_COLLECTION), where('authorId', '==', uid)));
            const supportedSnap = await getCountFromServer(query(collection(db, ISSUES_COLLECTION), where('solvers', 'array-contains', uid)));
            
            // Note: These require composite indexes (solvers Array + status ASC, etc.)
            // If the indexes are not yet deployed, this might fail, so we wrap in try-catch.
            let solved = 0, roadsSolved = 0, ecoSolved = 0;
            try {
                const solvedSnap = await getCountFromServer(query(collection(db, ISSUES_COLLECTION), where('solvers', 'array-contains', uid), where('status', '==', 'Solved')));
                solved = solvedSnap.data().count;
            } catch (err) { console.warn("Missing index for solved stats", err.message); }

            return {
                reported: reportedSnap.data().count,
                supported: supportedSnap.data().count,
                solved,
                roadsSolved,
                ecoSolved
            };
        } catch (e) {
            console.error("Error fetching user stats:", e);
            return { reported: 0, supported: 0, solved: 0, roadsSolved: 0, ecoSolved: 0 };
        }
    },

    /** Invalidate cache (call after mutations) */
    invalidateCache: () => {
        _lastFetchTime = 0;
        _cacheGeneration += 1;
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
            // Compress the image before uploading
            const manipResult = await ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: 1080 } }], // Resize width to 1080px (maintaining aspect ratio)
                { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
            );

            const base64 = await FileSystem.readAsStringAsync(manipResult.uri, { encoding: FileSystem.EncodingType.Base64 });
            const filename = `issues/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
            const storageRef = ref(storage, filename);
            await uploadString(storageRef, base64, 'base64', { contentType: 'image/jpeg' });
            return await getDownloadURL(storageRef);
        } catch (error) {
            console.error("Error uploading image:", error);
            throw new Error("Failed to upload image.");
        }
    },

    /**
     * Add new issue to Firestore.
     * Validates input before writing to prevent malformed data.
     */
    addIssue: async (issueData) => {
        // Input validation
        if (!issueData || typeof issueData !== 'object') {
            throw new Error('Invalid issue data.');
        }
        if (!issueData.title || typeof issueData.title !== 'string' || issueData.title.trim().length < 5) {
            throw new Error('Title must be at least 5 characters.');
        }
        if (!issueData.description || typeof issueData.description !== 'string' || issueData.description.trim().length < 10) {
            throw new Error('Description must be at least 10 characters.');
        }
        if (issueData.title.length > 200) {
            throw new Error('Title must not exceed 200 characters.');
        }
        if (issueData.description.length > 5000) {
            throw new Error('Description must not exceed 5000 characters.');
        }
        const validStatuses = ['Open', 'In Progress', 'Solved', 'Failed'];
        if (issueData.status && !validStatuses.includes(issueData.status)) {
            throw new Error('Invalid status value.');
        }
        const validUrgencies = ['low', 'medium', 'high', 'critical'];
        if (issueData.urgency && !validUrgencies.includes(issueData.urgency)) {
            throw new Error('Invalid urgency level.');
        }

        try {
            const newIssue = {
                title: issueData.title.trim(),
                description: issueData.description.trim(),
                category: issueData.category || 'Other',
                status: issueData.status || 'Open',
                urgency: issueData.urgency || 'medium',
                location: issueData.location || '',
                latitude: issueData.latitude || null,
                longitude: issueData.longitude || null,
                authorId: issueData.authorId || 'anonymous',
                authorName: issueData.authorName || 'Citizen',
                youtubeUrl: issueData.youtubeUrl || '',
                photo: issueData.photo || null,
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
     * Fetch comments from subcollection with pagination.
     * @param {string} id - Issue ID
     * @param {number} pageSize - Number of comments per page (default 50)
     * @param {object|null} lastDoc - Last document snapshot for pagination
     * @returns {{ comments: Array, lastDoc: object|null, hasMore: boolean }}
     */
    getComments: async (id, pageSize = 50, lastDocSnap = null) => {
        try {
            const commentsRef = collection(db, ISSUES_COLLECTION, id, 'comments');
            let q;
            if (lastDocSnap) {
                q = query(commentsRef, orderBy('createdAt', 'asc'), startAfter(lastDocSnap), limit(pageSize));
            } else {
                q = query(commentsRef, orderBy('createdAt', 'asc'), limit(pageSize));
            }
            const snapshot = await getDocs(q);
            const comments = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            }));
            const newLastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
            return {
                comments,
                lastDoc: newLastDoc,
                hasMore: snapshot.docs.length === pageSize
            };
        } catch (error) {
            console.error("Error fetching comments:", error);
            return { comments: [], lastDoc: null, hasMore: false };
        }
    },

    /**
     * Add a comment to an issue's subcollection.
     */
    addComment: async (id, commentData) => {
        if (!commentData || typeof commentData.text !== 'string') {
            throw new Error('Comment text is required.');
        }
        const text = commentData.text.trim();
        if (text.length < 1 || text.length > 1000) {
            throw new Error('Comment must be between 1 and 1000 characters.');
        }

        try {
            const newComment = {
                text,
                authorId: commentData.authorId || 'anonymous',
                authorName: commentData.authorName || 'Citizen',
                createdAt: new Date().toISOString(),
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
     * Upload and attach an "after" photo to a solved issue.
     */
    addAfterPhoto: async (issueId, photoUri) => {
        try {
            // Compress the image before uploading
            const manipResult = await ImageManipulator.manipulateAsync(
                photoUri,
                [{ resize: { width: 1080 } }],
                { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
            );

            const response = await fetch(manipResult.uri);
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
