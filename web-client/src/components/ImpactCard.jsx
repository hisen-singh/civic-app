import React from 'react';

/**
 * ImpactCard — The viral social sharing component.
 *
 * Two visual states driven by `issue.status`:
 *   "Open"   → Outrage Card  (Electric Orange, aggressive tone)
 *   "Solved" → Hero Card     (Celebratory tone using Electric Orange)
 *
 * Designed to be captured as a screenshot / exported as an image.
 * Uses NO border-radius, hard offset shadows, Space Grotesk 800.
 */

const CARD_WIDTH = 420;

const styles = {
  card: {
    width: CARD_WIDTH,
    background: 'var(--color-surface-card)',
    color: 'var(--color-text-primary)',
    border: '3px solid var(--color-border)',
    position: 'relative',
    overflow: 'hidden',
  },

  // ── Header Strip ──
  headerStrip: (accent) => ({
    background: accent,
    padding: '12px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  }),
  headerLabel: {
    fontSize: '0.7rem',
    fontWeight: 900,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: '#fff',
  },
  headerBrand: {
    fontSize: '0.7rem',
    fontWeight: 900,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: '#fff',
    opacity: 0.7,
  },

  // ── Body ──
  body: {
    padding: '24px 20px 20px',
  },
  category: (accent) => ({
    display: 'inline-block',
    border: `2px solid ${accent}`,
    padding: '4px 10px',
    fontSize: '0.7rem',
    fontWeight: 900,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: accent,
    marginBottom: 16,
  }),
  title: {
    fontSize: '1.6rem',
    fontWeight: 900,
    lineHeight: 1.15,
    textTransform: 'uppercase',
    letterSpacing: '-0.02em',
    margin: '0 0 20px 0',
  },
  description: {
    fontSize: '0.85rem',
    fontWeight: 500,
    color: 'var(--color-text-muted)',
    margin: '0 0 20px 0',
    lineHeight: 1.4,
  },

  // ── Stats Block ──
  statsBlock: {
    display: 'flex',
    gap: 0,
    marginBottom: 20,
    border: '2px solid var(--color-border)',
  },
  statCell: (accent, isFirst) => ({
    flex: 1,
    padding: '16px 14px',
    background: 'var(--color-surface-subtle)',
    borderLeft: isFirst ? 'none' : '2px solid var(--color-border)',
    textAlign: 'center',
  }),
  statNumber: (accent) => ({
    fontSize: '2.4rem',
    fontWeight: 900,
    lineHeight: 1,
    color: accent,
  }),
  statLabel: {
    fontSize: '0.6rem',
    fontWeight: 900,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: 'var(--color-text-muted)',
    marginTop: 6,
  },

  // ── Outrage CTA ──
  outrageMessage: {
    background: 'var(--color-surface-subtle)',
    border: '2px solid var(--color-accent-brand)',
    padding: '14px 16px',
    marginBottom: 16,
  },
  outrageText: {
    fontSize: '0.85rem',
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--color-accent-brand)',
    margin: 0,
    lineHeight: 1.4,
  },

  // ── Hero CTA ──
  heroMessage: {
    background: 'var(--color-surface-subtle)',
    border: '2px solid var(--color-accent-brand)',
    padding: '14px 16px',
    marginBottom: 16,
  },
  heroText: {
    fontSize: '0.85rem',
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--color-accent-brand)',
    margin: 0,
    lineHeight: 1.4,
  },

  // ── Footer ──
  footer: {
    borderTop: '2px solid var(--color-border)',
    padding: '12px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: '0.65rem',
    fontWeight: 700,
    color: 'var(--color-text-muted)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },

  // ── Resolved Stamp (diagonal overlay for Hero state) ──
  stamp: {
    position: 'absolute',
    top: 60,
    right: -20,
    transform: 'rotate(12deg)',
    border: '4px solid var(--color-accent-brand)',
    padding: '6px 36px',
    fontSize: '1.4rem',
    fontWeight: 900,
    color: 'var(--color-accent-brand)',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    opacity: 0.25,
    pointerEvents: 'none',
  },
};

export default function ImpactCard({ issue, cardRef }) {
  const isResolved = issue.status === 'Solved';
  const urgency = issue.urgency || 'medium';
  const accent =
    urgency === 'low'
      ? 'var(--color-status-low)'
      : urgency === 'critical'
        ? 'var(--color-status-critical)'
        : 'var(--color-status-medium)';

  return (
    <div ref={cardRef} style={styles.card}>
      {/* ── Header Strip ── */}
      <div style={styles.headerStrip(accent)}>
        <span style={styles.headerLabel}>
          {isResolved ? '✦ CIVIC IMPACT RECEIPT' : '⚠ CIVIC FAILURE REPORT'}
        </span>
        <span style={styles.headerBrand}>CIVIC</span>
      </div>

      {/* ── Resolved Stamp ── */}
      {isResolved && <div style={styles.stamp}>FIXED</div>}

      {/* ── Body ── */}
      <div style={styles.body}>
        <div style={styles.category(accent)}>{issue.category || 'ISSUE'}</div>
        <h2 className="font-display text-4xl" style={styles.title}>
          {issue.title}
        </h2>
        {issue.description && (
          <p style={styles.description}>{issue.description}</p>
        )}

        {/* ── Stats ── */}
        <div style={styles.statsBlock}>
          <div style={styles.statCell(accent, true)}>
            <div style={styles.statNumber(accent)}>{issue.daysOpen ?? 0}</div>
            <div style={styles.statLabel}>
              {isResolved ? 'Days to Fix' : 'Days Open'}
            </div>
          </div>
          <div style={styles.statCell(accent, false)}>
            <div style={styles.statNumber(accent)}>{issue.reports ?? 1}</div>
            <div style={styles.statLabel}>Reports</div>
          </div>
          <div style={styles.statCell(accent, false)}>
            <div style={styles.statNumber(accent)}>
              {isResolved ? '✓' : '✗'}
            </div>
            <div style={styles.statLabel}>
              {isResolved ? 'Resolved' : 'Unresolved'}
            </div>
          </div>
        </div>

        {/* ── CTA Message ── */}
        {isResolved ? (
          <div style={styles.heroMessage}>
            <p style={styles.heroText}>
              Citizens forced the city to fix this. Community power works.
            </p>
          </div>
        ) : (
          <div style={styles.outrageMessage}>
            <p style={styles.outrageText}>
              This has been broken for {issue.daysOpen ?? 0} days.{' '}
              {issue.reports ?? 1} neighbors reported it. Wake up, City Council.
            </p>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={styles.footer}>
        <span style={styles.footerText}>Report via CIVIC App</span>
        <span style={styles.footerText}>
          {new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      </div>
    </div>
  );
}
