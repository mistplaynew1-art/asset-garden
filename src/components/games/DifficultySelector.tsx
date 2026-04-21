import { DIFFICULTIES, type Difficulty } from '@/lib/difficulty';
import { playSound } from '@/lib/sounds';

interface Props {
  value: Difficulty;
  onChange: (d: Difficulty) => void;
  disabled?: boolean;
}

export default function DifficultySelector({ value, onChange, disabled }: Props) {
  const current = DIFFICULTIES.find(d => d.id === value) ?? DIFFICULTIES[1];
  return (
    <div className="p-4 rounded-xl bg-surface border border-border space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold font-display text-muted-foreground uppercase tracking-wider">Difficulty</label>
        <span className={`text-[10px] font-mono font-bold uppercase ${current.color}`}>{current.volatility}</span>
      </div>
      <div className="grid grid-cols-5 gap-1">
        {DIFFICULTIES.map(d => {
          const active = d.id === value;
          return (
            <button
              key={d.id}
              type="button"
              disabled={disabled}
              onClick={() => { onChange(d.id); playSound('click'); }}
              className={[
                'flex flex-col items-center gap-0.5 py-2 rounded-lg text-[10px] font-bold border transition-all',
                active
                  ? `${d.bg} ${d.color} border-transparent ring-2 ${d.ring} scale-[1.03]`
                  : 'bg-void border-border text-muted-foreground hover:text-foreground',
                disabled ? 'opacity-50 cursor-not-allowed' : '',
              ].join(' ')}
              title={`${d.label} — ${d.volatility} volatility`}
            >
              <span className="text-sm leading-none">{d.emoji}</span>
              <span className="leading-none">{d.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
