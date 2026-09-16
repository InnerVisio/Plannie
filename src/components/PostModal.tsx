import React, { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, deleteDoc, collection, addDoc, query, where, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { Post, Client, Comment } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
  Send, MessageSquare, Check, XCircle, ArrowRight, Clock, Trash2, Pencil,
  AlertCircle, CheckCircle2, Calendar, ChevronLeft, ChevronRight, EyeOff, Undo2,
  Copy, CalendarClock,
} from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from './ui/ConfirmDialog';
import EditPostModal from './EditPostModal';
import CopyTextButton from './CopyTextButton';
import DuplicatePostModal from './DuplicatePostModal';
import MovePostModal from './MovePostModal';
import { getGoogleCalendarUrl } from '../lib/calendar';
import { getEmbedUrl } from '../lib/media';
import { logActivity } from '../lib/activity';
import { Modal, Button, IconButton, Textarea } from './ui';

interface PostModalProps {
  post: Post;
  client: Client;
  onClose: () => void;
}

export default function PostModal({ post, client, onClose }: PostModalProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [description, setDescription] = useState(post.description || '');
  const [isSavingDesc, setIsSavingDesc] = useState(false);
  const [isProcessingPending, setIsProcessingPending] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'comments'), where('postId', '==', post.id));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Comment[];
      // Sort on the client side to avoid requiring a Firestore composite index
      commentsData.sort((a, b) => a.createdAt - b.createdAt);
      setComments(commentsData);
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'comments');
    });

    return () => unsubscribe();
  }, [post.id]);

  const handleApprovePending = async () => {
    if (!post.pendingDescription || isProcessingPending) return;
    setIsProcessingPending(true);
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        description: post.pendingDescription,
        pendingDescription: null,
        updatedAt: Date.now(),
      });
      setDescription(post.pendingDescription);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
      toast({ title: 'Nepodařilo se schválit popisek.', variant: 'error' });
    } finally {
      setIsProcessingPending(false);
    }
  };

  const handleRejectPending = async () => {
    if (!post.pendingDescription || isProcessingPending) return;
    setIsProcessingPending(true);
    try {
      await updateDoc(doc(db, 'posts', post.id), { pendingDescription: null, updatedAt: Date.now() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
      toast({ title: 'Nepodařilo se odmítnout popisek.', variant: 'error' });
    } finally {
      setIsProcessingPending(false);
    }
  };

  const handleResolveAction = async () => {
    try {
      // Clearing requiresAction and resolving the post's outstanding client comments are two
      // systems that must agree — do both in one batch, or "Vyřešeno" would clear the banner
      // while the comment inbox still shows the post as outstanding.
      const batch = writeBatch(db);
      batch.update(doc(db, 'posts', post.id), { requiresAction: false, updatedAt: Date.now() });
      const resolvedAt = Date.now();
      comments
        .filter((c) => c.authorType === 'client' && !c.resolvedAt)
        .forEach((c) => batch.update(doc(db, 'comments', c.id), { resolvedAt }));
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
      toast({ title: 'Nepodařilo se odškrtnout akci.', variant: 'error' });
    }
  };

  const handleSendToClient = async () => {
    setIsChangingStatus(true);
    try {
      // Deliberately does NOT clear requiresAction — sending a post to the client must not
      // silently discard an unresolved comment flag the owner never saw. Sending and resolving
      // are different actions; use "Vyřešeno" (handleResolveAction) to clear it.
      await updateDoc(doc(db, 'posts', post.id), {
        status: 'client_review',
        updatedAt: Date.now(),
      });
      await logActivity({
        clientId: client.id,
        clientName: client.name,
        postId: post.id,
        postTitle: post.title,
        type: 'sent_to_client',
        actor: 'agency',
        readAt: Date.now(),
      });
      toast({ title: 'Odesláno klientovi', variant: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
      toast({ title: 'Nepodařilo se odeslat příspěvek klientovi.', variant: 'error' });
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handleReturnToDraft = async () => {
    setIsChangingStatus(true);
    try {
      await updateDoc(doc(db, 'posts', post.id), { status: 'draft', updatedAt: Date.now() });
      toast({ title: 'Vráceno do konceptů', variant: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
      toast({ title: 'Nepodařilo se vrátit příspěvek do konceptů.', variant: 'error' });
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handlePublish = async () => {
    setIsChangingStatus(true);
    try {
      await updateDoc(doc(db, 'posts', post.id), { status: 'published', updatedAt: Date.now() });
      toast({ title: 'Příspěvek publikován', variant: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
      toast({ title: 'Nepodařilo se publikovat příspěvek.', variant: 'error' });
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handleSaveDescription = async () => {
    if (description.trim() === (post.description || '')) return;
    setIsSavingDesc(true);
    try {
      await updateDoc(doc(db, 'posts', post.id), { description: description.trim(), updatedAt: Date.now() });
      toast({ title: 'Popisek uložen', variant: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
      toast({ title: 'Nepodařilo se uložit popisek.', variant: 'error' });
    } finally {
      setIsSavingDesc(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      const authorType = currentUser ? 'admin' : 'client';
      const authorName = currentUser ? 'Agency' : client.name;

      await addDoc(collection(db, 'comments'), {
        postId: post.id,
        clientId: client.id,
        text: newComment.trim(),
        authorName,
        authorType,
        createdAt: Date.now(),
        resolvedAt: null,
      });
      setNewComment('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'comments');
      toast({ title: 'Nepodařilo se přidat komentář.', variant: 'error' });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Smazat příspěvek?',
      description: 'Opravdu chcete smazat tento příspěvek? Tato akce je nevratná.',
      variant: 'danger',
    });
    if (!ok) return;

    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'posts', post.id));
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'posts');
      toast({ title: 'Nepodařilo se smazat příspěvek.', variant: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isEditing) {
    return <EditPostModal post={post} onClose={() => setIsEditing(false)} />;
  }

  if (isDuplicating) {
    return (
      <DuplicatePostModal
        post={post}
        onClose={() => setIsDuplicating(false)}
        onDuplicated={() => { setIsDuplicating(false); onClose(); }}
      />
    );
  }

  if (isMoving) {
    return <MovePostModal post={post} onClose={() => setIsMoving(false)} />;
  }

  const mediaUrls = post.mediaUrls ?? [];
  const isVideo = post.postType === 'video' || post.postType === 'reel';

  return (
    <Modal
      open
      onClose={onClose}
      title={post.title}
      size="md"
      subtitle={
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span>Naplánováno na {format(new Date(post.scheduledDate), "d. MMMM yyyy 'v' H:mm", { locale: cs })}</span>
          {currentUser && (
            <button
              onClick={() => setIsMoving(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary bg-subtle hover:bg-hover px-2.5 py-1 rounded-md transition-colors w-fit"
            >
              <CalendarClock className="w-3 h-3" />
              Přesunout
            </button>
          )}
        </div>
      }
      headerActions={
        currentUser ? (
          <>
            <a
              href={getGoogleCalendarUrl(post, client?.name || 'Klient')}
              target="_blank"
              rel="noopener noreferrer"
              title="Přidat do Google Kalendáře"
              aria-label="Přidat do Google Kalendáře"
              className="w-10 h-10 rounded-full inline-flex items-center justify-center text-secondary hover:bg-hover hover:text-primary transition-colors shrink-0"
            >
              <Calendar className="w-[18px] h-[18px]" />
            </a>
            <IconButton icon={Copy} label="Duplikovat příspěvek" variant="ghost" onClick={() => setIsDuplicating(true)} />
            <IconButton icon={Pencil} label="Upravit příspěvek" variant="ghost" onClick={() => setIsEditing(true)} />
            <IconButton icon={Trash2} label="Smazat příspěvek" variant="danger" onClick={handleDelete} disabled={isDeleting} />
          </>
        ) : undefined
      }
      footer={
        post.status === 'draft' || post.status === 'needs_revision' ? (
          <Button variant="primary" fullWidth loading={isChangingStatus} icon={Send} onClick={handleSendToClient}>
            Odeslat klientovi
          </Button>
        ) : post.status === 'client_review' ? (
          <Button variant="secondary" fullWidth loading={isChangingStatus} icon={Undo2} onClick={handleReturnToDraft}>
            Vrátit do konceptů
          </Button>
        ) : post.status === 'approved' ? (
          <Button variant="primary" fullWidth loading={isChangingStatus} icon={CheckCircle2} onClick={handlePublish}>
            Publikovat
          </Button>
        ) : post.status === 'published' ? (
          <p className="text-sm text-muted text-center w-full">
            Publikováno {format(new Date(post.updatedAt), "d. MMMM yyyy", { locale: cs })}
          </p>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {post.status === 'draft' && (
          <div
            className="rounded-[var(--radius-field)] p-4 flex items-center gap-3"
            style={{ background: 'var(--status-draft-bg)' }}
          >
            <EyeOff className="w-5 h-5 shrink-0" style={{ color: 'var(--status-draft-fg)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--status-draft-fg)' }}>
              Koncept — klient tento příspěvek nevidí.
            </p>
          </div>
        )}

        {post.requiresAction && (
          <div
            className="rounded-[var(--radius-field)] p-4 flex items-center justify-between gap-3 flex-wrap"
            style={{ background: 'var(--status-revision-bg)' }}
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" style={{ color: 'var(--status-revision-fg)' }} />
              <div>
                <h3 className="font-bold text-sm" style={{ color: 'var(--status-revision-fg)' }}>Vyžaduje vaši akci</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--status-revision-fg)' }}>
                  Klient přidal komentář nebo vrátil k revizi.
                </p>
              </div>
            </div>
            <Button size="sm" variant="danger" icon={CheckCircle2} onClick={handleResolveAction}>Vyřešeno</Button>
          </div>
        )}

        {/* Media */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Náhled média</h3>
            {mediaUrls.length > 0 && (
              <a
                href={mediaUrls[currentMediaIndex]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-secondary bg-subtle hover:bg-hover px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <ArrowRight className="w-3.5 h-3.5" /> Otevřít zdroj
              </a>
            )}
          </div>

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
        </section>

        <hr className="border-subtle-border" />

        {/* Description */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Popisek příspěvku</h3>
            <CopyTextButton text={description} label="Kopírovat popisek" />
          </div>

          {post.pendingDescription && (
            <div className="rounded-[var(--radius-field)] overflow-hidden border" style={{ borderColor: 'var(--status-review-bg)' }}>
              <div className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2" style={{ background: 'var(--status-review-bg)' }}>
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest" style={{ color: 'var(--status-review-fg)' }}>
                  <Clock className="w-3.5 h-3.5" /> Klient navrhuje změnu popisku
                </div>
                <div className="flex items-center gap-2">
                  <IconButton icon={XCircle} label="Odmítnout změnu" size="sm" variant="ghost" onClick={handleRejectPending} disabled={isProcessingPending} />
                  <IconButton icon={Check} label="Schválit změnu" size="sm" variant="ghost" onClick={handleApprovePending} disabled={isProcessingPending} />
                </div>
              </div>
              <div className="p-4 space-y-3" style={{ background: 'var(--status-review-bg)' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--status-review-fg)' }}>Navrhovaný text:</p>
                <div className="text-sm bg-surface/50 p-3 rounded-[var(--radius-field)] whitespace-pre-wrap italic" style={{ color: 'var(--status-review-fg)' }}>
                  {post.pendingDescription}
                </div>
                <Button size="sm" fullWidth loading={isProcessingPending} onClick={handleApprovePending} icon={ArrowRight}>
                  Schválit navrhovanou změnu
                </Button>
              </div>
            </div>
          )}

          <Textarea
            autoGrow
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Zde napište popisek k příspěvku..."
          />
          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              loading={isSavingDesc}
              disabled={description.trim() === (post.description || '')}
              onClick={handleSaveDescription}
            >
              {description.trim() === (post.description || '') ? 'Uloženo' : 'Uložit změny'}
            </Button>
          </div>
        </section>

        <hr className="border-subtle-border" />

        {/* Comments */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-secondary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Komentáře a zpětná vazba</h3>
          </div>

          <div className="max-h-72 overflow-y-auto custom-scrollbar bg-subtle rounded-[var(--radius-field)] border border-subtle-border p-4 space-y-4">
            {comments.length === 0 ? (
              <div className="py-6 flex flex-col items-center justify-center text-muted">
                <MessageSquare className="w-7 h-7 mb-2 opacity-50" />
                <p className="text-sm">Zatím žádné komentáře. Začněte konverzaci!</p>
              </div>
            ) : (
              <>
                {comments.map((comment) => {
                  const isAdmin = comment.authorType === 'admin';
                  return (
                    <div key={comment.id} className={`flex flex-col max-w-[85%] ${isAdmin ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                      <span className="text-[11px] font-medium text-muted mb-1 px-1">
                        {comment.authorName === 'Agency' ? 'Agentura' : comment.authorName} · {format(new Date(comment.createdAt), 'd. M. H:mm', { locale: cs })}
                      </span>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm ${isAdmin ? 'bg-accent text-accent-fg rounded-tr-sm' : 'bg-surface border border-subtle-border text-primary rounded-tl-sm'}`}>
                        {comment.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={commentsEndRef} />
              </>
            )}
          </div>

          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Napište zprávu..."
              className="flex-1 h-11 px-4 bg-subtle border border-subtle-border rounded-[var(--radius-field)] text-base sm:text-sm text-primary placeholder:text-muted focus:bg-surface focus:border-strong-border focus:ring-2 focus:ring-[var(--accent)]/15 outline-none transition"
            />
            <IconButton
              icon={Send}
              label="Odeslat komentář"
              variant="default"
              type="submit"
              disabled={isSubmittingComment || !newComment.trim()}
            />
          </form>
        </section>
      </div>
    </Modal>
  );
}
