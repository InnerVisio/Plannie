import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, Calendar } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err: any) {
      setError('Neplatný e-mail nebo heslo. Zkuste to prosím znovu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] bg-fixed from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-6">
      <div className="bg-white/10 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-white/20 w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-indigo-600/20">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Přihlášení pro agentury</h1>
          <p className="text-indigo-300 mt-2 text-xs uppercase tracking-widest font-bold">Zabezpečený přístup</p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-rose-500/20 border border-rose-500/30 text-rose-200 rounded-2xl text-xs font-black uppercase tracking-widest text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-black text-indigo-300 uppercase tracking-widest mb-2 ml-1">E-mailová adresa</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-white/30" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/20 focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                placeholder="admin@agency.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-indigo-300 uppercase tracking-widest mb-2 ml-1">Heslo</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-white/30" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/20 focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white font-black uppercase tracking-widest py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/20 mt-4 active:scale-95"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Přihlásit se'}
          </button>
        </form>
      </div>
    </div>
  );
}
