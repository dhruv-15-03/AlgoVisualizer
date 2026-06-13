import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useSessionStore } from '@/stores/session-store';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useFamilyTheme } from '@/hooks/useFamilyTheme';
import { generateConfetti } from '@/lib/confetti';

interface Burst {
  seed: number;
}

/**
 * Convergence celebration overlay. Mounts inside the viz container (which must be
 * `relative`) and fires a one-shot glow + confetti burst + "Converged ✓" pill on
 * the rising edge into `runStatus === 'success'`.
 *
 * Fully gated by `prefers-reduced-motion`: when motion is reduced it shows only a
 * brief static badge — no confetti, no transforms, no transitions. Decorative, so
 * the overlay is `aria-hidden` and `pointer-events-none` and never blocks the viz.
 */
export function ConvergenceCelebration() {
  const runStatus = useSessionStore((s) => s.runStatus);
  const reduceMotion = usePrefersReducedMotion();
  const { palette } = useFamilyTheme();

  const [burst, setBurst] = useState<Burst | null>(null);
  const prevStatus = useRef(runStatus);

  useEffect(() => {
    const wasSuccess = prevStatus.current === 'success';
    prevStatus.current = runStatus;
    if (runStatus === 'success' && !wasSuccess) {
      setBurst({ seed: (Date.now() >>> 0) % 100000 || 1 });
    }
  }, [runStatus]);

  useEffect(() => {
    if (!burst) return;
    const t = window.setTimeout(() => setBurst(null), reduceMotion ? 1500 : 2200);
    return () => window.clearTimeout(t);
  }, [burst, reduceMotion]);

  if (!burst) return null;

  const colors = palette
    ? [palette.solid.hex, palette.accent.hex, palette.text.hex, '#4ade80', '#fcd34d']
    : undefined;

  const pieces = reduceMotion ? [] : generateConfetti({ seed: burst.seed, count: 30, colors });

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
    >
      {!reduceMotion && (
        <div
          className="animate-celebrate-glow absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 38%, rgb(var(--family-accent-rgb) / 0.28), transparent 62%)',
          }}
        />
      )}

      {pieces.map((p) => (
        <span
          key={p.id}
          className="animate-confetti-fall absolute top-0 block rounded-[1px]"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}ms`,
            animationDuration: `${p.duration}ms`,
            ['--cx' as string]: `${p.dx}px`,
            ['--cy' as string]: `${p.dy}px`,
            ['--cr' as string]: `${p.rotate}deg`,
          } as React.CSSProperties}
        />
      ))}

      <div className="absolute left-1/2 top-4 -translate-x-1/2">
        <div
          className={
            'inline-flex items-center gap-1.5 rounded-full border border-family-accent/40 bg-ink-900/85 px-3 py-1 text-xs font-semibold text-family-text shadow-lg shadow-ink-900/40 backdrop-blur ' +
            (reduceMotion ? '' : 'animate-converge-pop')
          }
        >
          <Icon name="check_circle" size={14} fill />
          Converged
        </div>
      </div>
    </div>
  );
}
