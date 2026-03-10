import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { X } from 'lucide-react';

const ToastContext = createContext(null);
const TOAST_DURATION_MS = 3500;

const TOAST_META = {
  success: {
    title: 'Success',
    dot: 'bg-green-400',
    progress: 'bg-green-500',
  },
  error: {
    title: 'Error',
    dot: 'bg-red-400',
    progress: 'bg-red-500',
  },
  warning: {
    title: 'Warning',
    dot: 'bg-amber-400',
    progress: 'bg-amber-500',
  },
  info: {
    title: 'Info',
    dot: 'bg-indigo-400',
    progress: 'bg-indigo-500',
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((previous) => previous.filter((toastItem) => toastItem.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type = 'info', message }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((previous) => [...previous, { id, type, message }]);
      window.setTimeout(() => removeToast(id), TOAST_DURATION_MS);
      return id;
    },
    [removeToast]
  );

  const contextValue = useMemo(() => ({ addToast, removeToast }), [addToast, removeToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex w-72 flex-col gap-3">
        {toasts.map((toastItem) => {
          const meta = TOAST_META[toastItem.type] ?? TOAST_META.info;

          return (
            <div
              key={toastItem.id}
              className="fade-up relative flex items-start gap-3 rounded-2xl border border-white/10 bg-[#16161F] px-4 py-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
            >
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white/85">{meta.title}</p>
                <p className="mt-0.5 text-xs text-white/40">{toastItem.message}</p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toastItem.id)}
                className="text-white/20 transition-colors hover:text-white/60"
                aria-label="Dismiss toast"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <span
                className={`absolute bottom-0 left-0 h-[2px] rounded-b-2xl ${meta.progress}`}
                style={{ width: '100%', animation: `toast-progress ${TOAST_DURATION_MS}ms linear forwards` }}
              />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider.');
  }

  return context;
}
