import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { reportError } from '@/lib/error-reporting';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Heading shown in the fallback. */
  title?: string;
  /** Supporting copy shown under the heading. */
  description?: string;
  /** Compact inline fallback (for embedding inside a panel) vs. full-page. */
  compact?: boolean;
  /** Called when the user clicks "Try again" (after local state is reset). */
  onReset?: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render-time exceptions in its subtree and shows a friendly,
 * recoverable message instead of unmounting the whole app to a blank screen.
 *
 * Wrap the app root (so any crash is contained) and individual risky regions
 * such as the visualization (so one bad render doesn't take down the editor).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // The UI already shows a recoverable message; forward to consent-gated
    // reporting (which also logs to the console for local debugging).
    reportError(error, { source: 'react', componentStack: info.componentStack ?? undefined });
  }

  handleReset = (): void => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    const {
      compact,
      title = 'Something went wrong',
      description = 'An unexpected error broke this view. Your code and progress are safe.',
    } = this.props;

    if (compact) {
      return (
        <div className="grid h-full place-items-center p-4">
          <div className="max-w-md text-center">
            <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-300">
              <Icon name="error_outline" size={16} />
              {title}
            </div>
            <p className="mt-1 text-xs text-ink-400">{description}</p>
            <pre className="mt-2 max-h-32 overflow-auto rounded-md bg-rose-500/10 p-3 text-left text-[11px] text-rose-200">
              {error.message || String(error)}
            </pre>
            <button
              onClick={this.handleReset}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-accent-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-400"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="grid h-full min-h-screen place-items-center bg-ink-900 p-6 text-center">
        <div className="max-w-lg">
          <div className="inline-flex items-center gap-2 text-base font-semibold text-rose-300">
            <Icon name="error_outline" size={20} />
            {title}
          </div>
          <p className="mt-2 text-sm text-ink-300">{description}</p>
          <pre className="mt-4 max-h-48 overflow-auto rounded-md bg-rose-500/10 p-3 text-left text-xs text-rose-200">
            {error.message || String(error)}
          </pre>
          <div className="mt-5 flex items-center justify-center gap-2">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-400"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 rounded-md border border-ink-600 px-4 py-2 text-sm font-semibold text-ink-200 transition-colors hover:bg-ink-800"
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
