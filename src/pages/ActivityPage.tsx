import React, { useMemo, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import type { Activity } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { describeActivity } from '../lib/activity';
import { useAgencyData } from '../hooks/useAgencyData';
import { useActivity } from '../hooks/useActivity';
import { useToast } from '../contexts/ToastContext';
import { Card, CardHeader, CardBody, Select, Avatar, EmptyState, SkeletonRow } from '../components/ui';

export default function ActivityPage() {
  const { clientMap, clients, posts } = useAgencyData();
  const { markRead } = useActivity();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [clientFilter, setClientFilter] = useState('all');
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const q = query(collection(db, 'activity'), orderBy('createdAt', 'desc'), limit(200));
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

  const filtered = useMemo(
    () => (clientFilter === 'all' ? activity : activity.filter((a) => a.clientId === clientFilter)),
    [activity, clientFilter]
  );

  const handleRowClick = async (item: Activity) => {
    await markRead(item.id);
    const post = posts.find((p) => p.id === item.postId);
    if (!post) {
      toast({ title: 'Příspěvek již neexistuje', variant: 'error' });
      return;
    }
    navigate(`/kalendar/${item.clientId}?post=${item.postId}`);
  };

  return (
    <Card>
      <CardHeader
        title="Aktivita"
        count={filtered.length}
        actions={
          <Select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="w-auto min-w-[160px]">
            <option value="all">Všichni klienti</option>
            {[...clients].sort((a, b) => a.name.localeCompare(b.name, 'cs')).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        }
      />
      <CardBody className="p-0">
        {loading ? (
          <div className="divide-y divide-subtle-border">
            <SkeletonRow /><SkeletonRow /><SkeletonRow />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Bell} title="Žádná oznámení" description="Aktivita klientů se zobrazí zde." />
          </div>
        ) : (
          <div className="divide-y divide-subtle-border">
            {filtered.map((item) => {
              const unread = !item.readAt;
              const client = clientMap[item.clientId];
              const text = describeActivity(item);
              return (
                <button
                  key={item.id}
                  onClick={() => handleRowClick(item)}
                  className={`w-full text-left flex items-start gap-3 px-5 py-4 transition-colors hover:bg-hover ${unread ? 'bg-subtle' : ''}`}
                >
                  <span className="relative shrink-0 mt-0.5">
                    <Avatar src={client?.logoUrl} name={client?.name ?? item.clientName} size="sm" />
                    {unread && (
                      <span
                        className="absolute -top-0.5 -left-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[var(--bg-surface)]"
                        style={{ background: 'var(--status-revision-fg)' }}
                      />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-primary leading-snug">{text}</p>
                    {item.type === 'comment' && item.preview && (
                      <p className="text-xs text-secondary mt-0.5 line-clamp-2">{item.preview}</p>
                    )}
                  </div>
                  <span className="text-[11px] text-muted shrink-0 whitespace-nowrap mt-0.5">
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: cs })}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
