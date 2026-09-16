import React, { useId } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  icon?: LucideIcon;
};

export default function Input({ label, hint, error, icon: Icon, className, id, ...rest }: InputProps) {
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
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          id={inputId}
          className={cn(
            'w-full h-11 bg-subtle border border-subtle-border rounded-[var(--radius-field)] text-primary placeholder:text-muted',
            'focus:bg-surface focus:border-strong-border focus:ring-2 focus:ring-[var(--accent)]/15 outline-none transition',
            'text-base sm:text-sm',
            Icon ? 'pl-10 pr-4' : 'px-4',
            error && 'border-[var(--status-revision-fg)]',
            className
          )}
          {...rest}
        />
      </div>
      {hint && !error && <p className="text-xs text-secondary mt-1.5">{hint}</p>}
      {error && <p className="text-xs mt-1.5" style={{ color: 'var(--status-revision-fg)' }}>{error}</p>}
    </div>
  );
}
