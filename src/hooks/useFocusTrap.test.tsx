import { describe, it, expect, afterEach, vi } from 'vitest';
import { useRef } from 'react';
import { render, cleanup, act } from '@testing-library/react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

function Dialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, { active: true, onClose });
  return (
    <div ref={ref} tabIndex={-1}>
      <button>first</button>
      <button>second</button>
      <button>third</button>
    </div>
  );
}

function key(k: string, init: Partial<KeyboardEventInit> = {}) {
  act(() => {
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init }),
    );
  });
}

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('useFocusTrap', () => {
  it('moves focus to the first focusable element on activation', () => {
    render(<Dialog onClose={() => {}} />);
    expect(document.activeElement?.textContent).toBe('first');
  });

  it('wraps focus forward with Tab', () => {
    render(<Dialog onClose={() => {}} />);
    expect(document.activeElement?.textContent).toBe('first');
    key('Tab');
    expect(document.activeElement?.textContent).toBe('second');
    key('Tab');
    expect(document.activeElement?.textContent).toBe('third');
    key('Tab'); // wrap to first
    expect(document.activeElement?.textContent).toBe('first');
  });

  it('wraps focus backward with Shift+Tab', () => {
    render(<Dialog onClose={() => {}} />);
    expect(document.activeElement?.textContent).toBe('first');
    key('Tab', { shiftKey: true }); // wrap to last
    expect(document.activeElement?.textContent).toBe('third');
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<Dialog onClose={onClose} />);
    key('Escape');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('restores focus to the previously-focused element on unmount', () => {
    const opener = document.createElement('button');
    opener.textContent = 'opener';
    document.body.appendChild(opener);
    opener.focus();
    expect(document.activeElement).toBe(opener);

    const { unmount } = render(<Dialog onClose={() => {}} />);
    expect(document.activeElement?.textContent).toBe('first');

    unmount();
    expect(document.activeElement).toBe(opener);
  });
});
