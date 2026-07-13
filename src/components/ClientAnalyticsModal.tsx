import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { AnalyticsReport, Client } from '../types';
import { X, FileText, Loader2, ExternalLink, Download } from 'lucide-react';

interface ClientAnalyticsModalProps {
  client: Client;
  onClose: () => void;
}

export default function ClientAnalyticsModal({ client, onClose }: ClientAnalyticsModalProps) {
  const [reports, setReports] = useState<AnalyticsReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
    });

    return () => unsubscribe();
  }, [client.id]);

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
              <h2 className="text-xl font-black text-slate-800">Analytika a reporty</h2>
              <p className="text-sm font-medium text-slate-500 mt-0.5">Přehled výsledků</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium">Zatím pro vás nemáme připravený žádný report.</p>
              <p className="text-xs mt-1">Brzy se zde objeví vaše první výsledky.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-300 hover:shadow-md transition-all group">
                  <div className="min-w-0 flex-1 pr-4">
                    <h4 className="font-bold text-slate-800 truncate text-lg">{report.title}</h4>
                    <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                      Přidáno: {new Date(report.createdAt).toLocaleDateString('cs-CZ')}
                    </p>
                  </div>
                  <a 
                    href={report.pdfUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="shrink-0 px-4 py-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Zobrazit PDF
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
