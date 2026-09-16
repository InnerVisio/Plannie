import React, { useState, useRef, useEffect } from 'react';
import { doc, updateDoc, collection, addDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Post, Client, Comment } from '../types';
import {
  AlertCircle, Clock, Calendar as CalendarIcon, Send, MessageSquare, Pencil, RotateCcw,
  ChevronLeft, ChevronRight, CheckCircle2,
} from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { sendNotificationEmail } from '../lib/email';
import { getGoogleCalendarUrl } from '../lib/calendar';
import { getEmbedUrl } from '../lib/media';
import { getPostMeta } from '../lib/status';
import { NOTIFICATION_EMAIL } from '../lib/config';
import { logActivity } from '../lib/activity';
import { Modal, Button, IconButton, Textarea, Badge } from './ui';
import CopyTextButton from './CopyTextButton';

interface ClientPostModalProps {
  post: Post;
  client: Client;
  onClose: () => void;
}

export default function ClientPostModal({ post, client, onClose }: ClientPostModalProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [commentText, setCommentText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(post.pendingDescription || post.description || '');
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'comments'), where('postId', '==', post.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Comment[];
      commentsData.sort((a, b) => a.createdAt - b.createdAt);
      setComments(commentsData);
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'comments');
    });
    return () => unsubscribe();
  }, [post.id]);

  const handleUpdateStatus = async (newStatus: 'approved' | 'needs_revision') => {
    try {
      const isClientAction = !currentUser;
      await updateDoc(doc(db, 'posts', post.id), {
        status: newStatus,
        updatedAt: Date.now(),
        ...(newStatus === 'needs_revision' && isClientAction ? { requiresAction: true } : {}),
      });

      if (isClientAction) {
        // Approval writes activity too (it's news), but does not set requiresAction — it isn't a
        // problem to solve. Only client-originated actions notify the owner; never self-notify.
        await logActivity({
          clientId: client.id,
          clientName: client.name,
          postId: post.id,
          postTitle: post.title,
          type: newStatus,
          actor: 'client',
        });
      }

      if (newStatus === 'needs_revision' && isClientAction) {
        sendNotificationEmail(NOTIFICATION_EMAIL, client?.name || 'Klient', post.title, 'revision');
      }

      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
      toast({ title: 'Nepodařilo se aktualizovat stav příspěvku.', variant: 'error' });
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || isSending) return;

    setIsSending(true);
    try {
      const authorType = currentUser ? 'admin' : 'client';
      const authorName = currentUser ? 'Agency' : client?.name || 'Client';

      await addDoc(collection(db, 'comments'), {
        postId: post.id,
        clientId: client.id,
        text: commentText.trim(),
        authorName,
        authorType,
        createdAt: Date.now(),
        resolvedAt: null,
      });

      if (authorType === 'client') {
        await updateDoc(doc(db, 'posts', post.id), { requiresAction: true, updatedAt: Date.now() });
        await logActivity({
          clientId: client.id,
          clientName: client.name,
          postId: post.id,
          postTitle: post.title,
          type: 'comment',
          actor: 'client',
          preview: commentText.trim().slice(0, 120),
        });
        sendNotificationEmail(NOTIFICATION_EMAIL, client?.name || 'Klient', post.title, 'comment');
      }

      setCommentText('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'comments');
      toast({ title: 'Nepodařilo se odeslat komentář.', variant: 'error' });
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveDescription = async () => {
    if (isSavingDescription) return;
    setIsSavingDescription(true);
    try {
      await updateDoc(doc(db, 'posts', post.id), { pendingDescription: editedDescription.trim(), updatedAt: Date.now() });
      if (!currentUser) {
        await logActivity({
          clientId: client.id,
          clientName: client.name,
          postId: post.id,
          postTitle: post.title,
          type: 'description_proposed',
          actor: 'client',
        });
      }
      setIsEditingDescription(false);
      toast({ title: 'Návrh odeslán ke schválení', variant: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
      toast({ title: 'Nepodařilo se uložit změnu popisku.', variant: 'error' });
    } finally {
      setIsSavingDescription(false);
    }
  };

  const meta = getPostMeta(post);
  const mediaUrls = post.mediaUrls ?? [];
  const isVideo = post.postType === 'video' || post.postType === 'reel';

  return (
    <Modal
      open
      onClose={onClose}
      title={post.title}
      size="md"
      subtitle={
        <span className="flex items-center gap-1.5">
          <CalendarIcon className="w-3.5 h-3.5" />
          {format(new Date(post.scheduledDate), "d. MMMM yyyy 'v' H:mm", { locale: cs })}
        </span>
      }
      headerActions={
        <a
          href={getGoogleCalendarUrl(post, client?.name || 'Klient')}
          target="_blank"
          rel="noopener noreferrer"
          title="Přidat do Google Kalendáře"
          aria-label="Přidat do Google Kalendáře"
          className="w-10 h-10 rounded-full inline-flex items-center justify-center text-secondary hover:bg-hover hover:text-primary transition-colors shrink-0"
        >
          <CalendarIcon className="w-[18px] h-[18px]" />
        </a>
      }
      footer={
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="secondary" fullWidth icon={AlertCircle} onClick={() => handleUpdateStatus('needs_revision')}>
            Vyžadovat úpravu
          </Button>
          <Button variant="primary" fullWidth icon={CheckCircle2} onClick={() => handleUpdateStatus('approved')}>
            Schválit příspěvek
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Media */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Náhled média</h3>
          {mediaUrls.length > 0 ? (
            <div className="relative group">
              <div className={`relative w-full ${isVideo ? 'h-[420px]' : 'h-[320px]'} sm:h-auto sm:aspect-video rounded-[var(--radius-field)] bg-subtle overflow-hidden border border-subtle-border`}>
                <iframe
                  key={currentMediaIndex}
                  src={`${getEmbedUrl(mediaUrls[currentMediaIndex])}${getEmbedUrl(mediaUrls[currentMediaIndex]).includes('?') ? '&' : '?'}playsinline=1`}
                  className="border-0 absolute top-0 left-0 w-[200%] h-[200%] scale-50 origin-top-left sm:relative sm:w-full sm:h-full sm:scale-100 sm:origin-center"
                  referrerPolicy="no-referrer"
                  allowFullScreen
                  allow="fullscreen"
                />
              </div>

              {mediaUrls.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setCurrentMediaIndex((p) => (p > 0 ? p - 1 : mediaUrls.length - 1)); }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-surface/90 text-secondary shadow-[var(--shadow-pop)] opacity-0 group-hover:opacity-100 transition-opacity hover:text-primary"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setCurrentMediaIndex((p) => (p < mediaUrls.length - 1 ? p + 1 : 0)); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-surface/90 text-secondary shadow-[var(--shadow-pop)] opacity-0 group-hover:opacity-100 transition-opacity hover:text-primary"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/40 px-2.5 py-1.5 rounded-full backdrop-blur-sm">
                    {mediaUrls.map((_, idx) => (
                      <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentMediaIndex ? 'bg-white scale-110' : 'bg-white/40'}`} />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="w-full aspect-video rounded-[var(--radius-field)] bg-subtle border-2 border-dashed border-subtle-border flex flex-col items-center justify-center text-muted">
              <Clock className="w-10 h-10 mb-2 opacity-40" />
              <p className="text-sm">Nebyl poskytnut odkaz na média</p>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Popisek</h3>
            {!isEditingDescription && (
              <div className="flex items-center gap-3 shrink-0">
                <CopyTextButton text={post.pendingDescription || post.description || ''} />
                <button
                  onClick={() => setIsEditingDescription(true)}
                  className="text-xs font-bold text-secondary hover:text-primary flex items-center gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" /> Upravit
                </button>
              </div>
            )}
          </div>

          {isEditingDescription ? (
            <div className="space-y-3">
              <Textarea
                autoGrow
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                placeholder="Zadejte nový popisek..."
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={RotateCcw}
                  onClick={() => {
                    setIsEditingDescription(false);
                    setEditedDescription(post.pendingDescription || post.description || '');
                  }}
                >
                  Zrušit
                </Button>
                <Button variant="primary" size="sm" loading={isSavingDescription} onClick={handleSaveDescription}>
                  Odeslat ke schválení
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="p-4 rounded-[var(--radius-field)] border leading-relaxed whitespace-pre-wrap text-sm"
              style={
                post.pendingDescription
                  ? { background: 'var(--status-review-bg)', borderColor: 'var(--status-review-bg)', color: 'var(--status-review-fg)' }
                  : { background: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }
              }
            >
              {post.pendingDescription ? (
                <>
                  <div className="flex items-center gap-2 mb-2 text-[10px] font-black uppercase tracking-widest">
                    <Clock className="w-3 h-3" /> Čeká na schválení administrátorem
                  </div>
                  {post.pendingDescription}
                </>
              ) : (
                post.description || <span className="text-muted italic">Nebyl zadán žádný popisek.</span>
              )}
            </div>
          )}
        </div>

        {/* Status */}
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Aktuální stav:</h3>
          <Badge label={meta.label} fg={meta.fg} bg={meta.bg} Icon={meta.Icon} />
        </div>

        {/* Comments */}
        <div className="pt-4 border-t border-subtle-border space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-secondary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Komentáře</h3>
          </div>

          <div className="bg-subtle rounded-[var(--radius-field)] border border-subtle-border overflow-hidden">
            <div className="max-h-48 overflow-y-auto custom-scrollbar p-4 space-y-3">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment.id} className={`flex flex-col ${comment.authorType === 'admin' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
                      comment.authorType === 'admin'
                        ? 'bg-accent text-accent-fg rounded-tr-none'
                        : 'bg-surface text-primary border border-subtle-border rounded-tl-none'
                    }`}>
                      <p className="font-bold text-[10px] uppercase tracking-wider opacity-70 mb-1">
                        {comment.authorName === 'Agency' ? 'Agentura' : comment.authorName}
                      </p>
                      <p>{comment.text}</p>
                    </div>
                    <span className="text-[10px] text-muted mt-1 px-1">
                      {format(new Date(comment.createdAt), 'H:mm', { locale: cs })}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted text-sm italic">
                  Zatím žádné komentáře. Začněte konverzaci!
                </div>
              )}
              <div ref={commentsEndRef} />
            </div>

            <form onSubmit={handleSendComment} className="p-3 bg-surface border-t border-subtle-border flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Napište zprávu..."
                className="flex-1 h-10 px-3 bg-subtle border border-subtle-border rounded-[var(--radius-field)] text-base sm:text-sm text-primary placeholder:text-muted focus:bg-surface focus:border-strong-border focus:ring-2 focus:ring-[var(--accent)]/15 outline-none transition"
              />
              <IconButton icon={Send} label="Odeslat komentář" size="sm" type="submit" disabled={!commentText.trim() || isSending} />
            </form>
          </div>
        </div>
      </div>
    </Modal>
  );
}
