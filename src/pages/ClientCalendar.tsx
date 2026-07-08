import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Client, Post, CustomEvent } from '../types';
import PostModal from '../components/PostModal';
import ClientPostModal from '../components/ClientPostModal';
import AddPostModal from '../components/AddPostModal';
import AddEventModal from '../components/AddEventModal';
import ClientPostList from '../components/ClientPostList';
import { useAuth } from '../contexts/AuthContext';
import { 
  format, 
  addMonths, 
  subMonths, 
  addWeeks,
  subWeeks,
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  eachDayOfInterval 
} from 'date-fns';
import { cs } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, ExternalLink, Video, Image as ImageIcon, Loader2, Plus, CheckCircle2, AlertCircle, Clock, Calendar as CalendarIcon, List as ListIcon } from 'lucide-react';

import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { getHolidayForDate } from '../lib/holidays';

export default function ClientCalendar() {
  const { shareableLinkId } = useParams();
  const { currentUser } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Modal state
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isAddingPost, setIsAddingPost] = useState(false);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [addingPostDate, setAddingPostDate] = useState<Date | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'list'>('week');

  // Fetch Client by Link ID
  useEffect(() => {
    if (!shareableLinkId) return;
    
    const q = query(collection(db, 'clients'), where('shareableLinkId', '==', shareableLinkId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setClient({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Client);
      } else {
        setError('Neplatný nebo vypršelý odkaz.');
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clients');
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [shareableLinkId]);

  // Fetch Posts for Client
  useEffect(() => {
    if (!client) return;

    const q = query(collection(db, 'posts'), where('clientId', '==', client.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Post[];
      const activePosts = postsData.filter(post => post.status !== 'published');
      setPosts(activePosts);
      
      // Update selectedPost if it's currently open and got modified
      setSelectedPost(current => {
        if (!current) return null;
        const updatedPost = activePosts.find(p => p.id === current.id);
        return updatedPost || null;
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
    });

    return () => unsubscribe();
  }, [client]);

  const customEvents: CustomEvent[] = posts
    .filter(p => p.postType === 'event')
    .map(p => ({
      id: p.id,
      clientId: p.clientId,
      name: p.title,
      date: p.scheduledDate
    }));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Načítání kalendáře...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-red-200 shadow-sm max-w-md mx-auto mt-12">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🔒</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Přístup odepřen</h2>
        <p className="text-slate-500">{error}</p>
      </div>
    );
  }

  if (!client) return null;

  // Calendar Logic
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  let startDate: Date;
  let endDate: Date;
  
  if (viewMode === 'week') {
    startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
    endDate = endOfWeek(currentDate, { weekStartsOn: 1 });
  } else {
    startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  }
  
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

  const nextPeriod = () => setCurrentDate(viewMode === 'week' ? addWeeks(currentDate, 1) : addMonths(currentDate, 1));
  const prevPeriod = () => setCurrentDate(viewMode === 'week' ? subWeeks(currentDate, 1) : subMonths(currentDate, 1));

  const now = new Date();
  now.setHours(0,0,0,0);
  
  const upcomingPosts = posts
    .filter(post => post.postType !== 'event' && post.scheduledDate >= new Date().setHours(0,0,0,0) && post.status !== 'published')
    .sort((a, b) => a.scheduledDate - b.scheduledDate)
    .slice(0, 5);
    
  const upcomingEvents = customEvents
    .filter(event => event.date >= new Date().setHours(0,0,0,0))
    .sort((a, b) => a.date - b.date)
    .slice(0, 5);

  const getPostsForDay = (day: Date) => {
    return posts.filter(post => isSameDay(new Date(post.scheduledDate), day));
  };

  const getBackgroundStyles = () => {
    const colorClasses: Record<string, string> = {
      slate: 'from-slate-950 via-slate-900 to-slate-950',
      indigo: 'from-indigo-950 via-indigo-900 to-indigo-950',
      emerald: 'from-emerald-950 via-emerald-900 to-emerald-950',
      rose: 'from-rose-950 via-rose-900 to-rose-950',
      amber: 'from-amber-950 via-amber-900 to-amber-950',
      violet: 'from-violet-950 via-violet-900 to-violet-950',
      cyan: 'from-cyan-950 via-cyan-900 to-cyan-950',
      blue: 'from-blue-950 via-blue-900 to-blue-950',
      zinc: 'from-zinc-950 via-zinc-900 to-zinc-950',
      neutral: 'from-neutral-950 via-neutral-900 to-neutral-950',
    };

    const gradient = colorClasses[client.brandColor || 'slate'] || colorClasses.slate;
    
    return `bg-gradient-to-br ${gradient}`;
  };

  const bgClass = getBackgroundStyles();

  return (
    <div className={`flex-1 min-h-0 flex flex-col transition-colors duration-700 ${bgClass}`}>
      <div className="max-w-[1400px] w-full mx-auto flex flex-col flex-1 min-h-0 space-y-4 sm:space-y-6 px-4 py-4 sm:py-6">
        {/* Header Section */}
        <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.08] border border-white/20 text-white">
          <div className="flex items-center gap-4">
            {client.logoUrl && (
              <img 
                src={client.logoUrl} 
                alt={`${client.name} logo`} 
                className="h-10 w-auto object-contain bg-white/10 rounded-lg p-1"
                referrerPolicy="no-referrer"
              />
            )}
            <div>
              <h1 className="text-xl font-bold tracking-tight">{client.name}</h1>
              <p className="text-[10px] uppercase tracking-widest font-black text-indigo-300">Klientský portál obsahu</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {client.googleDriveLink && (
              <a 
                href={client.googleDriveLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-500/30 active:scale-95"
              >
                <ExternalLink className="w-4 h-4" />
                Otevřít složku na disku
              </a>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0 flex flex-col min-h-0">
            {/* Calendar Section */}
            <div className="flex-1 flex flex-col min-h-0 bg-white/[0.08] border border-white/20 rounded-3xl overflow-hidden">
                {/* Calendar Controls */}
                <div className="shrink-0 flex flex-col gap-4 px-4 sm:px-6 py-4 sm:py-5 border-b border-white/10 bg-white/5">
                  {/* Top Row: Navigation + Title + Add Buttons */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {/* Nav Buttons (Only in calendar modes) */}
                      {(viewMode === 'week' || viewMode === 'month') && (
                        <div className="flex items-center bg-white/10 rounded-lg p-1">
                          <button onClick={prevPeriod} className="p-1.5 hover:bg-white/10 rounded-md transition-all text-white/70 hover:text-white">
                            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                          <button onClick={() => setCurrentDate(new Date())} className="px-2 py-1 text-[10px] sm:text-xs font-bold text-white/70 hover:text-white hover:bg-white/10 rounded-md transition-all">
                            Dnes
                          </button>
                          <button onClick={nextPeriod} className="p-1.5 hover:bg-white/10 rounded-md transition-all text-white/70 hover:text-white">
                            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        </div>
                      )}
                      
                      {/* Desktop Title */}
                      <h2 className="text-lg sm:text-xl font-black text-white tracking-tight capitalize hidden sm:block">
                        {viewMode === 'list' ? 'Všechny příspěvky' : 
                         viewMode === 'week' ? `${format(startDate, 'd. LLLL', { locale: cs })} - ${format(endDate, 'd. LLLL yyyy', { locale: cs })}` :
                         format(currentDate, 'LLLL yyyy', { locale: cs })
                        }
                      </h2>
                    </div>

                    {/* Admin Add Buttons */}
                    {currentUser && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button 
                          onClick={() => setIsAddingEvent(true)}
                          className="px-3 sm:px-4 py-2 sm:py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl shadow-lg shadow-violet-500/30 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                          title="Přidat událost"
                        >
                          <CalendarIcon className="w-4 h-4 sm:w-4 sm:h-4" />
                          <span className="hidden lg:inline text-sm">Událost</span>
                        </button>
                        <button 
                          onClick={() => setIsAddingPost(true)}
                          className="px-3 sm:px-4 py-2 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                          title="Přidat příspěvek"
                        >
                          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span className="hidden lg:inline text-sm">Příspěvek</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Bottom Row: Mobile Title + View Toggles */}
                  <div className="flex items-center justify-between gap-4 w-full">
                    {/* Mobile Title */}
                    <h2 className="text-base font-black text-white tracking-tight capitalize sm:hidden truncate flex-1 min-w-0">
                      {viewMode === 'list' ? 'Všechny příspěvky' : 
                       viewMode === 'week' ? `${format(startDate, 'd. L.', { locale: cs })} - ${format(endDate, 'd. L. yyyy', { locale: cs })}` :
                       format(currentDate, 'LLLL yyyy', { locale: cs })
                      }
                    </h2>

                    {/* View Toggles */}
                    <div className="flex items-center bg-white/10 rounded-xl p-1 shrink-0 ml-auto w-full sm:w-auto justify-end">
                      <button
                        onClick={() => setViewMode('week')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                          viewMode === 'week' ? 'bg-indigo-600 text-white shadow-md' : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Týden</span>
                      </button>
                      <button
                        onClick={() => setViewMode('month')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                          viewMode === 'month' ? 'bg-indigo-600 text-white shadow-md' : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Měsíc</span>
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                          viewMode === 'list' ? 'bg-indigo-600 text-white shadow-md' : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <ListIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Seznam</span>
                      </button>
                    </div>
                  </div>
                </div>

          {viewMode === 'month' ? (
            <>
            <div className="flex-1 min-h-0 overflow-auto custom-scrollbar overscroll-none">
              <div className="min-w-[320px] h-full flex flex-col">
                {/* Calendar Grid Header */}
                <div className="grid grid-cols-7 gap-px border-b border-white/10 bg-white/10">
                  {weekDays.map(day => (
                    <div key={day} className="py-2 sm:py-4 text-center text-[9px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.3em] text-white/40 bg-slate-900/40">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="flex-1 grid grid-cols-7 gap-px bg-white/10 min-h-[600px]">
                  {calendarDays.map((day, idx) => {
                    const dayPosts = getPostsForDay(day);
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isToday = isSameDay(day, new Date());
                    const holidayName = getHolidayForDate(day);
                    const customEventsForDay = customEvents.filter(e => isSameDay(new Date(e.date), day));

                    return (
                      <div 
                        key={day.toString()} 
                        tabIndex={0}
                        onClick={() => {
                          if (currentUser) {
                            const dateToPass = new Date(day);
                            dateToPass.setHours(12, 0, 0, 0);
                            setAddingPostDate(dateToPass);
                            setIsAddingPost(true);
                          }
                        }}
                        className={`flex flex-col min-h-0 p-1 sm:p-2 transition-all duration-500 bg-white/5 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 group/cell border-b sm:border-b-0 border-white/5 ${currentUser ? 'cursor-pointer hover:bg-white/20' : ''} ${
                          !isCurrentMonth ? 'opacity-20 grayscale' : ''
                        } ${holidayName && isCurrentMonth ? 'bg-rose-500/5 hover:bg-rose-500/10' : (customEventsForDay.length > 0 && isCurrentMonth ? 'bg-violet-500/5 hover:bg-violet-500/10' : '')}`}
                      >
                        <div className="shrink-0 flex justify-between items-start mb-1 sm:mb-2 gap-1 sm:gap-2 w-full">
                          <span className={`text-[10px] sm:text-xs font-black w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg sm:rounded-xl transition-all duration-500 shrink-0 ${
                            isToday 
                              ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.5)] scale-110' 
                              : (holidayName ? 'text-rose-400 group-hover/cell:text-rose-300' : (customEventsForDay.length > 0 ? 'text-violet-400 group-hover/cell:text-violet-300' : 'text-white/80 group-hover/cell:text-white'))
                          }`}>
                          {format(day, 'd')}
                        </span>
                        <div className="flex flex-col items-end gap-0.5 flex-1 min-w-0">
                          {holidayName && (
                            <span 
                              className="text-[7px] sm:text-[9px] font-bold text-rose-400/80 uppercase tracking-widest text-right line-clamp-2 w-full leading-tight group-hover/cell:text-rose-300 break-words"
                              title={holidayName}
                            >
                              {holidayName}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1 sm:space-y-1.5 pt-1 min-w-0 pb-1">
                        {dayPosts.map(post => {
                          const isVideo = post.postType === 'video' || post.postType === 'reel';
                          const isEvent = post.postType === 'event';
                          
                          let bgClass = 'bg-emerald-500/20 border-emerald-400/30 text-emerald-100 hover:bg-emerald-500/40';
                          if (isVideo) bgClass = 'bg-blue-500/20 border-blue-400/30 text-blue-100 hover:bg-blue-500/40';
                          if (isEvent) bgClass = 'bg-violet-500/20 border-violet-400/30 text-violet-100 hover:bg-violet-500/40';
                          
                          return (
                            <div 
                              key={post.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPost(post);
                              }}
                              className={`text-[10px] p-1 sm:p-2.5 rounded-md sm:rounded-xl border cursor-pointer transition-all duration-300 hover:scale-[1.05] active:scale-95 group/post flex flex-col gap-1.5 shadow-lg min-w-0 ${bgClass}`}
                            >
                              <div className="flex items-center justify-center sm:justify-start gap-2 font-black min-w-0">
                                {isEvent ? <CalendarIcon className="w-3.5 h-3.5 shrink-0" /> : isVideo ? <Video className="w-3.5 h-3.5 shrink-0" /> : <ImageIcon className="w-3.5 h-3.5 shrink-0" />}
                                <span className="hidden sm:block truncate flex-1 uppercase tracking-tight">{post.title}</span>
                                <div className="hidden sm:flex items-center shrink-0">
                                  {post.status === 'approved' && <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />}
                                  {post.status === 'needs_revision' && <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-400" />}
                                  {post.status === 'client_review' && <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          </>
          ) : viewMode === 'week' ? (
            <>
            <div className="flex-1 min-h-0 overflow-auto custom-scrollbar overscroll-none">
              <div className="min-w-[600px] sm:min-w-[800px] lg:min-w-full grid grid-cols-[45px_repeat(7,1fr)] sm:grid-cols-[60px_repeat(7,1fr)] gap-px bg-white/10 relative">
                
                {/* Top-left empty corner, sticky */}
                <div className="bg-slate-900/80 sticky top-0 left-0 z-30 border-b border-r border-white/10 backdrop-blur-md"></div>
                
                {/* Week Grid Header */}
                {calendarDays.map((day, idx) => (
                  <div key={idx} className="py-2 sm:py-3 flex flex-col items-center justify-center text-[9px] sm:text-[10px] font-black uppercase tracking-[0.1em] text-white/40 bg-slate-900/80 sticky top-0 z-20 border-b border-white/10 backdrop-blur-md">
                    <span>{weekDays[idx]}</span>
                    <span className={`text-sm sm:text-base mt-0.5 w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full ${isSameDay(day, new Date()) ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]' : 'text-white'}`}>
                      {format(day, 'd')}
                    </span>
                  </div>
                ))}

                {/* Week Grid Body with time rows */}
                {Array.from({ length: 18 }).map((_, i) => {
                  const hour = i + 6; // 6:00 to 23:00
                  return (
                    <div className="contents" key={hour}>
                      {/* Time Label */}
                      <div className="bg-slate-900/60 flex items-start justify-center pt-2 text-[9px] sm:text-[10px] font-bold text-white/40 border-r border-white/10 sticky left-0 z-10 backdrop-blur-md">
                        {`${hour}:00`}
                      </div>
                      
                      {/* Hour Cells for each day */}
                      {calendarDays.map((day, dayIdx) => {
                        const hourPosts = posts.filter(post => {
                          const postDate = new Date(post.scheduledDate);
                          return isSameDay(postDate, day) && postDate.getHours() === hour;
                        });
                        
                        return (
                          <div 
                            key={`${dayIdx}-${hour}`}
                            onClick={() => {
                              if (currentUser) {
                                const dateToPass = new Date(day);
                                dateToPass.setHours(hour, 0, 0, 0);
                                setAddingPostDate(dateToPass);
                                setIsAddingPost(true);
                              }
                            }}
                            className={`min-h-[30px] sm:min-h-[45px] p-0.5 sm:p-1 border-b border-white/5 transition-all bg-white/5 hover:bg-white/10 group flex flex-col justify-start ${currentUser ? 'cursor-pointer' : ''}`}
                          >
                            <div className="flex flex-col gap-1">
                              {hourPosts.map(post => {
                                const isVideo = post.postType === 'video' || post.postType === 'reel';
                                const isEvent = post.postType === 'event';
                                
                                let bgClass = 'bg-emerald-500/20 border-emerald-400/30 text-emerald-100 hover:bg-emerald-500/40';
                                if (isVideo) bgClass = 'bg-blue-500/20 border-blue-400/30 text-blue-100 hover:bg-blue-500/40';
                                if (isEvent) bgClass = 'bg-violet-500/20 border-violet-400/30 text-violet-100 hover:bg-violet-500/40';

                                return (
                                  <div
                                    key={post.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedPost(post);
                                    }}
                                    className={`text-[8px] sm:text-[10px] p-1 sm:p-1.5 rounded-md border cursor-pointer transition-all hover:scale-[1.02] active:scale-95 flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-1.5 shadow-md overflow-hidden ${bgClass}`}
                                  >
                                    <div className="flex items-center gap-1 shrink-0">
                                      {isEvent ? <CalendarIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" /> : isVideo ? <Video className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" /> : <ImageIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />}
                                      <span className="font-bold sm:hidden">{format(new Date(post.scheduledDate), "HH:mm")}</span>
                                    </div>
                                    <span className="truncate font-medium">{post.title}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
            </>
          ) : (
            <div className="flex-1 min-h-0 p-6 bg-white/5 overflow-y-auto custom-scrollbar overscroll-none">
              <ClientPostList 
                posts={posts} 
                onPostClick={setSelectedPost} 
                onShowInCalendar={(post) => {
                  setCurrentDate(new Date(post.scheduledDate));
                  setViewMode('month');
                }}
              />
            </div>
          )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-[320px] flex flex-col gap-6 flex-shrink-0 lg:overflow-y-auto custom-scrollbar lg:pb-4 lg:pr-2 overscroll-none">
            {/* Upcoming Posts */}
            <div className="bg-white/[0.08] border border-white/20 rounded-3xl p-6">
              <h3 className="text-white font-black tracking-tight mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-indigo-400" /> Nadcházející příspěvky
              </h3>
              {upcomingPosts.length === 0 ? (
                <p className="text-white/40 text-sm font-medium">Žádné naplánované příspěvky.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingPosts.map(post => (
                    <div 
                      key={post.id} 
                      onClick={() => setSelectedPost(post)}
                      className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl cursor-pointer transition-all active:scale-95 group flex flex-col gap-1"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-2 leading-tight pr-2">{post.title}</span>
                        {post.postType === 'video' || post.postType === 'reel' ? <Video className="w-3.5 h-3.5 text-blue-400 shrink-0" /> : <ImageIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-white/50 font-medium mt-1">
                        <CalendarIcon className="w-3 h-3" />
                        {format(new Date(post.scheduledDate), "d. MMMM 'v' H:mm", { locale: cs })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Events */}
            <div className="bg-white/[0.08] border border-white/20 rounded-3xl p-6">
              <h3 className="text-white font-black tracking-tight mb-4 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-violet-400" /> Nadcházející události
              </h3>
              {upcomingEvents.length === 0 ? (
                <p className="text-white/40 text-sm font-medium">Žádné události.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map(event => (
                    <div 
                      key={event.id} 
                      className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl flex flex-col gap-1"
                    >
                      <div className="text-sm font-bold text-white line-clamp-2 leading-tight">{event.name}</div>
                      <div className="flex items-center gap-1 text-xs text-violet-300/70 font-medium mt-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(event.date), "d. MMMM yyyy", { locale: cs })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Post Modal */}
      {selectedPost && (
        currentUser ? (
          <PostModal 
            post={selectedPost} 
            client={client!} 
            onClose={() => setSelectedPost(null)} 
          />
        ) : (
          <ClientPostModal 
            post={selectedPost} 
            client={client} 
            onClose={() => setSelectedPost(null)} 
          />
        )
      )}

      {/* Add Event Modal */}
      {isAddingEvent && (
        <AddEventModal 
          clientId={client.id} 
          onClose={() => setIsAddingEvent(false)} 
        />
      )}

      {/* Add Post Modal */}
      {isAddingPost && (
        <AddPostModal 
          clientId={client.id} 
          onClose={() => {
            setIsAddingPost(false);
            setAddingPostDate(undefined);
          }} 
          initialDate={addingPostDate}
        />
      )}
      </div>
    </div>
  );
}

