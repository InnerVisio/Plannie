import React from 'react';
import type { Post, Client } from '../types';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { AlertCircle, AlertTriangle, ExternalLink, Check } from 'lucide-react';
import Badge, { StatusBadge } from './ui/Badge';
import { IconButton, Button, Avatar } from './ui';
import CommentBadge from './CommentBadge';
import { isVideoType, isOverdue } from '../lib/status';

interface PostCardProps {
  post: Post;
  client?: Client;
  /** Current time for overdue detection. Required — passing it as a prop (rather than reading a
   * clock hook here) is what makes React.memo below actually prevent re-renders. */
  now: number;
  /** Count of unresolved client comments on this post. Do not call useComments() inside this
   * component — it must stay usable from contexts that don't provide it (memo-friendly). */
  commentCount?: number;
  onClick?: () => void;
  onPublish?: (e: React.MouseEvent) => void;
  onOpenClientCalendar?: (e: React.MouseEvent) => void;
  key?: React.Key;
}

function PostCard({ post, client, now, commentCount = 0, onClick, onPublish, onOpenClientCalendar }: PostCardProps) {
  const needsAttention = post.requiresAction || post.status === 'needs_revision';
  const overdue = isOverdue(post, now);

  return (
    <div
      onClick={onClick}
      className={`bg-surface border border-subtle-border rounded-[var(--radius-card)] p-4 transition hover:border-strong-border ${
        onClick ? 'cursor-pointer' : ''
      } ${needsAttention || overdue ? 'border-l-[3px] border-l-[var(--status-revision-fg)]' : ''}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Avatar src={client?.logoUrl} name={client?.name ?? 'Klient'} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-primary line-clamp-2 leading-snug">{post.title}</p>
          <p className="text-[11px] uppercase tracking-wide text-muted font-semibold mt-0.5 truncate">
            {client?.name ?? 'Neznámý klient'} · {isVideoType(post.postType) ? 'Video' : post.postType}
          </p>
        </div>
        <CommentBadge count={commentCount} className="shrink-0" />
        {post.requiresAction && (
          <AlertCircle
            className="w-4 h-4 shrink-0"
            style={{ color: 'var(--status-revision-fg)' }}
            aria-label="Klient přidal komentář"
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-subtle-border mt-3 pt-3">
        <span className="text-xs text-secondary font-medium truncate">
          {format(new Date(post.scheduledDate), "d. MMM 'v' H:mm", { locale: cs })}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {onPublish && (
            <Button size="sm" variant="primary" icon={Check} onClick={onPublish}>
              Publikovat
            </Button>
          )}
          {overdue && (
            <Badge
              label="Po termínu"
              fg="var(--status-revision-fg)"
              bg="var(--status-revision-bg)"
              Icon={AlertTriangle}
              size="sm"
            />
          )}
          <StatusBadge post={post} size="sm" />
          {onOpenClientCalendar && (
            <IconButton
              icon={ExternalLink}
              label="Otevřít kalendář klienta"
              variant="ghost"
              size="sm"
              onClick={onOpenClientCalendar}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default React.memo(PostCard);
