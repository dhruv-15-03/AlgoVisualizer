export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function formatNumber(n: number, digits = 3): string {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 10000 || (Math.abs(n) > 0 && Math.abs(n) < 0.001)) {
    return n.toExponential(2);
  }
  return n.toFixed(digits);
}

export function debounce<T extends (...args: never[]) => unknown>(
  fn: T,
  ms: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export const palette = [
  '#7c93ff',
  '#4ade80',
  '#facc15',
  '#f87171',
  '#c084fc',
  '#22d3ee',
  '#f59e0b',
  '#ec4899',
];

export function colorFor(index: number): string {
  return palette[index % palette.length];
}

export function range(start: number, stop?: number, step = 1): number[] {
  if (stop === undefined) {
    stop = start;
    start = 0;
  }
  const out: number[] = [];
  for (let i = start; i < stop; i += step) out.push(i);
  return out;
}
