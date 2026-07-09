import React, { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

let nextId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = ++nextId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div style={containerStyle} role="status" aria-live="polite">
        {toasts.map(toast => (
          <div key={toast.id} style={{ ...toastStyle, ...typeStyles[toast.type] }}>
            <span style={dotStyle(toast.type)} />
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const showToast = useContext(ToastContext);
  return showToast || (() => {});
}

const containerStyle = {
  position: 'fixed',
  bottom: 24,
  right: 24,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  zIndex: 9999,
  maxWidth: 380,
};

const toastStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '12px 16px',
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 500,
  color: 'var(--text-primary, #F1F5F9)',
  backgroundColor: 'var(--surface-elevated, #1A2133)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
  animation: 'toast-in 0.25s ease-out',
};

const typeStyles = {
  success: { borderLeft: '3px solid #10B981' },
  error: { borderLeft: '3px solid #EF4444' },
  info: { borderLeft: '3px solid #6366F1' },
};

const dotStyle = (type) => ({
  width: 8,
  height: 8,
  borderRadius: 4,
  flexShrink: 0,
  backgroundColor: type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#6366F1',
});
