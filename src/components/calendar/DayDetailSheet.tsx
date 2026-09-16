import React, { useState } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Plus, CalendarClock } from 'lucide-react';
import type { Post } from '../../types';
import { Modal, Button, IconButton, EmptyState } from '../ui';
import PostCard from '../PostCard';
import MovePostModal from '../MovePostModal';
import { CalendarDays } from 'lucide-react';

interface DayDetailSheetProps {
  open: boolean;
  onClose: () => void;
  date: Date | null;
  posts: Post[];
  now: number;
  unresolvedByPost?: Record<string, number>;
  holidayName?: string | null;
  isAdmin: boolean;
  onPostClick: (post: Post) => void;
  onAddPost?: () => void;
}

export default function DayDetailSheet({
  open,
  onClose,
  date,
  posts,
  now,
  unresolvedByPost,
  holidayName,
  isAdmin,
  onPostClick,
  onAddPost,
}: DayDetailSheetProps) {
  const [movingPost, setMovingPost] = useState<Post | null>(null);

  if (!date) return null;

  const sorted = [...posts].sort((a, b) => a.scheduledDate - b.scheduledDate);

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={format(date, "d. MMMM yyyy", { locale: cs })}
        subtitle={holidayName ? <span style={{ color: 'var(--status-revision-fg)' }}>{holidayName}</span> : undefined}
        size="sm"
        footer={
          isAdmin && onAddPost ? (
            <Button variant="primary" icon={Plus} fullWidth onClick={onAddPost}>
              Přidat příspěvek
            </Button>
          ) : undefined
        }
      >
        {sorted.length === 0 ? (
          <EmptyState icon={CalendarDays} title="Žádné příspěvky" description="Pro tento den není naplánován žádný obsah." />
        ) : (
          <div className="space-y-3">
            {sorted.map((post) => (
              <div key={post.id} className="relative">
                <PostCard
                  post={post}
                  now={now}
                  commentCount={unresolvedByPost?.[post.id] ?? 0}
                  onClick={() => onPostClick(post)}
                />
                {isAdmin && post.postType !== 'event' && post.status !== 'published' && (
                  <IconButton
                    icon={CalendarClock}
                    label="Přesunout"
                    variant="ghost"
                    size="sm"
                    className="absolute top-3 right-3 bg-surface"
                    onClick={(e) => { e.stopPropagation(); setMovingPost(post); }}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>

      {movingPost && <MovePostModal post={movingPost} onClose={() => setMovingPost(null)} />}
    </>
  );
}
