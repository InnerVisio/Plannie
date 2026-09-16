import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastItem extends ToastOptions {
  id: number;
}

interface ToastContextValue {
  toast: (opts: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export const useToast = () => useContext(ToastContext);

const VARIANT_META: Record<ToastVariant, { Icon: typeof CheckCircle2; fg: string; bg: string }> = {
  success: { Icon: CheckCircle2, fg: 'var(--status-approved-fg)', bg: 'var(--status-approved-bg)' },
  error: { Icon: AlertCircle, fg: 'var(--status-revision-fg)', bg: 'var(--status-revision-bg)' },
  info: { Icon: Info, fg: 'var(--status-scheduled-fg)', bg: 'var(--status-scheduled-bg)' },
};

const MAX_VISIBLE = 3;
const AUTO_DISMISS_MS = 4500;

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((opts: ToastOptions) => {
    const id = ++idRef.current;
    setToasts((current) => {
      const next = [...current, { id, ...opts }];
      return next.length > MAX_VISIBLE ? next.slice(next.length - MAX_VISIBLE) : next;
    });
    setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {createPortal(
        <div
          className="fixed z-[100] flex flex-col gap-2 pointer-events-none
            left-1/2 -translate-x-1/2 bottom-[calc(5rem+env(safe-area-inset-bottom))] w-[calc(100%-2rem)] max-w-sm items-center
            sm:left-auto sm:right-4 sm:translate-x-0 sm:top-4 sm:bottom-auto sm:items-end"
        >
          {toasts.map((t) => {
            const meta = VARIANT_META[t.variant ?? 'info'];
            const Icon = meta.Icon;
            return (
              <div
                key={t.id}
                role="status"
                className="anim-pop pointer-events-auto w-full sm:w-80 bg-surface border border-subtle-border rounded-[var(--radius-field)] shadow-[var(--shadow-pop)] p-3.5 flex items-start gap-3"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ color: meta.fg, background: meta.bg }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary truncate">{t.title}</p>
                  {t.description && (
                    <p className="text-xs text-secondary mt-0.5 line-clamp-2">{t.description}</p>
                  )}
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  aria-label="Zavřít oznámení"
                  className="shrink-0 text-muted hover:text-primary transition-colors p-1 -m-1 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};
