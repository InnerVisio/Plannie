import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Bell } from 'lucide-react';
import { useActivity } from '../../hooks/useActivity';
import { useAgencyData } from '../../hooks/useAgencyData';
import { useToast } from '../../contexts/ToastContext';
import { describeActivity } from '../../lib/activity';
import { Avatar, EmptyState } from '../ui';
import type { Activity } from '../../types';

interface NotificationPanelProps {
  onNavigateAway: () => void;
  onViewAll?: () => void;
  showHeader?: boolean;
}

export default function NotificationPanel({ onNavigateAway, onViewAll, showHeader = true }: NotificationPanelProps) {
  const { activity, unreadCount, loading, markRead, markAllRead } = useActivity();
  const { clientMap, posts } = useAgencyData();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleRowClick = async (item: Activity) => {
    await markRead(item.id);
    onNavigateAway();
    const post = posts.find((p) => p.id === item.postId);
    if (!post) {
      toast({ title: 'Příspěvek již neexistuje', variant: 'error' });
      return;
    }
    navigate(`/kalendar/${item.clientId}?post=${item.postId}`);
  };

  return (
    <div className="flex flex-col max-h-[480px]">
      {showHeader ? (
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-subtle-border">
          <h3 className="font-bold text-primary text-sm">Oznámení</h3>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead()}
              className="text-xs font-semibold text-secondary hover:text-primary transition-colors"
            >
              Označit vše jako přečtené
            </button>
          )}
        </div>
      ) : unreadCount > 0 ? (
        <div className="shrink-0 flex items-center justify-end px-4 py-2.5 border-b border-subtle-border">
          <button
            onClick={() => markAllRead()}
            className="text-xs font-semibold text-secondary hover:text-primary transition-colors"
          >
            Označit vše jako přečtené
          </button>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="p-4 text-sm text-muted">Načítání…</div>
        ) : activity.length === 0 ? (
          <div className="p-2">
            <EmptyState icon={Bell} title="Žádná oznámení" description="Aktivita klientů se zobrazí zde." />
          </div>
        ) : (
          activity.map((item) => {
            const unread = !item.readAt;
            const client = clientMap[item.clientId];
            const text = describeActivity(item);
            return (
              <button
                key={item.id}
                onClick={() => handleRowClick(item)}
                className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b border-subtle-border transition-colors hover:bg-hover ${unread ? 'bg-subtle' : ''}`}
              >
                <span className="relative shrink-0 mt-0.5">
                  <Avatar src={client?.logoUrl} name={client?.name ?? item.clientName} size="sm" />
                  {unread && (
                    <span
                      className="absolute -top-0.5 -left-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[var(--bg-surface)]"
                      style={{ background: 'var(--status-revision-fg)' }}
                    />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-primary leading-snug">{text}</p>
                  {item.type === 'comment' && item.preview && (
                    <p className="text-xs text-secondary mt-0.5 line-clamp-2">{item.preview}</p>
                  )}
                </div>
                <span className="text-[11px] text-muted shrink-0 whitespace-nowrap mt-0.5">
                  {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: cs })}
                </span>
              </button>
            );
          })
        )}
      </div>

      {onViewAll && (
        <div className="shrink-0 border-t border-subtle-border p-2">
          <button
            onClick={onViewAll}
            className="w-full text-center text-sm font-semibold text-secondary hover:text-primary py-2 rounded-[var(--radius-field)] hover:bg-hover transition-colors"
          >
            Zobrazit vše
          </button>
        </div>
      )}
    </div>
  );
}
