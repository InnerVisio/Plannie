import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { AnalyticsReport, Client } from '../types';
import { FileText, Download } from 'lucide-react';
import { Modal, Button, EmptyState, SkeletonRow } from './ui';

interface ClientAnalyticsModalProps {
  client: Client;
  onClose: () => void;
}

export default function ClientAnalyticsModal({ client, onClose }: ClientAnalyticsModalProps) {
  const [reports, setReports] = useState<AnalyticsReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'analytics_reports'), where('clientId', '==', client.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as AnalyticsReport[];
      fetched.sort((a, b) => b.createdAt - a.createdAt);
      setReports(fetched);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [client.id]);

  return (
    <Modal open onClose={onClose} title="Analytika a reporty" subtitle="Přehled výsledků">
      {isLoading ? (
        <div className="space-y-2"><SkeletonRow /><SkeletonRow /></div>
      ) : reports.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Zatím pro vás nemáme připravený žádný report."
          description="Brzy se zde objeví vaše první výsledky."
        />
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="flex items-center justify-between gap-3 p-4 bg-surface border border-subtle-border rounded-[var(--radius-field)]">
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-primary truncate">{report.title}</h4>
                <p className="text-sm text-secondary mt-1">Přidáno: {new Date(report.createdAt).toLocaleDateString('cs-CZ')}</p>
              </div>
              <a href={report.pdfUrl} target="_blank" rel="noreferrer" className="shrink-0">
                <Button variant="secondary" icon={Download}>Zobrazit PDF</Button>
              </a>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
