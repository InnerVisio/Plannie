import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  CalendarDays, LayoutDashboard, Users, CalendarRange, BarChart3, Settings, LogOut,
  PanelLeftClose, PanelLeftOpen, LayoutList, Bell, MessageSquare, type LucideIcon,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { useAgencyData } from '../../hooks/useAgencyData';
import { useComments } from '../../hooks/useComments';
import { cn } from '../../lib/cn';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

const MAIN_ITEMS: NavItem[] = [
  { to: '/prehled', label: 'Přehled', icon: LayoutDashboard },
  { to: '/klienti', label: 'Klienti', icon: Users },
];

const CONTENT_ITEMS: NavItem[] = [
  { to: '/kalendar', label: 'Kalendář', icon: CalendarRange },
  { to: '/obsah', label: 'Obsah', icon: LayoutList },
  { to: '/komentare', label: 'Komentáře', icon: MessageSquare },
  { to: '/analytika', label: 'Analytika', icon: BarChart3 },
  { to: '/aktivita', label: 'Aktivita', icon: Bell },
];

const STORAGE_KEY = 'plannie-sidebar-collapsed';

const readCollapsed = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

function NavRow({ item, collapsed }: { item: NavItem; collapsed: boolean; key?: React.Key }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 h-11 rounded-full transition-colors font-semibold text-sm',
          collapsed ? 'justify-center px-0 w-11 mx-auto' : 'px-3',
          isActive
            ? 'bg-accent text-accent-fg'
            : 'text-secondary hover:bg-hover hover:text-primary'
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
              isActive ? 'bg-accent-fg/15' : 'bg-subtle'
            )}
          >
            <Icon className="w-4 h-4" />
          </span>
          {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
          {!collapsed && !!item.badge && (
            <span className="shrink-0 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-[var(--status-revision-bg)] text-[var(--status-revision-fg)] text-[11px] font-bold">
              {item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const { counts } = useAgencyData();
  const { totalUnresolved } = useComments();

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  };

  const mainItems = MAIN_ITEMS.map((item) =>
    item.to === '/prehled' ? { ...item, badge: counts.needsAction + counts.overdue } : item
  );

  const contentItems = CONTENT_ITEMS.map((item) =>
    item.to === '/komentare' ? { ...item, badge: totalUnresolved } : item
  );

  return (
    <aside
      className={cn(
        'hidden lg:flex shrink-0 bg-app border-r border-subtle-border flex-col h-dvh sticky top-0 transition-[width] duration-200',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}
    >
      <div className={cn('flex items-center gap-3 h-16 px-4 shrink-0', collapsed && 'justify-center px-0')}>
        <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shrink-0">
          <CalendarDays className="w-[18px] h-[18px] text-accent-fg" />
        </div>
        {!collapsed && <span className="font-extrabold tracking-tight text-lg text-primary">Plannie</span>}
      </div>

      <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-4">
        {!collapsed && (
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted px-3 mb-2 mt-2">Menu</p>
        )}
        <div className="space-y-1">
          {mainItems.map((item) => (
            <NavRow key={item.to} item={item} collapsed={collapsed} />
          ))}
        </div>

        {!collapsed && (
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted px-3 mb-2 mt-6">Obsah</p>
        )}
        <div className={cn('space-y-1', collapsed && 'mt-6')}>
          {contentItems.map((item) => (
            <NavRow key={item.to} item={item} collapsed={collapsed} />
          ))}
        </div>
      </nav>

      <div className="px-3 pb-4 pt-2 border-t border-subtle-border space-y-1">
        <NavRow item={{ to: '/nastaveni', label: 'Nastavení', icon: Settings }} collapsed={collapsed} />
        <button
          onClick={() => signOut(auth)}
          title={collapsed ? 'Odhlásit se' : undefined}
          className={cn(
            'w-full flex items-center gap-3 h-11 rounded-full transition-colors font-semibold text-sm text-secondary hover:bg-hover hover:text-primary',
            collapsed ? 'justify-center px-0 w-11 mx-auto' : 'px-3'
          )}
        >
          <span className="w-8 h-8 rounded-full bg-subtle flex items-center justify-center shrink-0">
            <LogOut className="w-4 h-4" />
          </span>
          {!collapsed && <span className="flex-1 truncate text-left">Odhlásit se</span>}
        </button>
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Rozbalit postranní panel' : 'Sbalit postranní panel'}
          title={collapsed ? 'Rozbalit' : 'Sbalit'}
          className={cn(
            'w-full flex items-center gap-3 h-9 rounded-full transition-colors text-muted hover:bg-hover hover:text-secondary mt-1',
            collapsed ? 'justify-center px-0 w-11 mx-auto' : 'px-3'
          )}
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          {!collapsed && <span className="text-xs font-semibold">Sbalit</span>}
        </button>
      </div>
    </aside>
  );
}
