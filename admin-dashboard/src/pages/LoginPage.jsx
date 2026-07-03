import React, { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../firebase';

export default function LoginPage({ accessDenied, user }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.code === 'auth/invalid-credential'
        ? 'Invalid email or password.'
        : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  if (accessDenied) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="access-denied">
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
            <h2>Access Denied</h2>
            <p>
              You're signed in as <strong>{user?.email}</strong>, but this account
              does not have admin privileges. Contact a project administrator to
              get access.
            </p>
            <button className="btn-primary" onClick={() => signOut(auth)}>
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏛️</div>
          <h1>Civic Hero</h1>
          <p>Admin Dashboard — Sign in with your admin account</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@civichero.app"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
