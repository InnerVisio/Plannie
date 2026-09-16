import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { MessageSquare, ExternalLink, CheckCircle2, Send } from 'lucide-react';
import { db } from '../firebase';
import type { Comment, Post } from '../types';
import { useAgencyData } from '../hooks/useAgencyData';
import { useComments } from '../hooks/useComments';
import { useToast } from '../contexts/ToastContext';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { getCommentClientId } from '../lib/comments';
import { pluralize } from '../lib/text';
import { Card, CardBody, Tabs, Select, Avatar, IconButton, Button, EmptyState, SkeletonCard } from '../components/ui';
import PostModal from '../components/PostModal';

type FilterTab = 'unresolved' | 'all';

const GROUP_PAGE = 20;

interface CommentGroup {
  postId: string;
  post?: Post;
  clientId: string;
  clientComments: Comment[];
  newestAt: number;
}

export default function CommentsInboxPage() {
  const { clients, clientMap, validPosts, postMap } = useAgencyDataWithPostMap();
  const { unresolvedComments, allClientComments, resolvePost, loading } = useComments();
  const { toast } = useToast();

  const [tab, setTab] = useState<FilterTab>('unresolved');
  const [clientFilter, setClientFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(GROUP_PAGE);
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  // Posts older than useAgencyData's 6-month window aren't in validPosts, but comments on them
  // are still outstanding. Fetch those individually so the inbox never shows a phantom
  // "deleted post" for content that actually exists.
  const [extraPosts, setExtraPosts] = useState<Record<string, Post>>({});

  const sourceComments = tab === 'unresolved' ? unresolvedComments : allClientComments;

  const resolvedPostMap = useMemo(() => ({ ...extraPosts, ...postMap }), [extraPosts, postMap]);

  // Fetch any referenced post that falls outside the in-memory window.
  useEffect(() => {
    const missing: string[] = Array.from(
      new Set<string>(sourceComments.map((c) => c.postId).filter((id) => !resolvedPostMap[id]))
    );
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const fetched: Record<string, Post> = {};
      await Promise.all(
        missing.map(async (id) => {
          try {
            const snap = await getDoc(doc(db, 'posts', id));
            if (snap.exists()) fetched[id] = { id: snap.id, ...snap.data() } as Post;
          } catch (error) {
            handleFirestoreError(error, OperationType.GET, `posts/${id}`);
          }
        })
      );
      if (!cancelled && Object.keys(fetched).length > 0) {
        setExtraPosts((prev) => ({ ...prev, ...fetched }));
      }
    })();
    return () => { cancelled = true; };
  }, [sourceComments, resolvedPostMap]);

  const groups = useMemo<CommentGroup[]>(() => {
    const byPost = new Map<string, CommentGroup>();
    sourceComments.forEach((c) => {
      const clientId = getCommentClientId(c, resolvedPostMap);
      let group = byPost.get(c.postId);
      if (!group) {
        group = { postId: c.postId, post: resolvedPostMap[c.postId], clientId, clientComments: [], newestAt: 0 };
        byPost.set(c.postId, group);
      }
      group.clientComments.push(c);
      group.newestAt = Math.max(group.newestAt, c.createdAt);
    });
    let list = Array.from(byPost.values());
    if (clientFilter !== 'all') list = list.filter((g) => g.clientId === clientFilter);
    list.sort((a, b) => b.newestAt - a.newestAt);
    list.forEach((g) => g.clientComments.sort((a, b) => a.createdAt - b.createdAt));
    return list;
  }, [sourceComments, resolvedPostMap, clientFilter]);

  const visible = groups.slice(0, visibleCount);
  const openPost = openPostId ? resolvedPostMap[openPostId] ?? null : null;

  const sortedClients = useMemo(
    () => [...clients].sort((a, b) => a.name.localeCompare(b.name, 'cs')),
    [clients]
  );

  const handleResolve = async (postId: string) => {
    try {
      await resolvePost(postId);
      toast({ title: 'Konverzace označena jako vyřešená', variant: 'success' });
    } catch {
      toast({ title: 'Nepodařilo se označit konverzaci jako vyřešenou.', variant: 'error' });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Tabs
            value={tab}
            onChange={(v) => { setTab(v as FilterTab); setVisibleCount(GROUP_PAGE); }}
            items={[
              { value: 'unresolved', label: 'Nevyřešené' },
              { value: 'all', label: 'Vše' },
            ]}
          />
          <Select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="sm:max-w-[220px] sm:ml-auto">
            <option value="all">Všichni klienti</option>
            {sortedClients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </CardBody>
      </Card>

      <p className="text-sm text-secondary">{pluralize(groups.length, 'konverzace', 'konverzace', 'konverzací')}</p>

      {loading ? (
        <div className="space-y-3">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={MessageSquare}
              title="Žádné nevyřešené komentáře"
              description="Vše od klientů je vyřízeno."
            />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {visible.map((group) => (
            <CommentGroupCard
              key={group.postId}
              group={group}
              client={clientMap[group.clientId]}
              onOpenPost={() => setOpenPostId(group.postId)}
              onResolve={() => handleResolve(group.postId)}
            />
          ))}
          {visible.length < groups.length && (
            <div className="flex justify-center pt-2">
              <Button variant="secondary" onClick={() => setVisibleCount((v) => v + GROUP_PAGE)}>
                Načíst další
              </Button>
            </div>
          )}
        </div>
      )}

      {openPost && clientMap[openPost.clientId] && (
        <PostModal post={openPost} client={clientMap[openPost.clientId]} onClose={() => setOpenPostId(null)} />
      )}
    </div>
  );
}

/** Thin wrapper so this page can build a postId -> Post lookup without every other consumer
 * of useAgencyData paying for it. */
function useAgencyDataWithPostMap() {
  const data = useAgencyData();
  const postMap = useMemo(() => {
    const map: Record<string, Post> = {};
    data.validPosts.forEach((p) => { map[p.id] = p; });
    return map;
  }, [data.validPosts]);
  return { ...data, postMap };
}

function CommentGroupCard({
  group,
  client,
  onOpenPost,
  onResolve,
}: {
  group: CommentGroup;
  client?: { name: string; logoUrl?: string };
  onOpenPost: () => void;
  onResolve: () => void;
  key?: React.Key;
}) {
  const { toast } = useToast();
  const [adminReplies, setAdminReplies] = useState<Comment[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveOnReply, setResolveOnReply] = useState(true);

  // Fetch this post's admin replies for context. Scoped per visible card rather than a single
  // app-wide listener over all comments — the inbox shows at most 20 groups at a time.
  useEffect(() => {
    const q = query(collection(db, 'comments'), where('postId', '==', group.postId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Comment[];
      const admin = data.filter((c) => c.authorType === 'admin').sort((a, b) => a.createdAt - b.createdAt);
      setAdminReplies(admin.slice(-2));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'comments');
    });
    return () => unsubscribe();
  }, [group.postId]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSending) return;
    setIsSending(true);
    try {
      await addDoc(collection(db, 'comments'), {
        postId: group.postId,
        clientId: group.clientId,
        text: replyText.trim(),
        authorName: 'Agency',
        authorType: 'admin',
        createdAt: Date.now(),
        resolvedAt: null,
      });
      setReplyText('');
      if (resolveOnReply) {
        await onResolve();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'comments');
      toast({ title: 'Nepodařilo se odeslat odpověď.', variant: 'error' });
    } finally {
      setIsSending(false);
    }
  };

  const handleResolveClick = async () => {
    setIsResolving(true);
    try {
      await onResolve();
    } finally {
      setIsResolving(false);
    }
  };

  const postTitle = group.post?.title ?? 'Smazaný příspěvek';

  return (
    <Card>
      <div className="flex items-center gap-3 px-5 py-4 border-b border-subtle-border">
        <Avatar src={client?.logoUrl} name={client?.name ?? 'Klient'} size="sm" />
        <p className="min-w-0 flex-1 font-semibold text-primary truncate">
          {client?.name ?? 'Neznámý klient'} <span className="text-muted font-normal">·</span> {postTitle}
        </p>
        {group.post && (
          <IconButton icon={ExternalLink} label="Otevřít příspěvek" variant="ghost" size="sm" onClick={onOpenPost} />
        )}
      </div>

      <CardBody className="space-y-4">
        <div className="space-y-3">
          {adminReplies.map((reply) => (
            <div key={reply.id} className="flex flex-col items-end">
              <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm bg-accent text-accent-fg">
                {reply.text}
              </div>
              <span className="text-[11px] text-muted mt-1 px-1">
                {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true, locale: cs })}
              </span>
            </div>
          ))}
          {group.clientComments.map((comment) => (
            <div key={comment.id} className="flex flex-col items-start">
              <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm bg-subtle border border-subtle-border text-primary">
                „{comment.text}"
              </div>
              <span className="text-[11px] text-muted mt-1 px-1">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: cs })}
              </span>
            </div>
          ))}
        </div>

        <form onSubmit={handleReply} className="space-y-2 pt-2 border-t border-subtle-border">
          <div className="flex gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Napsat odpověď…"
              className="flex-1 h-11 px-4 bg-subtle border border-subtle-border rounded-[var(--radius-field)] text-base sm:text-sm text-primary placeholder:text-muted focus:bg-surface focus:border-strong-border focus:ring-2 focus:ring-[var(--accent)]/15 outline-none transition"
            />
            <Button type="submit" variant="primary" icon={Send} loading={isSending} disabled={!replyText.trim()}>
              Odeslat
            </Button>
          </div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-secondary cursor-pointer select-none">
              <input
                type="checkbox"
                checked={resolveOnReply}
                onChange={(e) => setResolveOnReply(e.target.checked)}
                className="w-4 h-4 rounded border-subtle-border accent-[var(--accent)]"
              />
              Označit jako vyřešené
            </label>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={CheckCircle2}
              loading={isResolving}
              onClick={handleResolveClick}
            >
              Označit jako vyřešené
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
