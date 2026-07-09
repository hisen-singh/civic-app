import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { IssuesProvider } from './contexts/IssuesContext';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import LoginPage from './pages/LoginPage';
import Sidebar from './components/Sidebar';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const IssuesPage = lazy(() => import('./pages/IssuesPage'));

function PageLoader() {
  return (
    <div className="loading-screen" style={{ minHeight: '50vh' }}>
      <div className="spinner" />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const tokenResult = await firebaseUser.getIdTokenResult();
          setIsAdmin(tokenResult.claims.admin === true);
        } catch (e) {
          console.warn('[Admin] Failed to check admin claim:', e);
          setIsAdmin(false);
        }
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
      <IssuesProvider>
        <ToastProvider>
          <ErrorBoundary>
            <div className="app-layout">
              <Sidebar user={user} />
              <main className="main-content">
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/issues" element={<IssuesPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </main>
            </div>
          </ErrorBoundary>
        </ToastProvider>
      </IssuesProvider>
    </BrowserRouter>
  );
}
