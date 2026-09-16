import React, { useMemo, useState, useRef, useEffect } from 'react';
import { collection, doc, updateDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Client } from '../types';
import { Link } from 'react-router-dom';
import {
  Copy, Plus, Users, MoreVertical, CalendarDays, FileText, Trash2, Search, ChevronDown,
} from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useAgencyData } from '../hooks/useAgencyData';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { matchesSearch } from '../lib/text';
import { getBrandColor } from '../lib/brand';
import {
  Card, CardHeader, CardBody, Button, IconButton, Input, Select, Tabs, Avatar, EmptyState, SkeletonRow,
} from '../components/ui';
import AddClientModal from '../components/AddClientModal';
import AddPostModal from '../components/AddPostModal';
import AddEventModal from '../components/AddEventModal';
import ManageAnalyticsModal from '../components/ManageAnalyticsModal';

type SortKey = 'newest' | 'name' | 'posts';
type FilterKey = 'all' | 'active' | 'inactive';

const PAGE_SIZE = 25;

function ClientRowMenu({
  client,
  onAddEvent,
  onManageAnalytics,
  onDelete,
}: {
  client: Client;
  onAddEvent: () => void;
  onManageAnalytics: () => void;
  onDelete: () => void;
  key?: React.Key;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const copyLink = async () => {
    const url = `${window.location.origin}/client/${client.shareableLinkId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Odkaz zkopírován', variant: 'success' });
    } catch {
      toast({ title: 'Nepodařilo se zkopírovat odkaz.', variant: 'error' });
    }
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <IconButton icon={MoreVertical} label="Další akce" variant="ghost" onClick={() => setOpen((v) => !v)} />
      {open && (
        <div className="absolute right-0 mt-1 w-56 bg-surface border border-subtle-border rounded-[var(--radius-field)] shadow-[var(--shadow-pop)] py-1.5 anim-pop z-40">
          <button onClick={() => { setOpen(false); onAddEvent(); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-secondary hover:bg-hover hover:text-primary transition-colors">
            <CalendarDays className="w-4 h-4" /> Přidat událost
          </button>
          <button onClick={copyLink} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-secondary hover:bg-hover hover:text-primary transition-colors">
            <Copy className="w-4 h-4" /> Kopírovat odkaz
          </button>
          <button onClick={() => { setOpen(false); onManageAnalytics(); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-secondary hover:bg-hover hover:text-primary transition-colors">
            <FileText className="w-4 h-4" /> Analytika
          </button>
          <Link to={`/kalendar/${client.id}`} onClick={() => setOpen(false)} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-secondary hover:bg-hover hover:text-primary transition-colors">
            <CalendarDays className="w-4 h-4" /> Otevřít kalendář
          </Link>
          <div className="my-1 border-t border-subtle-border" />
          <button onClick={() => { setOpen(false); onDelete(); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-[var(--status-revision-fg)] hover:bg-[var(--status-revision-bg)] transition-colors">
            <Trash2 className="w-4 h-4" /> Smazat klienta
          </button>
        </div>
      )}
    </div>
  );
}

export default function ClientsPage() {
  const { clients, posts, loading } = useAgencyData();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [activeClientForPost, setActiveClientForPost] = useState<Client | null>(null);
  const [activeClientForEvent, setActiveClientForEvent] = useState<Client | null>(null);
  const [managingAnalyticsFor, setManagingAnalyticsFor] = useState<Client | null>(null);

  const postCounts = useMemo(() => {
    const counts: Record<string, { total: number; waiting: number }> = {};
    posts.forEach((p) => {
      if (p.postType === 'event') return;
      if (!counts[p.clientId]) counts[p.clientId] = { total: 0, waiting: 0 };
      counts[p.clientId].total += 1;
      if (p.status === 'client_review') counts[p.clientId].waiting += 1;
    });
    return counts;
  }, [posts]);

  const filteredClients = useMemo(() => {
    let list = clients;
    if (filter === 'active') list = list.filter((c) => c.isActive);
    if (filter === 'inactive') list = list.filter((c) => !c.isActive);
    if (search.trim()) list = list.filter((c) => matchesSearch(c.name, search));

    const sorted = [...list];
    if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name, 'cs'));
    else if (sort === 'posts') sorted.sort((a, b) => (postCounts[b.id]?.total ?? 0) - (postCounts[a.id]?.total ?? 0));
    else sorted.sort((a, b) => b.createdAt - a.createdAt);

    return sorted;
  }, [clients, filter, search, sort, postCounts]);

  const visibleClients = filteredClients.slice(0, visibleCount);

  const toggleClientStatus = async (clientId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'clients', clientId), { isActive: !currentStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `clients/${clientId}`);
      toast({ title: 'Nepodařilo se změnit stav klienta.', variant: 'error' });
    }
  };

  const handleDelete = async (client: Client) => {
    const ok = await confirm({
      title: 'Smazat klienta?',
      description: `Opravdu chcete smazat klienta ${client.name}? Všechny jeho příspěvky a analytické reporty budou také smazány. Tuto akci nelze vzít zpět.`,
      variant: 'danger',
    });
    if (!ok) return;

    try {
      const postsSnapshot = await getDocs(query(collection(db, 'posts'), where('clientId', '==', client.id)));
      const reportsSnapshot = await getDocs(query(collection(db, 'analytics_reports'), where('clientId', '==', client.id)));

      await Promise.all([
        ...postsSnapshot.docs.map((d) => deleteDoc(d.ref)),
        ...reportsSnapshot.docs.map((d) => deleteDoc(d.ref)),
      ]);
      await deleteDoc(doc(db, 'clients', client.id));
      toast({ title: 'Klient smazán', variant: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `clients/${client.id}`);
      toast({ title: 'Nepodařilo se smazat klienta.', variant: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Klienti"
          count={clients.length}
          actions={
            <Button variant="primary" icon={Plus} onClick={() => setIsAddClientOpen(true)}>
              Nový klient
            </Button>
          }
        />
        <CardBody className="border-b border-subtle-border flex flex-col sm:flex-row gap-3 sm:items-center">
          <Input
            icon={Search}
            placeholder="Hledat klienta…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="sm:max-w-[180px]">
            <option value="newest">Nejnovější</option>
            <option value="name">Podle názvu</option>
            <option value="posts">Nejvíce příspěvků</option>
          </Select>
          <Tabs
            value={filter}
            onChange={(v) => setFilter(v as FilterKey)}
            items={[
              { value: 'all', label: 'Všichni' },
              { value: 'active', label: 'Aktivní' },
              { value: 'inactive', label: 'Neaktivní' },
            ]}
          />
        </CardBody>

        {loading ? (
          <div className="divide-y divide-subtle-border">
            <SkeletonRow /><SkeletonRow /><SkeletonRow />
          </div>
        ) : filteredClients.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Zatím žádní klienti"
            description="Přidejte prvního klienta a začněte plánovat obsah."
            action={<Button variant="primary" icon={Plus} onClick={() => setIsAddClientOpen(true)}>Nový klient</Button>}
          />
        ) : (
          <>
            <div className="divide-y divide-subtle-border">
              {visibleClients.map((client) => {
                const counts = postCounts[client.id] ?? { total: 0, waiting: 0 };
                return (
                  <div key={client.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar src={client.logoUrl} name={client.name} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: getBrandColor(client.brandColor) }} />
                          <p className="font-semibold text-primary truncate">{client.name}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <button
                            onClick={() => toggleClientStatus(client.id, client.isActive)}
                            className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full transition-colors"
                            style={
                              client.isActive
                                ? { color: 'var(--status-approved-fg)', background: 'var(--status-approved-bg)' }
                                : { color: 'var(--text-muted)', background: 'var(--bg-subtle)' }
                            }
                          >
                            {client.isActive ? 'Aktivní' : 'Neaktivní'}
                          </button>
                          <span className="text-xs text-secondary">
                            {counts.total} {counts.total === 1 ? 'příspěvek' : 'příspěvků'}
                            {counts.waiting > 0 && ` · ${counts.waiting} čeká`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 justify-end shrink-0">
                      <Button icon={Plus} onClick={() => setActiveClientForPost(client)} className="flex-1 sm:flex-none">
                        Příspěvek
                      </Button>
                      <ClientRowMenu
                        client={client}
                        onAddEvent={() => setActiveClientForEvent(client)}
                        onManageAnalytics={() => setManagingAnalyticsFor(client)}
                        onDelete={() => handleDelete(client)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {visibleCount < filteredClients.length && (
              <div className="p-4 flex justify-center border-t border-subtle-border">
                <Button variant="secondary" icon={ChevronDown} onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}>
                  Zobrazit více
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      <AddClientModal open={isAddClientOpen} onClose={() => setIsAddClientOpen(false)} />

      {activeClientForPost && (
        <AddPostModal clientId={activeClientForPost.id} onClose={() => setActiveClientForPost(null)} />
      )}
      {activeClientForEvent && (
        <AddEventModal clientId={activeClientForEvent.id} onClose={() => setActiveClientForEvent(null)} />
      )}
      {managingAnalyticsFor && (
        <ManageAnalyticsModal client={managingAnalyticsFor} onClose={() => setManagingAnalyticsFor(null)} />
      )}
    </div>
  );
}
