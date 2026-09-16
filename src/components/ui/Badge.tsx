import React from 'react';
import type { LucideIcon } from 'lucide-react';
import type { Post } from '../../types';
import { getPostMeta } from '../../lib/status';
import { cn } from '../../lib/cn';

interface BadgeProps {
  label: string;
  fg: string;
  bg: string;
  Icon?: LucideIcon;
  size?: 'sm' | 'md';
  className?: string;
}

export default function Badge({ label, fg, bg, Icon, size = 'md', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap',
        size === 'sm' ? 'h-6 px-2 text-[11px]' : 'h-7 px-2.5 text-xs',
        className
      )}
      style={{ color: fg, background: bg }}
    >
      {Icon && <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
      {label}
    </span>
  );
}

export function StatusBadge({ post, size }: { post: Post; size?: 'sm' | 'md' }) {
  const meta = getPostMeta(post);
  return <Badge label={meta.label} fg={meta.fg} bg={meta.bg} Icon={meta.Icon} size={size} />;
}
