import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import {
  PLAYBACK_SHORTCUTS,
  isEditableTarget,
  hasModifierKey,
  type PlaybackShortcut,
} from '@/lib/playback-keymap';

/**
 * Non-transport shortcuts that the help dialog also documents. These aren't
 * resolved by the playback keymap (they drive the dialog itself), so they live
 * here rather than in the transport catalog.
 */
const UI_SHORTCUTS: PlaybackShortcut[] = [
  { keys: ['?'], description: 'Show this shortcuts dialog', eventKey: '?' },
  { keys: ['Esc'], description: 'Close dialog', eventKey: 'Escape' },
];

/**
 * KeyboardHelp — discoverability for the workspace keyboard transport.
 *
 * The transport shortcuts (Space/←/→/Home/End/R) have always worked and are
 * documented to assistive tech via `aria-keyshortcuts`, but sighted mouse users
 * had no way to discover them. This surfaces them two ways: a header button and
 * the universal `?` help key. The dialog is sourced from the SAME
 * {@link PLAYBACK_SHORTCUTS} catalog the keymap exposes, so it can't drift from
 * actual behaviour.
 */
export function KeyboardHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // `?` is the conventional help key. It needs Shift to type, so only
      // Ctrl/Cmd/Alt count as disqualifying modifiers here; and like the
      // transport keys it must defer to text entry in the editor/inputs.
      if (e.key === '?' && !hasModifierKey(e) && !isEditableTarget(e.target)) {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Keyboard shortcuts (?)"
        aria-label="Keyboard shortcuts"
        aria-keyshortcuts="?"
        className="touch-target hidden items-center justify-center gap-1.5 rounded-md border border-ink-600 px-2 py-1 text-xs font-medium text-ink-300 hover:border-accent-400 hover:text-accent-200 sm:inline-flex"
      >
        <Icon name="keyboard" size={16} />
        <span className="hidden lg:inline">Keys</span>
      </button>
      {open && <ShortcutsDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Trap focus while open: focus moves in on mount, Tab/Shift+Tab wrap, Escape
  // closes, and focus returns to the invoking control on close.
  useFocusTrap(dialogRef, { active: true, onClose });

  const rows = [...PLAYBACK_SHORTCUTS, ...UI_SHORTCUTS];

  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        className="flex max-h-[90vh] w-full max-w-sm flex-col overflow-hidden rounded-xl border border-ink-700 bg-ink-800 shadow-e28 focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-ink-700 px-4 py-3">
          <h2 id="shortcuts-title" className="flex items-center gap-2 text-sm font-semibold text-ink-50">
            <Icon name="keyboard" size={18} />
            Keyboard shortcuts
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="touch-target grid place-items-center rounded-md text-ink-400 hover:text-ink-100"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          <dl className="flex flex-col gap-0.5">
            {rows.map((s) => (
              <div
                key={s.description}
                className="flex items-center justify-between gap-4 rounded-md px-2 py-1.5 odd:bg-ink-900/40"
              >
                <dt className="text-xs text-ink-200">{s.description}</dt>
                <dd className="flex shrink-0 items-center gap-1">
                  {s.keys.map((k) => (
                    <kbd
                      key={k}
                      className="rounded border border-ink-600 bg-ink-900 px-1.5 py-0.5 font-mono text-[11px] leading-none text-ink-200 shadow-sm"
                    >
                      {k}
                    </kbd>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[11px] leading-snug text-ink-400">
            Shortcuts pause while you’re typing in the code editor or an input.
          </p>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
