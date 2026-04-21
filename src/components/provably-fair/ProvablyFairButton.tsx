/**
 * Tiny lock button shown next to every game title.
 * Opens the global Provably Fair modal.
 */
import { useState } from 'react';
import { Lock } from 'lucide-react';
import ProvablyFairModal from './ProvablyFairModal';

interface ProvablyFairButtonProps {
  gameId?: string;
  className?: string;
}

export default function ProvablyFairButton({ gameId, className = '' }: ProvablyFairButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open Provably Fair"
        title="Verify this round is fair"
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-elevated border border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors ${className}`}
      >
        <Lock className="w-3 h-3" /> Verify
      </button>
      <ProvablyFairModal open={open} onClose={() => setOpen(false)} gameId={gameId} />
    </>
  );
}
