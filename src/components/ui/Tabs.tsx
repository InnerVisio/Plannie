import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

interface TabItem {
  value: string;
  label: string;
  icon?: LucideIcon;
}

interface TabsProps {
  value: string;
  onChange: (v: string) => void;
  items: TabItem[];
  size?: 'sm' | 'md';
  className?: string;
}

export default function Tabs({ value, onChange, items, size = 'md', className }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn('inline-flex bg-subtle rounded-full p-1 gap-0.5', className)}
    >
      {items.map((item) => {
        const active = item.value === value;
        const Icon = item.icon;
        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              'flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition-colors',
              size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-4 text-sm',
              active ? 'bg-surface text-primary shadow-[var(--shadow-card)]' : 'text-secondary hover:text-primary'
            )}
          >
            {Icon && <Icon className="w-4 h-4" />}
            <span className={cn(Icon && 'hidden sm:inline')}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
