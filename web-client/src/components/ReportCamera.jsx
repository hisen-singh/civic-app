import React, { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";

export default function ReportCamera({ onCapture, onCancel }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let stream = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasPermission(true);
      } catch (err) {
        console.error("Camera access denied or failed", err);
        setError("Camera access is required to report an issue.");
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleSnap = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageUrl = canvas.toDataURL("image/jpeg", 0.8);

    // Stop camera
    const stream = video.srcObject;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    onCapture(imageUrl);
  };

  if (error) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          textAlign: "center",
          background: "var(--color-surface)",
          color: "var(--color-text-primary)",
        }}
      >
        <p
          style={{
            color: "var(--color-accent-brand)",
            fontWeight: 800,
            fontSize: "1.5rem",
            marginBottom: "1rem",
          }}
        >
          {error}
        </p>
        <button className="brutalist-button rounded-none" onClick={onCancel}>
          BACK TO MAP
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "#000",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 101,
        }}
      >
        <h2
          className="font-display text-4xl"
          style={{
            margin: 0,
            textTransform: "uppercase",
            color: "#fff",
            textShadow: "2px 2px 0px var(--color-accent-brand)",
          }}
        >
          REPORT ISSUE
        </h2>
        <button
          onClick={onCancel}
          style={{
            background: "transparent",
            border: "none",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          <X size={32} />
        </button>
      </div>

      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Reticle / Framing Guide */}
        <div
          style={{
            position: "absolute",
            inset: "10%",
            border: "2px dashed rgba(255, 255, 255, 0.5)",
            pointerEvents: "none",
          }}
        ></div>
      </div>

      <div
        style={{
          padding: "2rem",
          display: "flex",
          justifyContent: "center",
          background: "#000",
          borderTop: "2px solid var(--color-border)",
        }}
      >
        <button
          onClick={handleSnap}
          style={{
            width: 80,
            height: 80,
            borderRadius: "0px",
            background: "var(--color-accent-brand)",
            border: "4px solid #fff",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            cursor: "pointer",
            boxShadow: "4px 4px 0px #fff",
          }}
        >
          <Camera size={32} color="#fff" />
        </button>
      </div>
    </div>
  );
}
