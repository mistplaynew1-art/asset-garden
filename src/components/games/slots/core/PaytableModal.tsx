/**
 * PaytableModal — slide-up modal showing per-symbol payouts.
 *
 * Each themed slot supplies its own entries (image, name, payout strings) so
 * this component stays generic.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { forwardRef } from 'react';

export interface PaytableEntry {
  id: string;
  name: string;
  imageUrl: string;
  payouts: string[];   // e.g. ["3× = 0.5×", "4× = 1.5×", "5× = 5×"]
  description?: string;
}

export interface PaytableModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  entries: PaytableEntry[];
  rules: string[];
}

const PaytableModal = forwardRef<HTMLDivElement, PaytableModalProps>(function PaytableModal(
  { open, onClose, title, entries, rules },
  ref,
) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-background border-2 border-yellow-400/50 shadow-2xl"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-yellow-400/30 bg-background/95 backdrop-blur">
              <h2 className="font-display font-extrabold text-lg text-yellow-300 tracking-wider">{title}</h2>
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
                aria-label="Close paytable"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-2">
              {entries.map(e => (
                <div
                  key={e.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-surface/60 hover:bg-surface border border-border transition"
                >
                  <div className="h-12 w-12 flex-shrink-0 flex items-center justify-center rounded bg-black/40">
                    <img src={e.imageUrl} alt={e.name} className="max-h-11 max-w-11 object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-foreground capitalize">{e.name}</div>
                    {e.description && (
                      <div className="text-[10px] text-muted-foreground leading-tight">{e.description}</div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-1">
                      {e.payouts.map((p, i) => (
                        <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-yellow-400/10 text-yellow-200 border border-yellow-400/20">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-4 pb-5 pt-2 border-t border-border">
              <div className="text-[11px] uppercase font-bold text-yellow-300 tracking-wider mb-1">How to win</div>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {rules.map((r, i) => <li key={i}>• {r}</li>)}
              </ul>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default PaytableModal;
