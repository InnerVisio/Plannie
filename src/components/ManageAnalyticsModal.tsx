import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { AnalyticsReport, Client } from '../types';
import { X, Plus, Trash2, FileText, Loader2, ExternalLink } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface ManageAnalyticsModalProps {
  client: Client;
  onClose: () => void;
}

export default function ManageAnalyticsModal({ client, onClose }: ManageAnalyticsModalProps) {
  const [reports, setReports] = useState<AnalyticsReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'analytics_reports'),
      where('clientId', '==', client.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedReports = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AnalyticsReport[];
      
      // Sort by creation date descending (newest first)
      fetchedReports.sort((a, b) => b.createdAt - a.createdAt);
      setReports(fetchedReports);
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
      const report: Omit<AnalyticsReport, 'id'> = {
        clientId: client.id,
        title: newTitle.trim(),
        pdfUrl: newUrl.trim(),
        createdAt: Date.now(),
      };

      await addDoc(collection(db, 'analytics_reports'), report);
      setNewTitle('');
      setNewUrl('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'analytics_reports');
      alert('Nepodařilo se přidat analytiku.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Opravdu chcete smazat tento report?')) return;
    try {
      await deleteDoc(doc(db, 'analytics_reports', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `analytics_reports/${id}`);
      alert('Nepodařilo se smazat analytiku.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
      <div 
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-xl z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">Analytika</h2>
              <p className="text-sm font-medium text-slate-500 mt-0.5">{client.name}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Add Form */}
          <form onSubmit={handleAddReport} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Přidat nový report</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Název (např. Červen 2026)</label>
                <input 
                  type="text" required value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  placeholder="Zadejte název reportu"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Odkaz na PDF (Google Disk atd.)</label>
                <input 
                  type="url" required value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  placeholder="https://..."
                />
              </div>
            </div>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Nahrát report
            </button>
          </form>

          {/* List of Reports */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Nahrané reporty</h3>
            {isLoading ? (
              <div className="py-8 flex justify-center"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-sm font-medium">
                Zatím nebyly nahrány žádné reporty.
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-300 transition-colors group">
                    <div className="min-w-0 flex-1 pr-4">
                      <h4 className="font-bold text-slate-800 truncate">{report.title}</h4>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                        {new Date(report.createdAt).toLocaleDateString('cs-CZ')}
                        <a 
                          href={report.pdfUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" /> Zobrazit
                        </a>
                      </p>
                    </div>
                    <button 
                      onClick={() => handleDelete(report.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 sm:opacity-100"
                      title="Smazat report"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
