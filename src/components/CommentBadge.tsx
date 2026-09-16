import React from 'react';
import { MessageSquare } from 'lucide-react';
import { cn } from '../lib/cn';

interface CommentBadgeProps {
  count: number;
  className?: string;
}

/** Small pill signalling unresolved client comments. Renders nothing when count is 0. */
export default function CommentBadge({ count, className }: CommentBadgeProps) {
  if (count <= 0) return null;
  return (
    <span
      className={cn('inline-flex items-center gap-1 h-5 px-1.5 rounded-full text-[10px] font-bold', className)}
      style={{ color: 'var(--status-revision-fg)', background: 'var(--status-revision-bg)' }}
      title={`Nevyřešené komentáře: ${count}`}
    >
      <MessageSquare className="w-3 h-3" />
      {count}
    </span>
  );
}
