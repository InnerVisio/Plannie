import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { AnalyticsReport, Client } from '../types';
import { Plus, Trash2, FileText, ExternalLink } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from './ui/ConfirmDialog';
import { Modal, Button, Input, IconButton, EmptyState, SkeletonRow } from './ui';

interface ManageAnalyticsModalProps {
  client: Client;
  onClose: () => void;
}

export default function ManageAnalyticsModal({ client, onClose }: ManageAnalyticsModalProps) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [reports, setReports] = useState<AnalyticsReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'analytics_reports'), where('clientId', '==', client.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as AnalyticsReport[];
      fetched.sort((a, b) => b.createdAt - a.createdAt);
      setReports(fetched);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'analytics_reports');
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [client.id]);

  const handleAddReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'analytics_reports'), {
        clientId: client.id,
        title: newTitle.trim(),
        pdfUrl: newUrl.trim(),
        createdAt: Date.now(),
      });
      setNewTitle('');
      setNewUrl('');
      toast({ title: 'Report přidán', variant: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'analytics_reports');
      toast({ title: 'Nepodařilo se přidat analytiku.', variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: 'Smazat report?', description: 'Opravdu chcete smazat tento report?', variant: 'danger' });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'analytics_reports', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `analytics_reports/${id}`);
      toast({ title: 'Nepodařilo se smazat analytiku.', variant: 'error' });
    }
  };

  return (
    <Modal open onClose={onClose} title="Analytika" subtitle={client.name}>
      <div className="space-y-6">
        <form onSubmit={handleAddReport} className="bg-subtle p-4 rounded-[var(--radius-field)] border border-subtle-border space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Přidat nový report</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Název (např. Červen 2026)" required value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Zadejte název reportu" />
            <Input label="Odkaz na PDF" type="url" required value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://..." />
          </div>
          <Button type="submit" variant="primary" loading={isSubmitting} icon={Plus}>Nahrát report</Button>
        </form>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted mb-3">Nahrané reporty</p>
          {isLoading ? (
            <div className="space-y-2"><SkeletonRow /><SkeletonRow /></div>
          ) : reports.length === 0 ? (
            <EmptyState icon={FileText} title="Zatím nebyly nahrány žádné reporty." />
          ) : (
            <div className="space-y-2">
              {reports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-3.5 bg-surface border border-subtle-border rounded-[var(--radius-field)]">
                  <div className="min-w-0 flex-1 pr-3">
                    <h4 className="font-semibold text-primary text-sm truncate">{report.title}</h4>
                    <p className="text-xs text-secondary mt-1 flex items-center gap-2">
                      {new Date(report.createdAt).toLocaleDateString('cs-CZ')}
                      <a href={report.pdfUrl} target="_blank" rel="noreferrer" className="text-secondary hover:text-primary hover:underline flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> Zobrazit
                      </a>
                    </p>
                  </div>
                  <IconButton icon={Trash2} label="Smazat report" variant="danger" size="sm" onClick={() => handleDelete(report.id)} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
