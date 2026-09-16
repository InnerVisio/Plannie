import React, { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAgencyData } from '../hooks/useAgencyData';
import { useComments } from '../hooks/useComments';
import { Card, CardBody, Avatar, EmptyState, SkeletonCard } from '../components/ui';
import { getBrandColor } from '../lib/brand';
import { Users } from 'lucide-react';
import CalendarView from '../components/calendar/CalendarView';

export default function CalendarHub() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { clients, posts, loading } = useAgencyData();
  const { unresolvedByPost } = useComments();

  const activeClients = clients.filter((c) => c.isActive);

  useEffect(() => {
    if (!clientId && !loading && activeClients.length === 1) {
      navigate(`/kalendar/${activeClients[0].id}`, { replace: true });
    }
  }, [clientId, loading, activeClients, navigate]);

  if (clientId) {
    const client = clients.find((c) => c.id === clientId);
    if (loading) return <SkeletonCard />;
    if (!client) {
      return (
        <EmptyState icon={Users} title="Klient nenalezen" description="Tento klient neexistuje nebo byl smazán." />
      );
    }
    const clientPosts = posts.filter((p) => p.clientId === client.id);
    return <CalendarView client={client} posts={clientPosts} isAdmin unresolvedByPost={unresolvedByPost} />;
  }

  const postCounts = (id: string) => {
    const clientPosts = posts.filter((p) => p.clientId === id && p.postType !== 'event');
    return {
      total: clientPosts.length,
      waiting: clientPosts.filter((p) => p.status === 'client_review').length,
    };
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Zatím žádní klienti"
        description="Přidejte klienta na stránce Klienti a poté se sem vraťte."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {clients.map((client) => {
        const counts = postCounts(client.id);
        return (
          <Link key={client.id} to={`/kalendar/${client.id}`}>
            <Card className="p-4 hover:border-strong-border transition h-full relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: getBrandColor(client.brandColor) }} />
              <div className="flex items-center gap-3 pl-2">
                <Avatar src={client.logoUrl} name={client.name} />
                <div className="min-w-0">
                  <p className="font-semibold text-primary truncate">{client.name}</p>
                  <p className="text-xs text-secondary mt-0.5">
                    {counts.total} příspěvků {counts.waiting > 0 && `· ${counts.waiting} čeká`}
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
