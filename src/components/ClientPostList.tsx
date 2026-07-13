import React from 'react';
import { Post } from '../types';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Video, Image as ImageIcon, CheckCircle2, AlertCircle, Clock, Calendar as CalendarIcon } from 'lucide-react';

interface ClientPostListProps {
  posts: Post[];
  onPostClick: (post: Post) => void;
  onShowInCalendar?: (post: Post) => void;
}

export default function ClientPostList({ posts, onPostClick, onShowInCalendar }: ClientPostListProps) {
  const sortedPosts = [...posts].sort((a, b) => a.scheduledDate - b.scheduledDate);

  if (sortedPosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white/5 border border-white/10 rounded-2xl">
        <CalendarIcon className="w-12 h-12 text-white/20 mb-4" />
        <p className="text-white/60 font-medium">Zatím nemáte naplánované žádné příspěvky.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedPosts.map(post => {
        const isVideo = post.postType === 'video' || post.postType === 'reel';
        const isEvent = post.postType === 'event';
        
        let statusColor = 'text-slate-400';
        let statusIcon = null;
        let statusText = '';
        
        switch (post.status) {
          case 'approved':
            statusColor = 'text-emerald-400';
            statusIcon = <CheckCircle2 className="w-4 h-4" />;
            statusText = 'Schváleno';
            break;
          case 'needs_revision':
            statusColor = 'text-rose-400';
            statusIcon = <AlertCircle className="w-4 h-4" />;
            statusText = 'Vyžaduje úpravu';
            break;
          case 'client_review':
            statusColor = 'text-amber-400';
            statusIcon = <Clock className="w-4 h-4" />;
            statusText = 'Ke schválení';
            break;
          case 'draft':
            statusColor = 'text-slate-400';
            statusIcon = <Clock className="w-4 h-4" />;
            statusText = 'Koncept';
            break;
          case 'scheduled':
            statusColor = 'text-indigo-400';
            statusIcon = <CalendarIcon className="w-4 h-4" />;
            statusText = 'Plánováno';
            break;
          case 'published':
            statusColor = 'text-emerald-400';
            statusIcon = <CheckCircle2 className="w-4 h-4" />;
            statusText = 'Publikováno';
            break;
        }

        if (isEvent) {
          statusColor = 'text-violet-400';
          statusIcon = <CalendarIcon className="w-4 h-4" />;
          statusText = 'Událost';
        }

        return (
          <div 
            key={post.id}
            onClick={() => onPostClick(post)}
            className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer group"
          >
            <div className={`flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 group-hover:bg-indigo-500/20 text-white/70 group-hover:text-indigo-300 transition-colors ${isEvent ? 'group-hover:bg-violet-500/20 group-hover:text-violet-300' : ''}`}>
              {isEvent ? <CalendarIcon className="w-6 h-6" /> : isVideo ? <Video className="w-6 h-6" /> : <ImageIcon className="w-6 h-6" />}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                <h3 className="text-base sm:text-lg font-bold text-white truncate">{post.title}</h3>
                <div className={`flex items-center gap-1.5 text-xs sm:text-sm font-semibold ${statusColor} shrink-0`}>
                  {statusIcon}
                  <span>{statusText}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-white/50 mb-2">
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>{format(new Date(post.scheduledDate), "d. MMMM yyyy 'v' H:mm", { locale: cs })}</span>
              </div>
              
              {post.description && (
                <p className="text-sm text-white/60 line-clamp-2 mt-2">
                  {post.description}
                </p>
              )}
              
              {onShowInCalendar && (
                <div className="mt-4 flex sm:justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onShowInCalendar(post);
                    }}
                    className="w-full sm:w-auto px-3 py-2 sm:py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5"
                  >
                    <CalendarIcon className="w-3.5 h-3.5" />
                    Ukázat v kalendáři
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
