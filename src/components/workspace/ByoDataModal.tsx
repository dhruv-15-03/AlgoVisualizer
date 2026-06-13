import { useCallback, useMemo, useRef, useState } from 'react';
import { useSessionStore } from '@/stores/session-store';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { csvToDataset, type CsvTask } from '@/lib/csv-dataset';
import { drawnPointsToDataset, type DrawnPoint } from '@/lib/draw-points';
import type { ByoSupport } from '@/lib/byo-support';
import type { Dataset } from '@/types/dataset';

interface ByoDataModalProps {
  support: ByoSupport;
  onClose: () => void;
}

type Tab = 'csv' | 'draw';

const TASK_LABEL: Record<CsvTask, string> = {
  classification: 'Classification',
  regression: 'Regression',
  clustering: 'Clustering',
};

/** Distinct, color-blind-friendly palette for drawn classes. */
const CLASS_COLORS = ['#60a5fa', '#f472b6', '#34d399', '#fbbf24', '#a78bfa', '#fb7185'];

/**
 * BYO data modal — lets the user supply a custom dataset for the current
 * algorithm via CSV upload or a 2D draw-points canvas. On success the dataset
 * is registered in the session store and selected, flowing through the same
 * pathway as built-in datasets.
 */
export function ByoDataModal({ support, onClose }: ByoDataModalProps) {
  const initialTab: Tab = support.csv ? 'csv' : 'draw';
  const [tab, setTab] = useState<Tab>(initialTab);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Trap focus inside the dialog while it's open: focus moves in on mount,
  // Tab/Shift+Tab wrap, Escape closes, and focus returns to the invoker on close.
  useFocusTrap(dialogRef, { active: true, onClose });

  const addCustomDataset = useSessionStore((s) => s.addCustomDataset);
  const setDataset = useSessionStore((s) => s.setDataset);

  const commit = useCallback(
    (ds: Dataset) => {
      addCustomDataset(ds);
      setDataset(ds.id);
      onClose();
    },
    [addCustomDataset, setDataset, onClose],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="byo-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-ink-700 bg-ink-800 shadow-2xl focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-ink-700 px-4 py-3">
          <h2 id="byo-title" className="flex items-center gap-2 text-sm font-semibold text-ink-50">
            <Icon name="upload_file" size={18} />
            Use your own data
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="touch-target grid place-items-center rounded-md text-ink-400 hover:text-ink-100"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {support.draw && (
          <div className="flex gap-1 border-b border-ink-700 px-4 pt-3" role="tablist" aria-label="Data source">
            <TabButton active={tab === 'csv'} onClick={() => setTab('csv')} icon="upload_file" label="Upload CSV" />
            <TabButton active={tab === 'draw'} onClick={() => setTab('draw')} icon="draw" label="Draw points" />
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto p-4">
          {tab === 'csv' ? (
            <CsvTab tasks={support.tasks} onCommit={commit} />
          ) : (
            <DrawTab tasks={support.tasks} onCommit={commit} />
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-t-md border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
        active
          ? 'border-accent-400 text-accent-200'
          : 'border-transparent text-ink-400 hover:text-ink-200'
      }`}
    >
      <Icon name={icon} size={16} />
      {label}
    </button>
  );
}

/* ---------------------------------------------------------------- CSV tab -- */

function CsvTab({ tasks, onCommit }: { tasks: CsvTask[]; onCommit: (d: Dataset) => void }) {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [task, setTask] = useState<CsvTask>(tasks[0]);
  const [labelColumn, setLabelColumn] = useState('last');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = useCallback((file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setText(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => setError('Could not read that file.');
    reader.readAsText(file);
  }, []);

  const onUse = useCallback(() => {
    setError('');
    const ts = Date.now();
    const label =
      task === 'clustering'
        ? null
        : labelColumn.trim().toLowerCase() === 'last'
          ? ('last' as const)
          : Number.parseInt(labelColumn, 10) - 1; // 1-based in the UI
    const result = csvToDataset(text, {
      id: `custom:csv:${ts}`,
      name: fileName ? `CSV · ${fileName}` : 'CSV dataset',
      task,
      labelColumn: label,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onCommit(result.dataset);
  }, [text, task, labelColumn, fileName, onCommit]);

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-400">
        Feature columns must be numeric. A header row is auto-detected. Max 5000 rows × 64 columns.
      </p>

      <div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          aria-label="CSV file"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
          <Icon name="upload_file" size={16} />
          <span>Choose CSV file…</span>
        </Button>
        {fileName && <span className="ml-2 text-xs text-ink-300">{fileName}</span>}
      </div>

      <label className="block">
        <span className="mb-1 block text-[11px] uppercase tracking-wide text-ink-400">Or paste CSV</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          aria-label="CSV text"
          placeholder={'x1,x2,label\n0.2,1.4,A\n1.1,0.3,B'}
          className="w-full rounded-md border border-ink-600 bg-ink-900 px-2 py-1.5 font-mono text-xs text-ink-100 focus:outline-none focus:ring-2 focus:ring-accent-400"
        />
      </label>

      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-[11px] uppercase tracking-wide text-ink-400">Task</span>
          <Select
            value={task}
            options={tasks.map((t) => ({ value: t, label: TASK_LABEL[t] }))}
            onChange={(e) => setTask(e.target.value as CsvTask)}
            aria-label="Dataset task"
          />
        </label>
        {task !== 'clustering' && (
          <label className="block">
            <span className="mb-1 block text-[11px] uppercase tracking-wide text-ink-400">Label column</span>
            <input
              value={labelColumn}
              onChange={(e) => setLabelColumn(e.target.value)}
              aria-label="Label column"
              placeholder="last"
              className="h-9 w-28 rounded-md border border-ink-600 bg-ink-900 px-2 text-sm text-ink-100 focus:outline-none focus:ring-2 focus:ring-accent-400"
            />
            <span className="mt-0.5 block text-[10px] text-ink-500">“last” or a column number (1-based)</span>
          </label>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-1.5 text-xs text-rose-200">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button variant="primary" size="sm" onClick={onUse} disabled={!text.trim()}>
          Use dataset
        </Button>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Draw tab -- */

const CANVAS_W = 440;
const CANVAS_H = 300;

function DrawTab({ tasks, onCommit }: { tasks: CsvTask[]; onCommit: (d: Dataset) => void }) {
  const drawTasks = tasks.filter((t) => t === 'classification' || t === 'clustering');
  const [task, setTask] = useState<CsvTask>(drawTasks[0]);
  const [numClasses, setNumClasses] = useState(2);
  const [activeClass, setActiveClass] = useState(0);
  const [points, setPoints] = useState<DrawnPoint[]>([]);
  const [error, setError] = useState('');
  const surfaceRef = useRef<HTMLDivElement>(null);

  const place = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const box = surfaceRef.current?.getBoundingClientRect();
      if (!box) return;
      const x = e.clientX - box.left;
      const y = e.clientY - box.top;
      // Flip y so "up" is positive, like a normal scatter plot.
      setPoints((prev) => [...prev, { x, y: CANVAS_H - y, label: task === 'clustering' ? 0 : activeClass }]);
    },
    [task, activeClass],
  );

  const onUse = useCallback(() => {
    setError('');
    const ts = Date.now();
    const result = drawnPointsToDataset(points, {
      id: `custom:draw:${ts}`,
      name: 'Drawn points',
      task: task === 'clustering' ? 'clustering' : 'classification',
      classNames: Array.from({ length: numClasses }, (_, i) => `Class ${i + 1}`),
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onCommit(result.dataset);
  }, [points, task, numClasses, onCommit]);

  const counts = useMemo(() => {
    const c = new Array(numClasses).fill(0) as number[];
    for (const p of points) if (p.label < numClasses) c[p.label] += 1;
    return c;
  }, [points, numClasses]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        {drawTasks.length > 1 && (
          <label className="block">
            <span className="mb-1 block text-[11px] uppercase tracking-wide text-ink-400">Task</span>
            <Select
              value={task}
              options={drawTasks.map((t) => ({ value: t, label: TASK_LABEL[t] }))}
              onChange={(e) => setTask(e.target.value as CsvTask)}
              aria-label="Drawn dataset task"
            />
          </label>
        )}
        {task === 'classification' && (
          <label className="block">
            <span className="mb-1 block text-[11px] uppercase tracking-wide text-ink-400">Classes</span>
            <Select
              value={String(numClasses)}
              options={[2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: String(n) }))}
              onChange={(e) => {
                const n = Number.parseInt(e.target.value, 10);
                setNumClasses(n);
                setActiveClass((c) => Math.min(c, n - 1));
              }}
              aria-label="Number of classes"
            />
          </label>
        )}
      </div>

      {task === 'classification' && (
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Active class">
          {Array.from({ length: numClasses }, (_, i) => (
            <button
              key={i}
              role="radio"
              aria-checked={activeClass === i}
              aria-label={`Class ${i + 1}`}
              onClick={() => setActiveClass(i)}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${
                activeClass === i ? 'border-ink-200 text-ink-50' : 'border-ink-600 text-ink-400'
              }`}
            >
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: CLASS_COLORS[i] }} />
              Class {i + 1} ({counts[i]})
            </button>
          ))}
        </div>
      )}

      <div
        ref={surfaceRef}
        onClick={place}
        role="application"
        aria-label="Drawing canvas — click to place points"
        className="relative cursor-crosshair overflow-hidden rounded-md border border-ink-600 bg-ink-900"
        style={{ width: CANVAS_W, height: CANVAS_H, maxWidth: '100%' }}
      >
        {points.map((p, i) => (
          <span
            key={i}
            className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: p.x,
              top: CANVAS_H - p.y,
              backgroundColor: task === 'clustering' ? '#94a3b8' : CLASS_COLORS[p.label] ?? '#94a3b8',
            }}
          />
        ))}
        {points.length === 0 && (
          <span className="pointer-events-none absolute inset-0 grid place-items-center text-xs text-ink-500">
            Click to place points
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPoints((p) => p.slice(0, -1))}
          disabled={points.length === 0}
        >
          <Icon name="undo" size={16} />
          <span>Undo</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setPoints([])} disabled={points.length === 0}>
          <Icon name="delete" size={16} />
          <span>Clear</span>
        </Button>
        <span className="text-xs text-ink-400">{points.length} points</span>
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-1.5 text-xs text-rose-200">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button variant="primary" size="sm" onClick={onUse} disabled={points.length === 0}>
          Use dataset
        </Button>
      </div>
    </div>
  );
}
