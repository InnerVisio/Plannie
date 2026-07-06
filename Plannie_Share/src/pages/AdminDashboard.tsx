import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Client } from '../types';
import { Link } from 'react-router-dom';
import { ExternalLink, Copy, Plus, Users, CheckCircle2, XCircle, Trash2, Loader2, Calendar, AlertTriangle } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import AddPostModal from '../components/AddPostModal';

export default function AdminDashboard() {
  const [clients, setClients] = useState<Client[]>([]);
  const [newClientName, setNewClientName] = useState('');
  const [newDriveLink, setNewDriveLink] = useState('');
  const [newLogoUrl, setNewLogoUrl] = useState('');
  const [newBrandColor, setNewBrandColor] = useState('slate');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // State for modals
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeClientForPost, setActiveClientForPost] = useState<Client | null>(null);

  // Real-time listener for clients
  useEffect(() => {
    const q = query(collection(db, 'clients'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const clientsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Client[];
      setClients(clientsData);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clients');
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    setIsSubmitting(true);
    try {
      const secureSlug = crypto.randomUUID();
      await addDoc(collection(db, 'clients'), {
        name: newClientName.trim(),
        shareableLinkId: secureSlug,
        googleDriveLink: newDriveLink.trim(),
        logoUrl: newLogoUrl.trim(),
        brandColor: newBrandColor,
        isActive: true,
        createdAt: Date.now()
      });
      setNewClientName('');
      setNewDriveLink('');
      setNewLogoUrl('');
      setNewBrandColor('slate');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'clients');
      alert("Nepodařilo se přidat klienta. Zkontrolujte pravidla Firebase.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleClientStatus = async (clientId: string, currentStatus: boolean) => {
    try {
      const clientRef = doc(db, 'clients', clientId);
      await updateDoc(clientRef, { isActive: !currentStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `clients/${clientId}`);
    }
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'clients', clientToDelete.id));
      setClientToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `clients/${clientToDelete.id}`);
      alert("Nepodařilo se smazat klienta.");
    } finally {
      setIsDeleting(false);
    }
  };

  const copyLink = (linkId: string) => {
    const url = `${window.location.origin}/client/${linkId}`;
    navigator.clipboard.writeText(url);
    alert('Zabezpečený odkaz byl zkopírován do schránky!');
  };

  return (
    <div className="min-h-screen bg-slate-900 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] bg-fixed from-slate-900 via-indigo-950 to-slate-900 py-8 px-4 sm:px-6 lg:px-8 transition-all duration-700">
      <div className="max-w-7xl mx-auto space-y-8 relative">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-white">Administrace agentury</h1>
            <p className="text-indigo-300 font-medium mt-2 uppercase tracking-widest text-xs">Ovládací panel • {clients.length} {clients.length === 1 ? 'klient' : clients.length > 1 && clients.length < 5 ? 'klienti' : 'klientů'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Add Client Form */}
          <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20 h-fit xl:sticky xl:top-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/25">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">Nový klient</h2>
            </div>
            
            <form onSubmit={handleAddClient} className="space-y-6">
              <div>
                <label className="block text-xs font-black text-indigo-300 uppercase tracking-widest mb-2">Název klienta</label>
                <input 
                  type="text" required value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/30 focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                  placeholder="např. Acme Corp"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-indigo-300 uppercase tracking-widest mb-2">Odkaz na Google Disk</label>
                <input 
                  type="url" value={newDriveLink}
                  onChange={(e) => setNewDriveLink(e.target.value)}
                  className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/30 focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                  placeholder="https://drive.google.com/..."
                />
              </div>
              <div>
                <label className="block text-xs font-black text-indigo-300 uppercase tracking-widest mb-2">URL adresa loga</label>
                <input 
                  type="url" value={newLogoUrl}
                  onChange={(e) => setNewLogoUrl(e.target.value)}
                  className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/30 focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                  placeholder="https://example.com/logo.png"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-indigo-300 uppercase tracking-widest mb-3">Barevný akcent</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'slate', color: 'bg-slate-900' },
                    { id: 'indigo', color: 'bg-indigo-950' },
                    { id: 'emerald', color: 'bg-emerald-950' },
                    { id: 'rose', color: 'bg-rose-950' },
                    { id: 'amber', color: 'bg-amber-950' },
                    { id: 'violet', color: 'bg-violet-950' },
                    { id: 'cyan', color: 'bg-cyan-950' },
                    { id: 'blue', color: 'bg-blue-950' },
                    { id: 'zinc', color: 'bg-zinc-900' },
                    { id: 'neutral', color: 'bg-neutral-900' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setNewBrandColor(c.id)}
                      className={`w-6 h-6 rounded-full transition-all border ${
                        newBrandColor === c.id 
                          ? 'border-white scale-125 ring-2 ring-white/20' 
                          : 'border-white/10 hover:scale-110'
                      } ${c.color}`}
                    />
                  ))}
                </div>
              </div>
              <button 
                type="submit" disabled={isSubmitting || !newClientName.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white font-black uppercase tracking-widest py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/20 active:scale-95"
              >
                {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
                Přidat klienta
              </button>
            </form>
          </div>

          {/* Clients List */}
          <div className="xl:col-span-2">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
              <div className="px-8 py-6 border-b border-white/10 bg-white/5">
                <h2 className="text-xl font-black text-white tracking-tight">Aktivní klienti</h2>
              </div>
              
              {isLoading ? (
                <div className="p-20 flex justify-center"><Loader2 className="w-10 h-10 text-indigo-400 animate-spin" /></div>
              ) : clients.length === 0 ? (
                <div className="p-20 text-center text-white/40 font-medium">Zatím žádní klienti. Začněte přidáním prvního!</div>
              ) : (
                <div className="divide-y divide-white/10">
                  {clients.map(client => (
                    <div key={client.id} className="p-8 hover:bg-white/5 transition-all group flex flex-col sm:flex-row sm:items-center justify-between gap-8">
                      <div className="flex-1 flex items-center gap-6">
                        {client.logoUrl ? (
                          <img 
                            src={client.logoUrl} 
                            alt="" 
                            className="w-14 h-14 rounded-2xl object-contain bg-white/10 p-2 border border-white/10 shadow-inner"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/20">
                            <Users className="w-6 h-6" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-4 mb-2">
                            <h3 className="text-2xl font-black text-white tracking-tight">{client.name}</h3>
                            <button 
                              onClick={() => toggleClientStatus(client.id, client.isActive)}
                              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                                client.isActive ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-white/5 text-white/40 border-white/10'
                              }`}
                            >
                              {client.isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {client.isActive ? 'Aktivní' : 'Neaktivní'}
                            </button>
                          </div>
                          <div className="flex items-center gap-6 text-xs font-bold text-indigo-300/60">
                            {client.googleDriveLink && (
                              <a href={client.googleDriveLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
                                <ExternalLink className="w-4 h-4" /> Disk
                              </a>
                            )}
                            <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {new Date(client.createdAt).toLocaleDateString('cs-CZ')}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setActiveClientForPost(client)}
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                        >
                          <Plus className="w-4 h-4" /> Příspěvek
                        </button>
                        <button 
                          onClick={() => copyLink(client.shareableLinkId)} 
                          className="p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-xl border border-white/10 transition-all active:scale-95"
                          title="Kopírovat odkaz"
                        >
                          <Copy className="w-5 h-5" />
                        </button>
                        <Link 
                          to={`/client/${client.shareableLinkId}`} 
                          className="p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-xl border border-white/10 transition-all active:scale-95"
                          title="Zobrazit kalendář"
                        >
                          <Calendar className="w-5 h-5" />
                        </Link>
                        <button 
                          onClick={() => setClientToDelete(client)} 
                          className="p-3 text-white/20 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all active:scale-95"
                          title="Smazat klienta"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Add Post Modal */}
      {activeClientForPost && (
        <AddPostModal 
          clientId={activeClientForPost.id} 
          onClose={() => setActiveClientForPost(null)} 
        />
      )}

      {/* Delete Confirmation Modal */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4"><AlertTriangle className="w-6 h-6 text-red-600" /></div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Smazat klienta?</h3>
              <p className="text-slate-500 mb-6">Opravdu chcete smazat klienta <strong className="text-slate-900">{clientToDelete.name}</strong>? Tuto akci nelze vzít zpět.</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setClientToDelete(null)} disabled={isDeleting} className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium">Zrušit</button>
                <button onClick={confirmDelete} disabled={isDeleting} className="px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl font-medium flex items-center gap-2">
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ano, smazat'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}



