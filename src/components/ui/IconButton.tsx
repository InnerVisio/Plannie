import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

type Variant = 'default' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon;
  label: string;
  variant?: Variant;
  size?: Size;
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'w-9 h-9',
  md: 'w-10 h-10',
};

const VARIANT_CLASSES: Record<Variant, string> = {
  default: 'bg-surface border border-subtle-border text-secondary hover:bg-hover hover:text-primary',
  ghost: 'text-secondary hover:bg-hover hover:text-primary',
  danger: 'text-[var(--status-revision-fg)] hover:bg-[var(--status-revision-bg)]',
};

export default function IconButton({
  icon: Icon,
  label,
  variant = 'default',
  size = 'md',
  className,
  ...rest
}: IconButtonProps) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center rounded-full transition-colors active:scale-[.96] shrink-0',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-app)]',
        'disabled:opacity-50 disabled:pointer-events-none',
        SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        className
      )}
      {...rest}
    >
      <Icon className={size === 'sm' ? 'w-4 h-4' : 'w-[18px] h-[18px]'} />
    </button>
  );
}
