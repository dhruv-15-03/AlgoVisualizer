import { useEffect, useRef, useState } from 'react';
import { useSessionStore } from '@/stores/session-store';
import { announceForStep } from '@/lib/step-announcer';

/** Minimum gap between spoken announcements, so fast playback doesn't spam. */
const THROTTLE_MS = 500;

/**
 * LiveAnnouncer — the screen-reader "What's happening now" region.
 *
 * Renders a visually-hidden `aria-live="polite"` region and updates its text
 * from the current trace event (via {@link announceForStep}). Two safeguards
 * keep it from flooding assistive tech during fast autoplay:
 *   1. **De-dupe** — identical consecutive sentences are dropped.
 *   2. **Throttle** — at most one update per {@link THROTTLE_MS}; the most
 *      recent pending sentence wins (leading + trailing edge).
 *
 * Because the playback controller only advances `currentStep` at integer step
 * boundaries, this is already step-granular; the throttle just caps the rate at
 * high speeds. Mounted once at the workspace level so it survives tab switches.
 */
export function LiveAnnouncer() {
  const events = useSessionStore((s) => s.events);
  const currentStep = useSessionStore((s) => s.currentStep);
  const [message, setMessage] = useState('');

  // Last sentence actually spoken (for de-dupe) and a trailing-edge timer.
  const lastSpokenRef = useRef('');
  const pendingRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const next = announceForStep(events, currentStep);
    if (!next || next === lastSpokenRef.current) return;

    const speak = (text: string) => {
      lastSpokenRef.current = text;
      setMessage(text);
    };

    if (timerRef.current === null) {
      // Leading edge: announce immediately, then open the throttle window.
      speak(next);
      timerRef.current = window.setTimeout(function flush() {
        const pending = pendingRef.current;
        pendingRef.current = null;
        if (pending && pending !== lastSpokenRef.current) {
          // Trailing edge: speak the latest queued sentence and keep the
          // window open in case more arrive.
          speak(pending);
          timerRef.current = window.setTimeout(flush, THROTTLE_MS);
        } else {
          timerRef.current = null;
        }
      }, THROTTLE_MS);
    } else {
      // Within the throttle window: remember only the newest sentence.
      pendingRef.current = next;
    }
  }, [events, currentStep]);

  // Clear any pending timer on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true" role="status">
      {message}
    </div>
  );
}
