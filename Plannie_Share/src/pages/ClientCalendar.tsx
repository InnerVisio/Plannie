import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Client, Post } from '../types';
import PostModal from '../components/PostModal';
import ClientPostModal from '../components/ClientPostModal';
import AddPostModal from '../components/AddPostModal';
import { useAuth } from '../contexts/AuthContext';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  eachDayOfInterval 
} from 'date-fns';
import { cs } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, ExternalLink, Video, Image as ImageIcon, Loader2, Plus, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

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
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

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
    <div className={`min-h-screen transition-colors duration-700 ${bgClass}`}>
      <div className="max-w-6xl mx-auto space-y-6 px-4 py-8 pb-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl shadow-2xl bg-white/[0.08] border border-white/20 text-white">
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
            {currentUser && (
              <button 
                onClick={() => setIsAddingPost(true)}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/30 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Nový příspěvek
              </button>
            )}
            
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

        {/* Calendar Section */}
        <div className="bg-white/[0.08] border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-3xl overflow-hidden">
          {/* Calendar Controls */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/5">
            <h2 className="text-xl font-black text-white tracking-tight capitalize">
              {format(currentDate, 'LLLL yyyy', { locale: cs })}
            </h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={prevMonth}
                className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-white/70 hover:text-white"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setCurrentDate(new Date())}
                className="px-5 py-2 text-xs font-black uppercase tracking-widest text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              >
                Dnes
              </button>
              <button 
                onClick={nextMonth}
                className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-white/70 hover:text-white"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Calendar Grid Header - Hidden on mobile */}
          <div className="hidden md:grid grid-cols-7 gap-px border-b border-white/10 bg-white/10">
            {weekDays.map(day => (
              <div key={day} className="py-4 text-center text-[10px] font-black uppercase tracking-[0.3em] text-white/40 bg-slate-900/40">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 auto-rows-fr gap-px bg-white/10">
            {calendarDays.map((day, idx) => {
              const dayPosts = getPostsForDay(day);
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isToday = isSameDay(day, new Date());

              return (
                <div 
                  key={day.toString()} 
                  tabIndex={0}
                  className={`min-h-[100px] md:min-h-[120px] p-3 transition-all duration-500 bg-white/5 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 group/cell border-b md:border-b-0 border-white/5 min-w-0 ${
                    !isCurrentMonth ? 'hidden md:block opacity-20 grayscale' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className={`text-xs font-black w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-500 ${
                      isToday 
                        ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.5)] scale-110' 
                        : 'text-white/80 group-hover/cell:text-white'
                    }`}>
                      {format(day, 'd')}
                    </span>
                  </div>

                  <div className="space-y-2 overflow-y-auto max-h-[80px] pr-0.5 custom-scrollbar min-w-0">
                    {dayPosts.map(post => {
                      const isVideo = post.postType === 'video' || post.postType === 'reel';
                      
                      return (
                        <div 
                          key={post.id}
                          onClick={() => setSelectedPost(post)}
                          className={`text-[10px] p-2.5 rounded-xl border cursor-pointer transition-all duration-300 hover:scale-[1.05] active:scale-95 group/post flex flex-col gap-1.5 shadow-lg min-w-0 ${
                            isVideo 
                              ? 'bg-blue-500/20 border-blue-400/30 text-blue-100 hover:bg-blue-500/40' 
                              : 'bg-emerald-500/20 border-emerald-400/30 text-emerald-100 hover:bg-emerald-500/40'
                          }`}
                        >
                          <div className="flex items-center gap-2 font-black min-w-0">
                            {isVideo ? <Video className="w-3.5 h-3.5 shrink-0" /> : <ImageIcon className="w-3.5 h-3.5 shrink-0" />}
                            <span className="truncate flex-1 uppercase tracking-tight">{post.title}</span>
                            {post.status === 'approved' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                            {post.status === 'needs_revision' && <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                            {post.status === 'client_review' && <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
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

      {/* Add Post Modal */}
      {isAddingPost && (
        <AddPostModal 
          clientId={client.id} 
          onClose={() => setIsAddingPost(false)} 
        />
      )}
      </div>
    </div>
  );
}

