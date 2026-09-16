import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, CalendarRange, MoreHorizontal, BarChart3, Settings, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { useAgencyData } from '../../hooks/useAgencyData';
import { cn } from '../../lib/cn';
import Modal from '../ui/Modal';
import { ThemeToggleTabs } from './ThemeToggle';

const TABS = [
  { to: '/prehled', label: 'Přehled', icon: LayoutDashboard },
  { to: '/klienti', label: 'Klienti', icon: Users },
  { to: '/kalendar', label: 'Kalendář', icon: CalendarRange },
];

export default function MobileTabBar() {
  const [moreOpen, setMoreOpen] = useState(false);
  const { counts } = useAgencyData();
  const navigate = useNavigate();

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-xl border-t border-subtle-border pb-[env(safe-area-inset-bottom)]">
        <div className="h-16 grid grid-cols-4">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const badge = tab.to === '/prehled' ? counts.needsAction + counts.overdue : 0;
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className="flex flex-col items-center justify-center gap-1 relative"
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center relative',
                        isActive ? 'bg-accent text-accent-fg' : 'text-muted'
                      )}
                    >
                      <Icon className="w-[18px] h-[18px]" />
                      {!!badge && (
                        <span className="absolute -top-1 -right-1 flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-[var(--status-revision-bg)] text-[var(--status-revision-fg)] text-[9px] font-bold">
                          {badge}
                        </span>
                      )}
                    </span>
                    <span className={cn('text-[10px] font-semibold', isActive ? 'text-primary' : 'text-muted')}>
                      {tab.label}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
          <button onClick={() => setMoreOpen(true)} className="flex flex-col items-center justify-center gap-1">
            <span className="w-9 h-9 rounded-full flex items-center justify-center text-muted">
              <MoreHorizontal className="w-[18px] h-[18px]" />
            </span>
            <span className="text-[10px] font-semibold text-muted">Více</span>
          </button>
        </div>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="Více" size="sm">
        <div className="space-y-4">
          <button
            onClick={() => { setMoreOpen(false); navigate('/analytika'); }}
            className="w-full flex items-center gap-3 h-12 px-3 rounded-[var(--radius-field)] hover:bg-hover transition-colors text-left"
          >
            <span className="w-9 h-9 rounded-full bg-subtle flex items-center justify-center shrink-0 text-secondary">
              <BarChart3 className="w-4 h-4" />
            </span>
            <span className="font-semibold text-primary text-sm">Analytika</span>
          </button>
          <button
            onClick={() => { setMoreOpen(false); navigate('/nastaveni'); }}
            className="w-full flex items-center gap-3 h-12 px-3 rounded-[var(--radius-field)] hover:bg-hover transition-colors text-left"
          >
            <span className="w-9 h-9 rounded-full bg-subtle flex items-center justify-center shrink-0 text-secondary">
              <Settings className="w-4 h-4" />
            </span>
            <span className="font-semibold text-primary text-sm">Nastavení</span>
          </button>
          <button
            onClick={() => signOut(auth)}
            className="w-full flex items-center gap-3 h-12 px-3 rounded-[var(--radius-field)] hover:bg-hover transition-colors text-left"
          >
            <span className="w-9 h-9 rounded-full bg-subtle flex items-center justify-center shrink-0 text-secondary">
              <LogOut className="w-4 h-4" />
            </span>
            <span className="font-semibold text-primary text-sm">Odhlásit se</span>
          </button>

          <div className="pt-2 border-t border-subtle-border">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-2">Vzhled</p>
            <ThemeToggleTabs />
          </div>
        </div>
      </Modal>
    </>
  );
}
