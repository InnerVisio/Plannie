import React, { useState, useRef, useEffect } from 'react';
import { doc, updateDoc, collection, addDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Post, Client, Comment } from '../types';
import { X, CheckCircle2, AlertCircle, Clock, Calendar as CalendarIcon, Send, MessageSquare, Pencil, Save, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useAuth } from '../contexts/AuthContext';

interface ClientPostModalProps {
  post: Post;
  client: Client;
  onClose: () => void;
}

/**
 * Robust function to extract Google Drive File ID and return a preview URL.
 */
const getDrivePreviewUrl = (url: string) => {
  if (!url) return '';
  // Regex to match various Google Drive/Docs URL formats and extract the ID
  const driveRegex = /(?:https?:\/\/)?(?:drive|docs)\.google\.com\/(?:(?:file|presentation|document|spreadsheets)\/d\/|open\?id=)([-\w]{25,})/;
  const match = url.match(driveRegex);
  if (match && match[1]) {
    return `https://drive.google.com/file/d/${match[1]}/preview`;
  }
  return url;
};

export default function ClientPostModal({ post, client, onClose }: ClientPostModalProps) {
  const { currentUser } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(post.pendingDescription || post.description || '');
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const q = query(collection(db, 'comments'), where('postId', '==', post.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      
      commentsData.sort((a, b) => a.createdAt - b.createdAt);
      setComments(commentsData);
      
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'comments');
    });

    return () => unsubscribe();
  }, [post.id]);

  const handleUpdateStatus = async (newStatus: 'approved' | 'needs_revision') => {
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        status: newStatus,
        updatedAt: Date.now()
      });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
      alert("Nepodařilo se aktualizovat stav příspěvku.");
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || isSending) return;

    setIsSending(true);
    try {
      const authorType = currentUser ? 'admin' : 'client';
      const authorName = currentUser ? 'Agency' : (client?.name || 'Client');

      await addDoc(collection(db, 'comments'), {
        postId: post.id,
        text: commentText.trim(),
        authorName,
        authorType,
        createdAt: Date.now()
      });
      setCommentText('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'comments');
      alert("Nepodařilo se odeslat komentář.");
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveDescription = async () => {
    if (isSavingDescription) return;
    setIsSavingDescription(true);
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        pendingDescription: editedDescription.trim(),
        updatedAt: Date.now()
      });
      setIsEditingDescription(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
      alert("Nepodařilo se uložit změnu popisku.");
    } finally {
      setIsSavingDescription(false);
    }
  };

  const statusConfig = {
    client_review: {
      label: 'Ke schválení',
      color: 'bg-amber-100 text-amber-700 border-amber-200',
      icon: <Clock className="w-3.5 h-3.5" />
    },
    approved: {
      label: 'Schváleno',
      color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />
    },
    needs_revision: {
      label: 'Vyžaduje úpravu',
      color: 'bg-rose-100 text-rose-700 border-rose-200',
      icon: <AlertCircle className="w-3.5 h-3.5" />
    },
    draft: {
      label: 'Koncept',
      color: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: <Clock className="w-3.5 h-3.5" />
    },
    scheduled: {
      label: 'Plánováno',
      color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      icon: <CalendarIcon className="w-3.5 h-3.5" />
    }
  };

  const currentStatus = statusConfig[post.status] || statusConfig.client_review;
  const previewUrl = post.mediaUrls && post.mediaUrls.length > 0 ? getDrivePreviewUrl(post.mediaUrls[0]) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{post.title}</h2>
            <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5" />
              {format(new Date(post.scheduledDate), 'd. MMMM yyyy v H:mm', { locale: cs })}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* Media Preview */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Náhled média</h3>
            {previewUrl ? (
              <div className="relative w-full aspect-video rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shadow-inner">
                <iframe 
                  src={previewUrl} 
                  className="w-full h-full border-0"
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="w-full aspect-video rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                <Clock className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">Nebyl poskytnut odkaz na média</p>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Popisek</h3>
              {!isEditingDescription && (
                <button 
                  onClick={() => setIsEditingDescription(true)}
                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Upravit
                </button>
              )}
            </div>
            
            {isEditingDescription ? (
              <div className="space-y-3">
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  className="w-full min-h-[120px] p-4 bg-slate-50 border border-indigo-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
                  placeholder="Zadejte nový popisek..."
                />
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => {
                      setIsEditingDescription(false);
                      setEditedDescription(post.pendingDescription || post.description || '');
                    }}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Zrušit
                  </button>
                  <button 
                    onClick={handleSaveDescription}
                    disabled={isSavingDescription}
                    className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-500/20"
                  >
                    {isSavingDescription ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Odeslat ke schválení
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative group">
                <div className={`p-4 rounded-xl border leading-relaxed whitespace-pre-wrap ${
                  post.pendingDescription 
                    ? 'bg-amber-50 border-amber-200 text-amber-900' 
                    : 'bg-slate-50 border-slate-100 text-slate-800'
                }`}>
                  {post.pendingDescription ? (
                    <>
                      <div className="flex items-center gap-2 mb-2 text-[10px] font-black uppercase tracking-widest text-amber-600">
                        <Clock className="w-3 h-3" />
                        Čeká na schválení administrátorem
                      </div>
                      {post.pendingDescription}
                    </>
                  ) : (
                    post.description || <span className="text-slate-400 italic">Nebyl zadán žádný popisek.</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Aktuální stav:</h3>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${currentStatus.color}`}>
              {currentStatus.icon}
              {currentStatus.label}
            </span>
          </div>

          {/* Comments Section */}
          <div className="pt-6 border-t border-slate-100 space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Komentáře</h3>
            </div>

            {/* Comment Feed */}
            <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
              <div className="max-h-40 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {comments.length > 0 ? (
                  comments.map((comment) => (
                    <div key={comment.id} className={`flex flex-col ${comment.authorType === 'admin' ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                        comment.authorType === 'admin' 
                          ? 'bg-indigo-600 text-white rounded-tr-none' 
                          : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-sm'
                      }`}>
                        <p className="font-bold text-[10px] uppercase tracking-wider opacity-70 mb-1">
                          {comment.authorName === 'Agency' ? 'Agentura' : comment.authorName}
                        </p>
                        <p>{comment.text}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 px-1">
                        {format(new Date(comment.createdAt), 'H:mm', { locale: cs })}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-slate-400 text-sm italic">
                    Zatím žádné komentáře. Začněte konverzaci!
                  </div>
                )}
                <div ref={commentsEndRef} />
              </div>

              {/* Input Area */}
              <form onSubmit={handleSendComment} className="p-3 bg-white border-t border-slate-100 flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Napište zprávu..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim() || isSending}
                  className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => handleUpdateStatus('needs_revision')}
            className="flex-1 px-6 py-3 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <AlertCircle className="w-5 h-5" />
            Vyžadovat úpravu
          </button>
          <button
            onClick={() => handleUpdateStatus('approved')}
            className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
          >
            <CheckCircle2 className="w-5 h-5" />
            Schválit příspěvek
          </button>
        </div>
      </div>
    </div>
  );
}
