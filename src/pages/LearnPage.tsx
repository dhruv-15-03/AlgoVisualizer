import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import {
  listLearningPaths,
  pathProgress,
  nextLesson,
  lessonWorkspacePath,
  type LearningPath,
  type Lesson,
} from '@/lib/curriculum';
import { useProgressStore } from '@/stores/progress-store';
import { prewarmPyodide } from '@/controllers/training-controller';

export function LearnPage() {
  const paths = listLearningPaths();

  // Same pre-warm play as Home: the visitor is about to open a workspace, so
  // pull the lazy Workspace bundle + Pyodide runtime during idle time.
  useEffect(() => {
    const ric: (cb: () => void) => number =
      typeof window.requestIdleCallback === 'function'
        ? (cb) => window.requestIdleCallback(cb, { timeout: 2000 })
        : (cb) => window.setTimeout(cb, 600);
    const cic: (id: number) => void =
      typeof window.cancelIdleCallback === 'function'
        ? (id) => window.cancelIdleCallback(id)
        : (id) => window.clearTimeout(id);
    const handle = ric(() => {
      void import('@/pages/WorkspacePage');
      prewarmPyodide();
    });
    return () => cic(handle);
  }, []);

  useEffect(() => {
    const prev = document.title;
    document.title = 'Learning paths · AlgoVisualizer';
    return () => {
      document.title = prev;
    };
  }, []);

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col overflow-y-auto bg-ink-900 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-ink-400 transition-colors hover:text-ink-200"
        >
          <Icon name="arrow_back" size={16} />
          Home
        </Link>
      </div>

      <header className="flex flex-col items-center gap-4 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent-500/15 text-accent-300">
          <Icon name="menu_book" size={32} />
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink-50 sm:text-4xl">
          Learning paths
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-300 sm:text-base">
          A guided route through the material instead of 25 disconnected sandboxes. Each lesson runs
          real Python in your browser and is complete when you beat its challenge — your progress is
          saved on this device.
        </p>
      </header>

      <section className="mt-8 space-y-6 sm:mt-12">
        {paths.map((path) => (
          <PathCard key={path.id} path={path} />
        ))}
      </section>
    </div>
  );
}

function PathCard({ path }: { path: LearningPath }) {
  // Subscribe to the completed Set so progress re-renders when a lesson is
  // earned (e.g. after returning from a beaten challenge in the workspace).
  const completed = useProgressStore((s) => s.completed);
  const progress = pathProgress(path, completed);
  const next = nextLesson(path, completed);
  const cta = next ?? path.lessons[0];
  const ctaLabel = progress.complete ? 'Review path' : progress.done === 0 ? 'Start path' : 'Continue';
  const pct = Math.round(progress.fraction * 100);

  return (
    <article className="rounded-2xl border border-ink-700 bg-ink-800 p-5 shadow-e2 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-ink-50">{path.title}</h2>
            {progress.complete && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                <Icon name="check_circle" size={13} fill />
                Complete
              </span>
            )}
          </div>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-300">{path.summary}</p>
        </div>
        {cta && (
          <Link to={lessonWorkspacePath(cta)} className="shrink-0">
            <Button variant="primary" size="lg">
              {ctaLabel}
              <Icon name="arrow_forward" size={18} />
            </Button>
          </Link>
        )}
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-[11px] text-ink-400">
          <span>
            <span className="font-semibold text-ink-200">{progress.done}</span> / {progress.total}{' '}
            lessons
          </span>
          <span>
            {path.estimate}
            <span className="px-1.5 text-ink-700">·</span>
            {pct}%
          </span>
        </div>
        <div
          className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-700"
          role="progressbar"
          aria-valuenow={progress.done}
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-label={`${path.title} progress`}
        >
          <div
            className="h-full rounded-full bg-accent-500 transition-all duration-250 ease-standard"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ol className="mt-5 space-y-1.5">
        {path.lessons.map((lesson, i) => (
          <LessonRow
            key={lesson.id}
            lesson={lesson}
            index={i + 1}
            done={completed.has(lesson.id)}
            isNext={next?.id === lesson.id}
          />
        ))}
      </ol>
    </article>
  );
}

function LessonRow({
  lesson,
  index,
  done,
  isNext,
}: {
  lesson: Lesson;
  index: number;
  done: boolean;
  isNext: boolean;
}) {
  const marker = done ? 'check_circle' : isNext ? 'play_circle' : 'radio_button_unchecked';
  const markerClass = done
    ? 'text-emerald-400'
    : isNext
      ? 'text-accent-300'
      : 'text-ink-500';

  return (
    <li>
      <Link
        to={lessonWorkspacePath(lesson)}
        className="group flex items-start gap-3 rounded-lg border border-transparent px-2.5 py-2 transition-colors hover:border-ink-700 hover:bg-ink-750"
      >
        <span className={`mt-0.5 shrink-0 ${markerClass}`}>
          <Icon name={marker} size={20} fill={done} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="font-mono text-[11px] text-ink-500">{index}</span>
            <span className="text-sm font-medium text-ink-100 group-hover:text-accent-300">
              {lesson.title}
            </span>
          </span>
          <span className="mt-0.5 block text-xs leading-relaxed text-ink-400">{lesson.blurb}</span>
        </span>
        <Icon
          name="arrow_forward"
          size={16}
          className="mt-1 shrink-0 text-ink-600 opacity-0 transition-opacity group-hover:opacity-100"
        />
      </Link>
    </li>
  );
}
