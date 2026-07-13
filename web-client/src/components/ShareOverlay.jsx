import React, { useRef, useState } from "react";
import { toPng } from "html-to-image";
import ImpactCard from "./ImpactCard";
import { X, Download, Share2, Copy } from "lucide-react";

/**
 * ShareOverlay — Full-screen modal that renders the ImpactCard
 * and provides export actions (download PNG, copy to clipboard, Web Share API).
 */

export default function ShareOverlay({ issue, onClose }) {
  const cardRef = useRef(null);
  const [status, setStatus] = useState(null); // null | 'generating' | 'success' | 'error'

  const generateImage = async () => {
    if (!cardRef.current) return null;
    setStatus("generating");
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2, // High-res for social media
        backgroundColor: "#000",
      });
      return dataUrl;
    } catch (err) {
      console.error("Failed to generate image:", err);
      setStatus("error");
      return null;
    }
  };

  const handleDownload = async () => {
    const dataUrl = await generateImage();
    if (!dataUrl) return;

    const link = document.createElement("a");
    link.download = `civic-impact-${issue.id}.png`;
    link.href = dataUrl;
    link.click();
    setStatus("success");
    setTimeout(() => setStatus(null), 2000);
  };

  const handleCopyToClipboard = async () => {
    const dataUrl = await generateImage();
    if (!dataUrl) return;

    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setStatus("success");
      setTimeout(() => setStatus(null), 2000);
    } catch (err) {
      console.error("Clipboard write failed:", err);
      // Fallback to download
      handleDownload();
    }
  };

  const handleNativeShare = async () => {
    const dataUrl = await generateImage();
    if (!dataUrl) return;

    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `civic-impact-${issue.id}.png`, {
        type: "image/png",
      });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title:
            issue.status === "Solved"
              ? `Citizens fixed: ${issue.title}`
              : `${issue.daysOpen} days broken: ${issue.title}`,
          text:
            issue.status === "Solved"
              ? "Community power works. Reported on CIVIC."
              : `This has been broken for ${issue.daysOpen} days. Wake up, City Council.`,
          files: [file],
        });
        setStatus("success");
      } else {
        // Fallback if Web Share API doesn't support files
        handleDownload();
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Share failed:", err);
        handleDownload();
      }
    }
  };

  return (
    <div style={overlayStyles.backdrop} onClick={onClose}>
      <div style={overlayStyles.container} onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button onClick={onClose} style={overlayStyles.closeBtn}>
          <X size={28} />
        </button>

        {/* Header */}
        <h2 style={overlayStyles.header}>GENERATE SHARE CARD</h2>
        <p style={overlayStyles.subheader}>
          {issue.status === "Solved"
            ? "Share this civic win with your community."
            : "Hold the city accountable. Share this failure."}
        </p>

        {/* Card Preview */}
        <div style={overlayStyles.cardWrapper}>
          <ImpactCard issue={issue} cardRef={cardRef} />
        </div>

        {/* Action Buttons */}
        <div style={overlayStyles.actions}>
          <button
            className="brutalist-button critical"
            onClick={handleNativeShare}
            style={overlayStyles.actionBtn}
          >
            <Share2 size={20} /> SHARE
          </button>
          <button
            className="brutalist-button"
            onClick={handleDownload}
            style={overlayStyles.actionBtn}
          >
            <Download size={20} /> DOWNLOAD
          </button>
          <button
            className="brutalist-button"
            onClick={handleCopyToClipboard}
            style={{
              ...overlayStyles.actionBtn,
              background: "#fff",
              color: "#000",
            }}
          >
            <Copy size={20} /> COPY
          </button>
        </div>

        {/* Status Feedback */}
        {status === "generating" && (
          <p style={overlayStyles.status}>GENERATING...</p>
        )}
        {status === "success" && (
          <p style={{ ...overlayStyles.status, color: "#FFD700" }}>✓ DONE</p>
        )}
        {status === "error" && (
          <p style={{ ...overlayStyles.status, color: "#EF4444" }}>
            ✗ FAILED — TRY DOWNLOAD
          </p>
        )}
      </div>
    </div>
  );
}

const overlayStyles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 200,
    background: "rgba(0, 0, 0, 0.9)",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    overflowY: "auto",
    padding: "2rem",
  },
  container: {
    position: "relative",
    maxWidth: 500,
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  closeBtn: {
    position: "absolute",
    top: 0,
    right: 0,
    background: "transparent",
    border: "none",
    color: "#fff",
    cursor: "pointer",
    padding: 8,
  },
  header: {
    fontWeight: 800,
    fontSize: "1.4rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    margin: "0 0 6px 0",
    textAlign: "center",
  },
  subheader: {
    fontSize: "0.8rem",
    color: "#888",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    margin: "0 0 24px 0",
    textAlign: "center",
  },
  cardWrapper: {
    marginBottom: 24,
    boxShadow: "8px 8px 0px rgba(255, 255, 255, 0.1)",
  },
  actions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
    width: "100%",
  },
  actionBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: "0.85rem",
    padding: "0.65rem 1.2rem",
  },
  status: {
    marginTop: 16,
    fontSize: "0.75rem",
    fontWeight: 800,
    letterSpacing: "0.1em",
    color: "#fff",
    textTransform: "uppercase",
  },
};
