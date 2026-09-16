import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { subMonths } from 'date-fns';
import { db } from '../firebase';
import { Client, Post } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { isOverdue } from '../lib/status';

interface AgencyDataValue {
  clients: Client[];
  clientMap: Record<string, Client>;
  posts: Post[];
  loading: boolean;
  /** posts whose client still exists — filters out orphans */
  validPosts: Post[];
}

interface AgencyClockValue {
  /** re-evaluates every 5 minutes so overdue detection stays fresh without a shorter interval */
  now: number;
  counts: { drafts: number; needsAction: number; waitingOnClient: number; readyToPublish: number; overdue: number };
}

const AgencyDataContext = createContext<AgencyDataValue>({
  clients: [],
  clientMap: {},
  posts: [],
  loading: true,
  validPosts: [],
});

const AgencyClockContext = createContext<AgencyClockValue>({
  now: Date.now(),
  counts: { drafts: 0, needsAction: 0, waitingOnClient: 0, readyToPublish: 0, overdue: 0 },
});

export const useAgencyData = () => {
  const data = useContext(AgencyDataContext);
  const clock = useContext(AgencyClockContext);
  // Keep the historical combined shape so existing call sites (`now`, `counts`) keep working —
  // consumers that only need `data` still re-render on the clock tick if they destructure `now`
  // here, but most read `useAgencyData()` once and pass fields down, so this is a convenience
  // wrapper. Perf-sensitive call sites should prefer `useAgencyClock()` directly.
  return { ...data, ...clock };
};

/** Subscribe to just the clock/counts — does not re-render when clients/posts change unless counts do. */
export const useAgencyClock = () => useContext(AgencyClockContext);

// Keep a rolling window in memory. Older posts are reachable through /obsah, which
// queries on demand — they do not belong in the always-live listener.
const POSTS_WINDOW_START = () => subMonths(new Date(), 6).getTime();

const TICK_INTERVAL = 5 * 60_000;

export const AgencyDataProvider = ({ children }: { children: React.ReactNode }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [clientsLoaded, setClientsLoaded] = useState(false);
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Computed once on mount — recomputing this per-tick and using it as an effect dependency
  // would tear down and re-subscribe the posts listener every tick.
  const windowStartRef = useRef(POSTS_WINDOW_START());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_INTERVAL);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const unsubscribeClients = onSnapshot(
      collection(db, 'clients'),
      (snapshot) => {
        setClients(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Client[]);
        setClientsLoaded(true);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'clients')
    );

    // Bounded window: never load the full historical `posts` collection into the always-live
    // listener. Single `where` inequality needs no composite index — do not add `orderBy` on a
    // different field alongside it, or the listener will fail silently. Sort in JS instead.
    const postsQuery = query(collection(db, 'posts'), where('scheduledDate', '>=', windowStartRef.current));
    const unsubscribePosts = onSnapshot(
      postsQuery,
      (snapshot) => {
        setPosts(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Post[]);
        setPostsLoaded(true);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'posts')
    );

    return () => {
      unsubscribeClients();
      unsubscribePosts();
    };
  }, []);

  // Data memo: deliberately does NOT depend on `now`. A clock tick must not re-run this filter
  // pass over hundreds of posts or re-render every consumer of useAgencyData's data fields.
  const dataValue = useMemo<AgencyDataValue>(() => {
    const clientMap: Record<string, Client> = {};
    clients.forEach((c) => { clientMap[c.id] = c; });

    const validPosts = posts.filter((p) => clientMap[p.clientId]);

    return {
      clients,
      clientMap,
      posts,
      loading: !(clientsLoaded && postsLoaded),
      validPosts,
    };
  }, [clients, posts, clientsLoaded, postsLoaded]);

  // Clock memo: small, isolated. Only its own consumers (sidebar badge, dashboard) re-render
  // on the tick.
  const clockValue = useMemo<AgencyClockValue>(() => {
    const contentPosts = dataValue.validPosts.filter((p) => p.postType !== 'event');
    const drafts = contentPosts.filter((p) => p.status === 'draft').length;
    const needsAction = contentPosts.filter((p) => p.status === 'needs_revision' || p.requiresAction).length;
    const waitingOnClient = contentPosts.filter((p) => p.status === 'client_review').length;
    const readyToPublish = contentPosts.filter((p) => p.status === 'approved' || p.status === 'scheduled').length;
    const overdue = contentPosts.filter((p) => isOverdue(p, now)).length;

    return {
      now,
      counts: { drafts, needsAction, waitingOnClient, readyToPublish, overdue },
    };
  }, [dataValue.validPosts, now]);

  return (
    <AgencyDataContext.Provider value={dataValue}>
      <AgencyClockContext.Provider value={clockValue}>{children}</AgencyClockContext.Provider>
    </AgencyDataContext.Provider>
  );
};
