import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, query, updateDoc, where, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import type { Comment } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface CommentsContextValue {
  unresolvedByPost: Record<string, number>;
  unresolvedComments: Comment[];
  /** All client comments regardless of resolution — backs the inbox's "Vše" tab. */
  allClientComments: Comment[];
  totalUnresolved: number;
  loading: boolean;
  resolveComment: (id: string) => Promise<void>;
  resolvePost: (postId: string) => Promise<void>;
}

const CommentsContext = createContext<CommentsContextValue>({
  unresolvedByPost: {},
  unresolvedComments: [],
  allClientComments: [],
  totalUnresolved: 0,
  loading: true,
  resolveComment: async () => {},
  resolvePost: async () => {},
});

export const useComments = () => useContext(CommentsContext);

/**
 * Provider for unresolved client comments — mount inside AppShell only (authenticated routes).
 * The public client portal must never subscribe to this.
 */
export const CommentsProvider = ({ children }: { children: React.ReactNode }) => {
  const [allClientComments, setAllClientComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Single `where` needs no composite index. Do NOT add `orderBy('createdAt')` alongside it —
    // that would require a composite index that doesn't exist, and the listener would fail
    // silently. Sort in JS instead, mirroring the precedent in PostModal's comment query.
    const q = query(collection(db, 'comments'), where('authorType', '==', 'client'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setAllClientComments(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Comment[]);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'comments');
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const resolveComment = async (id: string) => {
    try {
      await updateDoc(doc(db, 'comments', id), { resolvedAt: Date.now() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `comments/${id}`);
    }
  };

  const resolvePost = async (postId: string) => {
    // Missing resolvedAt on older documents is treated as unresolved.
    const toResolve = allClientComments.filter((c) => c.postId === postId && !c.resolvedAt);
    try {
      const batch = writeBatch(db);
      const resolvedAt = Date.now();
      toResolve.forEach((c) => batch.update(doc(db, 'comments', c.id), { resolvedAt }));
      batch.update(doc(db, 'posts', postId), { requiresAction: false, updatedAt: resolvedAt });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
    }
  };

  const value = useMemo<CommentsContextValue>(() => {
    // Missing resolvedAt on older documents is treated as unresolved.
    const unresolved = allClientComments.filter((c) => !c.resolvedAt);

    const unresolvedByPost: Record<string, number> = {};
    unresolved.forEach((c) => {
      unresolvedByPost[c.postId] = (unresolvedByPost[c.postId] ?? 0) + 1;
    });
    const unresolvedComments = [...unresolved].sort((a, b) => b.createdAt - a.createdAt);

    return {
      unresolvedByPost,
      unresolvedComments,
      allClientComments,
      totalUnresolved: unresolved.length,
      loading,
      resolveComment,
      resolvePost,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allClientComments, loading]);

  return <CommentsContext.Provider value={value}>{children}</CommentsContext.Provider>;
};
