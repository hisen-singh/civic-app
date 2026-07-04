import React, { useState, useMemo } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { useIssues } from '../contexts/IssuesContext';

export default function IssuesPage() {
  const { issues, loading } = useIssues();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [urgencyFilter, setUrgencyFilter] = useState('All');
  const [updatingId, setUpdatingId] = useState(null);

  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      const matchesSearch = !searchTerm ||
        issue.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.authorName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || issue.status === statusFilter;
      const matchesUrgency = urgencyFilter === 'All' || issue.urgency === urgencyFilter;
      return matchesSearch && matchesStatus && matchesUrgency;
    });
  }, [issues, searchTerm, statusFilter, urgencyFilter]);

  const handleStatusChange = async (issueId, newStatus) => {
    setUpdatingId(issueId);
    try {
      const adminUpdateIssueStatus = httpsCallable(functions, 'adminUpdateIssueStatus');
      await adminUpdateIssueStatus({ issueId, newStatus });
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status: ' + error.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '—';
    const now = new Date();
    const date = new Date(dateStr);
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
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
        <h2>All Issues</h2>
        <p>{filteredIssues.length} of {issues.length} issues shown</p>
      </div>

      {/* Toolbar */}
      <div className="issues-toolbar">
        <div className="search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Search issues by title, category, location..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="All">All Statuses</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Solved">Solved</option>
          <option value="Failed">Failed</option>
        </select>
        <select
          className="filter-select"
          value={urgencyFilter}
          onChange={e => setUrgencyFilter(e.target.value)}
        >
          <option value="All">All Urgencies</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Table */}
      <div className="issues-table">
        <table>
          <thead>
            <tr>
              <th>Issue</th>
              <th>Category</th>
              <th>Urgency</th>
              <th>Status</th>
              <th>Votes</th>
              <th>Reported</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredIssues.map(issue => (
              <tr key={issue.id}>
                <td className="issue-title-cell">
                  <div className="issue-title">{issue.title}</div>
                  <div className="issue-author">{issue.authorName || 'Anonymous'} · {issue.location || 'No location'}</div>
                </td>
                <td>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {issue.category || '—'}
                  </span>
                </td>
                <td>
                  <UrgencyBadge urgency={issue.urgency} />
                </td>
                <td>
                  <StatusBadge status={issue.status} />
                </td>
                <td>
                  <span style={{ fontWeight: 700 }}>{issue.votes || 0}</span>
                </td>
                <td>
                  <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                    {timeAgo(issue.createdAt)}
                  </span>
                </td>
                <td>
                  <div className="status-actions">
                    {issue.status !== 'Solved' && (
                      <button
                        className="btn-status btn-solve"
                        onClick={() => handleStatusChange(issue.id, 'Solved')}
                        disabled={updatingId === issue.id}
                      >
                        {updatingId === issue.id ? '...' : '✓ Solve'}
                      </button>
                    )}
                    {issue.status !== 'In Progress' && issue.status !== 'Solved' && (
                      <button
                        className="btn-status"
                        onClick={() => handleStatusChange(issue.id, 'In Progress')}
                        disabled={updatingId === issue.id}
                      >
                        In Progress
                      </button>
                    )}
                    {issue.status !== 'Failed' && issue.status !== 'Solved' && (
                      <button
                        className="btn-status btn-fail"
                        onClick={() => handleStatusChange(issue.id, 'Failed')}
                        disabled={updatingId === issue.id}
                      >
                        ✗ Fail
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredIssues.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <h3>No issues found</h3>
                    <p>Try adjusting your search or filters.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const classMap = {
    'Open': 'badge-open',
    'In Progress': 'badge-in-progress',
    'Solved': 'badge-solved',
    'Failed': 'badge-failed',
  };
  return (
    <span className={`badge ${classMap[status] || 'badge-open'}`}>
      <span className="badge-dot" />
      {status}
    </span>
  );
}

function UrgencyBadge({ urgency }) {
  const classMap = { critical: 'badge-critical', high: 'badge-high', medium: 'badge-medium', low: 'badge-low' };
  const labels = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
  return (
    <span className={`badge ${classMap[urgency] || 'badge-medium'}`}>
      {labels[urgency] || 'Medium'}
    </span>
  );
}
