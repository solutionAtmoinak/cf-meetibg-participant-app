import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

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
    setToasts((prev) => [...prev, { id, kind, message }]);
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
      <div className="toast-container" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`} data-testid={`toast-${t.kind}`}>
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
        notifyError(err instanceof Error ? err.message : String(err));
      }
    };
}
