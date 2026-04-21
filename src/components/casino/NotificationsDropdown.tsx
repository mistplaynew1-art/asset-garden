import { forwardRef, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, X, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications, NOTIFICATION_ICON, relativeTime, type NotificationType } from '@/stores/notifications-store';
import { playSound } from '@/lib/sounds';

const TYPE_COLORS: Record<NotificationType, string> = {
  promo: 'text-glow-gold bg-neon-gold/10',
  win: 'text-glow-green bg-neon-green/10',
  security: 'text-glow-red bg-neon-red/10',
  wallet: 'text-glow-blue bg-neon-blue/10',
  system: 'text-muted-foreground bg-elevated',
  deposit: 'text-glow-green bg-neon-green/10',
  withdrawal: 'text-glow-blue bg-neon-blue/10',
  bonus: 'text-glow-gold bg-neon-gold/10',
};

const NotificationsDropdown = forwardRef<HTMLDivElement>((_props, _forwardedRef) => {
  const items = useNotifications((s) => s.items);
  const markRead = useNotifications((s) => s.markRead);
  const markAllRead = useNotifications((s) => s.markAllRead);
  const dismiss = useNotifications((s) => s.dismiss);
  const unread = items.filter((i) => !i.read).length;

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const recent = items.slice(0, 8);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen((o) => !o); playSound('click'); }}
        className="relative p-2 rounded-lg hover:bg-elevated transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-neon-red text-[9px] font-bold text-foreground flex items-center justify-center animate-pulse-neon">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-[360px] max-w-[calc(100vw-1rem)] bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <h3 className="font-display font-bold text-sm text-foreground">Notifications</h3>
                {unread > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/15 text-primary">{unread} new</span>
                )}
              </div>
              {unread > 0 && (
                <button
                  onClick={() => markAllRead()}
                  className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              {recent.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <div className="text-xs text-muted-foreground">No notifications yet</div>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {recent.map((n) => {
                    const Icon = NOTIFICATION_ICON[n.type];
                    return (
                      <div
                        key={n.id}
                        className={`relative px-4 py-3 hover:bg-elevated/50 transition-colors group ${
                          !n.read ? 'bg-primary/[0.03]' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${TYPE_COLORS[n.type]}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="font-bold text-xs text-foreground truncate">{n.title}</div>
                              {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.desc}</div>
                            <div className="text-[10px] text-muted-foreground/70 mt-1">{relativeTime(n.createdAt)}</div>
                          </div>
                          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!n.read && (
                              <button
                                onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                                className="p-1 rounded hover:bg-elevated text-muted-foreground hover:text-foreground"
                                aria-label="Mark read"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                              className="p-1 rounded hover:bg-elevated text-muted-foreground hover:text-glow-red"
                              aria-label="Dismiss"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center py-3 text-xs font-bold text-primary hover:bg-elevated border-t border-border transition-colors"
            >
              View all notifications →
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
NotificationsDropdown.displayName = 'NotificationsDropdown';
export default NotificationsDropdown;
