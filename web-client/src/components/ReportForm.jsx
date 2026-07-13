import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCivicStore } from "../store/useCivicStore";
import { Check, X } from "lucide-react";

const reportSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  category: z.string().min(1, "Please select a category"),
});

export default function ReportForm({ imageUrl, onCancel, onComplete }) {
  const addIssue = useCivicStore((state) => state.addIssue);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(reportSchema),
  });

  const onSubmit = (data) => {
    // In a real app, this would get the actual user GPS and upload the photo to Firebase Storage
    // Here we use a fake GPS location based on NYC center (40.7128, -74.0060) with a tiny random offset
    const newIssue = {
      id: `reported-${Date.now()}`,
      title: data.title,
      category: data.category,
      latitude: 40.7128 + (Math.random() - 0.5) * 0.01,
      longitude: -74.006 + (Math.random() - 0.5) * 0.01,
      imageUrl,
      status: "Open",
      createdAt: Date.now(),
      daysOpen: 0,
      reports: 1,
    };

    addIssue(newIssue);
    onComplete();
  };

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
          borderBottom: "2px solid #fff",
        }}
      >
        <h2 style={{ margin: 0, textTransform: "uppercase", fontWeight: 800 }}>
          DETAILS
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

      <div style={{ padding: "2rem", flex: 1, overflowY: "auto" }}>
        {imageUrl && (
          <div
            style={{
              marginBottom: "2rem",
              border: "2px solid #fff",
              boxShadow: "4px 4px 0px #FFD700",
              maxHeight: "250px",
              overflow: "hidden",
            }}
          >
            <img
              src={imageUrl}
              alt="Captured"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontWeight: 800,
                marginBottom: "0.5rem",
                textTransform: "uppercase",
              }}
            >
              Issue Title
            </label>
            <input
              {...register("title")}
              className="brutalist-input"
              placeholder="e.g., Massive Pothole"
            />
            {errors.title && (
              <p
                style={{
                  color: "#EF4444",
                  fontWeight: 600,
                  marginTop: "0.25rem",
                  fontSize: "0.9rem",
                }}
              >
                {errors.title.message}
              </p>
            )}
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontWeight: 800,
                marginBottom: "0.5rem",
                textTransform: "uppercase",
              }}
            >
              Category
            </label>
            <select {...register("category")} className="brutalist-input">
              <option value="">SELECT A CATEGORY...</option>
              <option value="Pothole">POTHOLE</option>
              <option value="Streetlight">STREETLIGHT OUT</option>
              <option value="Sanitation">SANITATION</option>
              <option value="Vandalism">VANDALISM</option>
            </select>
            {errors.category && (
              <p
                style={{
                  color: "#EF4444",
                  fontWeight: 600,
                  marginTop: "0.25rem",
                  fontSize: "0.9rem",
                }}
              >
                {errors.category.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="brutalist-button critical"
            style={{
              marginTop: "1rem",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "0.5rem",
              padding: "1rem",
            }}
          >
            <Check size={24} /> PUBLISH ISSUE
          </button>
        </form>
      </div>
    </div>
  );
}
