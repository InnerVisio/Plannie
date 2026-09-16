import { CheckCircle2, Clock, AlertCircle, CalendarDays, Send, FileEdit, type LucideIcon } from 'lucide-react';
import type { Post } from '../types';

export type StatusKey = Post['status'];

export const STATUS_META: Record<StatusKey, {
  label: string; fg: string; bg: string; Icon: LucideIcon;
}> = {
  draft:          { label: 'Koncept',         fg: 'var(--status-draft-fg)',     bg: 'var(--status-draft-bg)',     Icon: FileEdit },
  client_review:  { label: 'Ke schválení',    fg: 'var(--status-review-fg)',    bg: 'var(--status-review-bg)',    Icon: Clock },
  approved:       { label: 'Schváleno',       fg: 'var(--status-approved-fg)',  bg: 'var(--status-approved-bg)',  Icon: CheckCircle2 },
  needs_revision: { label: 'Vyžaduje úpravu', fg: 'var(--status-revision-fg)',  bg: 'var(--status-revision-bg)',  Icon: AlertCircle },
  scheduled:      { label: 'Plánováno',       fg: 'var(--status-scheduled-fg)', bg: 'var(--status-scheduled-bg)', Icon: CalendarDays },
  published:      { label: 'Publikováno',     fg: 'var(--status-published-fg)', bg: 'var(--status-published-bg)', Icon: Send },
};

export const EVENT_META = { label: 'Událost', fg: 'var(--status-event-fg)', bg: 'var(--status-event-bg)', Icon: CalendarDays };

/** Events are not content — they never show a content status. */
export const getPostMeta = (post: Post) =>
  post.postType === 'event' ? EVENT_META : (STATUS_META[post.status] ?? STATUS_META.draft);

export const isVideoType = (t: Post['postType']) => t === 'video' || t === 'reel';
export const isEventType = (t: Post['postType']) => t === 'event';

/** A post whose scheduled slot has passed without being published. Deliberately includes drafts. */
export const isOverdue = (post: Post, now: number) =>
  post.postType !== 'event' &&
  post.status !== 'published' &&
  post.scheduledDate < now;
