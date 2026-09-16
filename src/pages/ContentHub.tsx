import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, startOfToday, endOfToday } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Search, LayoutList, CheckSquare } from 'lucide-react';
import type { Post } from '../types';
import { useAgencyData } from '../hooks/useAgencyData';
import { useComments } from '../hooks/useComments';
import { matchesSearch } from '../lib/text';
import { isOverdue } from '../lib/status';
import { Card, CardBody, Input, Select, Tabs, Button, EmptyState } from '../components/ui';
import PostCard from '../components/PostCard';
import PostModal from '../components/PostModal';
import BulkPublishModal from '../components/BulkPublishModal';

type StatusFilter = 'all' | 'draft' | 'client_review' | 'needs_revision' | 'approved' | 'published' | 'overdue';
type PeriodFilter = 'upcoming' | 'month' | 'all' | 'today';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Všechny stavy' },
  { value: 'draft', label: 'Koncept' },
  { value: 'client_review', label: 'Ke schválení' },
  { value: 'needs_revision', label: 'Vyžaduje úpravu' },
  { value: 'approved', label: 'Schváleno' },
  { value: 'published', label: 'Publikováno' },
  { value: 'overdue', label: 'Po termínu' },
];

const PAGE_SIZE = 50;

export default function ContentHub() {
  const { clients, clientMap, validPosts, now, loading } = useAgencyData();
  const { unresolvedByPost } = useComments();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [clientId, setClientId] = useState('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [period, setPeriod] = useState<PeriodFilter>('upcoming');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isBulkPublishOpen, setIsBulkPublishOpen] = useState(false);

  // Seed status/period filters from query params (dashboard deep links).
  useEffect(() => {
    const statusParam = searchParams.get('status');
    const periodParam = searchParams.get('period');
    let touched = false;
    if (statusParam && STATUS_OPTIONS.some((o) => o.value === statusParam)) {
      setStatus(statusParam as StatusFilter);
      setPeriod('all');
      touched = true;
    }
    if (periodParam === 'today') {
      setPeriod('today');
      touched = true;
    }
    if (touched) {
      const next = new URLSearchParams(searchParams);
      next.delete('status');
      next.delete('period');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const contentPosts = useMemo(() => validPosts.filter((p) => p.postType !== 'event'), [validPosts]);

  const isDefault = search === '' && clientId === 'all' && status === 'all' && period === 'upcoming';

  const resetFilters = () => {
    setSearch('');
    setClientId('all');
    setStatus('all');
    setPeriod('upcoming');
    setVisibleCount(PAGE_SIZE);
  };

  const filtered = useMemo(() => {
    let list = contentPosts;
    if (search.trim()) list = list.filter((p) => matchesSearch(p.title, search));
    if (clientId !== 'all') list = list.filter((p) => p.clientId === clientId);
    if (status === 'overdue') list = list.filter((p) => isOverdue(p, now));
    else if (status !== 'all') list = list.filter((p) => p.status === status);

    if (period === 'upcoming') {
      list = list.filter((p) => p.scheduledDate >= startOfToday().getTime());
    } else if (period === 'today') {
      const start = startOfToday().getTime();
      const end = endOfToday().getTime();
      list = list.filter((p) => p.scheduledDate >= start && p.scheduledDate <= end);
    } else if (period === 'month') {
      const start = startOfMonth(new Date()).getTime();
      const end = endOfMonth(new Date()).getTime();
      list = list.filter((p) => p.scheduledDate >= start && p.scheduledDate <= end);
    }

    return [...list].sort((a, b) => a.scheduledDate - b.scheduledDate);
  }, [contentPosts, search, clientId, status, period, now]);

  const visible = filtered.slice(0, visibleCount);

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

  const currentSelectedPost = selectedPost ? validPosts.find((p) => p.id === selectedPost.id) ?? null : null;
  const sortedClients = useMemo(() => [...clients].sort((a, b) => a.name.localeCompare(b.name, 'cs')), [clients]);

  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              icon={Search}
              placeholder="Hledat v názvu…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-xs"
            />
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)} className="sm:max-w-[200px]">
              <option value="all">Všichni klienti</option>
              {sortedClients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className="sm:max-w-[200px]">
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
            {!isDefault && (
              <Button variant="ghost" onClick={resetFilters}>Zrušit filtry</Button>
            )}
            <Button
              variant="secondary"
              icon={CheckSquare}
              className="sm:ml-auto"
              onClick={() => setIsBulkPublishOpen(true)}
            >
              Hromadné označení
            </Button>
          </div>
          <Tabs
            value={period}
            onChange={(v) => setPeriod(v as PeriodFilter)}
            items={[
              { value: 'today', label: 'Dnes' },
              { value: 'upcoming', label: 'Nadcházející' },
              { value: 'month', label: 'Tento měsíc' },
              { value: 'all', label: 'Vše' },
            ]}
          />
        </CardBody>
      </Card>

      <p className="text-sm text-secondary">{filtered.length} příspěvků</p>

      {loading ? null : filtered.length === 0 ? (
        <EmptyState
          icon={LayoutList}
          title="Žádné příspěvky neodpovídají filtrům."
          action={<Button variant="secondary" onClick={resetFilters}>Zrušit filtry</Button>}
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
                    client={clientMap[post.clientId]}
                    commentCount={unresolvedByPost[post.id] ?? 0}
                    onClick={() => setSelectedPost(post)}
                  />
                ))}
              </div>
            </div>
          ))}
          {visible.length < filtered.length && (
            <div className="flex justify-center pt-2">
              <Button variant="secondary" onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}>
                Zobrazit více
              </Button>
            </div>
          )}
        </div>
      )}

      {currentSelectedPost && clientMap[currentSelectedPost.clientId] && (
        <PostModal
          post={currentSelectedPost}
          client={clientMap[currentSelectedPost.clientId]}
          onClose={() => setSelectedPost(null)}
        />
      )}

      {isBulkPublishOpen && (
        <BulkPublishModal onClose={() => setIsBulkPublishOpen(false)} />
      )}
    </div>
  );
}
