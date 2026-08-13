import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { errorMessage } from './errorMessage.js';

interface Toast {
  id: number;
  kind: 'success' | 'error';
  message: string;
}

interface ToastContextValue {
  notifySuccess(message: string): void;
  notifyError(message: string): void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const push = useCallback((kind: Toast['kind'], message: string) => {
    const id = nextId.current++;
    // Defense in depth: a caller can end up passing something non-string at
    // runtime (a raw API error object slipping past errorMessage(), etc.) —
    // rendering that directly as a JSX child crashes the whole page, so
    // never trust the static type here.
    const safeMessage = typeof message === 'string' ? message : JSON.stringify(message);
    setToasts((prev) => [...prev, { id, kind, message: safeMessage }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const value: ToastContextValue = {
    notifySuccess: (message) => push('success', message),
    notifyError: (message) => push('error', message),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-1000" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-md px-4 py-[0.6rem] text-white text-[0.9rem] shadow-[0_2px_8px_rgba(0,0,0,0.2)] ${
              t.kind === 'success' ? 'bg-[#16a34a]' : 'bg-[#dc2626]'
            }`}
            data-testid={`toast-${t.kind}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

/** Wraps an async action so every SDK/backend call surfaces success or failure visibly — never a silent failure. */
export function useReportedAction(): <Args extends unknown[]>(
  successMessage: string,
  action: (...args: Args) => Promise<void>
) => (...args: Args) => Promise<void> {
  const { notifySuccess, notifyError } = useToast();
  return (successMessage, action) =>
    async (...args) => {
      try {
        await action(...args);
        notifySuccess(successMessage);
      } catch (err) {
        notifyError(errorMessage(err, String(err)));
      }
    };
}
