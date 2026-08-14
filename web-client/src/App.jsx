import { onAuthStateChanged, signOut } from 'firebase/auth';
import React, { useState, useEffect } from 'react';
import MapScreen from './components/MapScreen';
import ReportCamera from './components/ReportCamera';
import ReportForm from './components/ReportForm';
import ShareOverlay from './components/ShareOverlay';
import LoginOverlay from './components/LoginOverlay';
import { Camera, User } from 'lucide-react';
import { useCivicStore } from './store/useCivicStore';
import { auth } from './lib/firebase';

function App() {
  const [currentView, setCurrentView] = useState('map'); // 'map', 'camera', 'form'
  const [capturedImage, setCapturedImage] = useState(null);
  const [shareIssue, setShareIssue] = useState(null);
  const [showLogin, setShowLogin] = useState(false);

  const user = useCivicStore((state) => state.user);
  const loginStore = useCivicStore((state) => state.login);
  const logoutStore = useCivicStore((state) => state.logout);
  const initializeRealtimeFeed = useCivicStore(
    (state) => state.initializeRealtimeFeed,
  );

  // Sync Firebase auth state with Zustand store
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        loginStore({ uid: firebaseUser.uid, email: firebaseUser.email });
      } else {
        logoutStore();
      }
    });
    return () => unsubscribe();
  }, [loginStore, logoutStore]);

  // Initialize Real-Time WebSockets Feed
  useEffect(() => {
    initializeRealtimeFeed();
  }, [initializeRealtimeFeed]);

  const handleCapture = (imageUrl) => {
    setCapturedImage(imageUrl);
    setCurrentView('form');
  };

  const handleCancel = () => {
    setCurrentView('map');
    setCapturedImage(null);
  };

  const handleComplete = () => {
    setCurrentView('map');
    setCapturedImage(null);
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100dvh',
        flexDirection: 'column',
        backgroundColor: 'var(--color-surface)',
      }}
    >
      {/* Semantic Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          backgroundColor: 'var(--color-surface)',
          borderBottom: '2px solid var(--color-border)',
        }}
      >
        <h1
          className="font-display"
          style={{
            fontSize: '2rem',
            lineHeight: 1,
            letterSpacing: '-0.02em',
            color: 'var(--color-text-primary)',
          }}
        >
          CIVIC
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: 'var(--color-accent-brand)',
              color: '#fff',
              border: '2px solid var(--color-border)',
              borderRadius: 0,
              fontWeight: 700,
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
            onClick={() => setCurrentView('camera')}
          >
            <Camera size={18} /> Report Issue
          </button>

          {user ? (
            <button
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                border: '2px solid var(--color-border)',
                borderRadius: 0,
                fontWeight: 700,
                textTransform: 'uppercase',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
              onClick={() => signOut(auth)}
            >
              Sign Out
            </button>
          ) : (
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                border: '2px solid var(--color-border)',
                borderRadius: 0,
                fontWeight: 700,
                textTransform: 'uppercase',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
              onClick={() => setShowLogin(true)}
            >
              <User size={16} /> Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        {currentView === 'map' && (
          <MapScreen onShareIssue={(issue) => setShareIssue(issue)} />
        )}

        {currentView === 'camera' && (
          <ReportCamera onCapture={handleCapture} onCancel={handleCancel} />
        )}

        {currentView === 'form' && (
          <ReportForm
            imageUrl={capturedImage}
            onCancel={handleCancel}
            onComplete={handleComplete}
          />
        )}
      </main>

      {/* Share Overlay — renders above everything when an issue is selected */}
      {shareIssue && (
        <ShareOverlay issue={shareIssue} onClose={() => setShareIssue(null)} />
      )}

      {/* Login Overlay */}
      {showLogin && <LoginOverlay onClose={() => setShowLogin(false)} />}
    </div>
  );
}

export default App;
