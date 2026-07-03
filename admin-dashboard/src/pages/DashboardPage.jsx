import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export default function DashboardPage() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'issues'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setIssues(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const totalIssues = issues.length;
  const openCount = issues.filter(i => i.status === 'Open').length;
  const inProgressCount = issues.filter(i => i.status === 'In Progress').length;
  const solvedCount = issues.filter(i => i.status === 'Solved').length;
  const failedCount = issues.filter(i => i.status === 'Failed').length;
  const criticalCount = issues.filter(i => i.urgency === 'critical' || i.urgency === 'high').length;
  const resolutionRate = totalIssues > 0 ? Math.round((solvedCount / totalIssues) * 100) : 0;

  // Category breakdown
  const categoryMap = {};
  issues.forEach(issue => {
    const cat = issue.category || 'Other';
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  });
  const sortedCategories = Object.entries(categoryMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);
  const maxCategoryCount = sortedCategories.length > 0 ? sortedCategories[0][1] : 1;

  // Recent issues
  const recentIssues = issues.slice(0, 5);

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
        <h2>Dashboard</h2>
        <p>Real-time overview of community issues</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: 'var(--accent-surface)', color: 'var(--accent-light)' }}>📋</div>
          </div>
          <div className="stat-card-value">{totalIssues}</div>
          <div className="stat-card-label">Total Issues</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: 'var(--info-surface)', color: 'var(--info)' }}>🔵</div>
          </div>
          <div className="stat-card-value" style={{ color: 'var(--info)' }}>{openCount}</div>
          <div className="stat-card-label">Open</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: 'var(--warning-surface)', color: 'var(--warning)' }}>🟡</div>
          </div>
          <div className="stat-card-value" style={{ color: 'var(--warning)' }}>{inProgressCount}</div>
          <div className="stat-card-label">In Progress</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: 'var(--success-surface)', color: 'var(--success)' }}>✅</div>
          </div>
          <div className="stat-card-value" style={{ color: 'var(--success)' }}>{solvedCount}</div>
          <div className="stat-card-label">Resolved</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: 'var(--error-surface)', color: 'var(--error)' }}>🔴</div>
          </div>
          <div className="stat-card-value" style={{ color: 'var(--error)' }}>{criticalCount}</div>
          <div className="stat-card-label">Urgent / Critical</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: 'var(--success-surface)', color: 'var(--success)' }}>📈</div>
          </div>
          <div className="stat-card-value" style={{ color: 'var(--success)' }}>{resolutionRate}%</div>
          <div className="stat-card-label">Resolution Rate</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Category Breakdown */}
        <div className="section-card">
          <h3>Category Breakdown</h3>
          <div className="category-bar-list">
            {sortedCategories.map(([name, count]) => (
              <div className="category-bar-item" key={name}>
                <div className="category-bar-name">{name}</div>
                <div className="category-bar-track">
                  <div
                    className="category-bar-fill"
                    style={{ width: `${(count / maxCategoryCount) * 100}%` }}
                  />
                </div>
                <div className="category-bar-count">{count}</div>
              </div>
            ))}
            {sortedCategories.length === 0 && (
              <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>No data yet</p>
            )}
          </div>
        </div>

        {/* Recent Issues */}
        <div className="section-card">
          <h3>Recent Reports</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recentIssues.map(issue => (
              <div key={issue.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {issue.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    {issue.category} · {issue.authorName || 'Anonymous'}
                  </div>
                </div>
                <StatusBadge status={issue.status} />
              </div>
            ))}
            {recentIssues.length === 0 && (
              <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>No issues reported yet</p>
            )}
          </div>
        </div>
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
