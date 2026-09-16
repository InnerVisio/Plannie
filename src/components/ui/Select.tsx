import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export default function Select({ label, hint, error, className, id, children, ...rest }: SelectProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={inputId}
          className={cn(
            'w-full h-11 pl-4 pr-10 bg-subtle border border-subtle-border rounded-[var(--radius-field)] text-primary appearance-none cursor-pointer',
            'focus:bg-surface focus:border-strong-border focus:ring-2 focus:ring-[var(--accent)]/15 outline-none transition',
            'text-base sm:text-sm',
            error && 'border-[var(--status-revision-fg)]',
            className
          )}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown className="w-4 h-4 text-muted absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
      {hint && !error && <p className="text-xs text-secondary mt-1.5">{hint}</p>}
      {error && <p className="text-xs mt-1.5" style={{ color: 'var(--status-revision-fg)' }}>{error}</p>}
    </div>
  );
}
