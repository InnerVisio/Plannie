import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Post, Client } from '../types';
import { 
  Loader2, 
  AlertCircle, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Video, 
  Image as ImageIcon, 
  ExternalLink, 
  Check 
} from 'lucide-react';
import { format } from 'date-fns';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import PostModal from '../components/PostModal';

export default function MasterDashboard() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [clientMap, setClientMap] = useState<Record<string, Client>>({});
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Filtered states
  const [actionRequired, setActionRequired] = useState<Post[]>([]);
  const [upcomingPublish, setUpcomingPublish] = useState<Post[]>([]);
  const [waitingOnClient, setWaitingOnClient] = useState<Post[]>([]);

  useEffect(() => {
    // 1. Fetch Clients to build the map
    const unsubscribeClients = onSnapshot(collection(db, 'clients'), (snapshot) => {
      const map: Record<string, Client> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data() as Client;
        map[doc.id] = {
          id: doc.id,
          ...data
        };
      });
      setClientMap(map);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clients');
    });

    // 2. Fetch all Posts
    const unsubscribePosts = onSnapshot(collection(db, 'posts'), (snapshot) => {
      const allPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      
      setPosts(allPosts);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
    });

    return () => {
      unsubscribeClients();
      unsubscribePosts();
    };
  }, []);

  // 3. Filtering Logic
  useEffect(() => {
    // actionRequired: status === 'needs_revision' or status === 'draft'
    const needsRevision = posts.filter(p => p.status === 'needs_revision' || p.status === 'draft');
    setActionRequired(needsRevision);

    // upcomingPublish: status === 'approved' or status === 'scheduled' (exclude 'published')
    const upcoming = posts
      .filter(p => p.status === 'approved' || p.status === 'scheduled')
      .sort((a, b) => a.scheduledDate - b.scheduledDate);
    setUpcomingPublish(upcoming);

    // waitingOnClient: status === 'client_review'
    const waiting = posts.filter(p => p.status === 'client_review');
    setWaitingOnClient(waiting);

    // Keep active selected post in sync if modified
    setSelectedPost(current => {
      if (!current) return null;
      const updated = posts.find(p => p.id === current.id);
      return updated || current;
    });

  }, [posts]);

  const handleMarkPublished = async (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'posts', postId), {
        status: 'published',
        updatedAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
      alert("Nepodařilo se označit příspěvek jako publikovaný.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      </div>
    );
  }

  // Helper to get client from post
  const getClientForPost = (post: Post): Client | undefined => {
    return clientMap[post.clientId];
  };

  return (
    <div className="min-h-screen bg-slate-900 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] bg-fixed from-slate-900 via-indigo-950/40 to-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">Hlavní přehled</h1>
            <p className="text-indigo-300 font-medium uppercase tracking-widest text-xs mt-1">Celkový přehled obsahu agentury</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Action Required Column */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-6">
            <div className="flex items-center gap-2.5 pb-2 border-b border-white/10">
              <AlertCircle className="w-5 h-5 text-rose-400" />
              <h2 className="text-lg font-black text-white uppercase tracking-wider">Vyžaduje akci ({actionRequired.length})</h2>
            </div>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto px-2 py-2 -mx-2 -my-2 pr-1 custom-scrollbar">
              {actionRequired.length === 0 ? (
                <p className="text-slate-500 text-sm py-4 text-center italic">Vše je hotovo!</p>
              ) : (
                actionRequired.map(post => {
                  const client = getClientForPost(post);
                  const isVideo = post.postType === 'video' || post.postType === 'reel';
                  return (
                    <div 
                      key={post.id} 
                      onClick={() => setSelectedPost(post)}
                      className="p-5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl cursor-pointer transition-all duration-300 group flex flex-col gap-3 shadow-md hover:scale-[1.02]"
                    >
                      <div className="flex items-center gap-3">
                        {client?.logoUrl ? (
                          <img src={client.logoUrl} alt="" className="w-8 h-8 rounded-lg object-contain bg-white/10 p-1 border border-white/10" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                            {client?.name?.[0] || 'C'}
                          </div>
                        )}
                        <div>
                          <p className="text-white font-black text-sm group-hover:text-indigo-300 transition-colors truncate max-w-[180px]">{post.title}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{client?.name || 'Neznámý klient'}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-white/5 pt-2">
                        <span className="flex items-center gap-1.5 font-bold">
                          {isVideo ? <Video className="w-3.5 h-3.5 text-blue-400" /> : <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />}
                          {post.postType.toUpperCase()}
                        </span>
                        <span className="font-medium text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">Vyžaduje úpravu</span>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[10px] text-indigo-300/60 font-black">
                        <span>{format(new Date(post.scheduledDate), 'MMM d, h:mm a')}</span>
                        {client && (
                          <a 
                            href={`/client/${client.shareableLinkId}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 hover:text-white transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" /> Calendar
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Waiting on Client Column */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-6">
            <div className="flex items-center gap-2.5 pb-2 border-b border-white/10">
              <Clock className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-black text-white uppercase tracking-wider">Čeká na klienta ({waitingOnClient.length})</h2>
            </div>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto px-2 py-2 -mx-2 -my-2 pr-1 custom-scrollbar">
              {waitingOnClient.length === 0 ? (
                <p className="text-slate-500 text-sm py-4 text-center italic">Žádné příspěvky ke schválení.</p>
              ) : (
                waitingOnClient.map(post => {
                  const client = getClientForPost(post);
                  const isVideo = post.postType === 'video' || post.postType === 'reel';
                  return (
                    <div 
                      key={post.id} 
                      onClick={() => setSelectedPost(post)}
                      className="p-5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl cursor-pointer transition-all duration-300 group flex flex-col gap-3 shadow-md hover:scale-[1.02]"
                    >
                      <div className="flex items-center gap-3">
                        {client?.logoUrl ? (
                          <img src={client.logoUrl} alt="" className="w-8 h-8 rounded-lg object-contain bg-white/10 p-1 border border-white/10" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                            {client?.name?.[0] || 'C'}
                          </div>
                        )}
                        <div>
                          <p className="text-white font-black text-sm group-hover:text-indigo-300 transition-colors truncate max-w-[180px]">{post.title}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{client?.name || 'Neznámý klient'}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-white/5 pt-2">
                        <span className="flex items-center gap-1.5 font-bold">
                          {isVideo ? <Video className="w-3.5 h-3.5 text-blue-400" /> : <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />}
                          {post.postType.toUpperCase()}
                        </span>
                        <span className="font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">Ke schválení</span>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[10px] text-indigo-300/60 font-black">
                        <span>{format(new Date(post.scheduledDate), 'MMM d, h:mm a')}</span>
                        {client && (
                          <a 
                            href={`/client/${client.shareableLinkId}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 hover:text-white transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" /> Calendar
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Upcoming Publish Column */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-6">
            <div className="flex items-center gap-2.5 pb-2 border-b border-white/10">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-black text-white uppercase tracking-wider">Připraveno k publikování ({upcomingPublish.length})</h2>
            </div>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto px-2 py-2 -mx-2 -my-2 pr-1 custom-scrollbar">
              {upcomingPublish.length === 0 ? (
                <p className="text-slate-500 text-sm py-4 text-center italic">Žádné schválené příspěvky.</p>
              ) : (
                upcomingPublish.map(post => {
                  const client = getClientForPost(post);
                  const isVideo = post.postType === 'video' || post.postType === 'reel';
                  return (
                    <div 
                      key={post.id} 
                      onClick={() => setSelectedPost(post)}
                      className="p-5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl cursor-pointer transition-all duration-300 group flex flex-col gap-3 shadow-md hover:scale-[1.02]"
                    >
                      <div className="flex items-center gap-3">
                        {client?.logoUrl ? (
                          <img src={client.logoUrl} alt="" className="w-8 h-8 rounded-lg object-contain bg-white/10 p-1 border border-white/10" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                            {client?.name?.[0] || 'C'}
                          </div>
                        )}
                        <div>
                          <p className="text-white font-black text-sm group-hover:text-indigo-300 transition-colors truncate max-w-[180px]">{post.title}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{client?.name || 'Neznámý klient'}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-white/5 pt-2">
                        <span className="flex items-center gap-1.5 font-bold">
                          {isVideo ? <Video className="w-3.5 h-3.5 text-blue-400" /> : <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />}
                          {post.postType.toUpperCase()}
                        </span>
                        <button
                          onClick={(e) => handleMarkPublished(e, post.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-500/10 active:scale-95"
                        >
                          <Check className="w-3 h-3" /> Publikovat
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[10px] text-indigo-300/60 font-black">
                        <span>{format(new Date(post.scheduledDate), 'MMM d, h:mm a')}</span>
                        {client && (
                          <a 
                            href={`/client/${client.shareableLinkId}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 hover:text-white transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" /> Calendar
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Post Details Modal */}
      {selectedPost && getClientForPost(selectedPost) && (
        <PostModal 
          post={selectedPost} 
          client={getClientForPost(selectedPost)!} 
          onClose={() => setSelectedPost(null)} 
        />
      )}
    </div>
  );
}
