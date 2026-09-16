import React, { useId, useRef, useEffect } from 'react';
import { cn } from '../../lib/cn';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
  error?: string;
  autoGrow?: boolean;
};

export default function Textarea({
  label,
  hint,
  error,
  autoGrow = false,
  className,
  id,
  value,
  onChange,
  ...rest
}: TextareaProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!autoGrow || !ref.current) return;
    ref.current.style.height = 'auto';
    ref.current.style.height = `${ref.current.scrollHeight}px`;
  }, [autoGrow, value]);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        ref={ref}
        value={value}
        onChange={onChange}
        className={cn(
          'w-full min-h-28 py-3 px-4 bg-subtle border border-subtle-border rounded-[var(--radius-field)] text-primary placeholder:text-muted',
          'focus:bg-surface focus:border-strong-border focus:ring-2 focus:ring-[var(--accent)]/15 outline-none transition',
          'text-base sm:text-sm',
          autoGrow && 'resize-none overflow-hidden',
          error && 'border-[var(--status-revision-fg)]',
          className
        )}
        {...rest}
      />
      {hint && !error && <p className="text-xs text-secondary mt-1.5">{hint}</p>}
      {error && <p className="text-xs mt-1.5" style={{ color: 'var(--status-revision-fg)' }}>{error}</p>}
    </div>
  );
}
