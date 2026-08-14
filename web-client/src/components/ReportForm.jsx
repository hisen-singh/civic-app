import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCivicStore } from '../store/useCivicStore';
import { Check, X } from 'lucide-react';

const reportSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  category: z.string().min(1, 'Please select a category'),
});

export default function ReportForm({ imageUrl, onCancel, onComplete }) {
  const addIssue = useCivicStore((state) => state.addIssue);
  const user = useCivicStore((state) => state.user);
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
      status: 'Open',
      createdAt: Date.now(),
      daysOpen: 0,
      reports: 1,
      authorId: user?.uid || null, // FIX: Include authorId for Cloud Functions trust score calculation
    };

    // Optimistic local state update to show reported issue immediately on map
    addIssue(newIssue);

    // Background Queue Dispatch (Non-blocking message queue)
    fetch('/api/queue/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newIssue),
    }).catch(console.error);

    // Semantic Toast/Success State (Using DOM to survive component unmount)
    const toast = document.createElement('div');
    toast.textContent = 'Report queued for upload';
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: 'var(--color-surface-elevated, #3b3b3a)',
      color: 'var(--color-success, #10b981)',
      padding: '12px 24px',
      borderRadius: 'var(--radius-inner, 10px)',
      zIndex: '9999',
      fontWeight: '500',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      fontFamily: 'inherit',
    });
    document.body.appendChild(toast);
    setTimeout(() => {
      if (document.body.contains(toast)) document.body.removeChild(toast);
    }, 3000);

    // Immediate UI Acknowledgment
    onComplete();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'var(--color-surface)',
        color: 'var(--color-text-primary)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid var(--color-border)',
        }}
      >
        <h2
          className="font-display text-5xl uppercase"
          style={{ margin: 0, lineHeight: 1 }}
        >
          REPORT ISSUE
        </h2>
        <button
          onClick={onCancel}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-primary)',
            cursor: 'pointer',
          }}
        >
          <X size={32} />
        </button>
      </div>

      <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
        {imageUrl && (
          <div
            className="rounded-none border-2 border-black"
            style={{
              marginBottom: '2rem',
              maxHeight: '250px',
              overflow: 'hidden',
            }}
          >
            <img
              src={imageUrl}
              alt="Captured"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontWeight: 800,
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
              }}
            >
              Issue Title
            </label>
            <input
              {...register('title')}
              className="w-full p-3 rounded-none border-2 border-black bg-transparent text-black"
              placeholder="e.g., Massive Pothole"
            />
            {errors.title && (
              <p
                style={{
                  color: '#EF4444',
                  fontWeight: 600,
                  marginTop: '0.25rem',
                  fontSize: '0.9rem',
                }}
              >
                {errors.title.message}
              </p>
            )}
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontWeight: 800,
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
              }}
            >
              Category
            </label>
            <select
              {...register('category')}
              className="w-full p-3 rounded-none border-2 border-black bg-transparent text-black"
            >
              <option value="">SELECT A CATEGORY...</option>
              <option value="Pothole">POTHOLE</option>
              <option value="Streetlight">STREETLIGHT OUT</option>
              <option value="Sanitation">SANITATION</option>
              <option value="Vandalism">VANDALISM</option>
            </select>
            {errors.category && (
              <p
                style={{
                  color: '#EF4444',
                  fontWeight: 600,
                  marginTop: '0.25rem',
                  fontSize: '0.9rem',
                }}
              >
                {errors.category.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="bg-[var(--color-accent-brand)] text-white rounded-none font-bold uppercase"
            style={{
              marginTop: '1rem',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '1rem',
              border: 'none',
            }}
          >
            <Check size={24} /> PUBLISH ISSUE
          </button>
        </form>
      </div>
    </div>
  );
}
