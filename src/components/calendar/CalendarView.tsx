import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, startOfToday,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay,
  isSameMonth, isSameDay, eachDayOfInterval,
} from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  ChevronLeft, ChevronRight, ExternalLink, Plus, FileText, CalendarDays,
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import type { Client, Post } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { getHolidayForDate } from '../../lib/holidays';
import { getPostMeta, isOverdue } from '../../lib/status';
import { getBrandColor } from '../../lib/brand';
import { filterForClient } from '../../lib/visibility';
import {
  DAY_START_HOUR, DAY_END_HOUR, HOUR_HEIGHT, HOUR_HEIGHT_SM, GUTTER_WIDTH,
  totalGridHeight, topPx, layoutDayPosts,
} from '../../lib/calendar-layout';
import { Card, Button, IconButton, Tabs, Avatar, EmptyState } from '../ui';
import PostCard from '../PostCard';
import ClientPostList from '../ClientPostList';
import DayDetailSheet from './DayDetailSheet';
import PostModal from '../PostModal';
import ClientPostModal from '../ClientPostModal';
import AddPostModal from '../AddPostModal';
import AddEventModal from '../AddEventModal';
import ClientAnalyticsModal from '../ClientAnalyticsModal';

const WEEKDAYS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

export type ViewMode = 'day' | 'day3' | 'week' | 'month' | 'list';

interface CalendarViewProps {
  client: Client;
  posts: Post[];
  isAdmin: boolean;
  /** postId -> unresolved client comment count. CalendarView is also mounted on the public,
   * unauthenticated client portal, which sits outside the comments provider — so this is always
   * passed as a prop from the page level rather than read from a hook here. Undefined on the
   * public portal, where no badges are shown. */
  unresolvedByPost?: Record<string, number>;
}

export default function CalendarView({ client, posts: allPosts, isAdmin, unresolvedByPost }: CalendarViewProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  // Defence in depth: even if a caller passes unfiltered posts, drafts never render for non-admins here.
  const posts = useMemo(() => filterForClient(allPosts, isAdmin), [allPosts, isAdmin]);
  // CalendarView has no access to AgencyClockContext (it's also mounted on the public client
  // portal, outside that provider), so it keeps its own coarse ticker for overdue detection here.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5 * 60_000);
    return () => clearInterval(id);
  }, []);
  const [currentDate, setCurrentDate] = useState(new Date());
  // Default to the day view on phones (Google-Calendar-style), week everywhere else. Read once
  // on mount — a device rotation afterwards must not silently change the user's chosen mode.
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches ? 'day' : 'week'
  );
  const [mobileDay, setMobileDay] = useState(new Date());

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isAddingPost, setIsAddingPost] = useState(false);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [addingPostDate, setAddingPostDate] = useState<Date | undefined>(undefined);
  const [dayDetail, setDayDetail] = useState<Date | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Deep-link support: the notification centre navigates here with ?post=<id> to auto-open a post.
  useEffect(() => {
    const postId = searchParams.get('post');
    if (!postId) return;
    const target = posts.find((p) => p.id === postId);
    if (!target) return; // posts may still be loading; retry once they arrive
    setSelectedPost(target);
    const next = new URLSearchParams(searchParams);
    next.delete('post');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, posts]);

  const currentSelectedPost = selectedPost ? posts.find((p) => p.id === selectedPost.id) ?? null : null;

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  let rangeStart: Date;
  let rangeEnd: Date;
  switch (viewMode) {
    case 'day':
      rangeStart = startOfDay(currentDate);
      rangeEnd = endOfDay(currentDate);
      break;
    case 'day3':
      // Starts at currentDate itself, not a week boundary — "the next three days from here",
      // matching Google Calendar's 3-day view.
      rangeStart = startOfDay(currentDate);
      rangeEnd = endOfDay(addDays(currentDate, 2));
      break;
    case 'week':
      rangeStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      rangeEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      break;
    default:
      rangeStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      rangeEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  }
  const calendarDays = eachDayOfInterval({ start: rangeStart, end: rangeEnd });

  const nextPeriod = () => {
    if (viewMode === 'day') setCurrentDate(addDays(currentDate, 1));
    else if (viewMode === 'day3') setCurrentDate(addDays(currentDate, 3));
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addMonths(currentDate, 1));
  };
  const prevPeriod = () => {
    if (viewMode === 'day') setCurrentDate(subDays(currentDate, 1));
    else if (viewMode === 'day3') setCurrentDate(subDays(currentDate, 3));
    else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subMonths(currentDate, 1));
  };

  const headerTitle = useMemo(() => {
    switch (viewMode) {
      case 'list':
        return 'Všechny příspěvky';
      case 'day':
        return format(currentDate, 'EEEE d. MMMM', { locale: cs });
      case 'day3':
        return isSameMonth(rangeStart, rangeEnd)
          ? `${format(rangeStart, 'd.')}–${format(rangeEnd, 'd. MMMM', { locale: cs })}`
          : `${format(rangeStart, 'd. MMMM', { locale: cs })}–${format(rangeEnd, 'd. MMMM', { locale: cs })}`;
      case 'week':
        return `${format(rangeStart, 'd. L.', { locale: cs })}–${format(rangeEnd, 'd. L. yyyy', { locale: cs })}`;
      default:
        return format(currentDate, 'LLLL yyyy', { locale: cs });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, currentDate, rangeStart, rangeEnd]);

  const getPostsForDay = (day: Date) => posts.filter((post) => isSameDay(new Date(post.scheduledDate), day));

  // Drag-to-reschedule (month/week grids). Preserves the post's original time-of-day (month)
  // or original minutes (week, where the drop target already carries the target hour).
  const handleRescheduleDrop = async (postId: string, newDate: Date) => {
    const post = posts.find((p) => p.id === postId);
    if (!post || post.status === 'published') return;
    try {
      await updateDoc(doc(db, 'posts', postId), { scheduledDate: newDate.getTime(), updatedAt: Date.now() });
      toast({
        title: `Přesunuto na ${format(newDate, "d. MMMM 'v' H:mm", { locale: cs })}`,
        variant: 'success',
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
      toast({ title: 'Nepodařilo se přesunout příspěvek.', variant: 'error' });
    }
  };

  const combinedUpcoming = useMemo(
    () =>
      posts
        .filter((post) => post.scheduledDate >= startOfToday().getTime())
        .sort((a, b) => a.scheduledDate - b.scheduledDate)
        .slice(0, 7),
    [posts]
  );

  const openAddPostAt = (date: Date) => {
    if (!currentUser) return;
    setAddingPostDate(date);
    setIsAddingPost(true);
  };

  const brandColor = getBrandColor(client.brandColor);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <Card className="p-4 sm:p-5 relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: brandColor }} />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pl-2">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar src={client.logoUrl} name={client.name} size="md" />
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-primary tracking-tight truncate">{client.name}</h1>
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted">Klientský portál</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button variant="secondary" icon={FileText} onClick={() => setIsAnalyticsOpen(true)}>
              Analytika
            </Button>
            {client.googleDriveLink && (
              <a href={client.googleDriveLink} target="_blank" rel="noopener noreferrer">
                <Button variant="primary" icon={ExternalLink}>Složka</Button>
              </a>
            )}
          </div>
        </div>
      </Card>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <Card className="overflow-hidden">
            {/* Controls */}
            <div className="flex flex-col gap-3 px-4 sm:px-6 py-4 border-b border-subtle-border">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  {viewMode !== 'list' && (
                    <div className="flex items-center bg-subtle rounded-full p-1 shrink-0">
                      <IconButton icon={ChevronLeft} label="Předchozí" size="sm" variant="ghost" onClick={prevPeriod} />
                      <button
                        onClick={() => setCurrentDate(new Date())}
                        className="px-2.5 h-7 text-xs font-bold text-secondary hover:text-primary rounded-full transition-colors"
                      >
                        Dnes
                      </button>
                      <IconButton icon={ChevronRight} label="Další" size="sm" variant="ghost" onClick={nextPeriod} />
                    </div>
                  )}
                  <h2 className="text-base sm:text-lg font-bold text-primary tracking-tight capitalize truncate">
                    {headerTitle}
                  </h2>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="secondary" icon={CalendarDays} onClick={() => setIsAddingEvent(true)}>
                      <span className="hidden sm:inline">Událost</span>
                    </Button>
                    <Button size="sm" variant="primary" icon={Plus} onClick={() => setIsAddingPost(true)}>
                      <span className="hidden sm:inline">Příspěvek</span>
                    </Button>
                  </div>
                )}
              </div>

              <Tabs
                value={viewMode}
                onChange={(v) => setViewMode(v as ViewMode)}
                items={[
                  { value: 'day', label: 'Den' },
                  { value: 'day3', label: '3 dny' },
                  { value: 'week', label: 'Týden' },
                  { value: 'month', label: 'Měsíc' },
                  { value: 'list', label: 'Seznam' },
                ]}
                className="w-full sm:w-auto sm:self-end"
              />
            </div>

            {viewMode === 'month' && (
              <MonthGrid
                days={calendarDays}
                monthStart={monthStart}
                posts={posts}
                now={now}
                unresolvedByPost={unresolvedByPost}
                getPostsForDay={getPostsForDay}
                isAdmin={isAdmin}
                onOpenAddPost={openAddPostAt}
                onPostClick={setSelectedPost}
                onOpenDayDetail={setDayDetail}
                onDropPost={handleRescheduleDrop}
              />
            )}

            {(viewMode === 'day' || viewMode === 'day3' || viewMode === 'week') && (
              <WeekView
                days={calendarDays}
                dayCount={calendarDays.length}
                posts={posts}
                isAdmin={isAdmin}
                unresolvedByPost={unresolvedByPost}
                onOpenAddPost={openAddPostAt}
                onPostClick={setSelectedPost}
                mobileDay={mobileDay}
                setMobileDay={setMobileDay}
                onDropPost={handleRescheduleDrop}
              />
            )}


            {viewMode === 'list' && (
              <div className="p-4 sm:p-6">
                <ClientPostList posts={posts} now={now} unresolvedByPost={unresolvedByPost} onPostClick={setSelectedPost} />
              </div>
            )}
          </Card>
        </div>

        {/* Upcoming rail */}
        <div className="w-full lg:w-80 shrink-0">
          <Card className="p-5 lg:sticky lg:top-6">
            <h3 className="font-bold text-primary tracking-tight mb-4 flex items-center gap-2 text-sm">
              <CalendarDays className="w-4 h-4 text-secondary" /> Nadcházející
              {combinedUpcoming.length > 0 && (
                <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-subtle text-muted text-[11px] font-bold">
                  {combinedUpcoming.length}
                </span>
              )}
            </h3>
            {combinedUpcoming.length === 0 ? (
              <p className="text-sm text-secondary">Nic není v plánu.</p>
            ) : (
              <div className="space-y-2.5">
                {combinedUpcoming.slice(0, 7).map((item) => {
                  const meta = getPostMeta(item);
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedPost(item)}
                      className="w-full text-left p-3 bg-subtle hover:bg-hover rounded-[var(--radius-field)] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-primary line-clamp-2 leading-snug">{item.title}</span>
                        <meta.Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: meta.fg }} />
                      </div>
                      <p className="text-xs text-secondary mt-1">
                        {format(new Date(item.scheduledDate), "d. MMMM 'v' H:mm", { locale: cs })}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {currentSelectedPost && (
        currentUser ? (
          <PostModal post={currentSelectedPost} client={client} onClose={() => setSelectedPost(null)} />
        ) : (
          <ClientPostModal post={currentSelectedPost} client={client} onClose={() => setSelectedPost(null)} />
        )
      )}

      {isAddingEvent && <AddEventModal clientId={client.id} onClose={() => setIsAddingEvent(false)} />}

      {isAddingPost && (
        <AddPostModal
          clientId={client.id}
          onClose={() => { setIsAddingPost(false); setAddingPostDate(undefined); }}
          initialDate={addingPostDate}
        />
      )}

      {isAnalyticsOpen && <ClientAnalyticsModal client={client} onClose={() => setIsAnalyticsOpen(false)} />}

      <DayDetailSheet
        open={!!dayDetail}
        onClose={() => setDayDetail(null)}
        date={dayDetail}
        posts={dayDetail ? getPostsForDay(dayDetail) : []}
        now={now}
        unresolvedByPost={unresolvedByPost}
        holidayName={dayDetail ? getHolidayForDate(dayDetail) : null}
        isAdmin={isAdmin}
        onPostClick={(post) => { setDayDetail(null); setSelectedPost(post); }}
        onAddPost={dayDetail ? () => { const d = new Date(dayDetail); d.setHours(12, 0, 0, 0); setDayDetail(null); openAddPostAt(d); } : undefined}
      />
    </div>
  );
}

// ---------- Month grid ----------

function MonthGrid({
  days,
  monthStart,
  posts,
  now,
  unresolvedByPost,
  getPostsForDay,
  isAdmin,
  onOpenAddPost,
  onPostClick,
  onOpenDayDetail,
  onDropPost,
}: {
  days: Date[];
  monthStart: Date;
  posts: Post[];
  now: number;
  unresolvedByPost?: Record<string, number>;
  getPostsForDay: (day: Date) => Post[];
  isAdmin: boolean;
  onOpenAddPost: (date: Date) => void;
  onPostClick: (post: Post) => void;
  onOpenDayDetail: (date: Date) => void;
  onDropPost: (postId: string, newDate: Date) => void;
}) {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-7 border-b border-subtle-border sticky top-0 bg-surface z-10">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-muted">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayPosts = getPostsForDay(day);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, new Date());
          const holidayName = getHolidayForDate(day);
          const maxChips = 3;
          const visiblePosts = dayPosts.slice(0, maxChips);
          const overflowCount = dayPosts.length - visiblePosts.length;
          const dayKey = day.toString();
          const isHovered = isAdmin && hoveredDay === dayKey;

          return (
            <div
              key={dayKey}
              onClick={() => isAdmin && onOpenAddPost(new Date(day.getFullYear(), day.getMonth(), day.getDate(), 12, 0, 0, 0))}
              onDragOver={(e) => {
                if (!isAdmin) return;
                e.preventDefault(); // mandatory — without it the drop event never fires
                e.dataTransfer.dropEffect = 'move';
                if (hoveredDay !== dayKey) setHoveredDay(dayKey);
              }}
              onDragLeave={() => setHoveredDay((prev) => (prev === dayKey ? null : prev))}
              onDrop={(e) => {
                if (!isAdmin) return;
                e.preventDefault();
                setHoveredDay(null);
                const postId = e.dataTransfer.getData('text/plain');
                if (!postId) return;
                const source = posts.find((p) => p.id === postId);
                const target = new Date(day.getFullYear(), day.getMonth(), day.getDate());
                if (source) {
                  const sourceDate = new Date(source.scheduledDate);
                  target.setHours(sourceDate.getHours(), sourceDate.getMinutes(), 0, 0);
                } else {
                  target.setHours(12, 0, 0, 0);
                }
                onDropPost(postId, target);
              }}
              className={`min-h-[88px] sm:min-h-[140px] p-1.5 sm:p-2 border-b border-r border-subtle-border overflow-hidden flex flex-col transition-colors ${
                isAdmin ? 'cursor-pointer hover:bg-hover' : ''
              } ${!isCurrentMonth ? 'opacity-50' : ''} ${holidayName && isCurrentMonth ? 'bg-[var(--status-revision-bg)]/30' : ''} ${
                isHovered ? 'bg-hover ring-2 ring-inset ring-[var(--accent)]' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-1 shrink-0">
                <span
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full grid place-items-center text-xs font-semibold shrink-0 ${
                    isToday ? 'bg-accent text-accent-fg' : 'text-primary'
                  }`}
                >
                  {format(day, 'd')}
                </span>
              </div>
              {holidayName && isCurrentMonth && (
                <p
                  className="text-[9px] sm:text-[10px] font-semibold truncate mt-0.5"
                  style={{ color: 'var(--status-revision-fg)' }}
                  title={holidayName}
                >
                  {holidayName}
                </p>
              )}
              <div className="flex flex-col gap-1 mt-1 min-w-0 overflow-hidden">
                {visiblePosts.map((post) => (
                  <MonthChip
                    key={post.id}
                    post={post}
                    now={now}
                    hasUnresolvedComments={(unresolvedByPost?.[post.id] ?? 0) > 0}
                    isDragging={draggingId === post.id}
                    canDrag={isAdmin && post.status !== 'published'}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', post.id);
                      e.dataTransfer.effectAllowed = 'move';
                      setDraggingId(post.id);
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    onClick={(e) => { e.stopPropagation(); onPostClick(post); }}
                  />
                ))}
                {overflowCount > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onOpenDayDetail(day); }}
                    className="h-6 px-1.5 rounded-md text-[11px] font-semibold text-secondary bg-subtle hover:bg-hover text-left"
                  >
                    +{overflowCount} další
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** One post chip inside a month-grid day cell. Memoized — month cells re-render often
 * (drag hover state, day selection) and this keeps unaffected chips from re-rendering. */
const MonthChip = React.memo(function MonthChip({
  post,
  now,
  hasUnresolvedComments,
  isDragging,
  canDrag,
  onDragStart,
  onDragEnd,
  onClick,
}: {
  post: Post;
  now: number;
  hasUnresolvedComments: boolean;
  isDragging: boolean;
  canDrag: boolean;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  const meta = getPostMeta(post);
  const overdue = isOverdue(post, now);
  return (
    <div
      draggable={canDrag}
      onDragStart={(e) => { if (canDrag) onDragStart(e); }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`relative h-6 px-1.5 rounded-md text-[11px] font-medium flex items-center gap-1 truncate ${canDrag ? 'cursor-grab' : 'cursor-pointer'} ${isDragging ? 'opacity-40' : ''}`}
      style={{
        background: meta.bg,
        color: meta.fg,
        boxShadow: overdue ? 'inset 0 0 0 1px var(--status-revision-fg)' : undefined,
      }}
    >
      <meta.Icon className="w-3 h-3 shrink-0" />
      <span className="truncate">{format(new Date(post.scheduledDate), 'HH:mm')} {post.title}</span>
      {hasUnresolvedComments && (
        <span
          className="absolute -top-0.5 -right-0.5 w-[6px] h-[6px] rounded-full ring-1 ring-[var(--bg-surface)]"
          style={{ background: 'var(--status-revision-fg)' }}
        />
      )}
    </div>
  );
});

// ---------- Week view (Google-Calendar-style time grid) ----------

/** Snap a raw minute offset (from the top of the grid) to 15-minute increments. */
const snapMinutes = (minutes: number) => Math.round(minutes / 15) * 15;

/** Convert a Y offset inside a day column (in px) to a Date, snapped to 15 minutes. */
const yToDate = (day: Date, y: number, hourHeight: number): Date => {
  const rawMinutes = (y / hourHeight) * 60;
  const snapped = Math.max(0, snapMinutes(rawMinutes));
  const date = new Date(day.getFullYear(), day.getMonth(), day.getDate(), DAY_START_HOUR, 0, 0, 0);
  date.setMinutes(date.getMinutes() + snapped);
  return date;
};

function NowLine({ hourHeight, now }: { hourHeight: number; now: number }) {
  const nowDate = new Date(now);
  const hour = nowDate.getHours();
  if (hour < DAY_START_HOUR || hour >= DAY_END_HOUR) return null;
  const top = topPx(nowDate, hourHeight);
  return (
    <div
      className="absolute left-0 right-0 z-30 pointer-events-none"
      style={{ top }}
    >
      <div className="relative h-0">
        <span
          className="absolute -left-[4px] -top-[4px] w-2 h-2 rounded-full"
          style={{ background: 'var(--status-revision-fg)' }}
        />
        <div className="h-[2px] w-full" style={{ background: 'var(--status-revision-fg)' }} />
      </div>
    </div>
  );
}

function AllDayChipRow({
  events,
  onEventClick,
}: {
  events: Post[];
  onEventClick: (post: Post) => void;
}) {
  if (events.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 px-2 py-2 border-b border-subtle-border bg-surface">
      {events.map((event) => {
        const meta = getPostMeta(event);
        return (
          <button
            key={event.id}
            onClick={() => onEventClick(event)}
            className="inline-flex items-center gap-1.5 h-6 px-2 rounded-full text-[11px] font-semibold truncate max-w-[180px]"
            style={{ background: meta.bg, color: meta.fg }}
          >
            <meta.Icon className="w-3 h-3 shrink-0" />
            <span className="truncate">{event.title}</span>
          </button>
        );
      })}
    </div>
  );
}

interface DragCreateState {
  dayKey: string;
  startY: number;
  currentY: number;
}

function DayColumn({
  day,
  posts,
  hourHeight,
  isAdmin,
  now,
  unresolvedByPost,
  allowDragCreate = isAdmin,
  onOpenAddPost,
  onPostClick,
  onDropPost,
  dragCreate,
  setDragCreate,
}: {
  day: Date;
  posts: Post[];
  hourHeight: number;
  isAdmin: boolean;
  now: number;
  unresolvedByPost?: Record<string, number>;
  allowDragCreate?: boolean;
  onOpenAddPost: (date: Date) => void;
  onPostClick: (post: Post) => void;
  onDropPost: (postId: string, newDate: Date) => void;
  dragCreate: DragCreateState | null;
  setDragCreate: (s: DragCreateState | null) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverActive, setDragOverActive] = useState(false);
  const dayKey = day.toDateString();
  const laidOut = useMemo(() => layoutDayPosts(posts, hourHeight), [posts, hourHeight]);

  const isDraggingCreate = dragCreate?.dayKey === dayKey;

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAdmin) return;
    // Only start a create-drag when the mousedown target is the column background itself,
    // not a post block (a block's own onClick/onDragStart handles that case).
    if (e.currentTarget !== e.target) return;
    if (!allowDragCreate) {
      // Touch/mobile: no drag-to-create, but a plain tap still opens AddPostModal at the tapped slot.
      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      onOpenAddPost(yToDate(day, y, hourHeight));
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    setDragCreate({ dayKey, startY: y, currentY: y });
  };

  return (
    <div
      className="relative border-r border-subtle-border"
      style={{ height: totalGridHeight(hourHeight) }}
      onMouseDown={handleMouseDown}
      onDragOver={(e) => {
        if (!isAdmin) return;
        e.preventDefault(); // mandatory — without it the drop event never fires
        e.dataTransfer.dropEffect = 'move';
        setDragOverActive(true);
      }}
      onDragLeave={() => setDragOverActive(false)}
      onDrop={(e) => {
        if (!isAdmin) return;
        e.preventDefault();
        setDragOverActive(false);
        const postId = e.dataTransfer.getData('text/plain');
        if (!postId) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const target = yToDate(day, y, hourHeight);
        onDropPost(postId, target);
      }}
    >
      {/* Hour lines */}
      {Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => (
        <div
          key={i}
          className="absolute left-0 right-0 border-t border-subtle-border pointer-events-none"
          style={{ top: i * hourHeight }}
        />
      ))}

      {dragOverActive && (
        <div className="absolute inset-0 bg-hover pointer-events-none" />
      )}

      {/* Ghost block while creating */}
      {isDraggingCreate && dragCreate && Math.abs(dragCreate.currentY - dragCreate.startY) >= 8 && (
        <div
          className="absolute left-0.5 right-0.5 rounded-[10px] pointer-events-none"
          style={{
            top: Math.min(dragCreate.startY, dragCreate.currentY),
            height: Math.max(Math.abs(dragCreate.currentY - dragCreate.startY), 24),
            background: 'var(--accent)',
            opacity: 0.15,
          }}
        />
      )}

      {laidOut.map(({ post, top, height, column, columns }) => (
        <WeekBlock
          key={post.id}
          post={post}
          now={now}
          hasUnresolvedComments={(unresolvedByPost?.[post.id] ?? 0) > 0}
          top={top}
          height={height}
          column={column}
          columns={columns}
          isDragging={draggingId === post.id}
          canDrag={isAdmin && post.status !== 'published'}
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', post.id);
            e.dataTransfer.effectAllowed = 'move';
            setDraggingId(post.id);
          }}
          onDragEnd={() => setDraggingId(null)}
          onClick={(e) => { e.stopPropagation(); onPostClick(post); }}
        />
      ))}
    </div>
  );
}

/** One post block inside a week-view day column. Memoized for the same reason as MonthChip —
 * drag/hover state in the parent should not force every block in the column to re-render. */
const WeekBlock = React.memo(function WeekBlock({
  post,
  now,
  hasUnresolvedComments,
  top,
  height,
  column,
  columns,
  isDragging,
  canDrag,
  onDragStart,
  onDragEnd,
  onClick,
}: {
  post: Post;
  now: number;
  hasUnresolvedComments: boolean;
  top: number;
  height: number;
  column: number;
  columns: number;
  isDragging: boolean;
  canDrag: boolean;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  const meta = getPostMeta(post);
  const overdue = isOverdue(post, now);
  const oneLine = height < 40;
  return (
    <div
      draggable={canDrag}
      onDragStart={(e) => { if (canDrag) onDragStart(e); }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      onMouseDown={(e) => e.stopPropagation()}
      className={`absolute rounded-[10px] px-2 py-1 overflow-hidden transition-[filter] hover:brightness-95 dark:hover:brightness-110 ${
        canDrag ? 'cursor-grab' : 'cursor-pointer'
      } ${isDragging ? 'opacity-40' : ''}`}
      style={{
        top,
        height,
        left: `calc(${(column / columns) * 100}% + 2px)`,
        width: `calc(${100 / columns}% - 4px)`,
        background: meta.bg,
        color: meta.fg,
        borderLeft: `3px solid ${meta.fg}`,
        boxShadow: overdue ? 'inset 0 0 0 1px var(--status-revision-fg)' : undefined,
      }}
    >
      {hasUnresolvedComments && (
        <span
          className="absolute top-1 right-1 w-[6px] h-[6px] rounded-full ring-1 ring-[var(--bg-surface)]"
          style={{ background: 'var(--status-revision-fg)' }}
        />
      )}
      {oneLine ? (
        <p className="text-[10px] font-medium truncate leading-tight">
          <span className="font-bold tabular-nums">{format(new Date(post.scheduledDate), 'HH:mm')}</span>{' '}
          {post.title}
        </p>
      ) : (
        <>
          <p className="text-[10px] font-bold tabular-nums leading-tight">
            {format(new Date(post.scheduledDate), 'HH:mm')}
          </p>
          <p className="text-[11px] font-medium truncate leading-tight">{post.title}</p>
        </>
      )}
    </div>
  );
});

function WeekView({
  days,
  dayCount,
  posts,
  isAdmin,
  unresolvedByPost,
  onOpenAddPost,
  onPostClick,
  mobileDay,
  setMobileDay,
  onDropPost,
}: {
  days: Date[];
  /** Same as days.length — passed explicitly so the grid's column count is an obvious prop,
   * not something callers have to infer from an array. */
  dayCount: number;
  posts: Post[];
  isAdmin: boolean;
  unresolvedByPost?: Record<string, number>;
  onOpenAddPost: (date: Date) => void;
  onPostClick: (post: Post) => void;
  mobileDay: Date;
  setMobileDay: (d: Date) => void;
  onDropPost: (postId: string, newDate: Date) => void;
}) {
  // CalendarView is also mounted on the public, unauthenticated client portal, which sits
  // outside AgencyDataProvider — so we can't always rely on its ticking `now`. Keep a local
  // 60s ticker here (same cadence) so the now-line stays correct in every mounting context.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const [dragCreate, setDragCreate] = useState<DragCreateState | null>(null);

  const hours = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => i + DAY_START_HOUR);

  const timedPosts = useMemo(() => posts.filter((p) => p.postType !== 'event'), [posts]);
  const allDayEvents = useMemo(() => posts.filter((p) => p.postType === 'event'), [posts]);

  const getPostsForDay = (day: Date) => timedPosts.filter((post) => isSameDay(new Date(post.scheduledDate), day));
  const getEventsForDay = (day: Date) => allDayEvents.filter((event) => isSameDay(new Date(event.scheduledDate), day));

  const weekHasToday = days.some((d) => isSameDay(d, new Date(now)));

  // Auto-scroll so 8:00 (or the now-line, if today is visible) sits near the top on mount.
  useEffect(() => {
    const scrollTo = (el: HTMLDivElement | null, hourHeight: number) => {
      if (!el) return;
      const nowDate = new Date(now);
      const targetHour = weekHasToday && nowDate.getHours() >= DAY_START_HOUR ? Math.max(nowDate.getHours() - 1, DAY_START_HOUR) : 8;
      el.scrollTop = (targetHour - DAY_START_HOUR) * hourHeight;
    };
    scrollTo(scrollRef.current, HOUR_HEIGHT);
    scrollTo(mobileScrollRef.current, HOUR_HEIGHT_SM);
    // Only on mount — this is a one-time scroll position, not a reactive effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Drag-to-create: track mouse position on window while dragging, commit on mouseup.
  useEffect(() => {
    if (!dragCreate) return;
    const handleMove = (e: MouseEvent) => {
      const container = document.querySelector<HTMLElement>(`[data-daycol="${dragCreate.dayKey}"]`);
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
      setDragCreate((prev) => (prev ? { ...prev, currentY: y } : prev));
    };
    const handleUp = (e: MouseEvent) => {
      const container = document.querySelector<HTMLElement>(`[data-daycol="${dragCreate.dayKey}"]`);
      setDragCreate((prev) => {
        if (!prev || !container) return null;
        const rect = container.getBoundingClientRect();
        const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
        const dragDistance = Math.abs(y - prev.startY);
        const day = days.find((d) => d.toDateString() === prev.dayKey) ?? new Date(prev.dayKey);
        const hourHeight = container.clientHeight / (DAY_END_HOUR - DAY_START_HOUR);
        const startPx = dragDistance >= 8 ? Math.min(prev.startY, y) : prev.startY;
        const target = yToDate(day, startPx, hourHeight);
        onOpenAddPost(target);
        return null;
      });
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragCreate?.dayKey]);

  const dayPostsForMobile = getPostsForDay(mobileDay);
  const mobileEvents = getEventsForDay(mobileDay);

  // Tailwind can't generate an arbitrary grid-cols-N class from a runtime value, so the column
  // count is always driven by an inline style.
  const gridTemplateColumns = `${GUTTER_WIDTH}px repeat(${dayCount}, minmax(0, 1fr))`;
  // With 1–3 columns there's plenty of room for the full weekday name; 7 columns stays compact.
  const dayHeaderLabel = (day: Date) =>
    dayCount <= 3
      ? capitalize(format(day, 'EEEE d. M.', { locale: cs }))
      : WEEKDAYS[(day.getDay() + 6) % 7];

  return (
    <>
      {/* Desktop time grid */}
      <div className="hidden sm:block">
        {/* Sticky day header + all-day chip row, stacked in one sticky block so there's no
            manual offset math between them — a transparent sticky header would let blocks
            scroll through it, so this whole block gets a solid background. */}
        <div className="sticky top-0 z-20 bg-surface">
          <div className="grid border-b border-subtle-border" style={{ gridTemplateColumns }}>
            <div className="border-r border-subtle-border" />
            {days.map((day) => (
              <div
                key={day.toString()}
                className="py-2.5 flex flex-col items-center justify-center text-[11px] font-bold uppercase tracking-wider text-muted"
              >
                <span>{dayHeaderLabel(day)}</span>
                <span
                  className={`text-sm mt-0.5 w-7 h-7 flex items-center justify-center rounded-full ${
                    isSameDay(day, new Date()) ? 'bg-accent text-accent-fg' : 'text-primary'
                  }`}
                >
                  {format(day, 'd')}
                </span>
              </div>
            ))}
          </div>

          <div className="grid" style={{ gridTemplateColumns }}>
            <div className="border-r border-subtle-border" />
            {days.map((day) => (
              <div key={day.toString()} className="border-b border-subtle-border">
                <AllDayChipRow events={getEventsForDay(day)} onEventClick={onPostClick} />
              </div>
            ))}
          </div>
        </div>

        <div ref={scrollRef} className="overflow-y-auto custom-scrollbar max-h-[70vh] relative">
          <div className="grid" style={{ gridTemplateColumns }}>
            <div className="relative" style={{ height: totalGridHeight(HOUR_HEIGHT) }}>
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="absolute right-2 text-[10px] font-bold text-muted -translate-y-1/2"
                  style={{ top: (hour - DAY_START_HOUR) * HOUR_HEIGHT }}
                >
                  {hour}:00
                </div>
              ))}
            </div>
            {days.map((day) => (
              <div key={day.toString()} data-daycol={day.toDateString()}>
                <DayColumn
                  day={day}
                  posts={getPostsForDay(day)}
                  hourHeight={HOUR_HEIGHT}
                  isAdmin={isAdmin}
                  now={now}
                  unresolvedByPost={unresolvedByPost}
                  onOpenAddPost={onOpenAddPost}
                  onPostClick={onPostClick}
                  onDropPost={onDropPost}
                  dragCreate={dragCreate}
                  setDragCreate={setDragCreate}
                />
              </div>
            ))}
          </div>
          {weekHasToday && (
            <div className="absolute inset-0 pointer-events-none grid" style={{ gridTemplateColumns }}>
              <div />
              {days.map((day) => (
                <div key={day.toString()} className="relative">
                  {isSameDay(day, new Date(now)) && <NowLine hourHeight={HOUR_HEIGHT} now={now} />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile: real time grid for Den/3 dny (1–3 columns fit fine); single-day agenda fallback for Týden (7 columns don't). */}
      {dayCount <= 3 ? (
        <MobileTimeGrid
          days={days}
          dayCount={dayCount}
          gridTemplateColumns={gridTemplateColumns}
          dayHeaderLabel={dayHeaderLabel}
          getPostsForDay={getPostsForDay}
          getEventsForDay={getEventsForDay}
          isAdmin={isAdmin}
          now={now}
          unresolvedByPost={unresolvedByPost}
          onOpenAddPost={onOpenAddPost}
          onPostClick={onPostClick}
          onDropPost={onDropPost}
        />
      ) : (
      <div className="sm:hidden">
        <div className="grid grid-cols-7 gap-1 p-3 border-b border-subtle-border">
          {days.map((day) => {
            const hasContent = posts.some((p) => isSameDay(new Date(p.scheduledDate), day));
            const active = isSameDay(day, mobileDay);
            return (
              <button
                key={day.toString()}
                onClick={() => setMobileDay(day)}
                className={`flex flex-col items-center gap-1 py-1.5 rounded-[var(--radius-field)] transition-colors ${
                  active ? 'bg-accent text-accent-fg' : 'text-secondary hover:bg-hover'
                }`}
              >
                <span className="text-[10px] font-bold uppercase">{WEEKDAYS[(day.getDay() + 6) % 7]}</span>
                <span className="text-sm font-semibold">{format(day, 'd')}</span>
                <span className={`w-1 h-1 rounded-full ${hasContent ? (active ? 'bg-accent-fg' : 'bg-accent') : 'bg-transparent'}`} />
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-b border-subtle-border">
          <IconButton icon={ChevronLeft} label="Předchozí den" size="sm" variant="ghost" onClick={() => setMobileDay(subDays(mobileDay, 1))} />
          <p className="text-sm font-bold text-primary capitalize">{format(mobileDay, 'EEEE d. MMMM', { locale: cs })}</p>
          <IconButton icon={ChevronRight} label="Další den" size="sm" variant="ghost" onClick={() => setMobileDay(addDays(mobileDay, 1))} />
        </div>

        <AllDayChipRow events={mobileEvents} onEventClick={onPostClick} />

        {dayPostsForMobile.length === 0 && mobileEvents.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={CalendarDays} title="Žádné příspěvky" description="Pro tento den není naplánován žádný obsah." />
          </div>
        ) : (
          <div ref={mobileScrollRef} className="overflow-y-auto custom-scrollbar max-h-[65vh] relative">
            <div className="grid grid-cols-[44px_1fr]">
              <div className="relative" style={{ height: totalGridHeight(HOUR_HEIGHT_SM) }}>
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="absolute right-1.5 text-[10px] font-bold text-muted -translate-y-1/2"
                    style={{ top: (hour - DAY_START_HOUR) * HOUR_HEIGHT_SM }}
                  >
                    {hour}:00
                  </div>
                ))}
              </div>
              <div className="relative" data-daycol={mobileDay.toDateString()}>
                <DayColumn
                  day={mobileDay}
                  posts={dayPostsForMobile}
                  hourHeight={HOUR_HEIGHT_SM}
                  isAdmin={isAdmin}
                  now={now}
                  unresolvedByPost={unresolvedByPost}
                  allowDragCreate={false}
                  onOpenAddPost={onOpenAddPost}
                  onPostClick={onPostClick}
                  onDropPost={onDropPost}
                  dragCreate={null}
                  setDragCreate={() => {}}
                />
                {isSameDay(mobileDay, new Date(now)) && <NowLine hourHeight={HOUR_HEIGHT_SM} now={now} />}
              </div>
            </div>
          </div>
        )}

        <div className="p-4">
          {isAdmin && (
            <Button
              variant="secondary"
              icon={Plus}
              fullWidth
              onClick={() => {
                const d = new Date(mobileDay);
                d.setHours(12, 0, 0, 0);
                onOpenAddPost(d);
              }}
            >
              Přidat příspěvek
            </Button>
          )}
        </div>
      </div>
      )}
    </>
  );
}

/** capitalize the first letter — date-fns doesn't uppercase the leading weekday/month for us,
 * and Czech format strings (e.g. "EEEE d. M.") start lowercase. */
const capitalize = (s: string) => (s.length > 0 ? s[0].toUpperCase() + s.slice(1) : s);

/** Real 1–3 column time grid for the mobile Den/3 dny modes — the single-day agenda fallback
 * (rendered instead for Týden, where 7 columns don't fit at 375px) is a different, older path
 * kept unchanged below. This mirrors the desktop grid's structure but at HOUR_HEIGHT_SM. */
function MobileTimeGrid({
  days,
  dayCount,
  gridTemplateColumns,
  dayHeaderLabel,
  getPostsForDay,
  getEventsForDay,
  isAdmin,
  now,
  unresolvedByPost,
  onOpenAddPost,
  onPostClick,
  onDropPost,
}: {
  days: Date[];
  dayCount: number;
  gridTemplateColumns: string;
  dayHeaderLabel: (day: Date) => string;
  getPostsForDay: (day: Date) => Post[];
  getEventsForDay: (day: Date) => Post[];
  isAdmin: boolean;
  now: number;
  unresolvedByPost?: Record<string, number>;
  onOpenAddPost: (date: Date) => void;
  onPostClick: (post: Post) => void;
  onDropPost: (postId: string, newDate: Date) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hours = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => i + DAY_START_HOUR);
  const rangeHasToday = days.some((d) => isSameDay(d, new Date(now)));

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nowDate = new Date(now);
    const targetHour =
      rangeHasToday && nowDate.getHours() >= DAY_START_HOUR ? Math.max(nowDate.getHours() - 1, DAY_START_HOUR) : 8;
    el.scrollTop = (targetHour - DAY_START_HOUR) * HOUR_HEIGHT_SM;
    // Only on mount — one-time scroll position, not reactive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="sm:hidden">
      <div className="sticky top-0 z-20 bg-surface">
        <div className="grid border-b border-subtle-border" style={{ gridTemplateColumns }}>
          <div className="border-r border-subtle-border" />
          {days.map((day) => (
            <div
              key={day.toString()}
              className="py-2 flex flex-col items-center justify-center text-[10px] font-bold uppercase tracking-wider text-muted"
            >
              <span className="truncate px-0.5">{dayHeaderLabel(day)}</span>
              {dayCount > 1 && (
                <span
                  className={`text-sm mt-0.5 w-6 h-6 flex items-center justify-center rounded-full ${
                    isSameDay(day, new Date()) ? 'bg-accent text-accent-fg' : 'text-primary'
                  }`}
                >
                  {format(day, 'd')}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="grid" style={{ gridTemplateColumns }}>
          <div className="border-r border-subtle-border" />
          {days.map((day) => (
            <div key={day.toString()} className="border-b border-subtle-border">
              <AllDayChipRow events={getEventsForDay(day)} onEventClick={onPostClick} />
            </div>
          ))}
        </div>
      </div>

      <div ref={scrollRef} className="overflow-y-auto custom-scrollbar max-h-[65vh] relative">
        <div className="grid" style={{ gridTemplateColumns }}>
          <div className="relative" style={{ height: totalGridHeight(HOUR_HEIGHT_SM) }}>
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute right-1.5 text-[10px] font-bold text-muted -translate-y-1/2"
                style={{ top: (hour - DAY_START_HOUR) * HOUR_HEIGHT_SM }}
              >
                {hour}:00
              </div>
            ))}
          </div>
          {days.map((day) => (
            <div key={day.toString()} data-daycol={day.toDateString()}>
              <DayColumn
                day={day}
                posts={getPostsForDay(day)}
                hourHeight={HOUR_HEIGHT_SM}
                isAdmin={isAdmin}
                now={now}
                unresolvedByPost={unresolvedByPost}
                allowDragCreate={false}
                onOpenAddPost={onOpenAddPost}
                onPostClick={onPostClick}
                onDropPost={onDropPost}
                dragCreate={null}
                setDragCreate={() => {}}
              />
            </div>
          ))}
        </div>
        {rangeHasToday && (
          <div className="absolute inset-0 pointer-events-none grid" style={{ gridTemplateColumns }}>
            <div />
            {days.map((day) => (
              <div key={day.toString()} className="relative">
                {isSameDay(day, new Date(now)) && <NowLine hourHeight={HOUR_HEIGHT_SM} now={now} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
