import React, { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, deleteDoc, collection, addDoc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Post, Client, Comment } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { X, Save, Send, Loader2, MessageSquare, Edit3, Check, XCircle, ArrowRight, Clock, Trash2, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import EditPostModal from './EditPostModal';

interface PostModalProps {
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

export default function PostModal({ post, client, onClose }: PostModalProps) {
  const { currentUser } = useAuth();
  const [description, setDescription] = useState(post.description || '');
  const [isSavingDesc, setIsSavingDesc] = useState(false);
  const [isProcessingPending, setIsProcessingPending] = useState(false);
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const previewUrl = post.mediaUrls && post.mediaUrls.length > 0 ? getDrivePreviewUrl(post.mediaUrls[0]) : '';

  // Fetch comments in real-time
  useEffect(() => {
    const q = query(
      collection(db, 'comments'), 
      where('postId', '==', post.id)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      
      // Sort on the client side to avoid requiring a Firestore composite index
      commentsData.sort((a, b) => a.createdAt - b.createdAt);
      
      setComments(commentsData);
      
      // Scroll to bottom when new comments arrive
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'comments');
    });

    return () => unsubscribe();
  }, [post.id]);

  // Approve pending description
  const handleApprovePending = async () => {
    if (!post.pendingDescription || isProcessingPending) return;
    
    setIsProcessingPending(true);
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        description: post.pendingDescription,
        pendingDescription: null,
        updatedAt: Date.now()
      });
      setDescription(post.pendingDescription);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
      alert("Nepodařilo se schválit popisek.");
    } finally {
      setIsProcessingPending(false);
    }
  };

  // Reject pending description
  const handleRejectPending = async () => {
    if (!post.pendingDescription || isProcessingPending) return;
    
    setIsProcessingPending(true);
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        pendingDescription: null,
        updatedAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
      alert("Nepodařilo se odmítnout popisek.");
    } finally {
      setIsProcessingPending(false);
    }
  };

  // Update post description
  const handleSaveDescription = async () => {
    if (description.trim() === (post.description || '')) return;
    
    setIsSavingDesc(true);
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        description: description.trim(),
        updatedAt: Date.now()
      });
      // Optionally show a success toast here
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
      alert("Nepodařilo se uložit popisek.");
    } finally {
      setIsSavingDesc(false);
    }
  };

  // Add a new comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      const authorType = currentUser ? 'admin' : 'client';
      const authorName = currentUser ? 'Agency' : client.name;

      await addDoc(collection(db, 'comments'), {
        postId: post.id,
        text: newComment.trim(),
        authorName,
        authorType,
        createdAt: Date.now()
      });
      
      setNewComment('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'comments');
      alert("Nepodařilo se přidat komentář.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Opravdu chcete smazat tento příspěvek? Tato akce je nevratná.')) return;
    
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'posts', post.id));
      onClose(); // Close the modal, which will also unmount it
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'posts');
      alert('Nepodařilo se smazat příspěvek.');
    } finally {
    setIsDeleting(false);
    }
  };

  if (isEditing) {
    return <EditPostModal post={post} onClose={() => setIsEditing(false)} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{post.title}</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Naplánováno na {format(new Date(post.scheduledDate), "d. MMMM yyyy 'v' H:mm", { locale: cs })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {currentUser && (
              <>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-xl transition-colors"
                  title="Upravit příspěvek"
                >
                  <Pencil className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-100 rounded-xl transition-colors disabled:opacity-50"
                  title="Smazat příspěvek"
                >
                  {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                </button>
              </>
            )}
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8 custom-scrollbar">
          
          {/* Media Preview Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Náhled média</h3>
              {previewUrl && (
                <a 
                  href={post.mediaUrls[0]} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  Otevřít na Disku
                </a>
              )}
            </div>
            
            {previewUrl ? (
              <div className={`relative w-full ${post.postType === 'video' ? 'h-[500px]' : 'h-[350px]'} sm:h-auto sm:aspect-video rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shadow-inner`}>
                <iframe 
                  src={`${previewUrl}${previewUrl.includes('?') ? '&' : '?'}playsinline=1`} 
                  className="w-full h-full border-0 absolute inset-0 sm:relative"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="w-full aspect-video rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                <Clock className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">Nebyl poskytnut odkaz na média</p>
              </div>
            )}
          </section>

          <hr className="border-slate-100" />

          {/* Description Section */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-slate-900">Popisek příspěvku</h3>
              </div>
            </div>

            {/* Pending Change Alert */}
            {post.pendingDescription && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden animate-in slide-in-from-top-2 duration-300">
                <div className="px-4 py-2.5 bg-amber-100/50 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-amber-800 text-xs font-black uppercase tracking-widest">
                    <Clock className="w-3.5 h-3.5" />
                    Klient navrhuje změnu popisku
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRejectPending}
                      disabled={isProcessingPending}
                      className="p-1 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                      title="Odmítnout změnu"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleApprovePending}
                      disabled={isProcessingPending}
                      className="p-1 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                      title="Schválit změnu"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-2">
                      <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Navrhovaný text:</p>
                      <div className="text-sm text-amber-900 bg-white/50 p-3 rounded-xl border border-amber-100 whitespace-pre-wrap italic">
                        {post.pendingDescription}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleApprovePending}
                    disabled={isProcessingPending}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20"
                  >
                    {isProcessingPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                    Schválit navrhovanou změnu
                  </button>
                </div>
              </div>
            )}

            <div className="relative">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full min-h-[120px] p-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-y"
                placeholder="Zde napište popisek k příspěvku..."
              />
              <div className="flex justify-end mt-3">
                <button
                  onClick={handleSaveDescription}
                  disabled={isSavingDesc || description.trim() === (post.description || '')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm"
                >
                  {isSavingDesc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {description.trim() === (post.description || '') ? 'Uloženo' : 'Uložit změny'}
                </button>
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Comments Section */}
          <section className="flex flex-col h-[400px]">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-slate-900">Komentáře a zpětná vazba</h3>
            </div>
            
            {/* Comments List */}
            <div className="flex-1 overflow-y-auto bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-4 mb-4 custom-scrollbar">
              {comments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">Zatím žádné komentáře. Začněte konverzaci!</p>
                </div>
              ) : (
                <>
                  {comments.map(comment => {
                    const isAdmin = comment.authorType === 'admin';
                    return (
                      <div 
                        key={comment.id} 
                        className={`flex flex-col max-w-[85%] ${isAdmin ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                      >
                        <span className="text-[10px] sm:text-xs font-medium text-slate-500 mb-1 px-1">
                          {comment.authorName === 'Agency' ? 'Agentura' : comment.authorName} • {format(new Date(comment.createdAt), 'd. M. H:mm', { locale: cs })}
                        </span>
                        <div 
                          className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm ${
                            isAdmin 
                              ? 'bg-indigo-600 text-white rounded-tr-sm' 
                              : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
                          }`}
                        >
                          {comment.text}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={commentsEndRef} />
                </>
              )}
            </div>

            {/* Comment Input */}
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Napište zprávu..."
                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
              <button
                type="submit"
                disabled={isSubmittingComment || !newComment.trim()}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl transition-colors flex items-center justify-center shadow-sm"
              >
                {isSubmittingComment ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </form>
          </section>

        </div>
      </div>
    </div>
  );
}
