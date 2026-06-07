import { cn } from '@/lib/cn';

type Tone = 'idle' | 'loading' | 'ok' | 'warn' | 'error' | 'info';

interface StatusPillProps {
  tone: Tone;
  children: React.ReactNode;
  pulse?: boolean;
  className?: string;
}

const tones: Record<Tone, string> = {
  idle: 'bg-ink-700 text-ink-300 border-ink-600',
  loading: 'bg-amber-500/10 text-amber-300 border-amber-500/40',
  ok: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40',
  warn: 'bg-amber-500/10 text-amber-300 border-amber-500/40',
  error: 'bg-rose-500/10 text-rose-300 border-rose-500/40',
  info: 'bg-accent-500/10 text-accent-300 border-accent-500/40',
};

export function StatusPill({ tone, children, pulse, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        'pill border',
        tones[tone],
        className,
      )}
    >
      <span
        className={cn(
          'inline-block h-1.5 w-1.5 rounded-full',
          {
            'bg-ink-400': tone === 'idle',
            'bg-amber-400': tone === 'loading' || tone === 'warn',
            'bg-emerald-400': tone === 'ok',
            'bg-rose-400': tone === 'error',
            'bg-accent-400': tone === 'info',
          },
          pulse && 'animate-pulse',
        )}
      />
      {children}
    </span>
  );
}
