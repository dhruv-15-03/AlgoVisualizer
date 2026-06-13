import { useEffect, type RefObject } from 'react';
import { getFocusable, nextFocusTarget } from '@/lib/focus-trap';

interface FocusTrapOptions {
  /** Whether the trap is active (e.g. the dialog is open). */
  active: boolean;
  /** Called when Escape is pressed inside the trap. */
  onClose: () => void;
}

/**
 * useFocusTrap — confine keyboard focus to `containerRef` while `active`.
 *
 * On activation it remembers the previously-focused element and moves focus to
 * the first focusable control inside the container. While active, Tab/Shift+Tab
 * wrap around inside the container (via {@link nextFocusTarget}) and Escape calls
 * `onClose`. On deactivation/unmount, focus is restored to the element that had
 * it before the trap opened — the expected dialog behaviour.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement>,
  { active, onClose }: FocusTrapOptions,
): void {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Move focus into the dialog. Prefer the first focusable control; fall back
    // to the container itself (which should carry tabindex={-1}).
    const initial = getFocusable(container)[0] ?? container;
    initial.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const node = containerRef.current;
      if (!node) return;
      const focusables = getFocusable(node);
      if (focusables.length === 0) {
        // Nothing focusable inside — keep focus on the container.
        e.preventDefault();
        node.focus();
        return;
      }
      const target = nextFocusTarget(focusables, document.activeElement, e.shiftKey);
      if (target) {
        e.preventDefault();
        target.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      // Restore focus to the invoking control if it's still in the document.
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [active, onClose, containerRef]);
}
