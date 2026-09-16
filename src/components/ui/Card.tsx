import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'bg-surface rounded-[var(--radius-panel)] border border-subtle-border shadow-[var(--shadow-card)]',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  count?: number;
  actions?: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}

export function CardHeader({ title, subtitle, count, actions, icon: Icon, className }: CardHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 px-5 py-4 sm:px-7 sm:py-5 border-b border-subtle-border',
        className
      )}
    >
      <div className="min-w-0 flex items-center gap-3">
        {Icon && (
          <div className="w-9 h-9 rounded-full bg-subtle flex items-center justify-center shrink-0 text-secondary">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-base font-bold text-primary tracking-tight truncate">{title}</h2>
            {typeof count === 'number' && (
              <span className="shrink-0 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-subtle text-muted text-[11px] font-bold">
                {count}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-secondary mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-5 sm:p-7', className)} {...rest}>
      {children}
    </div>
  );
}
