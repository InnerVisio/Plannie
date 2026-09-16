import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { AnalyticsReport } from '../types';
import { FileText, ChevronDown, Users } from 'lucide-react';
import { useAgencyData } from '../hooks/useAgencyData';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { Card, CardHeader, CardBody, Avatar, Button, EmptyState, SkeletonRow } from '../components/ui';
import ManageAnalyticsModal from '../components/ManageAnalyticsModal';

export default function AnalyticsHub() {
  const { clients, loading: clientsLoading } = useAgencyData();
  const [reports, setReports] = useState<AnalyticsReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [managingClientId, setManagingClientId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'analytics_reports'),
      (snapshot) => {
        setReports(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as AnalyticsReport[]);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'analytics_reports');
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const managingClient = clients.find((c) => c.id === managingClientId) ?? null;

  if (clientsLoading || loading) {
    return (
      <Card>
        <div className="divide-y divide-subtle-border">
          <SkeletonRow /><SkeletonRow /><SkeletonRow />
        </div>
      </Card>
    );
  }

  if (clients.length === 0) {
    return <EmptyState icon={Users} title="Zatím žádní klienti" description="Přidejte klienta, abyste mohli spravovat jeho analytiku." />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Analytika" subtitle="Reporty podle klienta" icon={FileText} />
        <div className="divide-y divide-subtle-border">
          {clients.map((client) => {
            const clientReports = reports
              .filter((r) => r.clientId === client.id)
              .sort((a, b) => b.createdAt - a.createdAt);
            const expanded = expandedClientId === client.id;

            return (
              <div key={client.id}>
                <button
                  onClick={() => setExpandedClientId(expanded ? null : client.id)}
                  className="w-full flex items-center justify-between gap-4 p-4 sm:p-5 hover:bg-hover transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar src={client.logoUrl} name={client.name} size="sm" />
                    <div className="min-w-0">
                      <p className="font-semibold text-primary truncate">{client.name}</p>
                      <p className="text-xs text-secondary">
                        {clientReports.length} {clientReports.length === 1 ? 'report' : 'reportů'}
                        {clientReports[0] && ` · naposledy ${new Date(clientReports[0].createdAt).toLocaleDateString('cs-CZ')}`}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </button>
                {expanded && (
                  <div className="px-4 sm:px-5 pb-5 space-y-2">
                    {clientReports.length === 0 ? (
                      <p className="text-sm text-secondary py-2">Zatím nebyly nahrány žádné reporty.</p>
                    ) : (
                      clientReports.map((report) => (
                        <a
                          key={report.id}
                          href={report.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between gap-3 p-3 bg-subtle hover:bg-hover rounded-[var(--radius-field)] transition-colors"
                        >
                          <span className="text-sm font-medium text-primary truncate">{report.title}</span>
                          <span className="text-xs text-muted shrink-0">{new Date(report.createdAt).toLocaleDateString('cs-CZ')}</span>
                        </a>
                      ))
                    )}
                    <Button size="sm" variant="secondary" onClick={() => setManagingClientId(client.id)}>
                      Spravovat reporty
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {managingClient && (
        <ManageAnalyticsModal client={managingClient} onClose={() => setManagingClientId(null)} />
      )}
    </div>
  );
}
