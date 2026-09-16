import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  format, formatDistanceToNow, startOfToday, endOfToday, endOfWeek, isSameDay, isTomorrow,
} from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  CalendarDays, AlertTriangle, Clock, FileEdit, MessageSquare, CalendarCheck,
  ChevronRight, CheckCircle2,
} from 'lucide-react';
import type { Post } from '../types';
import { useAgencyData } from '../hooks/useAgencyData';
import { useActivity } from '../hooks/useActivity';
import { useComments } from '../hooks/useComments';
import { useAuth } from '../contexts/AuthContext';
import { isOverdue, getPostMeta } from '../lib/status';
import { pluralize } from '../lib/text';
import { describeActivity } from '../lib/activity';
import {
  Card, CardHeader, CardBody, Tabs, EmptyState, Skeleton, SkeletonCard, SkeletonRow, Avatar, StatusBadge,
} from '../components/ui';
import PostCard from '../components/PostCard';
import PostModal from '../components/PostModal';
import CommentBadge from '../components/CommentBadge';

type TimelineRange = 'today' | 'week';
type QueueTab = 'draft' | 'action' | 'waiting' | 'ready';

/** How many timeline rows to reveal at a time. */
const TIMELINE_PAGE = 8;
/** Overdue backlog can be huge; collapsed it shows only this many. */
const OVERDUE_PREVIEW = 3;

const greetingFor = (now: Date): string => {
  const h = now.getHours();
  if (h < 10) return 'Dobré ráno';
  if (h < 18) return 'Dobrý den';
  return 'Dobrý večer';
};

const capitalize = (s: string) => (s.length > 0 ? s[0].toUpperCase() + s.slice(1) : s);

const dayLabel = (day: Date, today: Date): string => {
  if (isSameDay(day, today)) return 'Dnes';
  if (isTomorrow(day)) return 'Zítra';
  return capitalize(format(day, 'EEEE d. M.', { locale: cs }));
};

export default function MasterDashboard() {
  const { clients, clientMap, validPosts, loading, now } = useAgencyData();
  const { activity, loading: activityLoading, markRead } = useActivity();
  const { unresolvedByPost, totalUnresolved } = useComments();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [timelineRange, setTimelineRange] = useState<TimelineRange>('today');
  const [overdueOpen, setOverdueOpen] = useState(false);
  const [timelineLimit, setTimelineLimit] = useState(TIMELINE_PAGE);

  // Stable identity so React.memo on TimelineRow/PostCard actually prevents re-renders —
  // an inline `() => setSelectedPost(post)` per row would create a new function every render.
  const handleSelectPost = useCallback((post: Post) => setSelectedPost(post), []);

  const nowDate = new Date(now);
  const today = startOfToday();

  const contentPosts = useMemo(() => validPosts.filter((p) => p.postType !== 'event'), [validPosts]);

  // ---------- Stat tiles ----------
  const statCounts = useMemo(() => {
    const todayStart = startOfToday().getTime();
    const todayEnd = endOfToday().getTime();
    return {
      today: contentPosts.filter(
        (p) => p.scheduledDate >= todayStart && p.scheduledDate <= todayEnd && p.status !== 'published'
      ).length,
      overdue: contentPosts.filter((p) => isOverdue(p, now)).length,
      waiting: contentPosts.filter((p) => p.status === 'client_review').length,
      drafts: contentPosts.filter((p) => p.status === 'draft').length,
    };
  }, [contentPosts, now]);

  const stats: {
    key: string; label: string; value: number; Icon: typeof CalendarDays; to: string; alarm?: boolean;
  }[] = [
    { key: 'today', label: 'Dnes', value: statCounts.today, Icon: CalendarDays, to: '/obsah?period=today' },
    { key: 'overdue', label: 'Po termínu', value: statCounts.overdue, Icon: AlertTriangle, to: '/obsah?status=overdue', alarm: statCounts.overdue > 0 },
    { key: 'waiting', label: 'Čeká na klienta', value: statCounts.waiting, Icon: Clock, to: '/obsah?status=client_review' },
    { key: 'drafts', label: 'Koncepty', value: statCounts.drafts, Icon: FileEdit, to: '/obsah?status=draft' },
  ];

  // ---------- Greeting ----------
  const greetingName = useMemo(() => {
    const email = currentUser?.email;
    if (!email) return '';
    const local = email.split('@')[0];
    if (!local) return '';
    return capitalize(local);
  }, [currentUser]);

  // ---------- Timeline ("Dnešní plán") ----------
  const timeline = useMemo(() => {
    const overdue = validPosts
      .filter((p) => isOverdue(p, now))
      .sort((a, b) => a.scheduledDate - b.scheduledDate);

    const rangeStart = today.getTime();
    const rangeEnd = timelineRange === 'today' ? endOfToday().getTime() : endOfWeek(nowDate, { weekStartsOn: 1 }).getTime();

    const inRange = validPosts
      .filter((p) => p.status !== 'published' && !isOverdue(p, now) && p.scheduledDate >= rangeStart && p.scheduledDate <= rangeEnd)
      .sort((a, b) => a.scheduledDate - b.scheduledDate);

    return { overdue, inRange };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validPosts, now, timelineRange]);

  // Group only the rows currently revealed, so the limit applies across days rather than per day.
  const visibleGroups = useMemo(() => {
    if (timelineRange === 'today') return null;
    const groups: { key: string; label: string; posts: Post[] }[] = [];
    timeline.inRange.slice(0, timelineLimit).forEach((post) => {
      const d = new Date(post.scheduledDate);
      const key = format(d, 'yyyy-MM-dd');
      let group = groups.find((g) => g.key === key);
      if (!group) {
        group = { key, label: dayLabel(d, today), posts: [] };
        groups.push(group);
      }
      group.posts.push(post);
    });
    return groups;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline, timelineRange, timelineLimit]);

  // ---------- Activity feed ----------
  const clientActivity = useMemo(
    () => activity.filter((a) => a.actor === 'client').slice(0, 8),
    [activity]
  );

  const handleActivityClick = async (item: (typeof clientActivity)[number]) => {
    await markRead(item.id);
    const post = validPosts.find((p) => p.id === item.postId);
    if (!post) return;
    navigate(`/kalendar/${item.clientId}?post=${item.postId}`);
  };

  // ---------- Client status overview ----------
  const clientRows = useMemo(() => {
    const active = clients.filter((c) => c.isActive !== false);
    const rows = active.map((client) => {
      const clientPosts = contentPosts.filter((p) => p.clientId === client.id);
      const draftsCount = clientPosts.filter((p) => p.status === 'draft').length;
      const waitingCount = clientPosts.filter((p) => p.status === 'client_review').length;
      const overdueCount = clientPosts.filter((p) => isOverdue(p, now)).length;
      return { client, draftsCount, waitingCount, overdueCount };
    });
    rows.sort((a, b) => {
      if (a.overdueCount !== b.overdueCount) return b.overdueCount - a.overdueCount;
      const aWaiting = a.waitingCount + a.draftsCount;
      const bWaiting = b.waitingCount + b.draftsCount;
      if (aWaiting !== bWaiting) return bWaiting - aWaiting;
      return a.client.name.localeCompare(b.client.name, 'cs');
    });
    return rows;
  }, [clients, contentPosts, now]);

  // ---------- Work queue ----------
  const queueBuckets = useMemo(() => ({
    draft: contentPosts.filter((p) => p.status === 'draft'),
    action: contentPosts.filter((p) => p.status === 'needs_revision' || p.requiresAction === true),
    waiting: contentPosts.filter((p) => p.status === 'client_review'),
    ready: contentPosts.filter((p) => p.status === 'approved'),
  }), [contentPosts]);

  const [queueTabTouched, setQueueTabTouched] = useState(false);
  const defaultQueueTab: QueueTab = queueBuckets.action.length > 0 ? 'action' : 'draft';
  const [queueTabState, setQueueTabState] = useState<QueueTab>(defaultQueueTab);
  const queueTab = queueTabTouched ? queueTabState : defaultQueueTab;

  const queueEmptyCopy: Record<QueueTab, string> = {
    draft: 'Žádné rozpracované koncepty.',
    action: 'Vše vyřešeno, skvělá práce!',
    waiting: 'Žádné příspěvky ke schválení.',
    ready: 'Žádné schválené příspěvky.',
  };

  const queueStatusFilter: Record<QueueTab, string> = {
    draft: 'draft',
    action: 'needs_revision',
    waiting: 'client_review',
    ready: 'approved',
  };

  const currentQueuePosts = queueBuckets[queueTab];
  const visibleQueuePosts = currentQueuePosts.slice(0, 12);

  const currentSelectedPost = selectedPost
    ? validPosts.find((p) => p.id === selectedPost.id) ?? null
    : null;

  if (loading) {
    return (
      <div className="space-y-6 pb-24 lg:pb-0">
        <Skeleton className="h-9 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Skeleton className="h-24 rounded-[var(--radius-card)]" />
          <Skeleton className="h-24 rounded-[var(--radius-card)]" />
          <Skeleton className="h-24 rounded-[var(--radius-card)]" />
          <Skeleton className="h-24 rounded-[var(--radius-card)]" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-3">
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
          <div className="space-y-3">
            <SkeletonRow /><SkeletonRow /><SkeletonRow />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      {/* Greeting header */}
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">
          {greetingFor(nowDate)}{greetingName ? `, ${greetingName}` : ''}
        </h1>
        <p className="text-sm sm:text-base text-secondary capitalize">
          {format(nowDate, 'EEEE d. MMMM', { locale: cs })}
        </p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s) => (
          <Card
            key={s.key}
            className="p-4 sm:p-5 cursor-pointer hover:border-strong-border transition"
            style={s.alarm ? { background: 'var(--status-revision-bg)' } : undefined}
            onClick={() => navigate(s.to)}
          >
            <div className="flex items-start justify-between">
              <div>
                <p
                  className="text-[11px] font-bold uppercase tracking-wider text-muted"
                  style={s.alarm ? { color: 'var(--status-revision-fg)' } : undefined}
                >
                  {s.label}
                </p>
                <p
                  className="text-3xl font-bold text-primary mt-1"
                  style={s.alarm ? { color: 'var(--status-revision-fg)' } : undefined}
                >
                  {s.value}
                </p>
              </div>
              <div
                className="w-9 h-9 rounded-full bg-subtle flex items-center justify-center text-secondary shrink-0"
                style={s.alarm ? { color: 'var(--status-revision-fg)', background: 'var(--status-revision-bg)' } : undefined}
              >
                <s.Icon className="w-4 h-4" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
        {/* Dnešní plán */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Dnešní plán"
              actions={
                <Tabs
                  size="sm"
                  value={timelineRange}
                  onChange={(v) => {
                    setTimelineRange(v as TimelineRange);
                    setTimelineLimit(TIMELINE_PAGE);
                  }}
                  items={[
                    { value: 'today', label: 'Dnes' },
                    { value: 'week', label: 'Tento týden' },
                  ]}
                />
              }
            />
            <CardBody className="space-y-1">
              {timeline.overdue.length === 0 && timeline.inRange.length === 0 ? (
                <EmptyState
                  icon={CalendarCheck}
                  title={timelineRange === 'today' ? 'Na dnešek nic naplánováno' : 'Tento týden nic nezbývá'}
                  description="Užijte si klidný den."
                />
              ) : (
                <>
                  {timeline.overdue.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--status-revision-fg)' }}>
                          Po termínu ({timeline.overdue.length})
                        </p>
                        {timeline.overdue.length > OVERDUE_PREVIEW && (
                          <button
                            onClick={() => setOverdueOpen((v) => !v)}
                            className="text-xs font-semibold text-secondary hover:text-primary transition-colors shrink-0"
                          >
                            {overdueOpen ? 'Skrýt' : `Zobrazit vše (${timeline.overdue.length})`}
                          </button>
                        )}
                      </div>
                      <div className="divide-y divide-subtle-border">
                        {(overdueOpen ? timeline.overdue : timeline.overdue.slice(0, OVERDUE_PREVIEW)).map((post) => (
                          <TimelineRow key={post.id} post={post} client={clientMap[post.clientId]} overdue commentCount={unresolvedByPost[post.id] ?? 0} onSelect={handleSelectPost} />
                        ))}
                      </div>
                      {!overdueOpen && timeline.overdue.length > OVERDUE_PREVIEW && (
                        <button
                          onClick={() => setOverdueOpen(true)}
                          className="w-full text-center text-xs font-semibold text-secondary hover:text-primary py-2 transition-colors"
                        >
                          + {timeline.overdue.length - OVERDUE_PREVIEW} dalších po termínu
                        </button>
                      )}
                      <div className="border-t border-subtle-border my-3" />
                    </div>
                  )}

                  {timelineRange === 'today' ? (
                    <div className="divide-y divide-subtle-border">
                      {timeline.inRange.slice(0, timelineLimit).map((post) => (
                        <TimelineRow key={post.id} post={post} client={clientMap[post.clientId]} commentCount={unresolvedByPost[post.id] ?? 0} onSelect={handleSelectPost} />
                      ))}
                    </div>
                  ) : (
                    visibleGroups?.map((group) => (
                      <div key={group.key} className="mb-3 last:mb-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5 sticky top-0 bg-surface py-1">
                          {group.label}
                        </p>
                        <div className="divide-y divide-subtle-border">
                          {group.posts.map((post) => (
                            <TimelineRow key={post.id} post={post} client={clientMap[post.clientId]} commentCount={unresolvedByPost[post.id] ?? 0} onSelect={handleSelectPost} />
                          ))}
                        </div>
                      </div>
                    ))
                  )}

                  {timeline.inRange.length > timelineLimit && (
                    <button
                      onClick={() => setTimelineLimit((n) => n + TIMELINE_PAGE)}
                      className="w-full mt-2 py-2.5 rounded-[var(--radius-field)] bg-subtle hover:bg-hover text-sm font-semibold text-secondary hover:text-primary transition-colors"
                    >
                      Načíst další ({timeline.inRange.length - timelineLimit})
                    </button>
                  )}
                </>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Aktivita klientů */}
        <div className="space-y-3">
          {totalUnresolved > 0 && (
            <button
              onClick={() => navigate('/komentare')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-field)] text-left transition-colors hover:brightness-95"
              style={{ background: 'var(--status-revision-bg)' }}
            >
              <MessageSquare className="w-4 h-4 shrink-0" style={{ color: 'var(--status-revision-fg)' }} />
              <span className="text-sm font-semibold flex-1" style={{ color: 'var(--status-revision-fg)' }}>
                {pluralize(totalUnresolved, 'nevyřešený komentář', 'nevyřešené komentáře', 'nevyřešených komentářů')}
              </span>
              <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--status-revision-fg)' }} />
            </button>
          )}
          <Card>
            <CardHeader
              title="Aktivita klientů"
              actions={
                <button
                  onClick={() => navigate('/aktivita')}
                  className="text-xs font-semibold text-secondary hover:text-primary transition-colors shrink-0"
                >
                  Zobrazit vše
                </button>
              }
            />
            <CardBody className="space-y-1">
              {activityLoading ? (
                <div className="space-y-3">
                  <SkeletonRow /><SkeletonRow /><SkeletonRow />
                </div>
              ) : clientActivity.length === 0 ? (
                <EmptyState
                  icon={MessageSquare}
                  title="Zatím žádná aktivita"
                  description="Komentáře a schválení od klientů se zobrazí zde."
                />
              ) : (
                <div className="divide-y divide-subtle-border -mx-1">
                  {clientActivity.map((item) => {
                    const unread = !item.readAt;
                    const client = clientMap[item.clientId];
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleActivityClick(item)}
                        className={`w-full text-left flex items-start gap-3 px-1 py-3 rounded-[var(--radius-field)] transition-colors hover:bg-hover ${unread ? 'bg-subtle' : ''}`}
                      >
                        <span className="relative shrink-0 mt-0.5">
                          <Avatar src={client?.logoUrl} name={client?.name ?? item.clientName} size="sm" />
                          {unread && (
                            <span
                              className="absolute -top-0.5 -left-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[var(--bg-surface)]"
                              style={{ background: 'var(--status-revision-fg)' }}
                            />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-primary leading-snug">{describeActivity(item)}</p>
                          {item.type === 'comment' && item.preview && (
                            <p className="text-xs text-secondary mt-0.5 line-clamp-2">{item.preview}</p>
                          )}
                        </div>
                        <span className="text-[11px] text-muted shrink-0 whitespace-nowrap mt-0.5">
                          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: cs })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Klienti — přehled stavů */}
      <Card>
        <CardHeader title="Klienti — přehled stavů" />
        {clientRows.length === 0 ? (
          <CardBody>
            <EmptyState
              icon={CheckCircle2}
              title="Zatím žádní aktivní klienti"
              action={
                <button
                  onClick={() => navigate('/klienti')}
                  className="text-sm font-semibold text-secondary hover:text-primary"
                >
                  Přejít na klienty
                </button>
              }
            />
          </CardBody>
        ) : (
          <div className="divide-y divide-subtle-border">
            {clientRows.slice(0, 8).map(({ client, draftsCount, waitingCount, overdueCount }) => {
              const hasNothing = draftsCount === 0 && waitingCount === 0 && overdueCount === 0;
              return (
                <button
                  key={client.id}
                  onClick={() => navigate(`/kalendar/${client.id}`)}
                  className="w-full flex items-center gap-3 px-5 sm:px-7 py-3.5 text-left hover:bg-hover transition-colors"
                >
                  <Avatar src={client.logoUrl} name={client.name} size="sm" />
                  <span className="font-semibold text-primary truncate shrink-0 max-w-[40%]">{client.name}</span>
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
                    {hasNothing ? (
                      <span className="text-xs text-muted">Vše v pořádku</span>
                    ) : (
                      <>
                        {draftsCount > 0 && (
                          <span
                            className="inline-flex items-center h-6 px-2 rounded-full text-[11px] font-semibold"
                            style={{ color: 'var(--status-draft-fg)', background: 'var(--status-draft-bg)' }}
                          >
                            {pluralize(draftsCount, 'koncept', 'koncepty', 'konceptů')}
                          </span>
                        )}
                        {waitingCount > 0 && (
                          <span
                            className="inline-flex items-center h-6 px-2 rounded-full text-[11px] font-semibold"
                            style={{ color: 'var(--status-review-fg)', background: 'var(--status-review-bg)' }}
                          >
                            {waitingCount === 1 ? '1 čeká' : `${waitingCount} čekají`}
                          </span>
                        )}
                        {overdueCount > 0 && (
                          <span
                            className="inline-flex items-center h-6 px-2 rounded-full text-[11px] font-semibold"
                            style={{ color: 'var(--status-revision-fg)', background: 'var(--status-revision-bg)' }}
                          >
                            {overdueCount} po termínu
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted shrink-0" />
                </button>
              );
            })}
          </div>
        )}
        {clientRows.length > 8 && (
          <div className="px-5 sm:px-7 py-3 border-t border-subtle-border">
            <button
              onClick={() => navigate('/klienti')}
              className="text-sm font-semibold text-secondary hover:text-primary"
            >
              Zobrazit všechny klienty
            </button>
          </div>
        )}
      </Card>

      {/* Pracovní fronta */}
      <Card>
        <CardHeader
          title="Pracovní fronta"
          actions={
            <Tabs
              size="sm"
              value={queueTab}
              onChange={(v) => { setQueueTabTouched(true); setQueueTabState(v as QueueTab); }}
              items={[
                { value: 'draft', label: `Koncepty (${queueBuckets.draft.length})` },
                { value: 'action', label: `Vyžaduje akci (${queueBuckets.action.length})` },
                { value: 'waiting', label: `Čeká na klienta (${queueBuckets.waiting.length})` },
                { value: 'ready', label: `Připraveno (${queueBuckets.ready.length})` },
              ]}
            />
          }
        />
        <CardBody>
          {currentQueuePosts.length === 0 ? (
            <EmptyState icon={CheckCircle2} title={queueEmptyCopy[queueTab]} />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {visibleQueuePosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    now={now}
                    client={clientMap[post.clientId]}
                    commentCount={unresolvedByPost[post.id] ?? 0}
                    onClick={() => handleSelectPost(post)}
                  />
                ))}
              </div>
              {currentQueuePosts.length > visibleQueuePosts.length && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={() => navigate(`/obsah?status=${queueStatusFilter[queueTab]}`)}
                    className="text-sm font-semibold text-secondary hover:text-primary"
                  >
                    Zobrazit vše
                  </button>
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>

      {currentSelectedPost && clientMap[currentSelectedPost.clientId] && (
        <PostModal
          post={currentSelectedPost}
          client={clientMap[currentSelectedPost.clientId]}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </div>
  );
}

// ---------- Timeline row ----------

const TimelineRow = React.memo(function TimelineRow({
  post, client, overdue, commentCount = 0, onSelect,
}: {
  post: Post;
  client?: { name: string; logoUrl?: string };
  overdue?: boolean;
  commentCount?: number;
  onSelect: (post: Post) => void;
  key?: React.Key;
}) {
  const meta = getPostMeta(post);
  const isEvent = post.postType === 'event';
  const timeColor = overdue ? 'var(--status-revision-fg)' : undefined;
  const barColor = overdue ? 'var(--status-revision-fg)' : meta.fg;

  return (
    <button
      onClick={() => onSelect(post)}
      className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-hover transition-colors rounded-[var(--radius-field)] px-1 -mx-1"
    >
      <span className="w-14 shrink-0 text-sm font-semibold text-secondary tabular-nums" style={timeColor ? { color: timeColor } : undefined}>
        {isEvent ? '—' : format(new Date(post.scheduledDate), 'HH:mm')}
      </span>
      <span className="w-[3px] self-stretch shrink-0 rounded-full" style={{ background: barColor }} />
      <span className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:gap-2">
        <span className="font-medium text-primary truncate">{post.title}</span>
        <span className="text-xs text-muted truncate">{client?.name ?? 'Neznámý klient'}</span>
      </span>
      <span className="hidden sm:flex items-center gap-2 shrink-0">
        <CommentBadge count={commentCount} />
        <StatusBadge post={post} size="sm" />
      </span>
    </button>
  );
});
