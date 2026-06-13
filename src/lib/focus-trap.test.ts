import { describe, it, expect, afterEach } from 'vitest';
import { getFocusable, nextFocusTarget, FOCUSABLE_SELECTOR } from '@/lib/focus-trap';

function mount(html: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.appendChild(host);
  return host;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('focus-trap.getFocusable', () => {
  it('collects focusable controls in DOM order', () => {
    const host = mount(`
      <a href="#one">one</a>
      <button>two</button>
      <input />
      <div>not focusable</div>
      <textarea></textarea>
    `);
    const focusables = getFocusable(host);
    expect(focusables.map((e) => e.tagName)).toEqual(['A', 'BUTTON', 'INPUT', 'TEXTAREA']);
  });

  it('skips disabled controls and tabindex="-1"', () => {
    const host = mount(`
      <button>ok</button>
      <button disabled>nope</button>
      <input disabled />
      <div tabindex="-1">nope</div>
      <div tabindex="0">yes</div>
    `);
    const labels = getFocusable(host).map((e) => e.textContent || e.tagName);
    expect(labels).toEqual(['ok', 'yes']);
  });

  it('includes the contenteditable selector token', () => {
    expect(FOCUSABLE_SELECTOR).toContain('[contenteditable="true"]');
  });
});

describe('focus-trap.nextFocusTarget', () => {
  function makeList(n: number): HTMLElement[] {
    return Array.from({ length: n }, (_, i) => {
      const b = document.createElement('button');
      b.textContent = String(i);
      return b;
    });
  }

  it('returns null when there is nothing focusable', () => {
    expect(nextFocusTarget([], null, false)).toBeNull();
  });

  it('moves forward and wraps from last to first', () => {
    const list = makeList(3);
    expect(nextFocusTarget(list, list[0], false)).toBe(list[1]);
    expect(nextFocusTarget(list, list[1], false)).toBe(list[2]);
    expect(nextFocusTarget(list, list[2], false)).toBe(list[0]); // wrap
  });

  it('moves backward and wraps from first to last (Shift+Tab)', () => {
    const list = makeList(3);
    expect(nextFocusTarget(list, list[2], true)).toBe(list[1]);
    expect(nextFocusTarget(list, list[1], true)).toBe(list[0]);
    expect(nextFocusTarget(list, list[0], true)).toBe(list[2]); // wrap
  });

  it('pulls focus to the first/last element when focus is outside the trap', () => {
    const list = makeList(3);
    const outsider = document.createElement('button');
    expect(nextFocusTarget(list, outsider, false)).toBe(list[0]);
    expect(nextFocusTarget(list, outsider, true)).toBe(list[2]);
    expect(nextFocusTarget(list, null, false)).toBe(list[0]);
  });

  it('handles a single focusable element by keeping focus on it', () => {
    const list = makeList(1);
    expect(nextFocusTarget(list, list[0], false)).toBe(list[0]);
    expect(nextFocusTarget(list, list[0], true)).toBe(list[0]);
  });
});
