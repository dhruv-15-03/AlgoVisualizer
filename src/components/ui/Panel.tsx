import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface PanelProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  noBody?: boolean;
}

export function Panel({ title, subtitle, right, children, className, bodyClassName, noBody }: PanelProps) {
  return (
    <section className={cn('panel flex min-h-0 flex-col', className)}>
      {title && (
        <header className="panel-header flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="flex min-w-0 items-center gap-1.5 truncate text-sm font-semibold text-ink-100">{title}</h2>
            {subtitle && <div className="mt-0.5 text-xs text-ink-400">{subtitle}</div>}
          </div>
          {right && <div className="shrink-0">{right}</div>}
        </header>
      )}
      {noBody ? (
        children
      ) : (
        <div className={cn('min-h-0 flex-1 p-3', bodyClassName)}>{children}</div>
      )}
    </section>
  );
}
