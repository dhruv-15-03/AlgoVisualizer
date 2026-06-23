import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { getConsent, setConsent, loadClarity } from '@/lib/consent';

/**
 * Minimal, accessible analytics-consent banner.
 *
 * Renders only while the user is undecided. Accepting persists the choice and
 * injects Microsoft Clarity; declining persists the choice and loads nothing.
 * Mounted once at the app root (outside <Routes>) so the decision is global.
 */
export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show only when there's no stored decision yet.
    setVisible(getConsent() === null);
  }, []);

  if (!visible) return null;

  function accept() {
    setConsent('accepted');
    loadClarity();
    setVisible(false);
  }

  function decline() {
    setConsent('declined');
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-title"
      aria-describedby="consent-desc"
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-3 sm:p-4"
    >
      <div className="w-full max-w-2xl rounded-xl border border-ink-700 bg-ink-800/95 p-4 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-ink-800/80">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-accent-300">
              <Icon name="insights" size={20} />
            </span>
            <div>
              <p id="consent-title" className="text-sm font-semibold text-ink-100">
                Help improve AlgoVisualizer?
              </p>
              <p id="consent-desc" className="mt-0.5 text-xs leading-relaxed text-ink-300">
                We&apos;d like to use Microsoft Clarity to understand how the app is used
                (anonymous session insights). Nothing analytics-related loads unless you
                accept. You can decline and everything still works.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-stretch">
            <button
              onClick={accept}
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-accent-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-800"
            >
              <Icon name="check_circle" size={14} fill />
              Accept
            </button>
            <button
              onClick={decline}
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-ink-600 px-3 py-1.5 text-xs font-semibold text-ink-200 transition-colors hover:bg-ink-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-500 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-800"
            >
              <Icon name="close" size={14} />
              Decline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
