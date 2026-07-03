import { useState, useCallback } from 'react';
import { IssueService } from '../services/IssueService';

export const useIssues = () => {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [lastDoc, setLastDoc] = useState(null);

    const loadIssues = useCallback(async (isRefresh = false, category = 'All', userId = null) => {
        if (!isRefresh && !hasMore) return;
        
        if (isRefresh) {
            setLoading(true);
        }

        try {
            setError(null);
            const { data, lastDoc: newLastDoc } = await IssueService.getIssuesPaginated(
                10,
                isRefresh ? null : lastDoc,
                category,
                userId
            );

            setIssues(prev => {
                if (isRefresh) return data;
                const newItems = data.filter(d => !prev.some(p => p.id === d.id));
                return [...prev, ...newItems];
            });
            
            setLastDoc(newLastDoc);
            setHasMore(data.length === 10);
        } catch (err) {
            setError(err.message || 'Failed to load issues');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [lastDoc, hasMore]);

    const addIssue = useCallback(async (issueData) => {
        setLoading(true);
        try {
            const newIssue = await IssueService.addIssue(issueData);
            setIssues(prev => [newIssue, ...prev]);
            return newIssue;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const upvoteIssue = useCallback(async (id, userId) => {
        try {
            const success = await IssueService.upvoteIssue(id, userId);
            if (success) {
                setIssues(prev => prev.map(issue => 
                    issue.id === id 
                        ? { ...issue, votes: issue.votes + 1, voters: [...(issue.voters || []), userId] }
                        : issue
                ));
            }
            return success;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    return {
        issues,
        loading,
        error,
        hasMore,
        loadIssues,
        addIssue,
        upvoteIssue
    };
};
