import { onAuthStateChanged, signOut } from "firebase/auth";
import React, { useState, useEffect } from "react";
import MapScreen from "./components/MapScreen";
import ReportCamera from "./components/ReportCamera";
import ReportForm from "./components/ReportForm";
import ShareOverlay from "./components/ShareOverlay";
import LoginOverlay from "./components/LoginOverlay";
import { Camera, User } from "lucide-react";
import { useCivicStore } from "./store/useCivicStore";
import { auth } from "./lib/firebase";

function App() {
  const [currentView, setCurrentView] = useState("map"); // 'map', 'camera', 'form'
  const [capturedImage, setCapturedImage] = useState(null);
  const [shareIssue, setShareIssue] = useState(null);
  const [showLogin, setShowLogin] = useState(false);

  const user = useCivicStore((state) => state.user);
  const loginStore = useCivicStore((state) => state.login);
  const logoutStore = useCivicStore((state) => state.logout);

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

  const handleCapture = (imageUrl) => {
    setCapturedImage(imageUrl);
    setCurrentView("form");
  };

  const handleCancel = () => {
    setCurrentView("map");
    setCapturedImage(null);
  };

  const handleComplete = () => {
    setCurrentView("map");
    setCapturedImage(null);
  };

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {currentView === "map" && (
        <>
          <MapScreen onShareIssue={(issue) => setShareIssue(issue)} />

          {/* Top Right Auth Button */}
          <div
            style={{
              position: "absolute",
              top: "1.5rem",
              right: "1.5rem",
              zIndex: 10,
            }}
          >
            {user ? (
              <button
                className="brutalist-button"
                onClick={() => signOut(auth)}
                style={{
                  padding: "0.5rem 1rem",
                  fontSize: "0.8rem",
                  background: "#000",
                  color: "#fff",
                  border: "2px solid #fff",
                }}
              >
                SIGN OUT
              </button>
            ) : (
              <button
                className="brutalist-button"
                onClick={() => setShowLogin(true)}
                style={{
                  padding: "0.5rem 1rem",
                  fontSize: "0.8rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: "#000",
                  color: "#fff",
                  border: "2px solid #fff",
                  boxShadow: "4px 4px 0 #FF4500",
                }}
              >
                <User size={16} /> SIGN IN
              </button>
            )}
          </div>

          {/* Centered Aggressive Report Button */}
          <div
            style={{
              position: "absolute",
              bottom: "2rem",
              left: "0",
              right: "0",
              display: "flex",
              justifyContent: "center",
              zIndex: 10,
            }}
          >
            <button
              className="brutalist-button critical"
              onClick={() => setCurrentView("camera")}
              style={{
                padding: "1rem 2rem",
                fontSize: "1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                borderRadius: "0",
              }}
            >
              <Camera size={28} /> REPORT ISSUE
            </button>
          </div>
        </>
      )}

      {currentView === "camera" && (
        <ReportCamera onCapture={handleCapture} onCancel={handleCancel} />
      )}

      {currentView === "form" && (
        <ReportForm
          imageUrl={capturedImage}
          onCancel={handleCancel}
          onComplete={handleComplete}
        />
      )}

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
