import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import { useToast } from '../components/Toast';

export default function ModerationPage() {
  const showToast = useToast();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [typeFilter, setTypeFilter] = useState('All');
  const [resolvingId, setResolvingId] = useState(null);

  useEffect(() => {
    const constraints = [orderBy('hiddenAt', 'desc')];
    if (statusFilter !== 'All') {
      constraints.unshift(where('status', '==', statusFilter));
    }

    const q = query(collection(db, 'reportedContent'), ...constraints);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setReports(items);
        setLoading(false);
      },
      (error) => {
        console.error('[Moderation] Failed to load reports:', error);
        showToast('Failed to load moderation queue', 'error');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [statusFilter, showToast]);

  const filteredReports = reports.filter((report) => {
    if (typeFilter === 'All') return true;
    return report.type === typeFilter.toLowerCase();
  });

  const handleResolve = async (contentId, action) => {
    const label = action === 'dismiss' ? 'dismiss' : 'remove';
    const confirmed = window.confirm(
      action === 'dismiss'
        ? 'Dismiss this report and restore the content?'
        : 'Permanently remove this content? This cannot be undone.',
    );
    if (!confirmed) return;

    setResolvingId(contentId);
    try {
      const adminResolveReport = httpsCallable(functions, 'adminResolveReport');
      await adminResolveReport({ contentId, action });
      showToast(
        action === 'dismiss'
          ? 'Report dismissed — content restored'
          : 'Content removed',
        'success',
      );
    } catch (error) {
      console.error('[Moderation] Resolve failed:', error);
      showToast(`Failed to ${label} report: ${error.message}`, 'error');
    } finally {
      setResolvingId(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
    return (
      <div className="loading-screen" style={{ minHeight: '50vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>Moderation Queue</h2>
        <p>
          {filteredReports.length} report
          {filteredReports.length !== 1 ? 's' : ''} shown
          {statusFilter === 'pending' ? ' — awaiting review' : ''}
        </p>
      </div>

      <div className="issues-toolbar">
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="pending">Pending</option>
          <option value="dismissed">Dismissed</option>
          <option value="removed">Removed</option>
          <option value="All">All Statuses</option>
        </select>
        <select
          className="filter-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="All">All Types</option>
          <option value="Issue">Issues</option>
          <option value="Comment">Comments</option>
        </select>
      </div>

      {filteredReports.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">✅</div>
          <h3>No reports to review</h3>
          <p>
            The moderation queue is clear. Check back when users flag content.
          </p>
        </div>
      ) : (
        <div className="moderation-list">
          {filteredReports.map((report) => (
            <div key={report.id} className="moderation-card">
              <div className="moderation-card-header">
                <div className="moderation-card-meta">
                  <span
                    className={`badge badge-${report.type === 'comment' ? 'in-progress' : 'open'}`}
                  >
                    <span className="badge-dot" />
                    {report.type === 'comment' ? 'Comment' : 'Issue'}
                  </span>
                  <span
                    className={`badge badge-${report.status === 'pending' ? 'critical' : report.status === 'dismissed' ? 'low' : 'failed'}`}
                  >
                    {report.status}
                  </span>
                  <span className="moderation-report-count">
                    {report.reportCount || 0} report
                    {(report.reportCount || 0) !== 1 ? 's' : ''}
                  </span>
                </div>
                <span className="moderation-date">
                  {formatDate(report.hiddenAt)}
                </span>
              </div>

              <h3 className="moderation-title">
                {report.type === 'comment'
                  ? report.text || 'Comment content unavailable'
                  : report.title || 'Untitled issue'}
              </h3>

              {report.type === 'issue' && report.description && (
                <p className="moderation-description">{report.description}</p>
              )}

              <div className="moderation-author">
                <span>
                  By {report.authorName || report.authorId || 'Unknown'}
                </span>
                {report.category && <span> · {report.category}</span>}
              </div>

              {report.reports?.length > 0 && (
                <div className="moderation-reasons">
                  <strong>Report reasons:</strong>
                  <ul>
                    {report.reports.map((r, i) => (
                      <li key={i}>
                        <span className="moderation-reason-tag">
                          {r.reason}
                        </span>
                        {r.reporterId && (
                          <span className="moderation-reporter">
                            {' '}
                            from {r.reporterId.slice(0, 8)}…
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {report.status === 'pending' && (
                <div className="moderation-actions">
                  <button
                    className="btn-secondary"
                    disabled={resolvingId === report.id}
                    onClick={() => handleResolve(report.id, 'dismiss')}
                  >
                    {resolvingId === report.id
                      ? 'Processing…'
                      : 'Dismiss & Restore'}
                  </button>
                  <button
                    className="btn-danger"
                    disabled={resolvingId === report.id}
                    onClick={() => handleResolve(report.id, 'remove')}
                  >
                    {resolvingId === report.id
                      ? 'Processing…'
                      : 'Remove Content'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
