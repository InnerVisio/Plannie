import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useActivity } from '../../hooks/useActivity';
import { ThemeToggleButton } from './ThemeToggle';
import NotificationPanel from './NotificationPanel';
import Avatar from '../ui/Avatar';
import IconButton from '../ui/IconButton';
import Modal from '../ui/Modal';
import { Settings, LogOut, Bell } from 'lucide-react';

const PAGE_TITLES: Record<string, string> = {
  '/prehled': 'Přehled',
  '/klienti': 'Klienti',
  '/kalendar': 'Kalendář',
  '/analytika': 'Analytika',
  '/obsah': 'Obsah',
  '/aktivita': 'Aktivita',
  '/nastaveni': 'Nastavení',
};

const getPageTitle = (pathname: string) => {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith('/kalendar')) return 'Kalendář';
  return 'Plannie';
};

export default function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { unreadCount } = useActivity();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', escHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', escHandler);
    };
  }, [notifOpen]);

  const email = currentUser?.email ?? '';

  return (
    <header className="hidden lg:flex h-16 items-center justify-between px-6 border-b border-subtle-border bg-app/80 backdrop-blur-xl sticky top-0 z-30">
      <h1 className="text-[22px] font-bold tracking-tight text-primary">{getPageTitle(location.pathname)}</h1>
      <div className="flex items-center gap-3">
        <div className="relative" ref={notifRef}>
          <span className="relative inline-flex">
            <IconButton icon={Bell} label="Oznámení" variant="ghost" onClick={() => setNotifOpen((v) => !v)} />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold grid place-items-center pointer-events-none"
                style={{ background: 'var(--status-revision-bg)', color: 'var(--status-revision-fg)' }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </span>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-[380px] bg-surface border border-subtle-border rounded-[var(--radius-panel)] shadow-[var(--shadow-pop)] overflow-hidden anim-pop z-40">
              <NotificationPanel
                onNavigateAway={() => setNotifOpen(false)}
                onViewAll={() => { setNotifOpen(false); navigate('/aktivita'); }}
              />
            </div>
          )}
        </div>
        <ThemeToggleButton />
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full hover:bg-hover transition-colors p-1 pr-3"
          >
            <Avatar name={email || 'A'} size="sm" />
            <span className="text-sm font-semibold text-primary max-w-[160px] truncate">{email}</span>
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-surface border border-subtle-border rounded-[var(--radius-field)] shadow-[var(--shadow-pop)] py-1.5 anim-pop z-40">
              <button
                onClick={() => { setMenuOpen(false); navigate('/nastaveni'); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-secondary hover:bg-hover hover:text-primary transition-colors"
              >
                <Settings className="w-4 h-4" /> Nastavení
              </button>
              <button
                onClick={() => signOut(auth)}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-secondary hover:bg-hover hover:text-primary transition-colors"
              >
                <LogOut className="w-4 h-4" /> Odhlásit se
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export function MobileTopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useActivity();
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <header className="lg:hidden flex items-center justify-between h-14 px-4 border-b border-subtle-border bg-app/80 backdrop-blur-xl sticky top-0 z-30 pt-[env(safe-area-inset-top)]">
      <h1 className="text-lg font-bold tracking-tight text-primary truncate">{getPageTitle(location.pathname)}</h1>
      <div className="flex items-center gap-1.5">
        <span className="relative inline-flex">
          <IconButton icon={Bell} label="Oznámení" variant="ghost" size="sm" onClick={() => setNotifOpen(true)} />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold grid place-items-center pointer-events-none"
              style={{ background: 'var(--status-revision-bg)', color: 'var(--status-revision-fg)' }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </span>
        <ThemeToggleButton />
      </div>

      <Modal open={notifOpen} onClose={() => setNotifOpen(false)} title="Oznámení" size="md">
        <div className="-m-5 sm:-m-6">
          <NotificationPanel
            showHeader={false}
            onNavigateAway={() => setNotifOpen(false)}
            onViewAll={() => { setNotifOpen(false); navigate('/aktivita'); }}
          />
        </div>
      </Modal>
    </header>
  );
}
