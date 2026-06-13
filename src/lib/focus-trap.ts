/**
 * focus-trap — pure helpers for keeping keyboard focus inside an open dialog.
 *
 * The DOM-querying parts are thin; the *decision* of where Tab/Shift+Tab should
 * land next is a pure function ({@link nextFocusTarget}) so it can be unit-tested
 * without a real focus model. The `useFocusTrap` hook composes these.
 */

/** Selector for elements that can receive keyboard focus. */
export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

/**
 * All focusable descendants of `container`, in DOM order, excluding hidden ones
 * (`hidden` attribute or `display:none`/`visibility:hidden` via offsetParent).
 */
export function getFocusable(container: HTMLElement): HTMLElement[] {
  const nodes = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  );
  return nodes.filter((el) => {
    if (el.hasAttribute('disabled')) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    // offsetParent is null for display:none elements (and position:fixed, but
    // dialogs don't put focusables there). Good enough for a trap.
    if (el.offsetParent === null && el.tagName !== 'BODY') {
      // Still allow elements that are visible via fixed positioning.
      const style = typeof window !== 'undefined' ? window.getComputedStyle(el) : null;
      if (!style || style.display === 'none' || style.visibility === 'hidden') return false;
    }
    return true;
  });
}

/**
 * Given the focusable elements, the currently-focused element, and whether
 * Shift is held, return the element that should receive focus next when Tab is
 * pressed — wrapping at both ends. Returns `null` when there's nothing to focus.
 *
 * Pure: no DOM mutation. The caller is responsible for calling `.focus()`.
 */
export function nextFocusTarget(
  focusables: HTMLElement[],
  active: Element | null,
  shiftKey: boolean,
): HTMLElement | null {
  if (focusables.length === 0) return null;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const index = active instanceof HTMLElement ? focusables.indexOf(active) : -1;

  // Focus is outside the trap (or unknown): pull it to the natural end.
  if (index === -1) return shiftKey ? last : first;

  if (shiftKey) {
    return index === 0 ? last : focusables[index - 1];
  }
  return index === focusables.length - 1 ? first : focusables[index + 1];
}
