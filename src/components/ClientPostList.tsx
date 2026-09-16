import React, { useMemo, useState } from 'react';
import { Post } from '../types';
import { format, startOfToday } from 'date-fns';
import { cs } from 'date-fns/locale';
import { CalendarDays, Search } from 'lucide-react';
import { EmptyState, Tabs, Input, Button } from './ui';
import PostCard from './PostCard';

interface ClientPostListProps {
  posts: Post[];
  onPostClick: (post: Post) => void;
  /** Current time for PostCard's overdue detection. */
  now: number;
  /** postId -> unresolved client comment count, for badges. */
  unresolvedByPost?: Record<string, number>;
}

type FilterKey = 'all' | 'client_review' | 'approved' | 'published';
type PeriodKey = 'upcoming' | 'history' | 'all';

const PAGE_SIZE = 30;

export default function ClientPostList({ posts, onPostClick, now, unresolvedByPost }: ClientPostListProps) {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [period, setPeriod] = useState<PeriodKey>('upcoming');
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Day-granularity cutoff for upcoming/history filtering — distinct from the live `now` prop
  // (which is minute-granularity, used only for PostCard's overdue detection).
  const todayCutoff = startOfToday().getTime();

  const filtered = useMemo(() => {
    let list = posts.filter((p) => p.postType !== 'event');
    if (filter !== 'all') list = list.filter((p) => p.status === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.title.toLowerCase().includes(q));
    }
    if (period === 'upcoming') {
      list = list.filter((p) => p.scheduledDate >= todayCutoff);
      return [...list].sort((a, b) => a.scheduledDate - b.scheduledDate);
    }
    if (period === 'history') {
      list = list.filter((p) => p.scheduledDate < todayCutoff);
      return [...list].sort((a, b) => b.scheduledDate - a.scheduledDate);
    }
    return [...list].sort((a, b) => a.scheduledDate - b.scheduledDate);
  }, [posts, filter, search, period, todayCutoff]);

  const startIndex = useMemo(() => {
    if (period !== 'all') return 0;
    const idx = filtered.findIndex((p) => p.scheduledDate >= todayCutoff);
    return idx === -1 ? Math.max(0, filtered.length - 1) : idx;
  }, [filtered, todayCutoff, period]);

  const visible = filtered.slice(0, Math.max(visibleCount, startIndex + PAGE_SIZE));

  const grouped = useMemo(() => {
    const groups: { key: string; label: string; posts: Post[] }[] = [];
    visible.forEach((post) => {
      const d = new Date(post.scheduledDate);
      const key = format(d, 'yyyy-MM');
      const label = format(d, 'LLLL yyyy', { locale: cs });
      let group = groups.find((g) => g.key === key);
      if (!group) {
        group = { key, label, posts: [] };
        groups.push(group);
      }
      group.posts.push(post);
    });
    return groups;
  }, [visible]);

  const hasMore = visible.length < filtered.length;

  if (posts.filter((p) => p.postType !== 'event').length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Zatím nemáte naplánované žádné příspěvky."
      />
    );
  }

  return (
    <div className="space-y-5">
      <Tabs
        value={period}
        onChange={(v) => { setPeriod(v as PeriodKey); setVisibleCount(PAGE_SIZE); }}
        items={[
          { value: 'upcoming', label: 'Nadcházející' },
          { value: 'history', label: 'Historie' },
          { value: 'all', label: 'Vše' },
        ]}
      />
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <Input icon={Search} placeholder="Hledat podle názvu…" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-xs" />
        <Tabs
          value={filter}
          onChange={(v) => setFilter(v as FilterKey)}
          items={[
            { value: 'all', label: 'Vše' },
            { value: 'client_review', label: 'Ke schválení' },
            { value: 'approved', label: 'Schváleno' },
            { value: 'published', label: 'Publikováno' },
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Žádné příspěvky neodpovídají filtru"
          action={
            <Button variant="secondary" onClick={() => { setFilter('all'); setSearch(''); }}>
              Zrušit filtry
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.key}>
              <p className="text-sm font-bold text-primary capitalize sticky top-0 bg-app/90 backdrop-blur-sm py-1.5 -mx-1 px-1 z-10">
                {group.label}
              </p>
              <div className="space-y-3 mt-2">
                {group.posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    now={now}
                    commentCount={unresolvedByPost?.[post.id] ?? 0}
                    onClick={() => onPostClick(post)}
                  />
                ))}
              </div>
            </div>
          ))}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button variant="secondary" onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}>
                Zobrazit více
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
