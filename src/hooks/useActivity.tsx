import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { collection, doc, limit, onSnapshot, orderBy, query, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import type { Activity } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface ActivityContextValue {
  activity: Activity[];
  unreadCount: number;
  loading: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const ActivityContext = createContext<ActivityContextValue>({
  activity: [],
  unreadCount: 0,
  loading: true,
  markRead: async () => {},
  markAllRead: async () => {},
});

export const useActivity = () => useContext(ActivityContext);

export const ActivityProvider = ({ children }: { children: React.ReactNode }) => {
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Single-field orderBy needs no composite index. Do NOT add a `where` clause here —
    // that would require a composite index that doesn't exist, and the listener would fail silently.
    const q = query(collection(db, 'activity'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setActivity(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Activity[]);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'activity');
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const markRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'activity', id), { readAt: Date.now() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `activity/${id}`);
    }
  };

  const markAllRead = async () => {
    const unread = activity.filter((a) => !a.readAt);
    if (unread.length === 0) return;
    try {
      const batch = writeBatch(db);
      const now = Date.now();
      unread.forEach((a) => batch.update(doc(db, 'activity', a.id), { readAt: now }));
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'activity');
    }
  };

  const value = useMemo<ActivityContextValue>(() => ({
    activity,
    unreadCount: activity.filter((a) => !a.readAt).length,
    loading,
    markRead,
    markAllRead,
  }), [activity, loading]);

  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>;
};
