import React, { useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: React.ReactNode;
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const SIZE_CLASSES: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-2xl',
  lg: 'sm:max-w-4xl',
};

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  headerActions,
  footer,
  size = 'md',
  children,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const timer = setTimeout(() => {
      panelRef.current?.focus();
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
      previousFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[rgba(16,24,40,.45)] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'w-full bg-surface flex flex-col outline-none',
          'rounded-t-[var(--radius-panel)] max-h-[92dvh] anim-sheet pb-[env(safe-area-inset-bottom)]',
          'sm:rounded-[var(--radius-panel)] sm:max-h-[90dvh] sm:anim-pop sm:pb-0 sm:m-4',
          SIZE_CLASSES[size]
        )}
      >
        {/* Grab handle, mobile only */}
        <div className="shrink-0 flex justify-center pt-2.5 sm:hidden">
          <div className="w-9 h-1.5 rounded-full bg-subtle" />
        </div>

        {/* Sticky header */}
        <div className="shrink-0 flex items-start justify-between gap-3 px-5 py-4 sm:px-6 sm:py-5 border-b border-subtle-border">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold text-primary tracking-tight truncate">
              {title}
            </h2>
            {subtitle && <div className="text-sm text-secondary mt-0.5">{subtitle}</div>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerActions}
            <button
              onClick={onClose}
              aria-label="Zavřít"
              className="w-9 h-9 rounded-full flex items-center justify-center text-secondary hover:bg-hover hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrolling body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-5 sm:px-6 sm:py-6">
          {children}
        </div>

        {/* Sticky footer */}
        {footer && (
          <div className="shrink-0 border-t border-subtle-border px-5 py-4 sm:px-6 sm:py-5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
