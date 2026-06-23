/**
 * playback-keymap — pure key→action resolution for keyboard playback control.
 *
 * The workspace lets the user drive playback from the keyboard. To keep that
 * logic testable (and to guarantee it never forks the transport behaviour), the
 * *decision* of which action a keypress maps to lives here as a pure function;
 * the React layer (`usePlaybackKeyboard`) only translates the resolved action
 * into the SAME session-store actions the on-screen buttons call.
 *
 *   Space        → play / pause
 *   ArrowLeft    → step back one frame
 *   ArrowRight   → step forward one frame
 *   Home         → jump to first frame
 *   End          → jump to last frame
 *   R            → reset / replay
 *
 * Guards: shortcuts are ignored while typing in an editable target (Monaco,
 * <input>, <textarea>, contenteditable) or when a modifier (Ctrl/Cmd/Alt) is
 * held, so they never collide with browser/OS chords or text entry.
 */

export type PlaybackAction =
  | 'play-pause'
  | 'step-back'
  | 'step-forward'
  | 'first-frame'
  | 'last-frame'
  | 'reset';

export interface PlaybackKeyContext {
  /** `KeyboardEvent.key`. */
  key: string;
  /** True when focus is in an editable element (skip shortcuts). */
  isEditableTarget: boolean;
  /** True when Ctrl/Cmd/Alt is held (skip shortcuts). */
  hasModifier: boolean;
  /** Whether a previous frame exists (currentStep > 0). */
  canStepBack: boolean;
  /** Whether a next frame exists (currentStep < last). */
  canStepForward: boolean;
}

/** Normalize a `KeyboardEvent.key` to a lowercase token we switch on. */
function normalizeKey(key: string): string {
  // Space is reported as ' ' in modern browsers, 'Spacebar' in older ones.
  if (key === ' ' || key === 'Spacebar' || key === 'Space') return 'space';
  return key.toLowerCase();
}

/**
 * Resolve a keyboard event context to a playback action, or `null` when the
 * key isn't a playback shortcut or a guard blocks it. Pure and side-effect free.
 */
export function resolvePlaybackAction(ctx: PlaybackKeyContext): PlaybackAction | null {
  if (ctx.isEditableTarget || ctx.hasModifier) return null;

  switch (normalizeKey(ctx.key)) {
    case 'space':
      return 'play-pause';
    case 'arrowleft':
      return ctx.canStepBack ? 'step-back' : null;
    case 'arrowright':
      return ctx.canStepForward ? 'step-forward' : null;
    case 'home':
      // Only meaningful when there's something earlier to jump to.
      return ctx.canStepBack ? 'first-frame' : null;
    case 'end':
      // Only meaningful when there's something later to jump to.
      return ctx.canStepForward ? 'last-frame' : null;
    case 'r':
      return 'reset';
    default:
      return null;
  }
}

/**
 * Human-facing catalog of the keyboard transport shortcuts, used to render the
 * in-app shortcuts help (see {@link KeyboardHelp}). `eventKey` is the
 * `KeyboardEvent.key` the shortcut is triggered by; a drift-guard test asserts
 * each one still resolves to an action via {@link resolvePlaybackAction}, so the
 * visible help can never silently fall out of sync with real transport behaviour.
 */
export interface PlaybackShortcut {
  /** Key-cap label(s) to display, e.g. `['Space']` or `['←']`. */
  keys: string[];
  /** What the shortcut does. */
  description: string;
  /** Representative `KeyboardEvent.key` value used by the drift guard. */
  eventKey: string;
}

export const PLAYBACK_SHORTCUTS: readonly PlaybackShortcut[] = [
  { keys: ['Space'], description: 'Play / pause', eventKey: ' ' },
  { keys: ['←'], description: 'Step back one frame', eventKey: 'ArrowLeft' },
  { keys: ['→'], description: 'Step forward one frame', eventKey: 'ArrowRight' },
  { keys: ['Home'], description: 'Jump to first frame', eventKey: 'Home' },
  { keys: ['End'], description: 'Jump to last frame', eventKey: 'End' },
  { keys: ['R'], description: 'Reset / replay', eventKey: 'r' },
];

/**
 * Whether the given event target is an editable element where playback
 * shortcuts must defer to text entry. Covers native form controls,
 * contenteditable regions, and the Monaco editor's input surface.
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  if (target.closest('[contenteditable="true"]')) return true;
  // Monaco renders a hidden <textarea> inside `.monaco-editor`; belt-and-braces.
  if (target.closest('.monaco-editor')) return true;
  return false;
}

/** Whether a modifier that should suppress shortcuts is held. */
export function hasModifierKey(e: {
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
}): boolean {
  return e.ctrlKey || e.metaKey || e.altKey;
}
