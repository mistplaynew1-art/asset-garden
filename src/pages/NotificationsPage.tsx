import { Bell, X, CheckCheck, Trash2 } from 'lucide-react';
import { useNotifications, NOTIFICATION_ICON, relativeTime } from '@/stores/notifications-store';

export default function NotificationsPage() {
  const items = useNotifications((s) => s.items);
  const markAllRead = useNotifications((s) => s.markAllRead);
  const dismiss = useNotifications((s) => s.dismiss);
  const markRead = useNotifications((s) => s.markRead);
  const clear = useNotifications((s) => s.clear);

  const unread = items.filter((i) => !i.read).length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-6 h-6 text-primary" />
          <h1 className="font-display font-extrabold text-2xl text-foreground">Notifications</h1>
          {unread > 0 && (
            <span className="ml-2 inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              {unread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={markAllRead}
            disabled={unread === 0}
            className="text-xs font-bold text-primary hover:underline disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
          >
            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
          </button>
          <button
            onClick={clear}
            disabled={items.length === 0}
            className="text-xs font-bold text-muted-foreground hover:text-destructive disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear all
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((n) => {
          const Icon = NOTIFICATION_ICON[n.type] ?? Bell;
          return (
            <div
              key={n.id}
              onClick={() => !n.read && markRead(n.id)}
              className={`p-4 rounded-xl border flex items-start gap-3 transition-all cursor-pointer ${
                n.read ? 'bg-surface border-border' : 'bg-primary/5 border-primary/20 hover:border-primary/40'
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${n.read ? 'bg-elevated' : 'bg-primary/10'}`}>
                <Icon className={`w-4 h-4 ${n.read ? 'text-muted-foreground' : 'text-primary'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-sm text-foreground">{n.title}</div>
                <div className="text-xs text-muted-foreground">{n.desc}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{relativeTime(n.createdAt)}</div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismiss(n.id);
                }}
                className="p-1 rounded hover:bg-elevated"
                aria-label="Dismiss"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No notifications</p>
          </div>
        )}
      </div>
    </div>
  );
}
