/**
 * WorkspaceTabBar — three-tab navigation for mobile / tablet workspace layout.
 * Hidden at `xl+` where we render the three panels side-by-side instead.
 */

import type { WorkspacePane } from './workspace-pane';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

const TABS: ReadonlyArray<{ id: WorkspacePane; label: string; icon: string }> = [
  { id: 'viz', label: 'Visualize', icon: 'insights' },
  { id: 'code', label: 'Code', icon: 'code' },
  { id: 'tune', label: 'Tune', icon: 'tune' },
];

interface WorkspaceTabBarProps {
  value: WorkspacePane;
  onChange: (pane: WorkspacePane) => void;
}

export function WorkspaceTabBar({ value, onChange }: WorkspaceTabBarProps) {
  return (
    <div
      role="tablist"
      aria-label="Workspace panes"
      className="flex shrink-0 border-b border-ink-700 bg-ink-800/40"
    >
      {TABS.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 border-b-2 px-2 py-2.5 text-xs font-medium transition-colors sm:text-sm',
              active
                ? 'border-accent-400 text-accent-200'
                : 'border-transparent text-ink-400 hover:bg-ink-800/60 hover:text-ink-200',
            )}
          >
            <Icon name={t.icon} size={18} weight={active ? 500 : 400} />
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
