import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import IssuesPage from './pages/IssuesPage';
import Sidebar from './components/Sidebar';

export default function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const tokenResult = await firebaseUser.getIdTokenResult();
        const adminClaim = tokenResult.claims.admin === true;
        setUser(firebaseUser);
        setIsAdmin(adminClaim);
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>Loading dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (!isAdmin) {
    return <LoginPage accessDenied user={user} />;
  }

  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar user={user} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/issues" element={<IssuesPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
