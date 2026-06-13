/**
 * Analytics consent + Microsoft Clarity loader.
 *
 * Clarity used to load unconditionally from `index.html`. It is now gated
 * behind explicit user consent: nothing is requested from clarity.ms until the
 * visitor clicks "Accept", and a stored "declined" choice fully suppresses it.
 *
 * The functions here are deliberately small and side-effect-isolated so the
 * decision logic can be unit tested without a real DOM/network.
 */

export const CONSENT_STORAGE_KEY = 'av:analytics-consent';
export const CLARITY_PROJECT_ID = 'x3eye4jaz2';

export type ConsentChoice = 'accepted' | 'declined';

/** Read the persisted choice. Returns null when undecided or unavailable. */
export function getConsent(storage: Pick<Storage, 'getItem'> | undefined = safeStorage()):
  | ConsentChoice
  | null {
  if (!storage) return null;
  try {
    const v = storage.getItem(CONSENT_STORAGE_KEY);
    return v === 'accepted' || v === 'declined' ? v : null;
  } catch {
    return null;
  }
}

/** Persist a choice. Swallows storage errors (private mode / disabled). */
export function setConsent(
  choice: ConsentChoice,
  storage: Pick<Storage, 'setItem'> | undefined = safeStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch {
    /* ignore */
  }
}

/** True only when the user has explicitly accepted. */
export function hasAccepted(
  storage: Pick<Storage, 'getItem'> | undefined = safeStorage(),
): boolean {
  return getConsent(storage) === 'accepted';
}

function safeStorage(): Storage | undefined {
  try {
    return typeof window !== 'undefined' ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
}

interface ClarityWindow extends Window {
  clarity?: ((...args: unknown[]) => void) & { q?: unknown[] };
}

/**
 * Inject the Microsoft Clarity tag. Idempotent — repeated calls are no-ops
 * once the script is present. Returns true if a load was initiated (or already
 * active), false if it couldn't run (no DOM).
 */
export function loadClarity(projectId: string = CLARITY_PROJECT_ID): boolean {
  if (typeof document === 'undefined' || typeof window === 'undefined') return false;

  const w = window as ClarityWindow;
  // Already bootstrapped (tag present or queue installed) — don't double-inject.
  if (w.clarity || document.getElementById('clarity-tag')) return true;

  w.clarity =
    w.clarity ||
    function (...args: unknown[]) {
      (w.clarity!.q = w.clarity!.q || []).push(args);
    };

  const script = document.createElement('script');
  script.id = 'clarity-tag';
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${projectId}`;
  const first = document.getElementsByTagName('script')[0];
  if (first && first.parentNode) {
    first.parentNode.insertBefore(script, first);
  } else {
    document.head.appendChild(script);
  }
  return true;
}

/** Load Clarity only if the user has previously accepted. */
export function maybeLoadClarity(
  storage: Pick<Storage, 'getItem'> | undefined = safeStorage(),
): boolean {
  if (!hasAccepted(storage)) return false;
  return loadClarity();
}
