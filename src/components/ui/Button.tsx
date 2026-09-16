import React from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'h-9 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-[15px]',
};

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg hover:bg-accent-hover',
  secondary: 'bg-surface border border-subtle-border text-primary hover:bg-hover',
  ghost: 'text-secondary hover:bg-hover hover:text-primary',
  danger: 'text-[var(--status-revision-fg)] bg-[var(--status-revision-bg)] hover:brightness-95',
};

export default function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  const iconEl = loading ? (
    <Loader2 className="w-4 h-4 animate-spin" />
  ) : Icon ? (
    <Icon className="w-4 h-4" />
  ) : null;

  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[var(--radius-field)] font-semibold transition-colors active:scale-[.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-app)]',
        'disabled:opacity-50 disabled:pointer-events-none',
        SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        fullWidth && 'w-full',
        className
      )}
      {...rest}
    >
      {iconEl && iconPosition === 'left' && iconEl}
      {children}
      {iconEl && iconPosition === 'right' && iconEl}
    </button>
  );
}
