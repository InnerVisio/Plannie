import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Client, Post } from '../types';
import { Lock } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardBody, SkeletonCard } from '../components/ui';
import CalendarView from '../components/calendar/CalendarView';
import { filterForClient } from '../lib/visibility';

export default function ClientPortal() {
  const { shareableLinkId } = useParams();
  const { currentUser } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!shareableLinkId) return;

    const q = query(collection(db, 'clients'), where('shareableLinkId', '==', shareableLinkId));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          setClient({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Client);
        } else {
          setError('Neplatný nebo vypršelý odkaz.');
        }
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'clients');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [shareableLinkId]);

  useEffect(() => {
    if (!client) return;
    const q = query(collection(db, 'posts'), where('clientId', '==', client.id));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setPosts(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Post[]);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'posts')
    );
    return () => unsubscribe();
  }, [client]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-app p-4 sm:p-6">
        <div className="max-w-[1400px] mx-auto space-y-6 pt-6">
          <SkeletonCard />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              <SkeletonCard />
            </div>
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-dvh bg-app flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardBody className="p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-subtle flex items-center justify-center mx-auto mb-4 text-muted">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-primary mb-1.5">Přístup odepřen</h2>
            <p className="text-sm text-secondary">{error}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!client) return null;

  const visiblePosts = filterForClient(posts, !!currentUser);

  return (
    <div className="min-h-dvh bg-app">
      <div className="max-w-[1400px] mx-auto px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-[calc(1.5rem+env(safe-area-inset-top))] sm:pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <CalendarView client={client} posts={visiblePosts} isAdmin={!!currentUser} />
      </div>
    </div>
  );
}
