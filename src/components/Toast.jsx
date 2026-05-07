import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((opts) => {
    const id = ++idRef.current;
    const t = {
      id,
      kind: opts.kind || 'info',
      title: opts.title || '',
      message: opts.message || '',
      duration: opts.duration ?? 4000
    };
    setToasts((list) => [...list, t]);
    if (t.duration > 0) {
      setTimeout(() => dismiss(id), t.duration);
    }
    return id;
  }, [dismiss]);

  const api = {
    toast,
    success: (message, title = 'Success') => toast({ kind: 'success', title, message }),
    error: (message, title = 'Something went wrong') => toast({ kind: 'error', title, message, duration: 6000 }),
    info: (message, title = '') => toast({ kind: 'info', title, message }),
    dismiss
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

function ToastViewport({ toasts, dismiss }) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} t={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ t, onDismiss }) {
  const klass =
    t.kind === 'success' ? 'toast toast-success' :
    t.kind === 'error' ? 'toast toast-error' :
    'toast toast-info';
  const icon = t.kind === 'success' ? '✓' : t.kind === 'error' ? '!' : 'i';
  const iconColor =
    t.kind === 'success' ? 'bg-koko-successBg text-koko-success' :
    t.kind === 'error' ? 'bg-koko-errorBg text-koko-error' :
    'bg-koko-infoBg text-koko-navy';

  useEffect(() => {
    // animation hook-up if needed
  }, []);

  return (
    <div className={klass} role="status">
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold ${iconColor}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        {t.title && <p className="text-sm font-semibold text-koko-ink">{t.title}</p>}
        {t.message && <p className="text-sm text-koko-body">{t.message}</p>}
      </div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="-mr-1 -mt-1 rounded-lg p-1 text-koko-faint transition hover:bg-koko-bg hover:text-koko-ink"
      >
        ×
      </button>
    </div>
  );
}
