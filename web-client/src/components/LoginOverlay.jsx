import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { useCivicStore } from "../store/useCivicStore";
import { X } from "lucide-react";

export default function LoginOverlay({ onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const loginStore = useCivicStore((state) => state.login);

  const handleAuth = async (isSignUp) => {
    if (!email || !password) {
      setError("EMAIL AND PASSWORD REQUIRED");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      let userCredential;
      if (isSignUp) {
        userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
      } else {
        userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password,
        );
      }

      loginStore({
        uid: userCredential.user.uid,
        email: userCredential.user.email,
      });
      onClose();
    } catch (err) {
      console.error("Auth error:", err);
      setError(err.message.replace("Firebase: ", "").toUpperCase());
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.container} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={styles.closeBtn}>
          <X size={32} color="#fff" />
        </button>

        <div style={styles.header}>
          <h2 style={styles.title}>ACCESS</h2>
          <p style={styles.subtitle}>IDENTIFY YOURSELF TO REPORT ISSUES</p>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        <div style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>EMAIL</label>
            <input
              type="email"
              style={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="CITIZEN@CIVIC.APP"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>PASSWORD</label>
            <input
              type="password"
              style={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div style={styles.actions}>
            <button
              className="brutalist-button critical"
              style={{ ...styles.actionBtn, background: "#FF4500" }}
              onClick={() => handleAuth(false)}
              disabled={isLoading}
            >
              {isLoading ? "WORKING..." : "SIGN IN"}
            </button>
            <button
              className="brutalist-button"
              style={{
                ...styles.actionBtn,
                background: "#FFD700",
                color: "#000",
              }}
              onClick={() => handleAuth(true)}
              disabled={isLoading}
            >
              {isLoading ? "WORKING..." : "CREATE ACCOUNT"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 300,
    background: "rgba(0, 0, 0, 0.85)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "1rem",
  },
  container: {
    background: "#000",
    border: "3px solid #fff",
    boxShadow: "8px 8px 0px #FF4500",
    width: "100%",
    maxWidth: "460px",
    padding: "2.5rem 2rem",
    position: "relative",
    fontFamily: "'Space Grotesk', sans-serif",
  },
  closeBtn: {
    position: "absolute",
    top: "1rem",
    right: "1rem",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: "0.25rem",
  },
  header: {
    marginBottom: "2rem",
  },
  title: {
    color: "#fff",
    fontSize: "3rem",
    fontWeight: 800,
    margin: "0 0 0.25rem 0",
    textTransform: "uppercase",
    letterSpacing: "-0.02em",
    lineHeight: 1,
  },
  subtitle: {
    color: "#FFD700",
    fontSize: "0.85rem",
    fontWeight: 800,
    margin: 0,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  },
  errorBox: {
    background: "#111",
    border: "2px solid #FF4500",
    color: "#FF4500",
    padding: "1rem",
    marginBottom: "1.5rem",
    fontSize: "0.75rem",
    fontWeight: 800,
    textTransform: "uppercase",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  label: {
    color: "#fff",
    fontSize: "0.85rem",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  },
  input: {
    background: "#000",
    border: "2px solid #fff",
    color: "#fff",
    padding: "1rem",
    fontSize: "1.25rem",
    fontWeight: 600,
    fontFamily: "'Space Grotesk', sans-serif",
    outline: "none",
  },
  actions: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    marginTop: "1rem",
  },
  actionBtn: {
    width: "100%",
    padding: "1.25rem",
    fontSize: "1.2rem",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
};
