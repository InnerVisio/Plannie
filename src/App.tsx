/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { Calendar, LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import AdminDashboard from './pages/AdminDashboard';
import MasterDashboard from './pages/MasterDashboard';
import ClientCalendar from './pages/ClientCalendar';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" />;
  return <>{children}</>;
};

const Navigation = () => {
  const { currentUser } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  
  if (!currentUser) return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <nav className="bg-slate-900/80 backdrop-blur-2xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto w-full px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-white/10">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight text-white">Plannie</span>
          </div>
        
        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-2">
          <Link 
            to="/master" 
            className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg flex items-center gap-2 transition-all duration-300 ${
              isActive('/master') 
                ? 'bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)]' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Přehled
          </Link>
          <Link 
            to="/" 
            className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg flex items-center gap-2 transition-all duration-300 ${
              isActive('/') 
                ? 'bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)]' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Administrace
          </Link>
          <div className="w-px h-6 bg-white/10 mx-2" />
          <button 
            onClick={() => signOut(auth)} 
            className="px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg flex items-center gap-2 transition-all duration-300"
          >
            <LogOut className="w-4 h-4" />
            Odhlásit se
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[73px] z-40 bg-slate-900/95 backdrop-blur-3xl border-t border-white/5 animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col p-4 gap-2">
            <Link 
              to="/master" 
              onClick={() => setIsMobileMenuOpen(false)}
              className={`p-4 text-sm font-black uppercase tracking-widest rounded-xl flex items-center gap-3 transition-all ${
                isActive('/master') ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              Hlavní přehled
            </Link>
            <Link 
              to="/" 
              onClick={() => setIsMobileMenuOpen(false)}
              className={`p-4 text-sm font-black uppercase tracking-widest rounded-xl flex items-center gap-3 transition-all ${
                isActive('/') ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              Administrace
            </Link>
            <div className="h-px w-full bg-white/10 my-2" />
            <button 
              onClick={() => {
                setIsMobileMenuOpen(false);
                signOut(auth);
              }} 
              className="p-4 text-sm font-black uppercase tracking-widest text-rose-400 hover:bg-rose-500/10 rounded-xl flex items-center gap-3 transition-all text-left"
            >
              <LogOut className="w-5 h-5" />
              Odhlásit se
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="h-screen flex flex-col bg-slate-900 font-sans selection:bg-indigo-500/30 overflow-hidden">
          <Navigation />
          
          <main className="flex-1 min-h-0 flex flex-col overflow-y-auto scroll-smooth custom-scrollbar">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/master" 
                element={
                  <ProtectedRoute>
                    <MasterDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route path="/client/:shareableLinkId" element={<ClientCalendar />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}


