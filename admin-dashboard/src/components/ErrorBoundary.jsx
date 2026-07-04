import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[AdminErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '60vh', padding: 40, textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 14, marginBottom: 24, maxWidth: 400 }}>
            An unexpected error occurred in the admin dashboard. This has been logged.
          </p>
          <button
            className="btn-primary"
            style={{ width: 'auto', padding: '12px 32px' }}
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </button>
          {this.state.error && (
            <pre style={{
              marginTop: 24, padding: 16, background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-sm)', fontSize: 11, color: 'var(--error)',
              maxWidth: 500, overflow: 'auto', textAlign: 'left',
            }}>
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
