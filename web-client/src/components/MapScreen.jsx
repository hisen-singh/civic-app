import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useCivicStore } from "../store/useCivicStore";
import { Share2 } from "lucide-react";

// Custom Map Marker using Lucide
const customIcon = new L.DivIcon({
  className: "custom-icon",
  html: `<div style="background-color: #FFD700; width: 16px; height: 16px; border-radius: 50%; border: 2px solid #000; box-shadow: 2px 2px 0 #fff;"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Component to handle initial positioning and seeding
function MapSetup() {
  const map = useMap();
  const seedMap = useCivicStore((state) => state.seedMap);

  useEffect(() => {
    // Default to New York or get user location
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.setView([latitude, longitude], 14);
        seedMap(latitude, longitude);
      },
      (err) => {
        console.warn("Location denied, using default", err);
        const lat = 40.7128;
        const lng = -74.006;
        map.setView([lat, lng], 14);
        seedMap(lat, lng);
      },
      { timeout: 5000 },
    );
  }, [map, seedMap]);

  return null;
}

export default function MapScreen({ onShareIssue }) {
  const issues = useCivicStore((state) => state.issues);

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      <MapContainer
        center={[40.7128, -74.006]}
        zoom={14}
        style={{ height: "100%", width: "100%", zIndex: 1 }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
        />
        <MapSetup />

        {issues.map((issue) => (
          <Marker
            key={issue.id}
            position={[issue.latitude, issue.longitude]}
            icon={customIcon}
          >
            <Popup className="brutalist-popup">
              <div
                style={{
                  background: "#000",
                  color: "#fff",
                  padding: "0.5rem",
                  border: "2px solid #fff",
                  boxShadow: "4px 4px 0 #FFD700",
                }}
              >
                <h3
                  style={{
                    textTransform: "uppercase",
                    fontWeight: 800,
                    margin: "0 0 0.5rem 0",
                    fontSize: "1.2rem",
                    color: "#FFD700",
                  }}
                >
                  {issue.title}
                </h3>
                <p style={{ margin: "0 0 0.5rem 0", fontWeight: 600 }}>
                  {issue.category}
                </p>

                <div
                  style={{
                    background: "#111",
                    padding: "0.5rem",
                    border: "1px solid #333",
                    marginBottom: "0.5rem",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 0.25rem 0",
                      fontSize: "0.8rem",
                      color: "#EF4444",
                      fontWeight: 800,
                    }}
                  >
                    OPEN FOR {issue.daysOpen} DAYS
                  </p>
                  <p style={{ margin: 0, fontSize: "0.8rem" }}>
                    {issue.reports} NEIGHBORS REPORTED
                  </p>
                </div>

                <button
                  className="brutalist-button"
                  onClick={() => onShareIssue && onShareIssue(issue)}
                  style={{
                    width: "100%",
                    fontSize: "0.8rem",
                    padding: "0.5rem",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Share2 size={16} /> GENERATE SHARE CARD
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Title Overlay */}
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        <h1
          style={{
            fontSize: "3rem",
            fontWeight: 800,
            textTransform: "uppercase",
            textShadow: "4px 4px 0px #FFD700",
            margin: 0,
            lineHeight: 1,
          }}
        >
          CIVIC
        </h1>
      </div>
    </div>
  );
}
